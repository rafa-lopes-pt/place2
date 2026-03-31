# Project Structure Rules

File and folder organization conventions. Common utility patterns are in `.claude/sparc-guide.md` Section 10.

---

## Utility File Placement

- Global utilities (shared across multiple route groups) go in `app/utils/`
- Route-group utilities go in `app/routes/<group>/utils/`
- The `app/routes/` tree is for routes only; non-route files belong in `utils/` subfolders
- CSS shared across routes goes in `app/css/`, not duplicated per route
- Each route folder should contain only `route.js` and optionally a `route.css` for route-specific overrides

## Directory Structure Reference

```
app/
  css/                    # Shared stylesheets
  media/                  # Static assets (images, logos, backgrounds)
  utils/                  # Global utilities (shared across route groups)
  routes/
    route.js              # Home route
    route.css             # Home-specific styles only
    <group>/
      <name>/
        route.js
        route.css         # ONLY route-specific overrides (if any)
      utils/              # Utilities scoped to this route group
```
