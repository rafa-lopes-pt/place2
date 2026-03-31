# SPARC Framework - Comprehensive Guide

Reference guide for AI assistants working with the SPARC framework. Source code is the ultimate authority for component APIs -- this guide covers architecture, patterns, and conventions.

---

## Table of Contents

| # | Section | Lines | What's Here |
|---|---------|-------|-------------|
| 1 | Architecture Overview | 28-84 | Setup, environment constraints, high-level flow |
| 2 | Component System | 86-485 | All components, props, lifecycle, SidePanel, selection guide |
| 3 | Routing System | 487-594 | Router, defineRoute, navigation guards |
| 4 | State Management | 596-810 | FormField, FormSchema, ContextStore, subscribers |
| 5 | Building Components | 812-879 | Custom component authoring |
| 6 | SharePoint Integration | 881-1413 | ListApi, SiteApi, CurrentUser, RoleManager, UserIdentity, People API, CAML |
| 7 | Styling & CSS | 1415-1465 | SCSS tokens, BEM classes, theming |
| 8 | Utilities & Helpers | 1467-1562 | Bundled deps, escapeHtml, resolvePath |
| 9 | Common Patterns | 1564-1839 | Search/filter, data tables, CRUD, bulk ops, role-based UI, cascading dropdowns, polling |
| 10 | Quick Reference | 1841-2297 | Copy-paste patterns, async validators, nav guards, concurrency, common mistakes |
| 11 | Anti-Patterns | 2299-2523 | What NOT to do -- with correct alternatives |
| 12 | File Organization | 2525-2553 | Naming conventions |
| 13 | Development & Deployment | 2555-2594 | Build commands, deployment |
| 14 | Glossary | 2596-2615 | Term definitions |

Use `Read` with `offset` and `limit` to jump directly to the section you need.

## 1. Architecture Overview

### What is SPARC?

**SPARC** (SharePoint Application Rendering Core) is a TypeScript micro-framework for building single-page applications on SharePoint on-premises environments with severe deployment restrictions.

- Built in TypeScript, distributed as JavaScript bundles
- React-like component architecture without virtual DOM or lifecycle hooks
- Ships as modular bundles: base (core), analytics (D3 charts), excelparser (CSV/data)
- Treats SharePoint exclusively as a data store -- SPARC owns all UI, routing, validation, and business logic

### Core Philosophy

1. **Bypass SharePoint's Native UI** -- Lists for data, AD for auth, Designer for email workflows. Everything else is SPARC.
2. **Pure HTML/CSS/JavaScript** -- No npm at runtime, no CDN, no external frameworks. Works in completely restricted environments.
3. **Modern Patterns, No Build Step** -- Write TypeScript locally, bundle once with Rollup, deploy single `.js` + `.css` + `.d.ts` to SharePoint. Consumers write plain JavaScript with IDE autocomplete.
4. **Developer Experience First** -- Proper file structure, actual error messages with file/line numbers, IDE support via TypeScript definitions.

### High-Level Flow

```
SharePoint Page (media content webpart)
  loads index.html (imports dist/nofbiz.base.js)
    |
    v
SPARC Entry Point (index.js)
  await pageReset() -- removes SP chrome, adds #root, awaits theme CSS
  creates Router instance with route list
    |
    v
Router (Singleton)
  manages hash-based SPA navigation
  lazy-loads route content on demand
  wraps app in global ErrorBoundary
    |
    v
Individual Routes (route.js files)
  define content via defineRoute() factory
  compose components, handle route logic
    |
    v
Components (UI Building Blocks)
  SPARC base components (Button, TextInput, Card, etc.)
  Custom compositions (factory functions)
  Fragment/Container for layout
```

### Environment Constraints

- No npm/build process on client environment
- No CDN or external web resources -- 100% local bundles
- No server-side Node.js -- client-side JavaScript only
- SharePoint REST API is the only data channel
- Microsoft Edge only (corporate, locked-down policies, VPN/intranet)
- All SharePoint List data stored as strings -- validation via Zod in SPARC

---

## 2. Component System

### Component Hierarchy

```
HTMDElementInterface (interface)
    |
HTMDElement (abstract base class)
    |
    +-- Container Components: Container, Card, View, Modal, SidePanel
    +-- Form Components: TextInput, TextArea, NumberInput, DateInput, ComboBox, PeoplePicker, CheckBox, FieldLabel
    +-- Navigation: Button, LinkButton, TabGroup, ViewSwitcher, AccordionGroup, AccordionItem
    +-- Display: Text, List, Image, Icon
    +-- Feedback: Toast, Dialog, Loader, ErrorBoundary

Special cases:
    Fragment -- implements HTMDElementInterface but does NOT extend HTMDElement (no DOM wrapper)
    FormField -- state container, not a visual component
```

### Component Categories

| Category | Components |
|----------|-----------|
| Form | TextInput, TextArea, NumberInput, DateInput, ComboBox, PeoplePicker, CheckBox, FieldLabel |
| Container | Container, Card, View, Modal, SidePanel, Fragment |
| Navigation | Button, LinkButton, TabGroup, ViewSwitcher, AccordionGroup, AccordionItem |
| Display | Text, List, Image, Icon |
| Feedback | Toast (static methods), Dialog, Loader, ErrorBoundary |

### HTMDElement Base Class

All visual components inherit from `HTMDElement` (source: `src/base/DOM/abstracts/HTMDElement.abstract.ts`):

- Auto-generates UUID for each instance (`this.id`)
- Derives component name from class name (`this.name` = lowercase class name)
- Auto-generates BEM CSS class: `${LIB_PREFIX}__${this.name}` via `this.topClassBEM`
- Manages DOM lifecycle: `render()`, `_refresh()`, `remove()`
- Event system: `setEventHandler()`, `_applyEventListeners()`, `removeAllEventListeners()`, `clearEventListenersRecord()`
- jQuery DOM access via `this.instance` (returns `JQuery<HTMLElement> | null`). Used extensively inside SPARC source as the standard internal DOM mechanism; application developers should almost never use `.instance` directly -- prefer SPARC API methods (`.children`, `.render()`, `.remove()`, event methods)
- Tracks DOM presence via `this.isAlive`
- Selector: `${containerSelector} #${id}.${topClassBEM}`

### Component Props Pattern

Components follow a consistent constructor signature:

```javascript
// Standard pattern: children first, options second
new Container(children, { class: 'my-layout' })
new Card(children, { class: 'featured' })

// Some components promote commonly-used args for better DX
new Text('Hello', { type: 'h1' })          // text content promoted
new Button('Click me', { variant: 'primary' }) // label promoted

// Form components take FormField as first arg
new TextInput(formField, { placeholder: 'Enter...' })
```

The base props interface (`HTMDElementProps`) provides: `id?`, `class?`, `containerSelector?`. Each component extends this with its own options.

**FormControl abstract class** (source: `src/base/DOM/abstracts/FormControl.abstract.ts`) -- extends HTMDElement for all form input components (TextInput, TextArea, NumberInput, DateInput, ComboBox, PeoplePicker, CheckBox). Adds:
- `isDisabled` / `isLoading` -- boolean property setters that toggle the component's disabled/loading state
- `value` -- returns the underlying `FormField` instance (NOT the raw value). Use `component.value.value` for the actual data, or access the FormField directly

### Component State

SPARC has no internal reactive state (no useState, no virtual DOM diffing). Data is passed by reference and lives in memory until the garbage collector cleans it up. This is a work in progress -- the state model may evolve.

For interactive data, use `FormField` (see Section 4). For read-only data, use plain variables.

### Lifecycle Methods

```javascript
const component = new Button('Click', { onClickHandler: () => doSomething() })

component.render()    // Append to DOM, attach event listeners
// If already in DOM, render() calls _refresh() instead
component.remove()    // Remove all event listeners, remove children, remove from DOM
```

**Important behavior:** Calling `render()` on a component that is already in the DOM (`isAlive === true`) silently redirects to `_refresh()`, performing a full DOM replacement instead of appending. This means `render()` is safe to call multiple times -- it won't duplicate elements. But it IS expensive on alive components because `_refresh()` rebuilds the entire subtree.

Internal methods (rarely called directly):
- `_refresh()` -- full DOM replacement: serializes to HTML string, `replaceWith` on the existing node, re-applies event listeners, re-renders children. No diffing -- the entire subtree is rebuilt. Triggered internally by the `.children` setter.
- `_applyEventListeners()`, `_renderChildren()`, `_removeChildren()`

### Function Children (Reactive Text)

The `HTMDNode` type accepts functions (`() => HTMDNode`) alongside strings and components. Functions are re-evaluated on every `_refresh()`, enabling reactive text without manual DOM manipulation:

```javascript
const user = { name: 'John' }
const heading = new Text([() => user.name, "'s Dashboard"], { type: 'h1' })
// Renders: "John's Dashboard"

user.name = 'Jane'
heading._refresh()  // Re-evaluates the function, renders: "Jane's Dashboard"
```

This pattern is especially useful with FormField subscribers:

```javascript
const countField = new FormField({ value: 0 })
const label = new Text(['Items: ', () => String(countField.value)], { type: 'span' })
countField.subscribe(() => label._refresh())
```

### Component Selection Guide

Use SPARC components for ALL UI. Never create raw HTML elements.

| Need | Use | NOT |
|------|-----|-----|
| Dropdown / select | `ComboBox` with `FormField` | Raw `<select>`, custom dropdown |
| User/people picker | `PeoplePicker` | Custom AD search + ComboBox |
| Text input | `TextInput` with `FormField` | Raw `<input type="text">` |
| Multi-line text | `TextArea` with `FormField` | Raw `<textarea>` |
| Number input | `NumberInput` with `FormField` | Raw `<input type="number">` |
| Date picker | `DateInput` with `FormField` | Raw `<input type="date">`, jQuery UI datepicker |
| Checkbox / toggle | `CheckBox` with `FormField` | Raw `<input type="checkbox">` |
| Button (action) | `Button` | Raw `<button>`, clickable `<div>` |
| Button (navigation) | `LinkButton` | `Button` + `Router.navigateTo` manually |
| Label for input | `FieldLabel` wrapping a form control | Raw `<label>` |
| Heading / paragraph | `Text` with `type: 'h1'`..`'p'` | Raw `<h1>`, `<p>`, `<span>` |
| Image | `Image` | Raw `<img>` |
| Layout wrapper | `Container` (with `as` for semantic tags) | Raw `<div>`, `<section>` |
| Card / panel | `Card` | Custom styled `Container` |
| Tabs | `TabGroup` with tab configs | Manual tab switching logic |
| Accordion | `AccordionGroup` + `AccordionItem` | Manual expand/collapse |
| Show/hide sections | `View` (`.show()`/`.hide()`) | jQuery `.show()`/`.hide()` |
| Switch between views | `ViewSwitcher` | Manual view toggling |
| User reference in list field | `UserIdentity` | Raw email strings, `PeopleSearchResult` extraction |
| Side panel / drawer | `SidePanel` | Custom positioned overlay |
| Modal / overlay | `Modal` or `Dialog` | Custom overlay + backdrop |
| Confirmation dialog | `Dialog` with `variant: 'warning'` | Custom modal with buttons |
| Notification toast | `Toast.success/error/info/warning` | Custom notification div |
| Async feedback | `Toast.loading()` or `Toast.promise()` | Custom spinner + status text |
| Loading indicator | `Loader` | Custom spinner |
| Render without wrapper | `Fragment` | Returning bare arrays |
| Dynamic stylesheet | `StyleResource` (`.ready` Promise) | Manual `<link>` injection |
| Scrollable list | `List` | Manual `<ul>`/`<ol>` |
| Form state (interactive) | `FormField` with `subscribe()` | Plain variables for user-editable data |
| Form group | `FormSchema` | Manual field-by-field validation |
| Cross-route state | `ContextStore` | Global variables, `window` properties |

### Component API Quick Reference

Compact reference for component APIs that are commonly needed but under-documented above. Source code is the ultimate authority.

#### Modal -- open/close lifecycle

