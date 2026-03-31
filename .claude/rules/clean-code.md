# Clean Code Rules

General principles that apply to all code in all projects.

---

## DRY -- No Code Duplication

- Before writing ANY code (JS, CSS, HTML patterns), check if it already exists or can be shared
- Extract shared concerns into common files (CSS layouts, JS helpers, reusable patterns)
- Route-level `route.css` files must ONLY contain route-specific overrides, never shared styles
- If 2+ routes need the same styles, extract to a shared stylesheet
- Shared JS helpers belong in a common `utils/` location, not duplicated per route

## Constants Over Functions for Static Content

- If a helper produces the same output every time (no parameters, no dynamic data), declare it as a `const`
- Only use functions when the output varies based on input parameters
- Good: `const banner = new Container([...])`
- Bad: `function createBanner() { return new Container([...]) }`
- This makes the code's intent clear: constants are static, functions are dynamic
