# Component Lifecycle Rules

Rules governing how SPARC components are created, rendered, and destroyed.

---

## Rendering

- NO automatic re-rendering -- SPARC has no virtual DOM
- ALWAYS manually call `render()`, `_refresh()`, or `remove()`
- `_refresh()` does full DOM replacement: serializes to HTML string, `replaceWith` on the existing node, re-applies event listeners, re-renders children. No diffing.
- The `.children` setter triggers `_refresh()` internally -- it is the standard way to update component content
- Check `isAlive` before performing DOM operations on a component

## Event Cleanup

- ALWAYS call `removeAllEventListeners()` in `remove()` -- prevents memory leaks
- ALWAYS clean up children, timers, and intervals during component removal
- Event listeners remain attached even after DOM removal without explicit cleanup

## State

- Use FormField with `subscribe()` for data the user interacts with (forms, filters, selections)
- Use plain variables for read-only data (fetched user info, config values, lookup tables)
- FormField adds overhead (cloneDeep, subscriber notification) -- only use when reactivity is needed
- Call `dispose()` during component cleanup to clear all FormField subscribers and prevent memory leaks

## CSS

- All components auto-generate a BEM class: `${LIB_PREFIX}__componentname`
- A global CSS file can target all SPARC components via these predictable class names
- Only write component-specific CSS for unique/one-off styling (e.g., page layouts)
- The value of `LIB_PREFIX` may change in the future. SCSS files must use the `$lib-prefix` variable (supports interpolation: `#{$lib-prefix}__button`). Plain CSS must hardcode the current prefix value (`nofbiz`). The variable exists so changing it in one place updates all SCSS-generated selectors

## Direct DOM Access (.instance)

- `.instance` returns `JQuery<HTMLElement> | null` -- the jQuery-wrapped DOM element for this component
- Used extensively inside SPARC source code as the standard internal DOM access mechanism
- For application developers (route/app code): `.instance` should almost never be used directly. Prefer SPARC API methods (`.children`, `.render()`, `.remove()`, event methods) for all standard operations
- When `.instance` is necessary (reading dimensions, scroll position, focus, classList), treat it as an escape hatch -- direct DOM mutations (innerHTML, appendChild, id changes) bypass SPARC's lifecycle and cause orphaned event listeners or broken state
