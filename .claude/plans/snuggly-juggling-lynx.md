# Admin Route: Add Hierarchy Viewer Tabs

## Context

The admin route currently handles CSV import for OrgHierarchy. The user wants to also **view** the imported hierarchy -- both by team (department structure) and by person (reporting chain). This makes admin the single management hub: import data, then verify it visually.

## File to modify

| File | Action |
|---|---|
| `site/SiteAssets/app/routes/admin/route.js` | **Modify** -- wrap existing import UI in TabGroup, add two new tabs |

No new files. No CSS needed -- AccordionItem/AccordionGroup provide collapsible tree UX with built-in SPARC styling.

## Approach: TabGroup with 3 tabs

Use SPARC's `TabGroup` component to organize the admin route into three tabs. Each tab gets a `View` as its content panel.

| Tab key | Label | Content |
|---|---|---|
| `import` | `Importar` | Existing import UI (file select, confirmation, progress, results) |
| `teams` | `Equipas` | Department tree -- AccordionItems nested by DeptAncestorPath |
| `people` | `Colaboradores` | Person tree -- AccordionItems nested by ManagerId |

## New imports

Add to the existing import line:

```js
import {
  Text, Container, Button, Dialog, Toast, View, TabGroup,
  AccordionGroup, AccordionItem, defineRoute,
} from '../../libs/nofbiz/nofbiz.base.js';
```

## Layout structure

```
ctaBanner         (always visible -- title, description)
statsRow          (always visible -- KPI with employee count)
tabGroup          (3 tabs, replaces direct uploadSection/resultView)
  importView:     uploadSection + resultView (existing import logic)
  teamsView:      department tree
  peopleView:     person tree
```

The ctaBanner and statsRow remain above the tabs for persistent context.

## Teams tab (department tree)

Build a recursive tree of `AccordionItem` components using department hierarchy:

1. Group all employees by `DeptCode`
2. For each unique dept, extract parent dept from `DeptAncestorPath` (second-to-last segment, stripping SubDivCode suffix)
3. Build children map: `parentDeptCode -> [childDeptCodes]`
4. Recursively create AccordionItems:
   - Header: `"DeptName (DeptCode) -- X colaboradores"`
   - Body: member rows (Text per member: `"FullName -- Category"`) + child dept AccordionItems

Root dept (no parent) is the top-level AccordionItem. Wrap in AccordionGroup with `allowMultipleOpen: true`.

**Member rows inside each department**: simple Text elements (`"FullName -- Category"`), displayed as `type: 'p'`. The AccordionItem body provides padding/indentation.

## People tab (person tree)

Build a recursive tree of `AccordionItem` components using reporting relationships:

1. Build children map: `managerId -> [employee objects]`
2. Find root (employee with no ManagerId)
3. Recursively create nodes:
   - **Branch node** (has direct reports): `AccordionItem` with header `"FullName (Category, DeptName) -- X subordinados"` and children = recursive nodes for each report
   - **Leaf node** (no reports): `Text` element `"FullName -- Category, DeptName"` with `type: 'p'`

Root person is the top-level AccordionItem.

## Data flow

- `getAllEmployees()` is called once on init (existing behavior for stats)
- Store result in `allEmployees` variable for reuse by all three views
- Both tree views are built immediately after data loads
- After successful import: re-fetch `getAllEmployees()`, rebuild stats + both tree views

### Rebuild function

```js
function rebuildViews(employees) {
  // Update stats
  statsRow.children = [buildKpi(String(employees.length), 'Colaboradores na hierarquia')];
  // Rebuild trees
  teamsView.children = [buildDeptTree(employees)];
  peopleView.children = [buildPeopleTree(employees)];
}
```

Called on init and after import success.

## Tree builder functions (inside defineRoute)

### `buildDeptTree(employees)`

```
1. Group employees by DeptCode -> Map<string, employee[]>
2. For each unique DeptCode, extract:
   - DeptName (from any member)
   - Parent DeptCode: parse DeptAncestorPath, strip SubDivCode if last segment matches, take second-to-last segment
3. Build deptChildren map: parentCode -> [childCodes]
4. Find root dept (parentCode is null)
5. Recursive buildDeptNode(deptCode):
   - members = employees in this dept, sorted by Category rank then FullName
   - memberRows = members.map(emp -> Text("FullName -- Category", { type: 'p' }))
   - childNodes = deptChildren[deptCode].map(buildDeptNode)
   - Return AccordionItem(headerString, [...memberRows, ...childNodes])
6. Wrap root in AccordionGroup([rootNode], { allowMultipleOpen: true })
```

### `buildPeopleTree(employees)`

```
1. Build childrenMap: managerId -> employee[], from ManagerId field
2. Find root (empty ManagerId)
3. Recursive buildPersonNode(emp):
   - reports = childrenMap[emp.Title] || [], sorted by FullName
   - If no reports: return Text("FullName -- Category, DeptName", { type: 'p' })
   - Else: return AccordionItem(headerString, reports.map(buildPersonNode))
4. Return AccordionGroup([buildPersonNode(root)], { allowMultipleOpen: true })
```

## Integration with existing import logic

The import flow remains unchanged. After a successful import in `runImport()`:
- Re-fetch employees: `const employees = await getAllEmployees()`
- Update `allEmployees = employees`
- Call `rebuildViews(employees)` to refresh stats + trees

## Verification

1. Open admin route in browser
2. Three tabs visible: "Importar", "Equipas", "Colaboradores"
3. "Importar" tab shows the existing import UI (file select, etc.)
4. "Equipas" tab shows department tree:
   - CEO-GOV accordion at top level
   - Expanding shows RSK-GOV, OPS-GOV, COM-GOV as nested accordions
   - Expanding RSK-GOV shows its sub-departments + direct members
   - Each leaf department lists its members
5. "Colaboradores" tab shows person tree:
   - Guillaume Nicolas (CEO) at top level
   - Expanding shows direct reports (Justino, Ana Sofia, Joao Pedro)
   - Each manager expands to show their reports recursively
   - Leaf employees are plain text rows
6. Import a new CSV -> verify both trees rebuild with new data
7. Stats KPI updates after import