```javascript
const modal = new Modal(children, {
  backdrop: true,           // blur/darken parent (default: true)
  closeOnFocusLoss: true,   // close on click outside (default: true)
  onOpenHandler: () => {},  // called on open()
  onCloseHandler: () => {}, // called on close()
})

modal.render()    // puts in DOM (hidden)
modal.open()      // shows with backdrop + scroll lock
modal.close()     // hides, removes backdrop
modal.isVisible   // boolean getter
modal.onOpenHandler = newFn   // reassignable after construction
modal.onCloseHandler = newFn  // reassignable after construction
```

#### Dialog -- extends Modal, adds structure

```javascript
const dialog = new Dialog({
  title: 'Confirm Action',                    // required -- heading text
  content: [new Text('Are you sure?')],       // required -- body content
  footer: [cancelBtn, confirmBtn],            // required -- action buttons
  variant: 'warning',                         // 'info' | 'warning' | 'error'
  backdrop: true,                             // inherited from Modal
  closeOnFocusLoss: false,                    // default false (unlike Modal)
})

dialog.render()   // attaches to DOM (hidden)
dialog.open()     // shows (inherited from Modal)
dialog.close()    // hides (inherited from Modal)
```

Variant behavior: `'error'` shows a warning icon in the header. `'info'` and `'warning'` show no icon.

#### SidePanel -- extends Modal, slides from right

```javascript
const panel = new SidePanel({
  title: 'Details',                        // required -- header text
  content: [new Text('Panel body')],       // required -- scrollable content area
  footer: [saveBtn, cancelBtn],            // optional -- fixed footer
  width: '500px',                          // CSS width (default: '400px')
  backdrop: true,                          // inherited from Modal (default: true)
  closeOnFocusLoss: true,                  // inherited from Modal (default: true)
})

panel.render()       // attaches to #root (hidden)
panel.open()         // slides in from right
panel.close()        // slides out
panel.title = 'New Title'   // live setter -- updates DOM instantly
panel.width = '600px'       // live setter -- updates DOM instantly
```

**When to use SidePanel vs Modal vs Dialog:**

| | SidePanel | Modal | Dialog |
|---|---|---|---|
| Position | Right edge, slides in | Centered overlay | Centered overlay |
| Content | Detail view, forms, settings | Any content | Structured (title/content/footer) |
| Scroll | Content area scrolls independently | Caller manages | Content area scrolls |
| Use case | Side-by-side context (list + detail) | Custom overlays | Confirmations, alerts |

#### View -- animated show/hide

```javascript
const view = new View(children, {
  showOnRender: true,          // auto-show after render (default: true)
  onRefreshHandler: () => {},  // called before every show()
})

view.render()                              // renders + shows (if showOnRender)
view.render(false)                         // renders but stays hidden
view.show(duration?, onCompleteCallback?)  // calls onRefreshHandler, then fadeIn
view.hide(duration?, onCompleteCallback?)  // fadeOut, then removes event listeners
view.toggleVisibility(duration?, callback?)
view.isVisible                             // boolean getter
```

Default animation duration: 400ms. Pass `0` for instant show/hide.

#### ViewSwitcher -- keyed view management

```javascript
const switcher = new ViewSwitcher([
  ['list', listView],      // [key, View] tuples
  ['detail', detailView],
], {
  selectedViewName: 'list',                    // initial view (default: first)
  onRefreshHandler: (name, index, view) => {}, // called on every switch
})

switcher.setView('detail')     // switch by key (animated)
switcher.setViewByIndex(1)     // switch by index (animated)
switcher.next()                // next view (wraps around)
switcher.previous()            // previous view (wraps around)
switcher.addViews(['new', newView])  // add views dynamically
switcher.currentChild          // current View instance
switcher.currentViewName       // current key
switcher.currentViewIndex      // current index
```

#### TabGroup -- tabs + view switching

```javascript
const tabs = new TabGroup([
  { key: 'overview', label: 'Overview', view: overviewView },
  { key: 'details', label: 'Details', view: detailsView },
  { key: 'history', label: 'History', view: historyView, disabled: true },
], {
  selectedTabKey: 'overview',                    // initial tab
  onTabChangeHandler: (tabConfig) => {},         // called on tab switch
})

tabs.setTab('details')      // switch by key
tabs.setTabByIndex(1)       // switch by index
tabs.nextTab()              // next tab (wraps)
tabs.previousTab()          // previous tab (wraps)
tabs.addTabs({ key, label, view })  // add tabs dynamically
tabs.currentTab             // current key
tabs.currentTabIndex        // current index
tabs.currentView            // current View instance
```

#### AccordionItem -- open/close control

```javascript
const item = new AccordionItem('Section Title', children, {
  isInitialOpen: false,         // default: false
  onOpenCallback: () => {},
  onCloseCallback: () => {},
})

item.open()
item.close()
item.toggle()
item.isOpen   // boolean getter
```

**AccordionGroup overwrites item callbacks:** When AccordionItems are added to an AccordionGroup, the group replaces each item's `onOpenCallback` with its own handler (to close other items when `allowMultipleOpen` is false). Any `onOpenCallback` set on individual items before adding them to the group will be silently replaced. Set per-item open behavior through the group's API or after group construction.

#### Toast.promise() -- automatic lifecycle

```javascript
// Wraps a promise with loading -> success/error Toast transitions
const result = await Toast.promise(api.createItem(data), {
  loading: 'Creating project...',
  success: 'Project created!',                    // string or (value) => string
  error: 'Failed to create project',              // string or (reason) => string
})

// The promise result is passed through -- use the return value
const items = await Toast.promise(api.getItems({}), {
  loading: 'Loading...',
  success: (items) => `Found ${items.length} items`,
  error: 'Load failed',
})
```

**Toast duration defaults** (customizable via `options.duration`):

| Type | Duration | Auto-close |
|------|----------|------------|
| success | 4000ms | yes |
| info | 5000ms | yes |
| warning | 6000ms | yes |
| error | 8000ms | yes |
| loading | indefinite | no (manual `.success()`/`.error()`/`.dismiss()`) |

#### FieldLabel -- positioning and tooltips

```javascript
const label = new FieldLabel('Email Address', formControl, {
  position: 'top',      // 'top' | 'left' | 'right' | 'bottom' (default: 'top')
  tooltip: 'Enter your work email',  // shown on hover with info icon
})
```

Setters available: `.label`, `.position`, `.tooltip`. CheckBox defaults to `position: 'left'`.

#### Button -- variants and modifiers

```javascript
const btn = new Button('Save', {
  variant: 'primary',           // 'primary' | 'secondary' | 'danger' (default: 'primary')
  isOutlined: false,            // outlined styling variant (default: false)
  squared: false,               // equal width/height for icon buttons (default: false)
  type: 'button',              // HTML type: 'button' | 'submit' | 'reset' (default: 'button')
  onClickHandler: () => {},    // required
})

btn.isLoading = true           // disables button + loading CSS class
btn.isDisabled = true          // disables button (inherited from FormControl)
```

#### TextInput -- additional props

```javascript
const input = new TextInput(formField, {
  placeholder: 'Enter...',     // placeholder text
  debounceMs: 300,             // sync delay in ms (default: 300)
  hideChars: false,            // mask input like password field (default: false)
  spellcheck: false,           // HTML spellcheck attribute (default: false)
  autocomplete: false,         // HTML autocomplete attribute (default: false)
})
```

#### ComboBox -- full props

```javascript
const combo = new ComboBox(formField, dataset, {
  allowMultiple: false,        // multi-select mode (default: false)
  allowFiltering: true,        // enable search filtering (default: true)
  allowCreate: false,          // allow typing new options (default: false)
  placeholder: 'Select...',   // input placeholder (default: 'Select...')
  clearText: 'Clear...',      // clear button text (default: 'Clear...')
  returnFullDataset: false,    // return all options with checked flags (default: false)
  onSelectHandler: (sel) => {},  // callback on option toggle
  filteringFunction: (search) => filteredOptions,  // custom filter (replaces Fuse.js)
})

combo.dataset = newOptions     // setter -- updates dropdown options
```

#### Container -- semantic tags and selectable items

```javascript
const section = new Container(children, {
  as: 'section',              // 'div'|'span'|'header'|'main'|'footer'|'section'|'article'|'nav' (default: 'div')
  selectableItems: false,     // enables item selection behavior (default: false)
})
```

#### List -- typed data table

```javascript
const list = new List({
  headers: ['Name', 'Status', 'Date'],   // column headers
  data: [['Project A', 'Active', '2024-01-01']],  // T[][] where T extends string | number
  emptyListMessage: 'No items to display',  // shown when data is empty
  onItemSelectHandler: (rowData) => {},     // callback when row is clicked
})

list.data = newData            // setter -- updates table rows
```

---

## 3. Routing System

### Router Singleton

`Router` is a singleton managing all SPA navigation (source: `src/base/routing/Router.ts`).

```javascript
// Initialize once at app startup with route names
new Router(['dashboard', 'admin', 'profile'])
// Automatically loads routes/route.js as landing page (no 'home' in array)
```

### defineRoute Factory

Every route MUST export via `defineRoute()`:

```javascript
// routes/dashboard/route.js
export default defineRoute((config) => {
  config.setRouteTitle('My Dashboard')

  // ALL route code lives inside this callback (functions, constants, variables)
  // This ensures proper GC when Router navigates away

  return [
    new Text('Dashboard', { type: 'h1' }),
    createDashboardContent()
  ]
})
```

**Key behaviors:**

- **Sync vs async:** Use `async` when the route needs data before rendering (API calls, user initialization). Use sync when the route renders immediately with static or pre-loaded content. Both are fully supported -- async is not slower for the initial render because the Router awaits the callback regardless.
- **Re-execution:** The callback runs every time the route is navigated to (including back/forward). All state created inside the callback is fresh on each visit. Routes are cached by path in the Router, but their content is re-generated on every navigation.
- **Return type:** `defineRoute` must return renderable content: a single component, an array of components, a string, or a Fragment. Arrays are the conventional pattern. Returning a single Container that wraps everything is also common for layout control. Never return `null` or `undefined` -- the Router expects content to render.

### Navigation

```javascript
Router.navigateTo('dashboard')
Router.navigateTo('search', { query: { q: 'hello', page: '1' } })
Router.navigateTo('profile', { newTab: true })

// Access query params (returns URLSearchParams)
const params = Router.queryParams
const searchTerm = params.get('q')

// Site root path
Router.siteRootPath  // SharePoint site absolute URL
```

**Important:** The option is `query`, NOT `queryParams`. Using `queryParams` silently drops the parameters. `Router.queryParams` returns `URLSearchParams` from the browser URL. When using `Router.navigateTo('path', { query: { uuid: '123' } })`, the query is placed in the URL's search string (before the hash). Inside the `defineRoute` callback, `Router.queryParams.get('uuid')` returns `'123'` because the Router updates the URL before executing the route callback. The `NavigationOptions` type signature:

```typescript
interface NavigationOptions {
  query?: Record<string, string>
  newTab?: boolean
}
```

### Subroutes

Nested folders with their own `route.js`:

```
routes/
  admin/
    route.js              # admin route
    settings/
      route.js            # admin/settings subroute
    users/
      route.js            # admin/users subroute
```

Access: `Router.navigateTo('admin/settings')`

### Error Handling

- Global `ErrorBoundary` wraps the entire app -- catches unhandled errors and shows `BreakingErrorDialog`
- For expected errors, use try/catch and show feedback via `Toast.error()` or `Dialog`

### Navigation Guards

Prevent navigation away from routes with unsaved changes.

```javascript
// Set a guard -- checked before every in-app navigation
Router.setNavigationGuard(() => {
  if (!schema.isDirty) return true; // no changes -- allow
  return 'You have unsaved changes. Leave this page?';
});

// Clear guard after successful save
Router.clearNavigationGuard();
```

`NavigationGuardFn = () => boolean | string`:
- Returns `true` -- navigation proceeds
- Returns `false` -- navigation silently blocked
- Returns a `string` -- Router shows a confirmation Dialog with "Stay" and "Leave" buttons

