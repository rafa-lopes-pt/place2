# Async UX Patterns

Mandatory safety rules for async operations. Detailed code examples, common mistakes, and advanced patterns are in `.claude/sparc-guide.md` Section 10.

---

## Minimum Requirements (Non-Negotiable)

Every user-initiated async operation (button click, form submit, data load) MUST follow all three rules. Omitting any one of them is a bug.

1. **`try/catch` around every ListApi call** -- uncaught errors trigger BreakingErrorDialog (full-screen, blocks interaction). Catch them and show a Toast instead.
2. **`isLoading = true` on the triggering button** -- prevents double-submission and gives visual feedback. Reset in `finally`.
3. **Loading feedback via Toast or Loader** -- `Toast.loading()` for non-blocking operations, `Loader` component for blocking operations where the user should wait before proceeding.

These apply to ALL async user actions -- form submissions, delete confirmations, status changes, data refreshes, and any click handler that awaits a Promise.

### Blocking vs Non-Blocking

- **Non-blocking** (user can continue): `Toast.loading()` or `Toast.promise()`. Example: saving a draft, refreshing data.
- **Blocking** (user must wait): `Loader` component overlays the section. Example: submit before redirect.

---

## Form Submission Flow

1. Validate via `schema.isValid` (or `await schema.validateAllAsync()` for async validators)
2. If invalid: `schema.focusOnFirstInvalid()` + `Toast.error(...)` + return
3. `submitButton.isLoading = true`
4. `const loading = Toast.loading('Saving...')`
5. `try { await listApi.createItem(schema.parseForList()); loading.success('Saved'); }`
6. `catch { loading.error('Failed'); }`
7. `finally { submitButton.isLoading = false; }`

---

## Toast Selection

- **`Toast.promise(promise, messages)`** -- single promise drives the operation. Auto loading/success/error.
- **`Toast.loading(message)`** -- manual lifecycle (`.success()`, `.error()`, `.dismiss()`). Use for multi-step or conditional messages.
- **`Toast.success/error/info/warning`** -- one-shot notifications.
