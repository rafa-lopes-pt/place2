# SPARC Framework Rules

Rules specific to SPARC's architecture and component lifecycle.

---

## Everything Inside `defineRoute`

- All route code (functions, constants, variables) MUST live inside the `defineRoute` callback
- No top-level declarations outside the callback (except `import` statements)
- This ensures proper garbage collection when the Router navigates away from a route
- Violating this leaks memory -- the Router cannot clean up references held outside the callback