Key behaviors:
- `beforeunload` is auto-managed: set when guard is active and returns non-true, cleared when guard is removed
- `Router.unauthorized()` bypasses the guard (terminal transition)
- Guards are checked on both programmatic navigation (`Router.navigateTo`) and browser back/forward (popstate)

---

## 4. State Management & Communication

State management in SPARC is deliberately simple. There is no Redux-like store, no useState hooks, no reactivity system. Data is passed by reference. This topic is a work in progress and will evolve.

Important: FormField is for data the user interacts with (form inputs, filters, selections). For read-only data (user profiles, config from lists, document library files, lookup tables), use plain variables -- there is no reason to wrap static data in FormField.

### FormField: Basic Usage

Source: `src/base/utils/form/FormField.class.ts`

```javascript
const field = new FormField({
  value: '',                    // initial value (cloneDeep'd for objects/arrays, direct assign for primitives)
  validatorCallback: (v) => v.length > 0  // optional
})

field.value          // get current value
field.value = 'new'  // set value (triggers cloneDeep for objects/arrays, skips for primitives)
field.wasTouched     // true after first value set
field.isValid        // result of last validate() / validateAsync() call
field.isValidating   // true while an async validator is in-flight
field.hasValidation  // true if validatorCallback was provided
field.isDisposed     // true after dispose() is called
field.validate()     // runs validatorCallback synchronously, returns boolean or null (if no validator)
field.validateAsync() // runs validatorCallback (sync or async), returns Promise<boolean | null>
field.focusOnInput() // focuses the linked input element
```

### Subscriber Pattern

FormField supports multiple subscribers via `subscribe()`. Each subscriber is called whenever `.value` is set:

```javascript
const searchField = new FormField({ value: '' })

// Subscribe to value changes -- returns an unsubscribe function
const unsubscribe = searchField.subscribe((query) => {
  updateResults(query)
})

// Multiple subscribers are supported
searchField.subscribe((query) => {
  updateCounter(query.length)
})

// Unsubscribe when no longer needed
unsubscribe()

// Or dispose all subscribers at once (e.g., during component cleanup)
searchField.dispose()  // clears all subscribers, sets isDisposed = true
```

Key behaviors:
- `subscribe()` returns an `Unsubscribe` function (call it to remove that specific subscriber)
- Subscriber errors are caught and logged (one failing subscriber does not break others)
- After `dispose()`, `subscribe()` returns a no-op and no notifications are sent
- Call `dispose()` during component/route cleanup to prevent memory leaks
- Value setter skips clone + notification + wasTouched if the new value is strictly equal to the current value (`===`)

### Async Validation

`validatorCallback` accepts sync or async functions: `(v: T) => boolean | Promise<boolean>`. The existing `validate()` method remains synchronous. Use `validateAsync()` for async validators:

```javascript
const uniqueNameField = new FormField({
  value: '',
  validatorCallback: async (val) => {
    const items = await listApi.getItems({ Title: val })
    return items.length === 0  // true if unique
  }
})

// Sync path still works via validate() (for sync callbacks)
// Async path -- use at submit time:
const valid = await uniqueNameField.validateAsync()
uniqueNameField.isValidating  // true while the async callback is in-flight
```

Key behaviors:
- `validateAsync()` returns `Promise<boolean | null>` (null if no validator)
- If the callback is sync, the fast path returns immediately without setting `isValidating`
- If the callback is async, `isValidating` becomes `true` and subscribers are notified (for UI loading states), then `false` on completion with a second notification
- `validate()` remains unchanged -- if called with an async callback, the Promise is truthy so `isValid` becomes `true` (a misuse, not a crash)
- Per-keystroke async validation is NOT supported -- form controls call `validate()` (sync) internally. `validateAsync()` is for explicit calls (typically at submit time)

### Form Validation

Use `validatorCallback` with Zod for runtime validation:

```javascript
const emailField = new FormField({
  value: '',
  validatorCallback: (val) =>
    __zod.string().email('Invalid email').safeParse(val).success
})

// Later, check validity
emailField.validate()  // returns true/false/null
if (!emailField.isValid) {
  emailField.focusOnInput()
  Toast.error('Please enter a valid email')
}
```

### FormSchema: Group Related Fields

Source: `src/base/utils/form/FormSchema.class.ts`

```javascript
// Create from explicit fields
const schema = new FormSchema({
  name: new FormField({ value: '' }),
  email: new FormField({ value: '', validatorCallback: emailValidator })
})

// Or create from key names (all fields start as empty FormFields)
const schema = FormSchema.fromKeys(['name', 'email', 'phone'])

schema.get('name')           // returns the FormField
schema.isValid               // true if ALL fields are valid (CAUTION: calls validateAll() -- triggers CSS state changes on all fields)
schema.validateAll()         // validates ALL fields synchronously, returns boolean
schema.validateAllAsync()    // validates ALL fields (sync + async) in parallel, returns Promise<boolean>
schema.isValidating          // true if ANY field has an async validator in-flight
schema.isDirty               // true if ANY field has been touched (preferred for navigation guards)
schema.hasUntouchedFields    // true if ANY field has NOT been touched
schema.focusOnFirstInvalid() // focuses the first invalid field's input
schema.parse()               // returns { name: value, email: value, ... }
schema.parseForList()        // like parse(), but auto-extracts .value from ComboBox fields -- use for createItem()/updateItem()
```

**When to use FormSchema vs individual FormFields:**

- **Use FormSchema** for multi-field forms that submit together (create/edit forms). Gives you `isValid`, `focusOnFirstInvalid()`, `parseForList()`, and `isDirty` for navigation guards -- all essential for the async UX patterns in `.claude/rules/async-ux-patterns.md`.
- **Use individual FormField** for standalone interactive elements: search inputs, single-field filters, toggle switches, or any field whose value is consumed independently rather than submitted as part of a form.
- **Rule of thumb:** If you have 2+ fields that are validated and submitted together, use FormSchema. It prevents the common anti-pattern of calling `.validate()` on each field individually and missing fields.

### ContextStore: Cross-Route Shared State

Source: `src/base/utils/state/ContextStore.class.ts`

All-static class (no instantiation) for key-value state that persists across route navigations. Lives in the bundle's module scope.

```javascript
// Set a value (accessible from any route)
ContextStore.set('currentProject', projectData)

// Get a value (throws SystemError if key missing)
ContextStore.get('currentProject')

// Get with fallback (no throw)
ContextStore.get('theme', 'light')

// Check existence
ContextStore.has('currentProject')

// Delete (auto-disposes FormField values via duck-typed dispose())
ContextStore.delete('currentProject')

// Clear all entries (auto-disposes all disposable values)
ContextStore.clear()

// Inspect
ContextStore.size    // number of entries
ContextStore.keys()  // string[]
```

**When to use ContextStore:**
- Data that must survive route navigation (selected project context, user preferences, cached lookup data)
- Cross-route communication where one route sets data and another reads it

**When NOT to use ContextStore:**
- Route-local interactive state -- use `FormField` with `subscribe()`
- Read-only data scoped to a single route -- use plain variables
- Data that should reset on navigation -- use route-scoped variables inside `defineRoute`

### Component Communication Patterns

#### 1. Parent-Child (Props)

Pass FormField or data as constructor arguments:

```javascript
function createParent() {
  const nameField = new FormField({ value: '' })
  return new Container([
    createChildInput(nameField),
    createChildDisplay(nameField)
  ])
}
```

#### 2. Sibling Communication (Parent Mediator)

Parent creates the shared FormField, passes to multiple children:

```javascript
function createSearchPage(items) {
  const searchField = new FormField({ value: '' })

  const searchInput = new TextInput(searchField, { placeholder: 'Search...' })
  const filteredList = new Container(items.map(renderItem))

  // Subscribe to react to value changes
  searchField.subscribe((query) => {
    filteredList.children = filterItems(items, query)
  })

  return new Container([searchInput, filteredList])
}
```

### Best Practice: Encapsulate State

Keep FormFields scoped to the creating function. Expose only what consumers need -- not the raw FormField itself if they only need to read the value.

---

## 5. Building Components

### Creating Custom Components

Developers create **composed components** using factory functions, not classes. This is the standard pattern:

```javascript
// components/projectCard/projectCard.js
export function createProjectCard(project) {
  const statusField = new FormField({
    value: project.Status,
    validatorCallback: (v) => __zod.enum(['Active', 'Completed', 'On Hold']).safeParse(v).success
  })

  return new Card([
    new Text(project.Title, { type: 'h3' }),
    new Text(`Status: ${project.Status}`, { type: 'p' }),
    new Button('View Details', {
      onClickHandler: () => Router.navigateTo('projects/detail', {
        query: { id: project.UUID }
      })
    })
  ])
}
```

Extending `HTMDElement` directly is ideal in theory but gets tricky and messy in plain JavaScript. Custom components created with raw jQuery that integrate with SPARC components (following the same string-representation pattern with optional event handlers) are possible but **not recommended** -- they risk buggy scenarios with uncleared events and lifecycle issues.

### Using Custom Components

Import and compose inside `defineRoute`:

```javascript
// routes/projects/route.js
import { defineRoute } from '../../dist/nofbiz.base.js'
import { createProjectCard } from './components/projectCard/projectCard.js'

export default defineRoute(async (config) => {
  config.setRouteTitle('Projects')

  const siteApi = new SiteApi()
  const projects = await siteApi.list('Projects').getItems()

  return [
    new Text('Projects', { type: 'h1' }),
    ...projects.map(createProjectCard)
  ]
})
```

### Styling Custom Components

Every SPARC component auto-generates a CSS class following `${LIB_PREFIX}__componentname`. A global CSS file can already target and style all SPARC components via these predictable class names -- you do NOT need a per-component CSS file by default.

Only create component-specific CSS when you need unique styling (page layouts, one-off overrides):

```css
/* Only needed for unique styling */
.nofbiz__card.project-card {
  border-left: 4px solid var(--primary-color);
}
```

Pass custom classes via the `class` prop: `new Card(children, { class: 'project-card' })`

Note: The current prefix is `nofbiz`, but `LIB_PREFIX` may change in the future. The prefix is defined in `src/base/utils/misc/identity.ts`.

---

## 6. SharePoint Integration

### 6.1 Core Principle

SharePoint handles: data storage (Lists), user authentication (AD), group management, email workflows (Designer).

SPARC handles: all UI rendering, data validation, application routing, business logic, user interaction.

### 6.2 SiteApi

Source: `src/base/sharepoint/api/SiteApi.class.ts`

Singleton by normalized URL -- multiple `new SiteApi(url)` calls with the same URL return the same instance.

```javascript
const siteApi = new SiteApi()               // defaults to _spPageContextInfo.webAbsoluteUrl
const siteApi = new SiteApi(absoluteUrl)    // specific site URL (singleton per URL)
```

**List factory** -- cached ListApi instances:

```javascript
const api = siteApi.list('Projects')                        // cached, reused on subsequent calls
const api = siteApi.list('Projects', { listItemType: '...' }) // with options
```

**Site operations:**

```javascript
await siteApi.getLists()                       // all lists (SPList[])
await siteApi.getSiteGroups()                  // all site groups (SPGroup[])
await siteApi.getWebInfo()                     // web properties (SPWeb)
await siteApi.createList('NewList', options?)   // create list, returns ListApi
await siteApi.deleteList('OldList')            // delete list by title
await siteApi.getFullUserDetails(loginName)    // delegates to people.api
```

**Request digest:**

```javascript
await siteApi.getRequestDigest()
```

- **Local site** (URL matches `_spPageContextInfo.webAbsoluteUrl`): reads the `#__REQUESTDIGEST` DOM element directly -- instant, no API call.
- **Remote site**: delegates to `refreshRequestDigest()`, which handles caching, expiry, and in-flight coalescing.

### 6.3 ListApi

Source: `src/base/sharepoint/api/ListApi.class.ts`

