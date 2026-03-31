# SharePoint Data Rules

API-specific gotchas that cause incorrect code if not followed.

---

## ListApi

- `ListApi.getItems()` uses CAML queries (`CAMLQueryObject` or raw CAML XML string), NOT REST filter syntax
- `CAMLQueryObject` supports all operators: string values default to `Eq`; use `{ value, operator }` for explicit operators (Neq, Gt, Lt, Geq, Leq, Contains, BeginsWith, IsNull, IsNotNull); use `{ value: [...], operator: 'Or', match? }` for same-field multi-value OR; use `$or: [...]` for cross-field OR
- `getItems()` accepts an options object: `{ limit, orderBy, viewFields }` -- limit defaults to all items, orderBy sorts via CAML OrderBy, viewFields restricts returned fields
- `getItems()` automatically paginates in 500-item pages
- `getItemsPaged()` returns a `PaginatedResult<T>` with `items` and a `next()` function for manual page-by-page iteration. Accepts `GetItemsPagedOptions` which extends `GetItemsOptions` with `pageSize` (default 500). Use when you need incremental loading or want to process pages as they arrive
- Method is `createItem()`, not `addItem()`
- `updateItem(id, fields, etag)` -- partial update via MERGE, only specified fields are modified; etag is required for optimistic concurrency
- `deleteItem(id, etag)` -- etag is required
- All query methods return items with `odata.etag` (intersection type `T & SPItemWithETag`) -- use this etag for subsequent writes
- On ETag mismatch, SharePoint returns HTTP 412, which SPARC surfaces as `SystemError('ConcurrencyConflict', ..., { breaksFlow: false })` -- app code should catch this, re-fetch, and notify the user
- Schema operations (`deleteField`, `setFieldIndexed`) use wildcard `IF-MATCH: '*'` (no concurrency control for metadata)
- Query methods: `getItems()`, `getItemsPaged()`, `getItemByTitle()`, `getItemByUUID()`, `getOwnedItems()` -- there is no `getItem(id)`
- Field management: `getFields()`, `createField(options)`, `deleteField(internalName)`, `setFieldIndexed(internalName, indexed)`
- Only create Text or Note (multi-line text) fields -- never use other SharePoint field types
- Note fields: always `richText: false` (set automatically by `createField`)
- All operations are async (return Promises)
- `sanitizeQuery(fields)` -- strips null/undefined entries from a query object before passing to `getItems()`. For Or conditions, filters null/undefined from the value array. Returns a clean `CAMLQueryObject` or `undefined` if nothing remains
- Input validation: all write methods throw `SystemError` with descriptive messages on invalid inputs (null fields, empty objects, non-integer IDs, empty ETags). Errors are `breaksFlow: true` -- they indicate programmer mistakes, not user errors

## Field Value Serialization

ListApi automatically handles conversion between JavaScript types and SharePoint's string-only storage.

### Storage Tiers

| Tier | JS Type | Stored As | Example |
|------|---------|-----------|---------|
| Simple | `string` | As-is | `"hello"` |
| Simple | `number`, `boolean` | `String(value)` | `"42"`, `"true"` |
| List | `Array<string\|number\|boolean>` | JSON array | `'["a","b","c"]'` |
| Complex | Object or array of objects | JSON | `'{"Email":"x","Name":"y"}'` |

### Auto-Serialization (Writes)

`createItem` and `updateItem` accept `Record<string, SPFieldValue>` -- values are auto-serialized via `toFieldValue()`:

- Strings pass through unchanged
- Numbers and booleans become their string representation
- Arrays and objects become `JSON.stringify()` output

### Auto-Parsing (Reads)

All query methods (`getItems`, `getItemsPaged`, `getItemByTitle`, `getItemByUUID`, `getOwnedItems`) auto-parse returned items:

- `"true"` / `"false"` -> `boolean`
- Strings starting with `{` or `[` -> parsed as JSON (fallback to raw string on parse error)
- Numeric strings remain as strings (preserves CAML query compatibility)
- Non-string properties (`Id`, `__metadata`, `odata.etag`) pass through unchanged

### Manual Parsing

`fromFieldValue<T>(raw)` is exported for explicit type conversion when auto-parsing is insufficient:

