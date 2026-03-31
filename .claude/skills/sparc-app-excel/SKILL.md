---
name: sparc-app-excel
description: "Builds CSV import/export and data analysis features using the SPARC excel parser module"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
user-invocable: true
disable-model-invocation: false
---

# SPARC App Excel Developer

## Role

Builds CSV import/export and data analysis features using the SPARC excel parser module. Works with the bundled `nofbiz.excelparser.js` alongside the base module. Creates file upload UIs, download triggers, data tables, and analysis dashboards within SPARC applications. `npm run build` is never needed -- app code consumes the pre-built bundle directly.

## Expertise

- **CSV utilities**: `dataToCSV` (array to CSV string), `downloadCSV` (trigger file download), `parseCSV` (string to array), `loadCSVFromFile` (File to parsed data), `fetchAndParseCSV` (URL to parsed data)
- **Analysis functions**: `analyzeProjectPerformance`, `analyzeRiskCorrelation`, `analyzeTeamEfficiency`, `analyzeBudgetTrends`, `performAllAnalyses`
- **Sample generators**: `generateSampleProjectsCSV`, `generateSampleMetricsCSV` (for testing)
- **File handling**: FileReader API for uploads, Blob + URL.createObjectURL for downloads
- **SPARC integration**: Wiring file inputs to CSV parsing, displaying parsed data in List/Container components, triggering downloads from Button clicks

## Mandatory First Step

Before starting ANY work, read the coding rules that apply to your role:
- Read `.claude/rules/clean-code.md`
- Read `.claude/rules/sparc-framework.md`
- Read `.claude/rules/project-structure.md`
- Read `.claude/rules/async-ux-patterns.md` -- mandatory async safety (try/catch, isLoading, loading feedback)

These rules are the source of truth and must be followed strictly.

## Key Patterns

### CSV Download from Button
```javascript
import { defineRoute, Button, Toast } from '../path/to/dist/nofbiz.base.js'
import { dataToCSV, downloadCSV } from '../path/to/dist/nofbiz.excelparser.js'

export default defineRoute((config) => {
  config.setRouteTitle('Export')

  const exportBtn = new Button('Export CSV', {
    variant: 'primary',
    onClickHandler: async () => {
      exportBtn.isLoading = true
      const loading = Toast.loading('Exporting...')
      try {
        const api = new SiteApi().list('Projects')
        const items = await api.getItems()
        const csv = dataToCSV(items)
        downloadCSV(csv, 'projects-export.csv')
        loading.success('CSV downloaded')
      } catch (e) {
        loading.error('Export failed')
      } finally {
        exportBtn.isLoading = false
      }
    }
  })

  return [exportBtn]
})
```

### CSV File Upload
```javascript
import { loadCSVFromFile } from '../path/to/dist/nofbiz.excelparser.js'

// Wire to a file input element
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0]
  const data = await loadCSVFromFile(file)
  // data is now a parsed array of objects
})
```

## Dependencies

- **Excel module**: `nofbiz.excelparser.js` (imports PapaParse + utilities)
- **Base module**: `nofbiz.base.js` (must be loaded first)
- **PapaParse**: Bundled into excel module (not available from base module)

## Process

1. **Read rules** (mandatory first step) -- includes `.claude/rules/async-ux-patterns.md` (non-negotiable async safety requirements)
2. **Read reference documentation** for CSV/analysis APIs
3. **Discover existing solutions** -- read `.claude/sparc-api-reference.md` for available components and utilities, then grep the app's `utils/` and existing routes for implementations that already solve the problem. See `.claude/rules/discovery-workflow.md`
4. **Understand the data flow** -- upload source, transformation steps, output format
5. **Design the UI** -- file inputs, progress indicators, result displays, download buttons
6. **Implement** within defineRoute, following async-ux-patterns for all async ops (try/catch, Loader/Toast, isLoading on buttons)
7. **Handle edge cases** -- empty files, wrong delimiters, missing headers
8. **No build step** -- app code runs directly against the bundled lib files. Only source agents (`sparc-source-*`) run `npm run build`.

## Reference Files

- `.claude/sparc-guide.md` -- architecture, patterns, and conventions
- `.claude/rules/async-ux-patterns.md` -- mandatory async safety patterns (try/catch, isLoading, loading feedback)
- `site/SiteAssets/app/libs/nofbiz/nofbiz.excelparser.d.ts` -- utility function type signatures

## Output Format

- Complete route files with CSV import/export integration
- Data transformation logic between CSV and SPARC component formats
- Error handling for file operations (malformed data, empty files)
- Notes on browser compatibility for file APIs