Always use `siteApi.list(title)` to get a ListApi instance -- the factory caches instances and auto-injects the SiteApi. The `ListApi` class is not exported from the module entry point; `siteApi.list()` is the only way to obtain an instance in app code.

```javascript
const api = siteApi.list('Projects')
```

**Get items** -- accepts `CAMLQueryObject` or raw CAML XML string. `CAMLQueryObject` supports all comparison operators and OR logic. String values default to `Eq`; use `{ value, operator }` for explicit operators; use `{ value: [...], operator: 'Or', match? }` for same-field multi-value OR; use `$or: [...]` for cross-field OR. Field conditions are AND-ed together. Automatically paginates in 500-item pages:

```javascript
// All items (no limit by default)
const items = await api.getItems()

// Filtered by field values (CAML query object -- NOT REST filter syntax)
const active = await api.getItems({ Status: 'Active' })
const specific = await api.getItems({ Status: 'Active', Priority: 'High' })

// Explicit operators (Eq, Neq, Gt, Lt, Geq, Leq, Contains, BeginsWith, IsNull, IsNotNull)
const highScore = await api.getItems({ Score: { value: '80', operator: 'Geq' } })
const hasEmail = await api.getItems({ Email: { value: '', operator: 'IsNotNull' } })
const matching = await api.getItems({ Title: { value: 'Project', operator: 'Contains' } })

// Same-field multi-value OR (default match operator: Eq)
const multiStatus = await api.getItems({ Status: { value: ['Active', 'Pending'], operator: 'Or' } })
// Same-field multi-value OR with custom match operator
const highScores = await api.getItems({ Score: { value: ['80', '90'], operator: 'Or', match: 'Geq' } })

// Cross-field OR via $or
const eitherDept = await api.getItems({ $or: [{ Department: 'HR' }, { Department: 'IT' }] })
// Combined: field conditions AND-ed, cross-field OR separately
const combined = await api.getItems({ Status: 'Active', $or: [{ Dept: 'HR' }, { Dept: 'IT' }] })

// Raw CAML XML for edge cases
const custom = await api.getItems('<View><Query><Where>...</Where></Query></View>')

// Control pagination limit
const all = await api.getItems({}, { limit: Infinity })   // fetch everything
const top50 = await api.getItems({}, { limit: 50 })       // stop after 50
```

**Sorting and field selection** -- `orderBy` sorts via CAML `<OrderBy>`, `viewFields` restricts returned columns:

```javascript
const sorted = await api.getItems({ Status: 'Active' }, {
  orderBy: [{ field: 'Created', ascending: false }]
})
const slim = await api.getItems({}, {
  viewFields: ['Title', 'Status', 'Created']
})
const combined = await api.getItems({ Status: 'Active' }, {
  limit: 100,
  orderBy: [{ field: 'Created', ascending: false }],
  viewFields: ['Title', 'Status', 'DueDate']
})
```

```javascript
// Convenience methods
const byTitle = await api.getItemByTitle('My Project')
const byUUID = await api.getItemByUUID('550e8400-e29b-41d4-a716-446655440000')
const owned = await api.getOwnedItems()          // defaults to current user's siteUserId
const owned = await api.getOwnedItems(userId)    // specific user
```

**Create item** -- `Record<string, SPFieldValue>` (strings, numbers, booleans, arrays, and objects are auto-serialized via `toFieldValue()`):

```javascript
await api.createItem({
  Title: 'New Project',
  Status: 'Active',
  Owner: user.get('email')
})
```

**Update item** -- partial update via MERGE (only specified fields are modified). Requires the item's `odata.etag` for optimistic concurrency:

```javascript
const items = await api.getItems({ Status: 'Active' })
const item = items[0]
await api.updateItem(item.ID, { Status: 'Completed' }, item['odata.etag'])
```

**Delete items** -- also requires `odata.etag`:

```javascript
const items = await api.getItems({ Title: 'Old Project' })
await api.deleteItem(items[0].ID, items[0]['odata.etag'])
await api.deleteALLItems()       // deletes every item (auto-passes etags)
```

**Concurrency:** All query methods (`getItems`, `getItemsPaged`, `getItemByTitle`, `getItemByUUID`, `getOwnedItems`) return items with an `odata.etag` property. Write methods (`updateItem`, `deleteItem`) require this etag. If the item was modified since the etag was obtained, SharePoint returns HTTP 412 and SPARC throws `SystemError('ConcurrencyConflict', ..., { breaksFlow: false })`. App code should catch this, re-fetch the item, and notify the user:

```javascript
try {
  await api.updateItem(item.ID, updates, item['odata.etag'])
} catch (error) {
  if (error.name === 'ConcurrencyConflict') {
    Toast.error('This item was modified by another user. Please refresh and try again.')
  } else {
    Toast.error('Update failed.')
  }
}
```

**Field management:**

```javascript
const fields = await api.getFields()                                       // non-hidden, non-readonly fields
await api.createField({ title: 'Priority' })                               // Text field (single-line, 255 chars)
await api.createField({ title: 'Description', multiline: true })           // Note field (multi-line, richText: false)
await api.createField({ title: 'Category', indexed: true })                // Text field with index
await api.deleteField('InternalFieldName')
await api.setFieldIndexed('Title', true)                                   // toggle index on existing field
```

All ListApi operations are **async** (return Promises).

**Query sanitization** -- `sanitizeQuery()` strips null/undefined entries from a query object, making it safe to build queries from optional filter values. Returns a clean `CAMLQueryObject` or `undefined` if nothing remains:

```javascript
// Filter form pattern -- optional form inputs
const query = sanitizeQuery({
  Status: statusFilter.value || null,
  Department: deptFilter.value || null,
  Priority: selectedPriorities.length > 0
    ? { value: selectedPriorities, operator: 'Or' }
    : null,
})
const items = await api.getItems(query)

// Lookup-chain pattern -- IDs from a prior query
const projectIds = listAItems.map(i => i.ProjectId)
const query = sanitizeQuery({
  ProjectId: projectIds.length > 0
    ? { value: projectIds, operator: 'Or' }
    : null,
  Status: activeOnly ? 'Active' : null,
})
const results = await api.getItems(query)
```

**Manual pagination** -- `getItemsPaged()` returns pages one at a time via a `next()` function instead of auto-fetching everything. Same query syntax as `getItems()`. Use when you need incremental loading, progress feedback, or want to process pages as they arrive:

```javascript
// Basic usage -- iterate page by page
let page = await api.getItemsPaged({ Status: 'Active' })
while (page) {
  processItems(page.items)
  page = page.next ? await page.next() : null
}

// Custom page size
let page = await api.getItemsPaged({}, { pageSize: 100 })

// Combine with limit, orderBy, viewFields
let page = await api.getItemsPaged({ Status: 'Active' }, {
  pageSize: 50,
  limit: 200,
  orderBy: [{ field: 'Created', ascending: false }],
  viewFields: ['Title', 'Status']
})

// Collect all into a flat array (equivalent to getItems)
const allItems = []
let page = await api.getItemsPaged(query)
while (page) {
  allItems.push(...page.items)
  page = page.next ? await page.next() : null
}
```

`PaginatedResult<T>` shape: `{ items: (T & SPItemWithETag)[], next: (() => Promise<PaginatedResult<T>>) | null }`. `next` is `null` when no more pages remain or when `limit` is reached.

### 6.3.1 Field Value Serialization

Source: `src/base/sharepoint/fieldValue.ts`

SharePoint stores all list item values as strings. ListApi handles conversion automatically:

**Writes (auto-serialized via `toFieldValue`):**

| JS Type | Stored As | Example |
|---------|-----------|---------|
| `string` | As-is | `"hello"` |
| `number`, `boolean` | `String(value)` | `"42"`, `"true"` |
| Array of primitives | `JSON.stringify()` | `'["a","b","c"]'` |
| Object or array of objects | `JSON.stringify()` | `'{"email":"x","name":"y"}'` |

**Reads (auto-parsed via `parseFieldValues`):**

All query methods (`getItems`, `getItemsPaged`, `getItemByTitle`, `getItemByUUID`, `getOwnedItems`) auto-parse returned items:
- `"true"` / `"false"` -> `boolean`
- Strings starting with `{` or `[` -> parsed as JSON (fallback to raw string on parse error)
- Numeric strings remain as strings (preserves CAML query compatibility)
- Non-string properties (`Id`, `__metadata`, `odata.etag`) pass through unchanged

**Manual parsing** -- `fromFieldValue<T>(raw)` for explicit type conversion when auto-parsing is insufficient:

```javascript
const tags = fromFieldValue(item.Tags)        // parse JSON array
const config = fromFieldValue(item.Config)     // parse JSON object
```

### 6.4 CurrentUser

Source: `src/base/sharepoint/user/CurrentUser.ts`

Async singleton -- `initialize()` returns `this`, enabling a one-liner. Accepts an optional `groupHierarchy` array and an optional `InitializeOptions` object:

```javascript
const user = await new CurrentUser().initialize(groupHierarchy)  // preferred: construct + initialize in one step
```

The two-step form also works:

```javascript
const user = new CurrentUser()                    // returns singleton slot (subsequent calls return same instance)
await user.initialize(groupHierarchy)             // loads data from SharePoint (idempotent once successful)
```

**Type-safe accessor** -- `get<K>(key)` returns the correctly-typed value:

```javascript
user.get('employeeId')         // string -- samAccountName extracted from claims login
user.get('loginName')          // string -- claims-encoded (e.g. "i:0#.w|DOMAIN\\user")
user.get('displayName')        // string
user.get('email')              // string
user.get('siteUserId')         // number -- numeric ID on the current site
user.get('jobTitle')           // string
user.get('pictureUrl')         // string
user.get('personalUrl')        // string
user.get('directReports')      // string[] -- login names
user.get('managers')           // string[] -- login names
user.get('peers')              // string[] -- login names
user.get('groups')             // SPGroup[] -- SharePoint groups the user belongs to
user.get('profileProperties')  // Record<string, string> -- all non-empty profile properties
```

**Group hierarchy getters** -- resolved from the hierarchy array passed to `initialize()`:

```javascript
user.accessLevel   // string | null -- the groupLabel of the matched hierarchy entry (e.g. 'ADMIN')
user.group         // SPGroup | null -- the full SPGroup object for the match
user.groupId       // number | null -- SPGroup.Id
user.groupTitle    // string | null -- SPGroup.Title
user.isInitialized // boolean -- true after successful initialize()
```

**Group hierarchy** is an ordered array of `{ groupTitle, groupLabel }` entries, checked from last (highest priority) to first. The first case-insensitive match against the user's SharePoint groups wins:

```javascript
const groupHierarchy = [
  { groupTitle: 'App Visitors', groupLabel: 'VISITOR' },
  { groupTitle: 'App Members', groupLabel: 'MEMBER' },
  { groupTitle: 'App Admins', groupLabel: 'ADMIN' },
]
```

**Debug/testing -- load a different user:**

```javascript
// Pass options.targetUser to load another user's profile instead of the authenticated user
const user = await new CurrentUser().initialize(hierarchy, { targetUser: 'john@company.com' })
// Also accepts display names -- resolved via People API searchUsers
const user = await new CurrentUser().initialize(hierarchy, { targetUser: 'John Doe' })
```

`targetUser` is resolved by the People API's `_resolveLoginName` (via `searchUsers`), so it accepts emails, display names, or login names.

**Error recovery:** if `initialize()` fails, the singleton reference is cleared so that a subsequent `new CurrentUser()` creates a fresh instance and `initialize()` can be retried.

### 6.5 RoleManager

Source: `src/base/sharepoint/user/RoleManager.class.ts`

List-based authorization for custom role checks. Unlike `CurrentUser` (singleton, SP-group-based), RoleManager is NOT a singleton -- different apps can use different lists or maintain multiple instances.

**List structure:** A SharePoint list (default: `'UserRoles'`) with:
- `Title` field = user's email address (lookup key)
- `Roles` field = JSON-serialized `string[]` (auto-parsed by ListApi)

