import { SiteApi, SystemError } from '../libs/nofbiz/nofbiz.base.js';
import { parseCSV } from '../libs/nofbiz/nofbiz.excelparser.js';
import { MENTOR_DEPT_OUIDS, GESTOR_CATEGORIES } from './constants.js';

const listApi = new SiteApi().list('OrgHierarchy');

/**
 * Category ranking for determining department heads.
 * Lower number = higher rank.
 */
const CATEGORY_RANK = {
  'Executive': 0,
  'Top Management': 1,
  'Management': 2,
  'Team Leader': 3,
  'Expert - Technical Lead': 4,
  'Technician': 5,
};

/**
 * Maps a CSV row to an OrgHierarchy SP record (without computed fields).
 * @param {Object} row - Parsed CSV row
 * @returns {Object}
 */
function mapCSVRow(row) {
  return {
    Title: String(row['Pessoa'] || '').trim(),
    FullName: String(row['Nome'] || '').trim(),
    ShortName: String(row['Nome Abreviado'] || '').trim(),
    DeptCode: String(row['Departamento (Codigo)'] || '').trim(),
    DeptName: String(row['Departamento'] || '').trim(),
    SubDivName: String(row['Polo/Divisao'] || '').trim(),
    SubDivCode: String(row['Sub-divisao (Codigo)'] || '').trim(),
    Category: String(row['Categoria (Descricao)'] || '').trim(),
    ManagerId: String(row['Manager'] || '').trim(),
    ManagerName: String(row['Nome Manager'] || '').trim(),
    Email: String(row['Email'] || '').trim(),
    AppRole: String(row['AppRole'] || '').trim(),
  };
}

/**
 * Imports organizational hierarchy from CSV content.
 * Full refresh: deletes all existing items and recreates from CSV.
 *
 * @param {string} csvContent - Raw CSV string
 * @param {(current: number, total: number) => void} [onProgress] - Progress callback for writes
 * @returns {Promise<{ success: number, failed: number, errors: string[] }>}
 */