```js
const tags = fromFieldValue<string[]>(item.Tags);  // parse JSON array
const config = fromFieldValue<{ theme: string }>(item.Config);  // parse JSON object
```

### Power BI Compatibility

- Simple values are stored as plain strings -- Power BI reads them directly
- JSON-stored values (tiers 2-3) require Power BI's `Json.Document()` to parse
- Boolean fields stored as `"true"`/`"false"` are recognized by Power BI as text; use a column transform to convert

## ComboBox Field Values

ComboBox stores full option objects (`{ label, value }`) in FormField, not plain values. Writing these directly to SharePoint causes silent data corruption.

- **`schema.parseForList()`** -- preferred. Like `parse()` but auto-extracts `.value` from ComboBox fields. Returns `Record<string, SPFieldValue>` ready for `createItem()`/`updateItem()`
- **`extractComboBoxValue(field.value)`** -- manual extraction for individual fields outside a schema
- **`toFieldValue()` guard** -- throws `SystemError` if ComboBoxOptionProps reaches serialization directly. Error message directs to the fix
- `isComboBoxOption(value)` -- duck-type check, exported for edge cases

Always use `parseForList()` instead of `parse()` when the result goes to `createItem()` or `updateItem()`.

## CurrentUser

- Source: `src/base/sharepoint/user/CurrentUser.ts`
- Singleton pattern -- second constructor call returns existing instance
- Lifecycle: `await new CurrentUser().initialize(groupHierarchy?, options?)` -- `options` is `InitializeOptions` with optional `targetUser` to load a different user's profile (debug/testing)
- Type-safe accessor: `user.get(key)` with keys: `employeeId`, `loginName`, `displayName`, `email`, `siteUserId`, `jobTitle`, `pictureUrl`, `personalUrl`, `directReports`, `managers`, `peers`, `groups`, `profileProperties`
- Group hierarchy getters: `accessLevel`, `group`, `groupId`, `groupTitle`, `isInitialized`
- Group hierarchy is hardcoded per site/app -- an ordered array of `{ groupTitle, groupLabel }` entries
- Error recovery: failed `initialize()` clears singleton for retry
- NOT: `.AccountName`, `.UID`, `.City`, `.Country`, `.DisplayName` (old API) -- these do not exist

## People API

- Source: `src/base/sharepoint/api/people.api.ts`
- Identity resolution utilities -- not tied to list operations
- `searchUsers(query, options?)` -- AD search via people picker
- `getUserProfile(loginName)` -- farm-wide profile from PeopleManager
- `getFullUserDetails(loginName, siteApi)` -- consolidated (ensureUser + groups + profile), fault-tolerant
- Plain `DOMAIN\user` login names are auto-resolved to claims format
- User data is stored in lists as plain strings (email, employee ID), not as SP user objects
- **UserIdentity** (`src/base/sharepoint/user/UserIdentity.class.ts`) -- preferred for user references in lists. Auto-serializes via `toJSON()`, read back with `fromField()` / `manyFromField()`. Supports extensible custom properties (`new UserIdentity(email, name, { team, role })`) that survive serialization round-trips. `with()` for immutable enrichment, `prop(key)` / `hasProp(key)` for access. PeoplePicker stores `UserIdentity` as `ComboBoxOptionProps.value`

## HTTP Layer

- Exported as `spGET`, `spPOST`, `spDELETE`, `spMERGE` -- no aliases
- Escape hatch for SharePoint REST endpoints not covered by SiteApi/ListApi
- `X-RequestDigest` auto-injected on POST/DELETE/MERGE
- Auto-retries once on 403 digest expiry (async mode only)
- Most work should go through SiteApi and ListApi

## Data Modeling

- All fields are Text (single-line, up to 255 chars) or Note (multi-line, `richText: false`) only
- **Preferred**: `UserIdentity` for user references -- auto-serializes to JSON, read back with `fromField()` / `manyFromField()`
- **Legacy fallback**: email for single-user columns, employee ID for multi-user/compact columns
- Employee ID: globally unique, compact, extracted from claims login name -- parsing is app-level
- Never store site user IDs (numeric, per-site, unreliable across migrations)
- Index columns used as CAML query filters to avoid list view threshold throttling
- Always index: Title field (every list), UUID field (when present)
- Use `createField({ indexed: true })` or `setFieldIndexed()` for indexing