**Constructor and loading:**
```javascript
const roles = new RoleManager()
await roles.load()                 // queries 'UserRoles' list by current user's email
await roles.load('AppRoles')       // or specify a different list name
```

If no matching item is found, the instance has zero roles (valid state, no error).

**Role checks:**
```javascript
roles.hasRole('editor')                    // exact match
roles.hasAnyRole(['admin', 'editor'])      // true if user has either
roles.hasAnyRole(['*'])                    // wildcard -- always true
```

**Permission map -- resource-level access:**
```javascript
const permissions = {
  dashboard: ['*'],                    // everyone
  reports:   ['admin', 'analyst'],     // admin or analyst
  settings:  ['admin'],                // admin only
}

roles.canAccess('reports', permissions)   // true if user has 'admin' or 'analyst'
roles.canAccess('unknown', permissions)   // false (key not in map)
```

**Getters:**
- `roles.roles` -- shallow copy of the loaded roles array
- `roles.isLoaded` -- distinguishes "not yet loaded" from "loaded with zero roles"

**RoleManager vs CurrentUser groups:**

| | CurrentUser | RoleManager |
|---|---|---|
| Source | SharePoint groups (AD-backed) | Custom SP list |
| Granularity | Hierarchy labels (ADMIN/MEMBER/VISITOR) | Arbitrary role strings |
| Singleton | Yes | No |
| Use case | Coarse access tiers, route protection | Fine-grained permissions, feature flags |

### 6.6 UserIdentity

Source: `src/base/sharepoint/user/UserIdentity.class.ts`

Immutable value class for canonical user identity storage in SharePoint list fields. Wraps `email` and `displayName` with built-in JSON serialization that integrates with ListApi's auto-serialization/parsing. Supports extensible custom properties (team, role, department, etc.) that survive serialization round-trips.

**Constructor:**
```javascript
const ref = new UserIdentity('john@company.com', 'John Doe')
// Throws SystemError('InvalidUserIdentity') if email is empty/whitespace

// With custom properties (optional third param)
const ref = new UserIdentity('john@company.com', 'John Doe', { team: 'Engineering', role: 'Lead' })
// Properties must be string | number | boolean -- objects/arrays/nulls are filtered out
// Keys 'email' and 'displayName' are silently excluded (reserved for core fields)
```

**Custom properties API:**
```javascript
ref.prop('team')           // 'Engineering' (or undefined if not set)
ref.hasProp('team')        // true
ref.properties             // Readonly<{ team: 'Engineering', role: 'Lead' }> (frozen)

// Immutable enrichment -- returns a NEW UserIdentity with merged properties
const enriched = ref.with({ department: 'Product' })
enriched.prop('team')       // 'Engineering' (carried over)
enriched.prop('department') // 'Product' (added)
// Original ref is unchanged; cached details carry over to the new instance
```

**Write to list (auto-serialized via toJSON):**
```javascript
await listApi.createItem({ AssignedTo: ref })           // single user
await listApi.createItem({ Reviewers: [ref1, ref2] })   // multi-user array
// toJSON() produces: { team: 'Engineering', role: 'Lead', email: '...', displayName: '...' }
// Core fields spread last -- always win over property key collisions
```

**Read from list (auto-parsed by ListApi):**
```javascript
const assignee = UserIdentity.fromField(item.AssignedTo)       // UserIdentity | null
const reviewers = UserIdentity.manyFromField(item.Reviewers)   // UserIdentity[]
// fromField() preserves custom properties from the serialized data
assignee.prop('team')   // 'Engineering' (round-trip preserved)
```

**PeoplePicker integration:** PeoplePicker stores `UserIdentity` as `ComboBoxOptionProps.value`. After selection:
```javascript
const identity = personField.value?.value   // UserIdentity
identity.email                               // 'john@company.com'
identity.displayName                         // 'John Doe'

// Convenience getters on PeoplePicker instance
picker.selectedIdentity     // UserIdentity | null (single-select)
picker.selectedIdentities   // UserIdentity[] (multi-select)
```

**Factory methods:**
```javascript
UserIdentity.fromSearchResult(peopleSearchResult)   // from AD search result
UserIdentity.fromCurrentUser(user)                  // from initialized CurrentUser
UserIdentity.fromField(item.AssignedTo)             // from list field (auto-parsed, preserves properties)
UserIdentity.manyFromField(item.Reviewers)          // from multi-user list field
```

**Full user details (on demand):**
```javascript
await identity.fetchFullDetails()   // fetches via getFullUserDetails
identity.details                    // FullUserDetails | null
```

**String coercion:** `identity.toString()` returns the display name.

### 6.7 People API

Source: `src/base/sharepoint/api/people.api.ts`

Identity resolution utilities -- not tied to list operations. For storing user data in lists, use `UserIdentity` (Section 6.5) which auto-serializes to JSON.

```javascript
// Search Active Directory via people picker
const results = await searchUsers('John', { maximumSuggestions: 10 })

// Get user profile from PeopleManager (farm-wide)
const profile = await getUserProfile('DOMAIN\\jsmith')

// Consolidated details: ensureUser + groups + profile (fault-tolerant)
const details = await getFullUserDetails('DOMAIN\\jsmith', siteApi)
```

Login name resolution: plain `DOMAIN\user` strings are automatically resolved to claims format (`i:0#.w|DOMAIN\user`) via people picker search. Claims-encoded names are passed through directly.

`getFullUserDetails` calls three endpoints in sequence: `ensureUser` (required), `getuserbyid/groups` (optional -- empty array on failure), and `PeopleManager/GetPropertiesFor` (optional -- partial data on failure). This is the same function used by `CurrentUser.initialize()`.

**PeoplePicker pre-population:** Use `peoplePicker.resolveUser(identifier)` to programmatically resolve and select a user by email, display name, or employee ID. Returns the matched `PeopleSearchResult` or `null`.

### 6.8 HTTP Layer

Source: `src/base/sharepoint/api/httpRequests.ts`

Low-level request functions for endpoints not covered by SiteApi/ListApi:

```javascript
const data = await spGET<ResponseType>(url, options?)
const result = await spPOST<ResponseType>(url, { data: payload, requestDigest })
await spDELETE(url, { requestDigest })
await spMERGE(url, { data: partialPayload, requestDigest })
```

Key behaviors:
- `X-RequestDigest` auto-injected on POST/DELETE/MERGE (from `_spPageContextInfo.formDigestValue` when not provided)
- Auto-retries once on 403 digest expiry (async mode only)
- `SPRequestOptions` extends `JQueryAjaxSettings` with optional `requestDigest` field
- All functions return `Promise<T>` by default
- `{ async: false }` overloads exist but are deprecated -- they block the main thread, skip digest auto-retry, and prevent loading feedback

Most work should go through SiteApi and ListApi. Use the HTTP functions directly only for SharePoint REST endpoints those classes don't cover.

### 6.9 Data Modeling Principles

SharePoint lists are NoSQL-style document stores. SPARC enforces a strict data modeling approach:

**All fields are Text or Note only:**
- **Text** -- single-line, values up to 255 characters (FieldTypeKind 2)
- **Note** -- multi-line text, values exceeding 255 characters (FieldTypeKind 3, always `richText: false`)
- Never use Choice, Lookup, DateTime, Number, or other SharePoint field types
- Validation happens in SPARC via Zod, not in SharePoint

```javascript
// Create fields programmatically
await api.createField({ title: 'Status' })                          // Text
await api.createField({ title: 'LongDescription', multiline: true }) // Note (richText: false)
```

**User identifiers in lists:**
- **Preferred**: `UserIdentity` -- auto-serializes to `{"email":"...","displayName":"..."}` (plus any custom properties), read back with `UserIdentity.fromField()` / `manyFromField()`. See Section 6.6
- **Legacy fallback**: plain email string (single-user) or employee ID string (multi-user/compact)
- Employee ID: globally unique, compact, extracted from `claimsPrefix|domain\[prefix]employeeID` -- parsing logic is app-level and environment-specific
- Never store site user IDs (numeric IDs are per-site, unreliable across migrations)

**FK relationships:** stored as string values (e.g., a UserSettings list pointing to a UserProfiles list via email). Joins happen in SPARC code, not via SharePoint lookup columns.

```javascript
const statusField = new FormField({
  value: 'active',
  validatorCallback: (val) =>
    __zod.enum(['active', 'inactive', 'pending', 'archived']).safeParse(val).success
})
```

### 6.10 Large Lists & Indexing

SharePoint's list view threshold is 5,000 items. SPARC handles this through pagination and indexing:

- `getItems()` automatically paginates in 500-item pages
- Pass `{ limit: Infinity }` to fetch all items across pages; use a specific number to cap results
- Index columns that are used as CAML query filters to avoid throttling

**Indexing guidelines:**
- Always index the **Title** field (every list uses it)
- Index the **UUID** field when present (lists needing cross-site unique identifiers)
- Index any field frequently used in CAML query filters

```javascript
// At list creation time
await api.createField({ title: 'Category', indexed: true })

// On an existing field
await api.setFieldIndexed('Title', true)
```

Indexing is a design-time concern -- plan which columns need indexing upfront based on expected query patterns and data volume.

### 6.11 Permission-Based Routing

Use `CurrentUser` with group hierarchy to conditionally register routes:

```javascript
const user = await new CurrentUser().initialize([
  { groupTitle: 'App Visitors', groupLabel: 'VISITOR' },
  { groupTitle: 'App Members', groupLabel: 'MEMBER' },
  { groupTitle: 'App Admins', groupLabel: 'ADMIN' },
])

const routes = ['dashboard', 'profile']
if (user.accessLevel === 'ADMIN') {
  routes.push('admin', 'admin/settings')
}
new Router(routes)
```

### Error Handling

ErrorBoundary handles uncaught errors based on their `breaksFlow` property:

- `breaksFlow: true` (default) -- shows the BreakingErrorDialog (full-screen, blocks interaction)
- `breaksFlow: false` -- auto-shows `Toast.error()` with the error message (non-intrusive notification)

```javascript
// For expected errors -- try/catch with user feedback
try {
  await api.updateItem(item.ID, updates, item['odata.etag'])
} catch (error) {
  if (error.name === 'ConcurrencyConflict') {
    Toast.error('Item was modified by someone else. Please refresh.')
  } else {
    Toast.error('Update failed. Please try again.')
  }
}

// For unexpected errors -- ErrorBoundary catches them automatically
// breaksFlow: true  -> BreakingErrorDialog
// breaksFlow: false -> Toast.error (e.g. ConcurrencyConflict)
```

---

## 7. Styling & CSS

### BEM Methodology

SPARC uses Block-Element-Modifier naming with `LIB_PREFIX` (currently `nofbiz`):

```css
.nofbiz__button { }                  /* block */
.nofbiz__button--primary { }         /* modifier */
.nofbiz__card__header { }            /* element */
.nofbiz__card__header--highlighted { } /* element + modifier */
```

### Auto-Generated Classes

When components render, they automatically get their BEM class:

```javascript
new TextInput(field)
// Renders with class: nofbiz__textinput

new Button('Click', { variant: 'primary' })
// Renders with class: nofbiz__button nofbiz__button--primary

new Card(children, { class: 'custom-card' })
// Renders with class: nofbiz__card custom-card
```

### Styling Philosophy

- Every component gets `${LIB_PREFIX}__componentname` automatically -- no manual class assignment needed
- A single global CSS file can style all SPARC components via these predictable selectors
- Custom classes are additive -- pass via the `class` prop for unique/one-off styling
- Co-located CSS files (e.g., `component.css` next to `component.js`) are only needed for unique layouts
- Never use inline styles on SPARC components
- The prefix prevents collisions with other libraries and SharePoint's own styles

### Global Styles

Place app-wide styles in `app/css/`:

```css
:root {
  --primary-color: #0070d2;
  --secondary-color: #6c757d;
  --error-color: #e74c3c;
  --spacing-unit: 0.5rem;
}
```

---

## 8. Utilities & Helpers

### pageReset()