export async function importFromCSV(csvContent, onProgress) {
  const errors = [];

  // 1. Parse CSV
  const rawRows = await parseCSV(csvContent);
  if (!rawRows || rawRows.length === 0) {
    return { success: 0, failed: 0, errors: ['CSV is empty'] };
  }

  // 2. Build person adjacency map, validate uniqueness and manager refs
  const personMap = new Map();
  let rootId = null;

  for (const raw of rawRows) {
    const mapped = mapCSVRow(raw);
    const id = mapped.Title;

    if (!id) {
      errors.push('Row with empty Pessoa field skipped.');
      continue;
    }

    if (personMap.has(id)) {
      errors.push(`Duplicate employee ID "${id}" -- keeping first occurrence.`);
      continue;
    }

    personMap.set(id, mapped);

    if (!mapped.ManagerId) {
      if (rootId !== null) {
        errors.push(`Multiple roots found: "${rootId}" and "${id}". Aborting.`);
        return { success: 0, failed: 0, errors };
      }
      rootId = id;
    }
  }

  if (rootId === null) {
    errors.push('No root employee found (person with empty Manager). Aborting.');
    return { success: 0, failed: 0, errors };
  }

  // Validate all manager references resolve
  for (const [id, person] of personMap) {
    if (person.ManagerId && !personMap.has(person.ManagerId)) {
      errors.push(`Employee "${id}" references unknown manager "${person.ManagerId}". Aborting.`);
      return { success: 0, failed: 0, errors };
    }
  }

  // 3. Detect cycles via BFS from root -- unreachable nodes are flagged
  const visited = new Set();
  const bfsQueue = [rootId];
  const ancestorPaths = new Map();
  ancestorPaths.set(rootId, rootId);
  visited.add(rootId);

  while (bfsQueue.length > 0) {
    const currentId = bfsQueue.shift();
    const currentPath = ancestorPaths.get(currentId);

    for (const [childId, child] of personMap) {
      if (child.ManagerId === currentId && !visited.has(childId)) {
        visited.add(childId);
        ancestorPaths.set(childId, currentPath + '|' + childId);
        bfsQueue.push(childId);
      }
    }
  }

  const unreachable = [];
  for (const id of personMap.keys()) {
    if (!visited.has(id)) {
      unreachable.push(id);
    }
  }
  if (unreachable.length > 0) {
    errors.push(`Unreachable employees (possible cycle): ${unreachable.join(', ')}. Aborting.`);
    return { success: 0, failed: 0, errors };
  }

  // 4. AncestorPath is already computed in step 3

  // 5. Infer department hierarchy
  // 5a. Group employees by DeptCode
  const deptGroups = new Map();
  for (const [id, person] of personMap) {
    const code = person.DeptCode;
    if (!code) continue;
    if (!deptGroups.has(code)) {
      deptGroups.set(code, []);
    }
    deptGroups.get(code).push({ id, ...person });
  }

  // 5b. For each dept, find highest-ranked person (lowest CATEGORY_RANK)
  const deptHeads = new Map();
  for (const [code, members] of deptGroups) {
    let bestMember = null;
    let bestRank = Infinity;
    for (const member of members) {
      const rank = CATEGORY_RANK[member.Category] ?? Infinity;
      if (rank < bestRank) {
        bestRank = rank;
        bestMember = member;
      }
    }
    if (bestMember) {
      deptHeads.set(code, bestMember);
    }
  }

  // 5c. That person's manager's DeptCode = parent department
  // Build department adjacency: parentDeptCode -> [childDeptCode]
  const deptParent = new Map();
  let rootDeptCode = null;

  for (const [code, head] of deptHeads) {
    if (!head.ManagerId) {
      // Root person's dept is root dept
      rootDeptCode = code;
      deptParent.set(code, null);
      continue;
    }

    const manager = personMap.get(head.ManagerId);
    if (!manager) {
      deptParent.set(code, null);
      continue;
    }

    const managerDeptCode = manager.DeptCode;

    // Edge case: if manager is in the same dept, this dept has no cross-dept link
    if (managerDeptCode === code) {
      deptParent.set(code, null);
      if (rootDeptCode === null) rootDeptCode = code;
    } else {
      deptParent.set(code, managerDeptCode);
    }
  }

  // Handle ambiguous dept parent: if multiple highest-ranked in a dept point
  // to different parent depts, use the one with strictly higher category.
  // Already handled above by selecting single best-ranked member.

  // 5d. Build department tree, compute DeptAncestorPath via BFS from root dept
  const deptAncestorPaths = new Map();

  if (rootDeptCode) {
    const deptQueue = [rootDeptCode];
    deptAncestorPaths.set(rootDeptCode, rootDeptCode);

    while (deptQueue.length > 0) {
      const currentCode = deptQueue.shift();
      const currentPath = deptAncestorPaths.get(currentCode);

      for (const [childCode, parentCode] of deptParent) {
        if (parentCode === currentCode && !deptAncestorPaths.has(childCode)) {
          deptAncestorPaths.set(childCode, currentPath + '|' + childCode);
          deptQueue.push(childCode);
        }
      }
    }
  }

  // Handle any depts that weren't reachable from root dept (orphan dept trees)
  for (const code of deptGroups.keys()) {
    if (!deptAncestorPaths.has(code)) {
      deptAncestorPaths.set(code, code);
    }
  }

  // 6. Assign DeptAncestorPath to each person
  // Direct members: deptPath; subdivision members: deptPath|subDivCode
  const personDeptPaths = new Map();
  for (const [id, person] of personMap) {
    const deptPath = deptAncestorPaths.get(person.DeptCode) || person.DeptCode;
    if (person.SubDivCode) {
      personDeptPaths.set(id, deptPath + '|' + person.SubDivCode);
    } else {
      personDeptPaths.set(id, deptPath);
    }
  }

  // 7. Compute Depth for each person: number of '|' separators in AncestorPath
  const personDepths = new Map();
  for (const [id] of personMap) {
    const path = ancestorPaths.get(id) || '';
    const separators = path.split('|').length - 1;
    personDepths.set(id, String(separators));
  }

  // 8. Full refresh: delete all then batch-create in groups of 5
  await listApi.deleteALLItems();

  const records = [];
  for (const [id, person] of personMap) {
    records.push({
      ...person,
      AncestorPath: ancestorPaths.get(id) || id,
      DeptAncestorPath: personDeptPaths.get(id) || person.DeptCode,
      Depth: personDepths.get(id) || '0',
    });
  }

  const total = records.length;
  let success = 0;
  let failed = 0;
  const batchSize = 5;

  for (let i = 0; i < total; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(record => listApi.createItem(record))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        success++;
      } else {
        failed++;
        errors.push(result.reason?.message || 'Unknown write error');
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total);
    }
  }

  return { success, failed, errors };
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Single person lookup by employee ID (Title field).
 * @param {string} id - Employee ID
 * @returns {Promise<Object|null>}
 */
export async function getEmployee(id) {
  const [emp] = await listApi.getItemByTitle(id);
  return emp || null;
}

/**
 * All members of a department (indexed DeptCode query).
 * @param {string} deptCode
 * @returns {Promise<Array>}
 */
export async function getTeamMembers(deptCode) {
  return listApi.getItems({ DeptCode: deptCode });
}

