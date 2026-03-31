# Agent Delegation Rules

Development and review work MUST be delegated to the appropriate agent via the Task tool. Advisory and configuration work runs inline via skills.

---

## Mandatory Delegation (agents)

These tasks require isolated agent execution via the Task tool with the correct `subagent_type`. The orchestrator identifies what needs to be done and delegates -- it does not perform the work itself.

### App Development -- Projects Using Bundled SPARC

- Building routes, forms, components, navigation, SharePoint integration -- delegate to `sparc-app-base`
- Building analytics dashboards with chart components -- delegate to `sparc-app-analytics`
- Building CSV import/export and data analysis features -- delegate to `sparc-app-excel`
- App code review (DRY violations, scoping, project structure) -- delegate to `sparc-app-reviewer`

### Review

- Process efficiency, waste elimination, workflow optimization (Lean Six Sigma) -- delegate to `lss-reviewer`
- Usability evaluation from a non-technical end-user perspective -- delegate to `non-technical-reviewer`

## Inline Skills (no delegation)

These tasks run directly in the orchestrator conversation via skills, benefiting from full conversation context:

- SharePoint list design, permissions, deployment, data modeling -- handled by `sharepoint-advisor` skill
- `.claude/` config auditing and management (agents, skills, rules, CLAUDE.md) -- handled by `claude-config-manager` skill

## Context7 Prefetch for Agent Delegation

Delegated agents cannot access MCP servers. When a task involves third-party dependency APIs, the orchestrator should prefetch relevant documentation from Context7 and include it in the task prompt.

### Library-to-Agent Mapping

| Library | Context7 ID | Relevant Agents |
|---------|-------------|-----------------|
| D3 | `/d3/d3` | sparc-app-analytics |
| PapaParse | `/mholt/papaparse` | sparc-app-excel |
| Zod | `/colinhacks/zod` | sparc-app-base |
| dayjs | `/iamkun/dayjs` | sparc-app-base |
| Lodash | `/lodash/lodash` | sparc-app-base |
| Fuse.js | `/websites/fusejs_io` | sparc-app-base |

### Prefetch Protocol

1. Identify which third-party dependency APIs the task involves
2. Call `resolve-library-id` to confirm the Context7 library ID (use the table above as a starting point)
3. Call `query-docs` with a query scoped to the specific APIs needed
4. Include the fetched documentation in the agent's task prompt

### When to Skip Prefetch

- Task only involves SPARC-internal APIs (components, Router, FormField, etc.)
- Task is a review (reviewer agents analyze existing code, not dependency docs)
- Task does not touch any third-party API calls

## Parallel Execution

When a task requires multiple agents, the orchestrator runs them in parallel or in sequence based on file conflict risk.

### Write Targets

| Category | Agents | Write Target |
|----------|--------|-------------|
| App dev | `sparc-app-base`, `sparc-app-analytics`, `sparc-app-excel` | `app/` (routes may overlap on `app/utils/`, `app/css/`, `app/index.js`) |
| Review | `sparc-app-reviewer`, `lss-reviewer`, `non-technical-reviewer` | None (read-only) |

### Rules

**Safe in parallel (no isolation needed):**
- Any combination of review agents -- read-only
- Review agents alongside any dev agent -- reads never conflict with writes

**Requires worktree isolation (`isolation: "worktree"` on Task call):**
- Two or more app dev agents in parallel -- shared files in `app/` may conflict
- Two tasks delegated to the same agent

**Must run sequentially:**
- A dev agent followed by a reviewer that evaluates that agent's output

### Decision Checklist

Before launching parallel agents, the orchestrator checks:

1. Do they write to different directory trees? -- parallel, no isolation
2. Same tree but guaranteed different files? -- parallel, no isolation
3. Could they touch the same files? -- parallel with `isolation: "worktree"`, merge afterward
4. Does one depend on the other's output? -- sequential

### Worktree Merge

When agents use worktree isolation, each produces changes on a separate branch. After all complete:

1. Review each branch for conflicts
2. Merge branches one at a time into the working branch
3. If conflicts are non-trivial, delegate resolution to the agent with domain ownership of the conflicting files

### Worktree Safety Protocol

Worktree isolation only works if agents commit their changes inside the worktree. Without commits, the cleanup mechanism sees "no changes" and auto-deletes the worktree -- potentially losing work or silently writing edits to the main tree.

**Agent prompt requirement:** Every task using `isolation: "worktree"` MUST include this instruction in the prompt:

```
After making all edits, stage and commit your changes with a descriptive message.
Do NOT push. The orchestrator will merge your branch.
```

**Post-completion verification:** After all worktree agents complete, the orchestrator MUST verify isolation before proceeding:

```bash
git worktree list              # expect N+1 entries (main + one per agent)
git branch --list 'claude/*'   # expect one branch per agent
```

If only the main worktree appears, isolation failed. The orchestrator must:
1. Check if changes landed in the main working directory (compare with `git diff`)
2. If changes are present but unmerged, verify correctness manually -- files may have been silently overwritten
3. If changes are missing, re-run the agents sequentially

**Fallback -- when to skip worktree isolation entirely:**
- If all agents write to guaranteed non-overlapping files, parallel without isolation is safe and avoids worktree complexity
- If file overlap is possible and worktree behavior cannot be verified, run agents sequentially -- this is slower but guarantees correctness
- Reserve worktree isolation for cases where parallelism provides meaningful time savings AND file conflicts are a real risk