Called at the top of the entry script to prepare for SPARC. Removes SharePoint chrome, adds `#root` container, and awaits base + app theme CSS loading (prevents FOUC). Returns `Promise<void>` -- await it to ensure styles are ready before rendering:

```javascript
await pageReset({
  themePath: resolvePath('@/main-dev.css', { useSiteRoot: true }),
  clearConsole: false,
});
```

Calling without `await` is backward-compatible (fires and forgets).

### Bundled Dependencies (use these, never reinvent)

These are bundled into the base module, exported from `src/base/index.ts`, and available at runtime. Import them from the SPARC bundle -- never install or use them directly from npm.

#### `__lodash` (Lodash)

Use `__lodash` for common utility operations. Never write custom implementations of these:

- `__lodash.debounce(fn, ms)` -- debounce any function (never write custom debounce closures)
- `__lodash.throttle(fn, ms)` -- throttle functions
- `__lodash.cloneDeep(obj)` -- deep clone (never use `JSON.parse(JSON.stringify())`)
- `__lodash.groupBy(arr, key)` -- group arrays by property
- `__lodash.uniqBy(arr, key)` -- deduplicate arrays
- `__lodash.sortBy(arr, key)` -- sort arrays
- `__lodash.pick(obj, keys)` / `__lodash.omit(obj, keys)` -- object subsetting
- `__lodash.isEmpty(val)` -- check empty objects/arrays/strings (never write custom isEmpty)
- `__lodash.get(obj, path, default)` -- safe nested property access

#### `__zod` (Zod)

All runtime validation goes through `__zod`. Never use manual regex chains or if-statement validation:

- `__zod.string().email()`, `.url()`, `.min(n)`, `.max(n)` -- string validation
- `__zod.number().min(n).max(n)` -- number validation
- `__zod.enum(['a', 'b'])` -- enum validation
- `.safeParse(val).success` -- the pattern used in FormField `validatorCallback`
- `.parse(val)` -- throws on invalid (use in trusted contexts)

```javascript
// FormField validation pattern
const emailField = new FormField({
  value: '',
  validatorCallback: (val) => __zod.string().email().safeParse(val).success
})
```

#### `__dayjs` (Day.js)

Use `__dayjs` for all date operations. Never use `new Date()` for parsing or `string.split('-')` for date manipulation:

- `__dayjs(dateString)` -- parse dates
- `.format('DD-MM-YYYY')` -- format dates
- `.isValid()` -- validate date strings
- `.diff(other, 'days')` -- date arithmetic
- `.isBefore()`, `.isAfter()` -- date comparison

#### `__fuse` (Fuse.js)

Use `__fuse` for fuzzy search. Never write custom fuzzy matching algorithms:

- `new __fuse(list, { keys: ['Title', 'Description'] })` -- create search index
- `.search(query)` -- fuzzy search, returns ranked results
- Already used internally by ComboBox for dropdown filtering

### Additional Base Utilities

Additional utilities are exported from the base module. These will grow and change over time -- check `src/base/index.ts` for the current list. Examples of what you may find:

- `resolvePath()` -- resolves `@` prefix to SharePoint site URL (DX convenience, not required)
- `copyToClipboard()` -- clipboard utility
- `generateRuntimeUID()` / `generateUUIDv4()` -- ID generation
- `enforceStrictObject()` -- type safety helper
- `StyleResource` -- dynamic stylesheet loading. Exposes `ready: Promise<void>` that resolves when the browser finishes loading the stylesheet. `await new StyleResource(path).ready` to wait; fire-and-forget (`new StyleResource(path)`) still works without unhandled rejection
- `SimpleElapsedTimeBenchmark` -- performance measurement
- `startDigestTimer()` / `stopDigestTimer()` -- manage periodic request digest refresh for long-running sessions

### Path Utilities

`resolvePath()` (source: `src/base/utils/misc/path.ts`) replaces `@` with the SharePoint URL:

```javascript
resolvePath('@/images/logo.png')
// -> https://site.sharepoint.com/SiteAssets/app/images/logo.png

resolvePath('@/images/logo.png', { useSiteRoot: true })
// -> https://site.sharepoint.com/images/logo.png
```

This is a DX convenience -- writing the full path manually is equally valid.

---

## 9. Common Patterns

### Search/Filter List

FormField holds the search term. A subscriber filters the dataset and updates the list:

```javascript
function createSearchableList(items) {
  const listContainer = new Container(items.map(renderItem))

  const searchField = new FormField({ value: '' })
  searchField.subscribe((query) => {
    const filtered = items.filter(item =>
      item.Title.toLowerCase().includes(query.toLowerCase())
    )
    listContainer.children = filtered.map(renderItem)
  })

  return new Container([
    new TextInput(searchField, { placeholder: 'Search...' }),
    listContainer
  ])
}
```

### Data Table with Sorting/Filtering

Fetch all data once, then sort/filter client-side via FormField subscriber. No re-querying:

```javascript
async function createDataTable() {
  const data = await siteApi.list('Projects').getItems()
  const tableContainer = new Container(renderRows(data))

  const sortField = new FormField({ value: 'Title' })
  sortField.subscribe((column) => {
    const sorted = [...data].sort((a, b) => a[column].localeCompare(b[column]))
    tableContainer.children = renderRows(sorted)
  })

  return new Container([
    createSortControls(sortField),
    tableContainer
  ])
}
```

### Modal Dialog

Modals separate rendering from visibility. Render first (puts in DOM but hidden), then control with `open()`/`close()`:

```javascript
const confirmDialog = new Dialog({
  title: 'Confirm Delete',
  content: [new Text('This action cannot be undone.', { type: 'p' })],
  footer: [
    new Button('Cancel', { onClickHandler: () => confirmDialog.close() }),
    new Button('Delete', { variant: 'danger', onClickHandler: handleDelete }),
  ],
  variant: 'warning',
  onCloseHandler: () => { /* cleanup if needed */ }
})

confirmDialog.render()   // In DOM but hidden -- no animation glitch
// Later...
confirmDialog.open()     // Show with proper animation
// User interacts...
confirmDialog.close()    // Hide with proper animation
```

This separation prevents buggy animations and gives granular control when rendering component sets that include modals not meant to be visible immediately.

**Dialog lifecycle in routes:**

- `.render()` is always needed -- Dialog creates its own DOM attachment point (appends to `<body>`)
- Returning the Dialog in the route's component array is ALSO needed -- this registers it with the Router for automatic cleanup on navigation
- Both `.render()` AND inclusion in the return array are required:

```javascript
export default defineRoute((config) => {
  const dialog = new Dialog({
    title: 'Confirm',
    content: [new Text('Are you sure?', { type: 'p' })],
    footer: [
      new Button('Cancel', { onClickHandler: () => dialog.close() }),
      new Button('Confirm', { variant: 'primary', onClickHandler: handleConfirm }),
    ],
    variant: 'info',
  })
  dialog.render()  // attaches to DOM (hidden)

  return [
    // ... other components ...
    dialog  // Router will clean this up on navigation
  ]
})
```

This pattern applies to Dialog AND Modal. Any component that calls `.render()` manually (outside the normal children flow) must ALSO be returned in the route array for cleanup.

### Master-Detail View

Use `ViewSwitcher` to toggle between the list view and the detail view. ViewSwitcher takes `[key, View]` tuples:

```javascript
function createMasterDetail(items) {
  const listView = new View([createListView(items)], {})
  const detailView = new View([createDetailView(selectedItem)], {})

  const viewSwitcher = new ViewSwitcher([
    ['list', listView],
    ['detail', detailView],
  ])

  // Switch views by key or index
  viewSwitcher.setView('detail')      // by key
  viewSwitcher.setViewByIndex(1)      // by index

  return viewSwitcher
}
```

### Async Data Loading

ListApi operations are async. Use FormField to manage loading state and update the UI when data arrives:

```javascript
function createAsyncList() {
  const listContainer = new Container([new Loader([], {})])

  api.getItems().then(items => {
    listContainer.children = items.map(renderItem)
  }).catch(() => {
    Toast.error('Failed to load data')
    listContainer.children = [new Text('Unable to load data.')]
  })

  return listContainer
}
```

### Protected Routes

Use CurrentUser with group hierarchy to conditionally register routes:

```javascript
const user = await new CurrentUser().initialize([
  { groupTitle: 'App Visitors', groupLabel: 'VISITOR' },
  { groupTitle: 'App Members', groupLabel: 'MEMBER' },
  { groupTitle: 'App Admins', groupLabel: 'ADMIN' },
])

const routes = ['dashboard', 'profile']
if (user.accessLevel === 'ADMIN') {
  routes.push('admin', 'admin/settings')
}
new Router(routes)
```

### Bulk Operations

Multi-select items for batch delete/update with progress feedback:

```javascript
const selectedIds = new FormField({ value: [] })

const handleBulkDelete = async () => {
  const ids = selectedIds.value
  if (!ids.length) return

  bulkDeleteBtn.isLoading = true
  const loading = Toast.loading(`Deleting ${ids.length} items...`)
  const failed = []

  for (const id of ids) {
    try {
      const item = items.find(i => i.ID === id)
      await api.deleteItem(id, item['odata.etag'])
    } catch {
      failed.push(id)
    }
  }

  if (failed.length) {
    loading.error(`${failed.length} items failed to delete`)
    selectedIds.value = failed  // keep failed items selected
  } else {
    loading.success('All items deleted')
    selectedIds.value = []
  }
  bulkDeleteBtn.isLoading = false
}
```

### Role-Based UI

Conditionally render UI elements based on user permissions:

```javascript
// Using CurrentUser group hierarchy
const user = await new CurrentUser().initialize(groupHierarchy)
const isAdmin = user.accessLevel === 'ADMIN'

const adminControls = isAdmin
  ? [new Button('Manage Users', { onClickHandler: handleManage })]
  : []

// Using RoleManager for fine-grained control
const roles = new RoleManager()
await roles.load()

const permissions = {
  editProject: ['admin', 'manager'],
  deleteProject: ['admin'],
  viewReports: ['*'],
}

const actions = []
if (roles.canAccess('editProject', permissions)) {
  actions.push(new Button('Edit', { onClickHandler: handleEdit }))
}
if (roles.canAccess('deleteProject', permissions)) {
  actions.push(new Button('Delete', { variant: 'danger', onClickHandler: handleDelete }))
}
```

### Cascading Dropdowns

ComboBox #1 subscriber drives ComboBox #2 options via the `dataset` setter:

```javascript
const categoryField = new FormField({ value: '' })
const subcategoryField = new FormField({ value: '' })

const subcategoryCombo = new ComboBox(subcategoryField, [], { placeholder: 'Select subcategory...' })

categoryField.subscribe((category) => {
  subcategoryField.value = ''  // reset dependent field
  subcategoryCombo.dataset = subcategories[category] || []
})

const categoryCombo = new ComboBox(categoryField, categories, { placeholder: 'Select category...' })
```

### Polling / Auto-Refresh

Periodically refresh data with `isAlive` guard for safe cleanup on navigation:

```javascript
export default defineRoute((config) => {
  config.setRouteTitle('Live Dashboard')
  const container = new Container([new Loader([], {})])

  const refresh = async () => {
    if (!container.isAlive) {
      clearInterval(intervalId)  // route was navigated away -- stop polling
      return
    }
    try {
      const items = await api.getItems({ Status: 'Active' })
      container.children = items.map(renderItem)
    } catch {
      // Backoff: skip this cycle, next interval will retry
    }
  }

  refresh()  // initial load
  const intervalId = setInterval(refresh, 30000)  // 30s refresh

  return [container]
})
```

The `isAlive` check guards against DOM operations on a removed component. When the Router navigates away, the container is removed from the DOM and `isAlive` becomes `false`, causing the next interval tick to self-clear.

---

## 10. App Developer Quick Reference

Copy-paste patterns for the most common operations in SPARC apps. Every pattern here is the complete, correct implementation. See `.claude/rules/async-ux-patterns.md` for the mandatory requirements behind these patterns.

### Form Submission (Complete Pattern)

