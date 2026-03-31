# Organizational Hierarchy: Unified List with Dual Materialized Paths

## Status: IMPLEMENTED

Commit `52f6eb0` -- `Replace Equipas list with OrgHierarchy dual materialized paths`

## Context

The project needs hierarchy lookups for initiative visibility and validation workflows:
- **Visibility**: team members of the impacted team can view; managers of ancestor departments can view; the submitter can view
- **Validation**: managers above the impacted team's head must validate initiatives
- **Team selection**: dropdown showing "Responsible | Department | Subdivision" for impacted team selection
- **Team membership**: who is on a given team/subdivision

A single `OrgHierarchy` list **replaces the old `Equipas` list**, storing one row per employee with two pre-computed materialized paths -- one for person management chains, one for department/subdivision hierarchy. All data is derived from a single CSV import (hierarchy.ods).

## Key Design Decisions

- **Single list replaces Equipas**: OrgHierarchy stores person-level records with dept hierarchy inferred from management chains, eliminating the separate Equipas department list
- **Dual materialized paths**: `AncestorPath` (person chain) for validation routing, `DeptAncestorPath` (dept/subdivision chain) for initiative visibility scoping
- **Note fields for paths**: Real department codes exceed 6 chars; Note fields have no length limit (but cannot be indexed). Acceptable for orgs under 5000 employees -- BeginsWith queries still work
- **Full refresh strategy**: CSV is a complete snapshot. Import = `deleteALLItems()` + batch re-create in groups of 5 via `Promise.allSettled`
- **Dept hierarchy inferred from management chains**: No `ParentDeptCode` in CSV. Each dept's parent is determined by finding the highest-ranked person in the dept and looking at their manager's DeptCode

## Data Model

### SharePoint List: `OrgHierarchy`

| Field | Type | Indexed | Purpose |
|---|---|---|---|
| Title | Text | Yes | Employee ID (Pessoa). Primary key. |
| FullName | Text | No | Full name |
| ShortName | Text | No | Abbreviated name |
| DeptCode | Text | Yes | Department OUID (e.g., `RSK-CCT`) |
| DeptName | Text | No | Department description |
| SubDivCode | Text | No | Subdivision code (empty if no subdivision) |
| SubDivName | Text | No | Subdivision name (empty if no subdivision) |
| Category | Text | No | Role level (Executive, Top Management, Management, Team Leader, Expert - Technical Lead, Technician) |
| ManagerId | Text | Yes | Direct manager's employee ID. Empty for CEO. |
| ManagerName | Text | No | Manager name (denormalized for display) |
| AncestorPath | Note | No | Person mgmt chain from CEO: `154895\|475760\|838047\|675613` |
| DeptAncestorPath | Note | No | Dept+subdivision chain from root: `CEO-GOV\|RSK-GOV\|RSK-REG\|RSK-CCT\|098asdhj7` |
| Depth | Text | No | Management depth (CEO = 0) |

3 indexed columns (Title, DeptCode, ManagerId). Paths are Note fields (unindexed).

### How the paths work

```
Guillaume (154895), CEO-GOV:
  AncestorPath:     154895
  DeptAncestorPath: CEO-GOV

Justino (475760), RSK-GOV:
  AncestorPath:     154895|475760
  DeptAncestorPath: CEO-GOV|RSK-GOV

Hugo (838047), RSK-REG:
  AncestorPath:     154895|475760|838047
  DeptAncestorPath: CEO-GOV|RSK-GOV|RSK-REG

Sonia (675613), RSK-CCT:
  AncestorPath:     154895|475760|838047|675613
  DeptAncestorPath: CEO-GOV|RSK-GOV|RSK-REG|RSK-CCT

Maria Joana (675578), RSK-CCT, subdivision Analytics (098asdhj7):
  AncestorPath:     154895|475760|838047|675613|675578
  DeptAncestorPath: CEO-GOV|RSK-GOV|RSK-REG|RSK-CCT|098asdhj7
```

People in a subdivision get the subdivision code appended to their DeptAncestorPath. People directly in the department (no subdivision) stop at the department code. `BeginsWith "...|RSK-CCT"` matches BOTH direct members and subdivision members.

### Category ranking (for determining department heads)

Executive > Top Management > Management > Team Leader > Expert - Technical Lead > Technician

### Subdivisions as team levels

Subdivisions (Polo/Divisao) are organizational units within departments:
- Have their own code (`SubDivCode`) and name (`SubDivName`)
- Appear as the deepest level in `DeptAncestorPath`
- `BeginsWith "...|RSK-CCT"` returns everyone (direct + subdivision members)
- `BeginsWith "...|RSK-CCT|098asdhj7"` returns only the subdivision

## Implemented API

**File**: `site/SiteAssets/app/utils/org-hierarchy-api.js`

### Import function

`importFromCSV(csvContent, onProgress)` -- returns `Promise<{ success, failed, errors }>`

Algorithm:
1. Parse CSV with `parseCSV` from nofbiz.excelparser
2. Build person adjacency map, validate uniqueness/manager refs/single root
3. Detect cycles via BFS from root -- unreachable nodes abort import
4. Compute person `AncestorPath` via BFS
5. Infer department hierarchy: group by DeptCode, find highest-ranked per dept, trace to parent dept via manager's DeptCode
6. Compute `DeptAncestorPath` per department via BFS, assign to persons (with SubDivCode suffix where applicable)
7. Compute `Depth` from AncestorPath separator count
8. Full refresh: `deleteALLItems()` then batch-create in groups of 5

