---
name: claude-config-manager
description: "Audits and maintains .claude/ configuration files, agents, rules, and CLAUDE.md consistency"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
user-invocable: true
disable-model-invocation: false
---

# Claude Config Manager

## Role

Maintains the `.claude/` configuration directory and root `CLAUDE.md` as the project evolves. Ensures all agent definitions, skill files, rule files, and the central reference document stay consistent with each other. This is a meta-skill -- it does not write application code or framework source, it manages the AI configuration layer that guides all other agents and skills.

## Scope

### Owns (can create, modify, delete)
- `.claude/agents/*.md` -- agent definition files
- `.claude/skills/*/SKILL.md` -- skill definition files
- `.claude/rules/*.md` -- coding rule files
- `CLAUDE.md` -- root AI reference document (lean index of agents, skills, and references)
- `.mcp.json` -- MCP server configuration
- `.claude/settings.json` -- plugin and environment settings

### Reads (for verification, never modifies)
- `site/SiteAssets/app/libs/nofbiz/nofbiz.base.d.ts` -- to verify component API signatures
- App code in `site/SiteAssets/app/` -- to verify project structure
- `.claude/sparc-guide.md` -- to check for consistency with agent/skill claims
- `site/SiteAssets/app/libs/nofbiz/` -- bundled framework files (managed by `sparc-update-dist`)

### Never touches
- SPARC framework source (not available in app projects)
- Framework bundles in `site/SiteAssets/app/libs/nofbiz/` (managed by `sparc-update-dist`)
- Application code (owned by developers, not config management)
- `.claude/sparc-guide.md` (updates managed separately -- managed by `sparc-update-dist`)
- `.claude/settings.local.json`
- `.claude/plans/`

## Audit Process

Run this checklist when asked to audit, or before making any changes.

### Step 1: Inventory

Collect the ground truth:
- Glob `.claude/agents/*.md` -- list all agent files
- For each: extract YAML frontmatter (name, description, model, tools, skills) and body references to rule files
- Glob `.claude/skills/*/SKILL.md` -- list all skill files
- For each: extract YAML frontmatter (name, description, allowed-tools, user-invocable, disable-model-invocation)
- Glob `.claude/rules/*.md` -- list all rule files
- Read `CLAUDE.md` -- extract agent tables, skill tables, and reference pointers
- Read `.mcp.json` -- list configured MCP servers
- Read `.claude/settings.json` -- check enabledPlugins
- Cross-reference with `.claude/rules/mcp-tools.md`

### Step 2: Compare

Check for discrepancies:
- **Missing from CLAUDE.md**: Agent/skill file exists but no row in the tables
- **Ghost entries**: Table lists an agent/skill that has no corresponding file
- **Stale metadata**: Table says different scope/model than file specifies
- **Broken rule references**: Agent/skill body says "Read `.claude/rules/foo.md`" but that file does not exist
- **Tool mismatches**: Table lists different tools than file frontmatter specifies
- **Skill linkage**: Agent frontmatter `skills:` field references a skill that does not exist
- **Orphaned skills**: Skill exists but is not referenced by any agent and not listed as inline
- **MCP drift**: Server configured in `.mcp.json` but not documented in `.claude/rules/mcp-tools.md`, or vice versa
- **Plugin drift**: Plugin in `.claude/settings.json` but not documented in `.claude/rules/mcp-tools.md`, or vice versa

### Step 3: Report

Output a structured audit report:
```
# Config Audit Report

Files scanned: X agents, Y skills, Z rules
CLAUDE.md tables checked

## Discrepancies Found

### [Type]: [Description]
- Expected: [what should be true]
- Actual: [what is true]
- Fix: [specific edit needed]

## All Clear
[List items that passed all checks]
```

### Step 4: Fix (if requested)

Apply fixes atomically -- when adding/removing an agent or skill, update the relevant table in `CLAUDE.md`.

## Creating a New Agent

When asked to create a new agent, follow this process:

1. **Determine category**: Source Developer, Source Quality, App Developer, Reviewer, Advisor, or Config Management (or propose a new category)
2. **Determine model**: opus for write-heavy development work, sonnet for review/advisory work, haiku only for lightweight documentation
3. **Determine tools**: Development agents get Read+Write+Edit+Glob+Grep+Bash; review-only agents get Read+Grep+Glob+Bash; advisory agents add WebSearch+WebFetch
4. **Determine rules**: Which `.claude/rules/` files should this agent read? Match based on what it modifies
5. **Create the skill file first** (`.claude/skills/<name>/SKILL.md`) with full domain knowledge
6. **Write the agent file** as a minimal wrapper referencing the skill
7. **Update CLAUDE.md** agent and skill tables
8. **Run audit** to verify consistency

## Modifying an Existing Agent

1. Read the current agent file and its linked skill file
2. Make the requested changes (domain knowledge goes in the skill, agent stays minimal)
3. If model, tools, scope, or rules changed: update CLAUDE.md tables
4. If the agent's task description changed: update CLAUDE.md tables
5. Run audit to verify consistency

## Adding a New Rule File

1. Create `.claude/rules/<name>.md` -- plain markdown, no YAML frontmatter
2. Follow format: H1 title, horizontal rule, H2 sections with bullet points
3. Identify which agents/skills should read this rule (based on what the rule governs)
4. Update those skill files to include the rule in their "Mandatory First Step" section
5. Update CLAUDE.md tables if applicable
6. Run audit to verify consistency

## Removing an Agent or Rule

1. Delete the file
2. Remove all references from CLAUDE.md tables
3. If removing a rule: remove references from all agent/skill files that read it
4. Run audit to verify no orphaned references remain

## CLAUDE.md Size Management

The file should stay lean (~30-50 lines). It is purely a directory/index:
- Table rows should be single-line descriptions
- Never duplicate information that already exists in skill files, agent files, or `.claude/sparc-guide.md`
- No rules, no code examples, no dependency lists -- those belong in `.claude/rules/` and `.claude/sparc-guide.md`

## Agent File Conventions

All agent files must follow these conventions (enforce during audits):

- **Filename**: kebab-case, `.md` extension
- **YAML frontmatter**: `name`, `description`, `model`, `tools`, `skills` -- no extra fields
- **Valid models**: `claude-opus-4-6`, `claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001`
- **Valid tools**: `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `WebSearch`, `WebFetch`
- **Body**: Minimal wrapper (~5 lines) referencing the preloaded skill for full instructions

## Skill File Conventions

All skill files must follow these conventions (enforce during audits):

- **Location**: `.claude/skills/<skill-name>/SKILL.md`
- **Directory name**: kebab-case, matches the `name` field in frontmatter
- **YAML frontmatter**: exactly `name`, `description`, `allowed-tools`, `user-invocable`, `disable-model-invocation`
- **Body**: Full domain knowledge -- Role, Expertise, Mandatory First Step, Module Structure, Key Patterns, Process, Reference Files, Output Format, Review Checklists (where applicable), Interaction Style (for conversational skills)

## Reference Files

- `CLAUDE.md` -- the central document this skill maintains
- `.claude/agents/*.md` -- all agent definitions
- `.claude/skills/*/SKILL.md` -- all skill definitions
- `.claude/rules/*.md` -- all rule files