```javascript
const handleSubmit = async () => {
  if (!schema.isValid) {
    schema.focusOnFirstInvalid();
    Toast.error('Please fix the highlighted fields');
    return;
  }

  submitButton.isLoading = true;
  const loading = Toast.loading('Saving...');
  try {
    await listApi.createItem(schema.parseForList());
    loading.success('Saved successfully');
    Router.clearNavigationGuard();  // if guard was set
    Router.navigateTo('target-route');
  } catch (error) {
    if (error.name === 'ConcurrencyConflict') {
      loading.error('Modified by another user. Please refresh.');
    } else {
      loading.error('Failed to save');
    }
  } finally {
    submitButton.isLoading = false;
  }
};
```

### Data Fetching on Route Load

```javascript
export default defineRoute(async (config) => {
  config.setRouteTitle('Project Detail');

  const uuid = Router.queryParams.get('uuid');
  if (!uuid) {
    throw new SystemError('InvalidRoute', 'Missing project UUID');
  }

  const api = new SiteApi().list('Projects');
  const [project] = await api.getItemByUUID(uuid);
  if (!project) {
    throw new SystemError('NotFound', `Project ${uuid} not found`);
  }

  return [/* components using project data */];
});
```

### Success Screen with Timed Redirect

Extract this as a shared utility in `app/utils/` to avoid duplication:

```javascript
// app/utils/success-screen.js
export function createSuccessScreen(message, redirectPath, delayMs = 3000) {
  setTimeout(() => Router.navigateTo(redirectPath), delayMs);
  return new Container([
    new Text(message, { type: 'h2' }),
    new Text(`Redirecting in ${delayMs / 1000} seconds...`, { type: 'p' }),
  ], { class: 'success-screen' });
}
```

### Debounce

Use `__lodash.debounce` (bundled) instead of writing inline debounce closures:

```javascript
const debouncedSearch = __lodash.debounce((query) => {
  const results = fuse.search(query);
  listContainer.children = results.map(renderItem);
}, 300);

searchField.subscribe(debouncedSearch);
```

### ComboBox Value Extraction

ComboBox stores `ComboBoxOptionProps` (`{ label, value }`) in FormField, not plain values. Always extract before writing to SharePoint:

```javascript
// Preferred: use parseForList() on a FormSchema (auto-extracts all ComboBox fields)
const data = schema.parseForList();
await listApi.createItem(data);

// Manual: use extractComboBoxValue() for individual fields
import { extractComboBoxValue } from '../dist/nofbiz.base.js';
const status = extractComboBoxValue(statusField.value); // returns the plain .value
await listApi.createItem({ Status: status });
```

**Anti-pattern: ComboBox values directly to SharePoint**

```javascript
// WRONG -- serializes { label: "Red", value: "red" } as JSON string
const data = schema.parse();
await taskList.createItem(data);

// RIGHT -- extracts .value from ComboBox fields automatically
const data = schema.parseForList();
await taskList.createItem(data);
```

The `toFieldValue()` function now throws `SystemError` if a ComboBoxOptionProps object reaches serialization, catching this bug at the storage boundary.

### PeoplePicker Value Extraction

PeoplePicker stores `UserIdentity` as the option value. Extract user data directly:

```javascript
// PeoplePicker option.value is UserIdentity
const identity = personField.value?.value   // UserIdentity
identity.email                               // 'john@company.com'
identity.displayName                         // 'John Doe'

// Store to list (auto-serialized via toJSON)
await api.createItem({ AssignedTo: identity })

// Read back from list
const assignee = UserIdentity.fromField(item.AssignedTo)
```

### CurrentUser Singleton

Instantiate once per route, reuse the reference. Multiple `new CurrentUser()` calls return the same singleton, but it reads as confusing intent:

```javascript
export default defineRoute(async (config) => {
  const user = await new CurrentUser().initialize(groupHierarchy);

  // Reuse 'user' everywhere in the route
  const displayName = user.get('displayName');
  const email = user.get('email');
  const isAdmin = user.accessLevel === 'ADMIN';

  // WRONG: calling new CurrentUser() again later in the route
  // It works (returns same singleton) but signals unclear intent
});
```

### TextInput Auto-Sync

TextInput automatically syncs with its FormField via a built-in debounced `input` handler (default 300ms). Do NOT add manual input handlers -- they bypass the internal debounce and cause double-triggering:

```javascript
// CORRECT -- TextInput handles sync automatically
const searchField = new FormField({ value: '' });
const searchInput = new TextInput(searchField, { placeholder: 'Search...' });

// Use debounceMs to control sync timing
const immediateInput = new TextInput(field, { debounceMs: 0 });    // immediate sync
const slowInput = new TextInput(field, { debounceMs: 500 });       // 500ms debounce

// WRONG -- do NOT do this
searchInput.setEventHandler('input', (e) => {
  searchField.value = e.target.value;  // redundant, double-triggers
});
```

### Detail Page Header

Common pattern for detail pages with title, status, and back navigation:

```javascript
function createDetailHeader(title, statusText, backRoute) {
  return new Container([
    new LinkButton('Back', backRoute, { variant: 'secondary' }),
    new Container([
      new Text(title, { type: 'h1' }),
      new Text(statusText, { type: 'span', class: 'status-badge' }),
    ], { class: 'header-title-row' }),
  ], { class: 'detail-header' });
}
```

### Media Assets (Images, Logos, Backgrounds)

Use `resolvePath('@/media/...')` for static assets. Create a `media/` folder in the app directory for images, logos, and backgrounds:

```
app/
  media/           # Static assets (images, logos, backgrounds)
    logo.svg
    bg.jpg
  routes/
  utils/
```

```javascript
new Image({ src: resolvePath('@/media/logo.svg'), alt: 'Company Logo' })
new Image({ src: resolvePath('@/media/bg.jpg'), alt: 'Background' })
```

Never use empty `src` attributes on Image components -- they cause spurious HTTP requests to the current page URL.

### Edit Form (Load + Update Existing Data)

```javascript
export default defineRoute(async (config) => {
  config.setRouteTitle('Edit Project');
  const uuid = Router.queryParams.get('uuid');
  const api = new SiteApi().list('Projects');
  const [item] = await api.getItemByUUID(uuid);

  const schema = new FormSchema({
    title: new FormField({ value: item.Title }),
    status: new FormField({ value: item.Status }),
  });

  Router.setNavigationGuard(() => {
    if (!schema.isDirty) return true;
    return 'You have unsaved changes. Leave this page?';
  });

  const submitButton = new Button('Save', { variant: 'primary' });
  const handleSubmit = async () => {
    if (!schema.isValid) {
      schema.focusOnFirstInvalid();
      Toast.error('Please fix the highlighted fields');
      return;
    }
    submitButton.isLoading = true;
    const loading = Toast.loading('Saving...');
    try {
      await api.updateItem(item.ID, schema.parseForList(), item['odata.etag']);
      loading.success('Saved');
      Router.clearNavigationGuard();
      Router.navigateTo('projects');
    } catch (error) {
      if (error.name === 'ConcurrencyConflict') {
        loading.error('Modified by another user. Please refresh.');
      } else {
        loading.error('Failed to save');
      }
    } finally {
      submitButton.isLoading = false;
    }
  };
  submitButton.setEventHandler('click', handleSubmit);

  return [/* form components using schema fields */];
});
```

### Delete Confirmation

```javascript
const deleteButton = new Button('Delete', { variant: 'danger' });
const dialog = new Dialog({
  title: 'Delete Project',
  content: [new Text('This action cannot be undone.', { type: 'p' })],
  footer: [
    new Button('Cancel', { onClickHandler: () => dialog.close() }),
    new Button('Delete', {
      variant: 'danger',
      onClickHandler: async () => {
        dialog.close();
        deleteButton.isLoading = true;
        const loading = Toast.loading('Deleting...');
        try {
          await api.deleteItem(item.ID, item['odata.etag']);
          loading.success('Deleted');
          Router.navigateTo('projects');
        } catch (error) {
          loading.error('Delete failed');
        } finally {
          deleteButton.isLoading = false;
        }
      },
    }),
  ],
  variant: 'warning',
});
dialog.render();

deleteButton.setEventHandler('click', () => dialog.open());
```

### Conditional Rendering with View

```javascript
const detailView = new View([/* detail content */], { showOnRender: false });
const emptyView = new View([new Text('Select an item', { type: 'p' })], { showOnRender: true });

// Toggle based on selection
selectionField.subscribe((selected) => {
  if (selected) {
    emptyView.hide(0);
    detailView.children = [renderDetail(selected)];
    detailView.show();
  } else {
    detailView.hide(0);
    emptyView.show();
  }
});
```

### TabGroup Usage

```javascript
const overviewView = new View([/* overview content */], {});
const detailsView = new View([/* details content */], {});

const tabs = new TabGroup([
  { key: 'overview', label: 'Overview', view: overviewView },
  { key: 'details', label: 'Details', view: detailsView },
], {
  onTabChangeHandler: (tab) => {
    // React to tab changes if needed
  },
});
```

### ViewSwitcher Wizard (Multi-Step Form)

```javascript
const step1View = new View([/* step 1 fields */], {});
const step2View = new View([/* step 2 fields */], {});
const step3View = new View([/* review + submit */], {});

const wizard = new ViewSwitcher([
  ['step1', step1View],
  ['step2', step2View],
  ['step3', step3View],
]);

const nextButton = new Button('Next', {
  onClickHandler: () => wizard.next(),
});
const prevButton = new Button('Back', {
  onClickHandler: () => wizard.previous(),
});
```

### Form Submission with Async Validators

When a form has async validators (e.g., server-side uniqueness checks), use `validateAllAsync()` instead of `schema.isValid`:

```javascript
const handleSubmit = async () => {
  submitButton.isLoading = true;
  const valid = await schema.validateAllAsync();
  if (!valid) {
    schema.focusOnFirstInvalid();
    Toast.error('Please fix the highlighted fields');
    submitButton.isLoading = false;
    return;
  }

  const loading = Toast.loading('Saving...');
  try {
    await listApi.createItem(schema.parseForList());
    loading.success('Saved successfully');
  } catch (error) {
    loading.error('Failed to save');
  } finally {
    submitButton.isLoading = false;
  }
};
```

Key differences from the sync flow:
- `isLoading = true` BEFORE validation (async validation may be slow)
- `await schema.validateAllAsync()` replaces `schema.isValid`
- All field validators (sync and async) run in parallel via `Promise.all`
- Fields without validators pass automatically (null !== false)
- Use `schema.isValidating` or `field.isValidating` to show loading indicators

### Navigation Guards in Practice

Every route with editable forms should set a navigation guard to prevent data loss:

```javascript
export default defineRoute((config) => {
  config.setRouteTitle('Edit Project');

  const schema = new FormSchema({
    title: new FormField({ value: existingProject.Title }),
    status: new FormField({ value: existingProject.Status }),
  });

  // Guard checks dirty state on every navigation attempt
  Router.setNavigationGuard(() => {
    if (!schema.isDirty) return true;
    return 'You have unsaved changes. Leave this page?';
  });

  const handleSave = async () => {
    // ... validation, isLoading, try/catch ...
    try {
      await listApi.updateItem(id, schema.parseForList(), etag);
      Router.clearNavigationGuard();  // clear BEFORE navigating away
      Router.navigateTo('projects');
    } catch (error) {
      // ... error handling ...
    }
  };

  return [/* form components */];
});
```

Guard key points:
- Set guard ONCE per route, not inside event handlers
- The guard function is called fresh on each navigation -- captures current state via closure
- Clear the guard BEFORE programmatic navigation after a successful save
- `Router.unauthorized()` bypasses guards (terminal redirect)
- Do NOT manually manage `beforeunload` -- the Router handles it automatically

### Concurrency Conflict Handling

Write operations (`updateItem`, `deleteItem`) require the item's `odata.etag`. If the item was modified since the etag was obtained, SharePoint returns HTTP 412 and SPARC throws `SystemError('ConcurrencyConflict', ..., { breaksFlow: false })`.