### Query functions

| Function | Signature | Query | Use Case |
|---|---|---|---|
| `getEmployee` | `(id) -> Promise<Object\|null>` | `getItemByTitle(id)` | Single person lookup |
| `getTeamMembers` | `(deptCode) -> Promise<Array>` | `DeptCode Eq` | All members of a department |
| `getTeamScope` | `(deptAncestorPath) -> Promise<string[]>` | `DeptAncestorPath BeginsWith` | All dept/subdivision codes under a dept path |
| `getDirectReports` | `(managerId) -> Promise<Array>` | `ManagerId Eq` | Immediate subordinates |
| `getDescendants` | `(employeeId) -> Promise<Array>` | `AncestorPath BeginsWith "path\|"` | All people below (all levels) |
| `getAncestors` | `(employeeId) -> Promise<Array>` | Parse path, `Title Or` batch | Full chain upward (sorted CEO-first) |
| `getManagementChainIds` | `(ancestorPath) -> string[]` | String split only | Lightweight: IDs only, no SP query |
| `getAllEmployees` | `() -> Promise<Array>` | No filter, `limit: Infinity` | Full dataset |
| `getGovernanceOUID` | `(ouid) -> string` | Static map | Governance-level OUID for mentor/gestor routing |

### Use case queries

**Initiative visibility** (app logic in routes, not in API):
1. Get current user's `DeptAncestorPath` via `getTeamMembers(userOUID)`
2. `getTeamScope(deptAncestorPath)` to get all descendant dept codes
3. Query initiatives: `{ ImpactedTeamOUID: { value: scope, operator: 'Or' } }`

**Validation routing**:
1. `getAncestors(employeeId)` for full management chain
2. App logic determines which ancestors qualify as validators

**Management chain**: `getManagementChainIds(ancestorPath)` for IDs, `getAncestors(id)` for full records

## Files Changed

| File | Action |
|---|---|
| `site/SiteAssets/app/utils/org-hierarchy-api.js` | **Created** -- unified query API + import logic + getGovernanceOUID |
| `site/sharepointContext.js` | **Edited** -- replaced Equipas mock data with OrgHierarchy (14 employees across CEO, RSK, OPS, COM branches) |
| `site/SiteAssets/app/utils/routing-rules.js` | **Edited** -- import switched from `equipas-api.js` to `org-hierarchy-api.js` |
| `site/SiteAssets/app/routes/departamento/route.js` | **Edited** -- uses `getTeamMembers` + `getTeamScope` instead of old `getDepartment` + `AllDescendants` |
| `site/SiteAssets/app/utils/equipas-api.js` | **Deleted** -- all exports now in org-hierarchy-api.js |

## CSV Column Mapping

Source: `hierarchy.ods` (converted to CSV for parsing)

| CSV Column | SP Field |
|---|---|
| `Pessoa` | Title (employee ID) |
| `Nome` | FullName |
| `Nome Abreviado` | ShortName |
| `Departamento (Codigo)` | DeptCode |
| `Departamento` | DeptName |
| `Polo/Divisao` | SubDivName |
| `Sub-divisao (Codigo)` | SubDivCode |
| `Categoria (Descricao)` | Category |
| `Manager` | ManagerId |
| `Nome Manager` | ManagerName |
| (computed from Manager chain) | AncestorPath |
| (computed: inferred dept hierarchy + optional SubDivCode) | DeptAncestorPath |
| (computed from AncestorPath depth) | Depth |

## Mock Data Coverage

The `sharepointContext.js` mock includes 14 employees across 3 branches:

- **CEO**: Guillaume (154895) -- root
- **RSK branch**: Justino, Cecilia, Ana, Hugo, Sonia, Maria Joana (with subdivision `098asdhj7`), Pedro, Marco
- **OPS branch**: Ana Sofia, Gustavo, Amadeu, Joana Rosa
- **COM branch**: Joao Pedro

## Edge Case Handling

- **Empty CSV**: Early return `{ success: 0, failed: 0, errors: ['CSV is empty'] }` -- existing data preserved
- **Duplicate IDs**: First occurrence kept, subsequent flagged in errors
- **Missing manager ref**: Validation error, import aborts (no data deleted)
- **Multiple roots**: Detected and aborted
- **Cycles/unreachable nodes**: BFS reachability check from root; unreachable nodes abort import
- **Ambiguous dept parent**: Resolved by selecting the single highest-ranked member per dept
- **Orphan dept trees**: Depts unreachable from root dept get their own code as path (graceful fallback)

## Verification

1. Run the app locally (`site/SitePages/index.html`)
2. Open browser console: `SPInterceptor.store.lists.OrgHierarchy`
3. Test queries:
   - `getEmployee('675578')` -- returns Maria Joana with both paths and subdivision fields
   - `getTeamScope('CEO-GOV|RSK-GOV')` -- returns descendant dept codes under RSK
   - `getTeamMembers('RSK-CCT')` -- returns all CONDUCT & CONTROL members (including subdivision)
   - `getAncestors('675578')` -- returns chain: Guillaume -> Justino -> Hugo -> Sonia -> Maria Joana
   - `getDirectReports('675613')` -- returns Sonia's direct reports
   - `getDescendants('475760')` -- returns all people under Justino
4. Test import: convert hierarchy.ods to CSV, call `importFromCSV`, verify items created
5. Verify departamento route loads correctly with new API
