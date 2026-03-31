# place

SPARC application for SharePoint on-premises. Built on the SPARC framework.

## Framework Reference

- **SPARC guide**: `.claude/sparc-guide.md` -- comprehensive architecture, patterns, APIs
- **Framework rules**: `.claude/rules/` -- critical constraints (environment, lifecycle, data)
- **Type definitions**: `site/SiteAssets/app/libs/nofbiz/nofbiz.base.d.ts` -- component API signatures
- **Bundled output**: `site/SiteAssets/app/libs/nofbiz/` (update with `sparc-update-dist`)

## Directory Structure

```
site/
  jquery.js                          # jQuery (from SPARC sandbox)
  sharepointContext.js               # Mock _spPageContextInfo for local dev
  spInterceptor.js                   # Offline dev mock API
  SitePages/
    index.html                       # Entry HTML
  SiteAssets/
    app/
      index.js                       # App entry: pageReset, Router, CurrentUser
      libs/
        nofbiz/                      # SPARC dist (updated via sparc-update-dist)
      css/                           # Shared stylesheets
      routes/
        route.js                     # Home route (/)
        <group>/
          <name>/
            route.js                 # Nested route
            route.css                # Route-specific overrides only
        <group>/utils/               # Utilities scoped to route group
      utils/                         # Global utilities (shared across route groups)
```

## Import Paths

All imports come from the bundled SPARC dist file. Path depth depends on file location:

| File Location | Import Path |
|---|---|
| `SiteAssets/app/index.js` | `./libs/nofbiz/nofbiz.base.js` |
| `SiteAssets/app/utils/*.js` | `../libs/nofbiz/nofbiz.base.js` |
| `SiteAssets/app/routes/route.js` | `../libs/nofbiz/nofbiz.base.js` |
| `SiteAssets/app/routes/<group>/<name>/route.js` | `../../../libs/nofbiz/nofbiz.base.js` |

## Route Conventions

- Every route exports `defineRoute` as default
- ALL code (functions, constants, variables) lives inside the `defineRoute` callback
- Only `import` statements go outside the callback
- Violating scoping leaks memory -- the Router cannot clean up references outside the callback
- Route files: `route.js` and optionally `route.css` for route-specific overrides

## State Management

- **FormField**: for data the user interacts with (forms, filters, selections) -- provides reactivity via `subscribe()`
- **Plain variables**: for read-only data (fetched records, config values, lookup tables)
- FormField adds overhead (cloneDeep, subscriber notification) -- only use when reactivity is needed

## Error Handling

- NEVER throw plain `Error` -- always use `SystemError` from the error-handling module
- `new SystemError(name, message, options?)` where `options.breaksFlow` defaults to `true`
- Set `breaksFlow: false` for recoverable errors
- Use `Toast.error()` for user-facing error messages
- Use `Dialog` for confirmations and blocking prompts

## SharePoint Data Rules

- Everything in SharePoint Lists is stored as strings
- All validation happens in SPARC via Zod
- Only create Text or Note fields (never other SP field types)
- User identifiers: UserIdentity for user references (auto-serialized, `fromField()` to read back)
- Index columns used as CAML query filters
- `ListApi.getItems()` uses CAML queries, NOT REST filter syntax

## Component Rules

- NEVER manipulate `.instance` contents directly (innerHTML, appendChild, etc.)
- ALWAYS use the `.children` setter for updating content
- ALWAYS call `removeAllEventListeners()` in `remove()`
- Check `isAlive` before DOM operations on a component

## Mock Data for Local Development

The offline development environment uses three files (load order matters):

1. `sharepointContext.js` -- defines `_spPageContextInfo` (SharePoint context) and `_spMockData` (seed data). **Project-specific, never overwritten by updates.**
2. `spInterceptor.js` -- intercepts jQuery AJAX calls and returns mock responses from an in-memory store. Reads `_spMockData` on initialization. **Framework-owned, updated by `sparc-update-dist`.**
3. App code (`index.js`) -- imports SPARC modules and initializes the application.

### Adding Seed Data

Edit `sharepointContext.js` and uncomment/populate the `_spMockData` sections:

- `user` -- partial override of mock user identity (Title, Email)
- `profile` -- partial override of user profile (deep merge)
- `groups` -- full replacement of mock SharePoint groups
- `lists` -- pre-populate lists with items, fields, and nextId

Each list entry needs `items` (array), `fields` (array), and `nextId` (next auto-increment ID).

### Runtime API

`SPInterceptor.store` is available globally at runtime:
- `SPInterceptor.store.lists` -- inspect/modify mock list data from the browser console
- `SPInterceptor.logging = false` -- suppress console output
- `SPInterceptor.register(method, test, handler)` -- add custom endpoint handlers

## Agent Delegation

Development and review tasks must be delegated to agents via the Task tool. See `.claude/rules/agent-delegation.md` for full rules.

| Agent | Use when... |
|-------|------------|
| `sparc-app-base` | Building routes, forms, components, navigation, SP integration |
| `sparc-app-analytics` | Building analytics dashboards with chart components |
| `sparc-app-excel` | Building CSV import/export and data analysis |
| `sparc-app-reviewer` | Reviewing app code for DRY, scoping, structure |
| `lss-reviewer` | Evaluating process efficiency and workflow |
| `non-technical-reviewer` | Evaluating usability from end-user perspective |

## Inline Skills

These run directly in the orchestrator conversation (no Task delegation):

| Skill | Use when... |
|-------|------------|
| `sharepoint-advisor` | SP list design, permissions, deployment, data modeling |
| `claude-config-manager` | Auditing/maintaining .claude/ config, agents, rules, CLAUDE.md |