Uncaught: ConcurrencyConflict is non-breaking, so ErrorBoundary auto-shows `Toast.error` (no BreakingErrorDialog).

Explicit catch (preferred for forms with retry):

```javascript
try {
  await listApi.updateItem(currentItem.ID, schema.parseForList(), currentItem['odata.etag']);
  loading.success('Saved successfully');
} catch (error) {
  if (error.name === 'ConcurrencyConflict') {
    loading.error('This record was modified by another user.');
    const [refreshed] = await listApi.getItemByUUID(currentItem.UUID);
    currentItem = refreshed;
  } else {
    loading.error('Failed to save');
  }
}
```

### Common Async Mistakes

**Bare async handler (no safety):**
```javascript
// WRONG -- no try/catch, no isLoading, no feedback
const handleSave = async () => {
  await listApi.createItem(schema.parseForList());
  Router.navigateTo('projects');
};

// CORRECT -- all three requirements met
const handleSave = async () => {
  if (!schema.isValid) { schema.focusOnFirstInvalid(); Toast.error('Fix fields'); return; }
  submitButton.isLoading = true;
  const loading = Toast.loading('Saving...');
  try {
    await listApi.createItem(schema.parseForList());
    loading.success('Saved');
    Router.navigateTo('projects');
  } catch { loading.error('Failed to save'); }
  finally { submitButton.isLoading = false; }
};
```

**Manual input sync on auto-syncing components:**
```javascript
// WRONG -- TextInput already auto-syncs with its FormField
searchInput.setEventHandler('input', (e) => {
  searchField.value = e.target.value;  // redundant, causes double-triggering
});

// CORRECT -- rely on TextInput's built-in debounced sync (default 300ms)
const searchInput = new TextInput(searchField, { placeholder: 'Search...' });
```

---

## 11. Common Anti-Patterns

These are mistakes that frequently appear in AI-generated SPARC code. Each entry shows what NOT to do and the correct alternative.

### Raw HTML Instead of SPARC Components

Never create raw HTML elements. SPARC provides a component for every UI need (see the Component Selection Guide in Section 2).

```javascript
// WRONG -- raw HTML
const input = document.createElement('input')
input.type = 'text'

// CORRECT -- SPARC component
const field = new FormField({ value: '' })
const input = new TextInput(field, { placeholder: 'Enter...' })
```

### Reinventing Bundled Utilities

Never write custom implementations of operations already provided by bundled dependencies:

```javascript
// WRONG -- custom debounce
let timer;
const debounce = (fn, ms) => (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }

// CORRECT
const debouncedFn = __lodash.debounce(fn, 300)

// WRONG -- JSON round-trip for cloning
const copy = JSON.parse(JSON.stringify(obj))

// CORRECT
const copy = __lodash.cloneDeep(obj)

// WRONG -- manual date parsing
const parts = dateStr.split('-')
const date = new Date(parts[0], parts[1] - 1, parts[2])

// CORRECT
const date = __dayjs(dateStr)

// WRONG -- manual validation with regex
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ... }

// CORRECT
const isValid = __zod.string().email().safeParse(email).success

// WRONG -- custom fuzzy search
function fuzzyMatch(items, query) { ... }

// CORRECT
const fuse = new __fuse(items, { keys: ['Title'] })
const results = fuse.search(query)
```

### Wrong API Method Names

```javascript
// WRONG -- these methods do not exist
await api.addItem({ Title: 'New' })         // no addItem
await api.getItem(5)                         // no getItem(id)
await api.getItems({ $filter: "Status eq 'Active'" })  // no REST filter syntax

// CORRECT
await api.createItem({ Title: 'New' })
await api.getItemByUUID(uuid)               // or getItemByTitle, getItems with CAML
await api.getItems({ Status: 'Active' })    // CAML query object
```

### Missing ETag in Write Operations

```javascript
// WRONG -- missing etag
await api.updateItem(item.ID, { Status: 'Done' })
await api.deleteItem(item.ID)

// CORRECT -- pass etag from fetched item
await api.updateItem(item.ID, { Status: 'Done' }, item['odata.etag'])
await api.deleteItem(item.ID, item['odata.etag'])
```

### FormField for Read-Only Data

```javascript
// WRONG -- FormField for data that never changes via user input
const userName = new FormField({ value: user.get('displayName') })

// CORRECT -- plain variable for read-only data
const userName = user.get('displayName')
```

### Code Outside defineRoute

```javascript
// WRONG -- leaks memory, Router cannot clean up
const sharedState = new FormField({ value: '' })

export default defineRoute((config) => {
  return [new TextInput(sharedState)]
})

// CORRECT -- everything inside the callback
export default defineRoute((config) => {
  const sharedState = new FormField({ value: '' })
  return [new TextInput(sharedState)]
})
```

### Button for Declarative Navigation

```javascript
// WRONG -- manual navigation in click handler for simple links
new Button('View Project', {
  onClickHandler: () => Router.navigateTo('detail', { query: { uuid } })
})

// CORRECT -- LinkButton handles navigation, active state, cleanup
new LinkButton('View Project', 'detail', { navigationOptions: { query: { uuid } } })
```

Use `LinkButton` for all declarative navigation (links, nav menus, back buttons). Use `Button` + `Router.navigateTo` only for programmatic navigation that depends on async logic (e.g., navigate after successful save inside a try/catch). The async-ux-patterns examples correctly use Button for post-save navigation because the navigation is conditional on success.

### Uncaught ListApi Errors

```javascript
// WRONG -- uncaught error triggers BreakingErrorDialog
const handleSave = async () => {
  await api.createItem(schema.parseForList())
}

// CORRECT -- catch and show Toast
const handleSave = async () => {
  submitButton.isLoading = true
  const loading = Toast.loading('Saving...')
  try {
    await api.createItem(schema.parseForList())
    loading.success('Saved')
  } catch (error) {
    loading.error('Failed to save')
  } finally {
    submitButton.isLoading = false
  }
}
```

### Plain Error Instead of SystemError

```javascript
// WRONG -- bypasses ErrorBoundary
throw new Error('Something went wrong')

// CORRECT
throw new SystemError('OperationFailed', 'Something went wrong')
/// Or non-breaking:
throw new SystemError('ValidationWarning', 'Invalid input', { breaksFlow: false })
```

### Direct DOM Manipulation on Components

```javascript
// WRONG -- bypasses lifecycle, orphans event listeners
component.instance[0].innerHTML = '<p>New content</p>'
component.instance.append('<div>Extra</div>')

// CORRECT -- use the children setter
component.children = [new Text('New content', { type: 'p' })]
```

### Global State via window or Module Variables

```javascript
// WRONG
window.currentProject = projectData
// or module-level variable outside defineRoute

// CORRECT -- ContextStore for cross-route state
ContextStore.set('currentProject', projectData)
// In another route:
const project = ContextStore.get('currentProject')
```

### Raw PeoplePicker Email Extraction

```javascript
// WRONG -- extracting email from raw PeopleSearchResult (old pattern)
function getPeoplePickerEmail(field) {
  return field.value?.value?.EntityData?.Email || ''
}

// CORRECT -- PeoplePicker stores UserIdentity directly
const identity = personField.value?.value   // UserIdentity
const email = identity?.email               // 'john@company.com'
```

### Custom Notification/Modal UI

```javascript
// WRONG -- custom notification
const notification = document.createElement('div')
notification.className = 'custom-toast'
notification.textContent = 'Saved!'
document.body.appendChild(notification)

// CORRECT
Toast.success('Saved!')

// WRONG -- custom modal overlay
const overlay = document.createElement('div')
overlay.className = 'modal-backdrop'

// CORRECT
const dialog = new Dialog({
  title: 'Confirm',
  content: [new Text('Are you sure?', { type: 'p' })],
  footer: [new Button('Cancel', { onClickHandler: () => dialog.close() }),
           new Button('OK', { variant: 'primary', onClickHandler: handleOk })],
  variant: 'warning',
})
dialog.render()
dialog.open()
```

---

## 12. File Organization & Naming

File structure rules are in `.claude/rules/project-structure.md`. This section covers naming conventions only.

### Variables
- `camelCase` for all variables
- Descriptive names: `userEmailField` not `uef`
- Boolean prefixes: `isActive`, `hasPermission`, `canEdit`

### Functions
- `camelCase` with verb prefix: `createLoginForm`, `fetchProjectData`, `handleFormSubmit`
- Common prefixes: `create*`, `fetch*`, `handle*`, `check*`, `set*`, `get*`, `build*`, `validate*`

### Classes/Components
- `PascalCase` for component classes: `UserCard`, `ProjectTable`
- `camelCase` for factory functions: `createLoginForm`, `createUserTable`

### Files
- `kebab-case` for all files: `login-form.js`, `user-card.css`, `data-transforms.js`
- Folder names match kebab-case: `routes/user-profile/`

### CSS Classes
- BEM with `${LIB_PREFIX}__` prefix: `.nofbiz__componentname`, `.nofbiz__componentname--modifier`
- Component folder name matches CSS class base

### Constants
- `UPPER_SNAKE_CASE` for true constants: `MAX_RETRIES`, `API_TIMEOUT`

---

## 13. Development & Deployment

### Framework Development (TypeScript)

```bash
npm install          # Install dependencies once
npm run dev          # Watch mode -- auto-compiles TypeScript
npm run bundle       # Compile TypeScript + bundle with Rollup
npm run lint         # Check code quality
```

Output:
- `dist/nofbiz.base.js` -- main framework bundle
- `dist/nofbiz.base.d.ts` -- TypeScript definitions
- `dist/nofbiz.analytics.js` -- analytics module (optional)
- `dist/nofbiz.excelparser.js` -- excel parser module (optional)
- `dist/nofbiz.base.css` -- compiled SCSS

### Project Development (Using SPARC)

No build step required:

1. Deploy framework files to SharePoint (`/SiteAssets/dist/`)
2. Create entry HTML with media content webpart
3. Write application code in `/SiteAssets/app/` (plain JavaScript)
4. Refresh browser -- changes take effect immediately

```html
<script type="module" src="/sites/yoursite/SiteAssets/dist/nofbiz.base.js"></script>
<script type="module" src="/sites/yoursite/SiteAssets/app/index.js"></script>
```

In `index.js`:
```javascript
await pageReset({ clearConsole: true, removeStyles: true });
// styles are loaded -- safe to render
new Router([...]);
```

---

## 14. Glossary

- **HTMD**: HyperText Markup Dialect -- HTML syntax using JavaScript objects
- **HTMDNode**: A component instance that implements HTMDElementInterface, or a string, or an array of these
- **HTMDElement**: Abstract base class for all visual SPARC components
- **FormField**: Observable state container with optional validation and subscriber pattern (subscribe/dispose)
- **FormSchema**: Groups multiple FormFields for form-level validation and parsing
- **SPA**: Single-Page Application -- navigation without full page reloads
- **BEM**: Block-Element-Modifier -- CSS naming convention used by SPARC
- **LIB_PREFIX**: The project-wide CSS prefix (currently `nofbiz`), used in BEM class generation. Exported from `src/base/utils/misc/identity.ts`
- **defineRoute**: Factory function wrapping route content for lazy loading and GC-safe scoping
- **Router**: Singleton managing hash-based SPA navigation and route loading
- **Container**: Layout component wrapping children in an HTML element
- **Fragment**: Layout component rendering children without an HTML wrapper element
- **ErrorBoundary**: Component catching unhandled errors globally -- shows BreakingErrorDialog for flow-breaking errors, auto-shows Toast.error for non-breaking errors
- **ContextStore**: All-static cross-route key-value store for shared state that persists across navigations
- **ListApi**: SharePoint List CRUD interface using CAML queries
- **SiteApi**: Singleton per URL managing request digest tokens, list factory, and site-level operations
- **CurrentUser**: Async singleton providing current user profile, group memberships, and access level via group hierarchy
- **People API**: Identity resolution utilities (searchUsers, getUserProfile, getFullUserDetails)
