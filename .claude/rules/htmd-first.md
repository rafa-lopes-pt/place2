# HTMD Components First

SPARC provides tested, lifecycle-managed components (HTMD elements) for all standard UI needs. Raw HTML is an antipattern.

---

## Rule

- ALWAYS use SPARC HTMD components instead of raw HTML elements or native DOM APIs
- This applies to ALL UI: route content, navigation, forms, layout, display elements
- If a mockup or design requires UI that no existing HTMD component can fully implement, ASK the user how to proceed before writing any code -- do not silently fall back to raw HTML

## Why

HTMD components provide:
- Automatic lifecycle management (event cleanup, garbage collection on route change)
- Consistent BEM-based CSS classes for styling
- Built-in accessibility and interaction patterns
- Integration with SPARC's rendering pipeline (`_refresh()`, `.children` setter)
- Tested behavior in SharePoint on-premises environments (Edge compatibility)

Raw HTML bypasses all of this, creating memory leaks, broken event cleanup, and inconsistent styling.

## Component Selection Reference

| Need | HTMD Component | NOT |
|------|---------------|-----|
| Navigation link | `LinkButton` | `<a>` tag, raw `<link>` |
| Action button | `Button` | `<button>`, clickable `<div>` |
| Heading / paragraph / span | `Text` (with `type` prop) | `<h1>`, `<p>`, `<span>` |
| Text input | `TextInput` + `FormField` | `<input type="text">` |
| Multi-line text | `TextArea` + `FormField` | `<textarea>` |
| Number input | `NumberInput` + `FormField` | `<input type="number">` |
| Date picker | `DateInput` + `FormField` | `<input type="date">` |
| Checkbox | `CheckBox` + `FormField` | `<input type="checkbox">` |
| Dropdown / select | `ComboBox` + `FormField` | `<select>`, custom dropdown |
| People picker | `PeoplePicker` | Custom AD search |
| Label for input | `FieldLabel` | `<label>` |
| Image | `Image` | `<img>` |
| Layout wrapper | `Container` (with `as` for semantic tags) | `<div>`, `<section>`, `<nav>` |
| Card / panel | `Card` | Custom styled `<div>` |
| Tabs | `TabGroup` | Manual tab switching |
| Accordion | `AccordionGroup` + `AccordionItem` | Manual expand/collapse |
| Show/hide sections | `View` | jQuery `.show()`/`.hide()` |
| View switching | `ViewSwitcher` | Manual view toggling |
| Modal / overlay | `Modal` or `Dialog` | Custom overlay |
| Icon | `Icon` / `getIcon()` | Inline SVG, `<i>` tags |
| Ordered/unordered list | `List` | `<ul>`, `<ol>` |
| Grouped children without wrapper | `Fragment` | Returning bare arrays |

## When No Component Fits

If the design requires something not covered by any existing HTMD component:

1. Do NOT create raw HTML as a workaround
2. ASK the user: describe what the design needs and which components were considered
3. Possible outcomes the user may choose:
   - Compose existing components to approximate the design
   - Accept a simplified version using available components
   - Request a custom component (rare, requires careful lifecycle handling)
