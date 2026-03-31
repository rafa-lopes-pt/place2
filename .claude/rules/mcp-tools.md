# MCP Servers & LSP Plugin

Central reference for all external tool integrations available in the development environment.

---

## MCP Servers

### chrome-devtools

Browser automation and debugging via Chromium DevTools Protocol.

- **Snapshot/Screenshot**: `take_snapshot`, `take_screenshot` -- page content as a11y tree or image
- **Interaction**: `click`, `fill`, `hover`, `press_key`, `type_text`, `drag`, `upload_file`
- **Navigation**: `navigate_page`, `new_page`, `list_pages`, `select_page`, `close_page`
- **Performance**: `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`
- **Debugging**: `list_console_messages`, `get_console_message`, `list_network_requests`, `get_network_request`
- **Emulation**: `emulate` (viewport, network, geolocation, color scheme, CPU throttling)
- **Other**: `evaluate_script`, `handle_dialog`, `wait_for`, `resize_page`, `take_memory_snapshot`

### mdn

MDN Web Docs -- official documentation for web technologies.

- `search(query)` -- search MDN, returns summaries and compat-keys
- `get-doc(path)` -- full documentation page as markdown
- `get-compat(key)` -- browser compatibility data (use compat-key from search/get-doc, do not guess)

### context7

Real-time documentation and code examples for npm dependencies.

- `resolve-library-id(libraryName, query)` -- find Context7 library ID (must call before query-docs)
- `query-docs(libraryId, query)` -- fetch scoped documentation and code examples

## TypeScript LSP (vtsls)

Automatic language intelligence -- no manual tool calls needed.

- Jump-to-definition, find-references, type checking after edits
- Configured in `.claude/settings.json` via `enabledPlugins`

## Access

| Tool | Orchestrator | Inline Skills | Delegated Agents |
|------|-------------|---------------|-----------------|
| chrome-devtools | yes | yes | no |
| mdn | yes | yes | no |
| context7 | yes | yes | no |
| vtsls (LSP) | yes | yes | yes (automatic) |

Delegated agents run in isolated subprocesses without MCP server access. When an agent task involves dependency APIs, the orchestrator should prefetch Context7 docs and include them in the task prompt (see `.claude/rules/agent-delegation.md`).