/**
 * All dept codes under a given dept ancestor path (for visibility scoping).
 * Returns array of unique DeptCode values from descendants.
 * @param {string} deptAncestorPath
 * @returns {Promise<string[]>}
 */
export async function getTeamScope(deptAncestorPath) {
  const descendants = await listApi.getItems({
    DeptAncestorPath: { value: deptAncestorPath + '|', operator: 'BeginsWith' },
  });
  const codes = new Set(descendants.map(d => d.DeptCode));
  // Also add subdivision codes where present
  descendants.forEach(d => { if (d.SubDivCode) codes.add(d.SubDivCode); });
  // Include the dept's own code (extract last segment before any subdivision)
  const ownCode = deptAncestorPath.split('|').pop();
  codes.add(ownCode);
  return [...codes];
}

/**
 * Immediate subordinates (indexed ManagerId query).
 * @param {string} managerId - Employee ID of the manager
 * @returns {Promise<Array>}
 */
export async function getDirectReports(managerId) {
  return listApi.getItems({ ManagerId: managerId });
}

/**
 * All people below a given employee (all levels) via BeginsWith on AncestorPath.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
export async function getDescendants(employeeId) {
  const emp = await getEmployee(employeeId);
  if (!emp) return [];
  return listApi.getItems({
    AncestorPath: { value: emp.AncestorPath + '|', operator: 'BeginsWith' },
  });
}

/**
 * Full management chain upward -- parses AncestorPath, batch queries.
 * Returns ancestors sorted from root (CEO) to the employee themselves.
 * @param {string} employeeId
 * @returns {Promise<Array>}
 */
export async function getAncestors(employeeId) {
  const emp = await getEmployee(employeeId);
  if (!emp) return [];
  const ids = emp.AncestorPath.split('|');
  if (ids.length <= 1) return [emp]; // root, no ancestors
  const ancestors = await listApi.getItems({
    Title: { value: ids, operator: 'Or' },
  });
  // Sort by path order (CEO first)
  const idOrder = new Map(ids.map((id, i) => [id, i]));
  return ancestors.sort((a, b) => (idOrder.get(a.Title) ?? 0) - (idOrder.get(b.Title) ?? 0));
}

/**
 * Lightweight: returns management chain IDs from an ancestor path string.
 * No SP query needed.
 * @param {string} ancestorPath
 * @returns {string[]}
 */
export function getManagementChainIds(ancestorPath) {
  return ancestorPath ? ancestorPath.split('|') : [];
}

/**
 * Full dataset -- all employees.
 * @returns {Promise<Array>}
 */
export async function getAllEmployees() {
  return listApi.getItems(undefined, { limit: Infinity });
}

/**
 * Lookup employee(s) by email (indexed Email query).
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getByEmail(email) {
  const results = await listApi.getItems({ Email: email });
  return results.filter(item => item.Email === email);
}

/**
 * Updates the AppRole override for an employee.
 * @param {string} employeeId - Employee ID (Title field)
 * @param {string} appRole - New AppRole value ('' to clear override)
 * @returns {Promise<void>}
 */
export async function updateEmployeeRole(employeeId, appRole) {
  const emp = await getEmployee(employeeId);
  if (!emp) throw new SystemError('NotFound', `Employee ${employeeId} not found`);
  await listApi.updateItem(emp.Id, { AppRole: appRole }, emp['odata.etag']);
}

/**
 * Derives application roles from an OrgHierarchy employee record.
 * Priority: AppRole override > Category-based > default colaborador.
 * @param {Object|null} employee
 * @returns {string[]}
 */
export function deriveRoles(employee) {
  if (!employee) return ['colaborador'];
  const appRole = employee.AppRole || '';
  const category = employee.Category || '';

  if (appRole === 'mentor' || MENTOR_DEPT_OUIDS.includes(employee.DeptCode))
    return ['mentor'];
  if (appRole === 'gestor') return ['gestor'];

  if (GESTOR_CATEGORIES.includes(category)) return ['gestor'];

  return ['colaborador'];
}

// ---------------------------------------------------------------------------
// Governance OUID mapper (moved from equipas-api.js)
// ---------------------------------------------------------------------------

/**
 * Resolves the governance-level (depth 1) OUID for any OUID.
 * Used for mentor/gestor routing.
 * @param {string} ouid
 * @returns {string}
 */
export function getGovernanceOUID(ouid) {
  const prefix = ouid.split('-')[0];
  const govMap = {
    COM: 'COM-GOV',
    OPS: 'OPS-GOV',
    ITD: 'ITD-GOV',
    FIN: 'FIN-GOV',
    RSK: 'RSK-GOV',
    STR: 'STR-GOV',
    LEG: 'LEG-JRI',
    CEO: 'CEO-GOV',
  };
  return govMap[prefix] || ouid;
}
