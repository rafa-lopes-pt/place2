# Critical Constraints

Hard rules that apply to all SPARC work. Violations cause runtime failures or security issues.

---

## Environment

- NO npm/build process available on client environment
- NO access to CDN or external web resources -- 100% local content
- NO external dependencies at runtime -- everything bundled
- SharePoint REST API is the only available backend
- Microsoft Edge is the only supported browser (corporate environment)

## Component Children

- NEVER bypass SPARC's component API by manipulating `.instance` contents directly (innerHTML, appendChild, etc.)
- ALWAYS use the `.children` setter for updating component content
- The `.children` setter triggers proper re-rendering, lifecycle management, and event cleanup

## SharePoint Data

- EVERYTHING in SharePoint Lists is stored as strings
- ALL validation happens in SPARC via Zod -- never rely on SharePoint choice fields or native validation
- SharePoint is data storage + authentication only -- SPARC owns all UI, routing, and business logic

## Scoping

- All route code (functions, constants, variables) MUST live inside the `defineRoute` callback
- No top-level declarations outside the callback (except `import` statements)
- Violating this leaks memory -- the Router cannot clean up references held outside the callback

## Error Handling

- NEVER throw plain `Error` -- always use `SystemError` from the error-handling module
- `SystemError` constructor: `new SystemError(name, message, options?)` where `options.breaksFlow` defaults to `true`
- Set `breaksFlow: false` for recoverable errors that should not trigger the BreakingErrorDialog
- The ErrorBoundary depends on `SystemError` properties (name, timestamp, breaksFlow) -- plain `Error` bypasses this
- `breaksFlow: true` -- ErrorBoundary shows the BreakingErrorDialog (full-screen, blocks interaction)
- `breaksFlow: false` -- ErrorBoundary auto-shows `Toast.error()` with the error message (non-intrusive notification)
