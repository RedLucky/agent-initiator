# Change Log

Newest entries first. Format:

```
## 2026-10-02 — docs(TASK-5130): require tests and plain-language doc comments for every function
- What: Testing and code-quality rules state they win over plugin defaults (ponytail): every function, including small private helpers, needs a unit test and a doc comment written in plain words; duplicated constraints were merged; new requirement guards.
- Why: The goal is code that junior and senior developers can both understand; the old wording contradicted ponytail and repeated the same constraints.
- Files: presets/base/*, .agents/*, .claude/skills/write-unit-test, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-5129): update moonrepo rule for moon v2 and detect .config/moon
- What: The moonrepo rule and preset follow moon v2: `.moon/toolchains.yml`, `.moon/tasks.*` and `.moon/tasks/**`, `moon templates`, simple task commands, a "Before running tasks" section (first commit, `moon setup`, no script inference) and `moon mcp` in Framework docs. Detection also accepts `.config/moon`.
- Why: The rule described moon v1 while moon 2.5.6 is current; v2 renamed the toolchain file and accepts `.config/moon`.
- Files: presets/moonrepo/*, src/detect/workspace.ts, test/detect.test.ts, test/fixtures/moon-config/

## 2026-10-02 — fix(TASK-5127): add moon CLI and per-app moon.yml when scaffolding
- What: moonrepo scaffolding adds `@moonrepo/cli` as a root dev dependency and writes a `moon.yml` per app (tasks from the package scripts that exist; fixed commands for Python and Go), and reminds the user about the first commit and `moon setup`.
- Why: moon does not read package.json scripts, so a new moon repo failed every Definition of Done command with "No tasks found".
- Files: src/scaffold/*, src/cli.ts, test/scaffold.test.ts

## 2026-10-02 — fix(TASK-5128): use moon project IDs and moon run :lint
- What: Per-package moon targets use the moon project ID (map key in .moon/workspace.yml, else folder name) instead of the package.json name; `lint` runs `moon run :lint` instead of `moon check`.
- Why: `moon check` needs a project ID in non-interactive shells and runs build+test, and `moon run @acme/web:test` is not a valid target.
- Files: src/detect/workspace.ts, src/detect/index.ts, src/types.ts, src/generate.ts, src/scaffold/templates.ts, presets/moonrepo/preset.json, test/*

## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- What: ...
- Why: ...
- Files: ...
```

## 2026-10-02 — feat(TASK-3814): enforce beginner-friendly doc comments, unit tests, and external mocking
- What: Added mandatory documentation rules (JSDoc for JS/TS, GoDoc for Go, docstrings for Python) across functions, classes, objects, and data types in plain, beginner-friendly language, specific inline comments explaining the "why", strict mandatory unit test requirements, and mandatory mocking of external boundaries (databases, Redis/caches, queues, HTTP APIs) across presets and agent rules.
- Why: Ensure high code maintainability, beginner-friendly clarity, non-obvious logic rationale, rigorous unit test verification, and isolated, non-flaky testing without hitting real external infrastructure.
- Files: presets/base/rules/code-quality.md, presets/base/rules/testing.md, presets/base/preset.json, presets/node/rules/javascript.md, presets/typescript/rules/typescript.md, presets/go/rules/go.md, presets/python/rules/python.md, AGENTS.md, .agents/rules/, test/__snapshots__/generate.test.ts.snap

## 2026-10-02 — docs(TASK-8819): update README with moonrepo support and scaffolding command
- What: Updated README.md diagram, quickstart section 3, CLI reference, and supported stacks table to reflect moonrepo support and add `--layout moonrepo` example command. Added moonrepo layout scaffolding support.
- Why: Clearly document moonrepo monorepo capabilities for users and CI automation.
- Files: README.md, src/scaffold/types.ts, src/scaffold/index.ts, src/scaffold/templates.ts, src/scaffold/recipes.ts, test/scaffold.test.ts

## 2026-10-02 — feat(TASK-4192): add moonrepo rules, constraints, and task guidelines
- What: Added dedicated moonrepo rule file (`rules/moonrepo.md`) and workspace constraints (`must`/`never`) covering project/action graphs, toolchain versions, build caching, task targets, and scaffolding generators.
- Why: Guide coding agents to respect moonrepo conventions (inputs/outputs, caching, toolchain, and graph inspection) when working in moonrepo workspaces.
- Files: presets/moonrepo/rules/moonrepo.md, presets/moonrepo/preset.json, test/generate.test.ts

## 2026-10-02 — feat(TASK-6182): support moonrepo multi-language workspaces
- What: Added moonrepo workspace detection (`.moon/workspace.yml`), project globs/map parsing, `moonrepo` preset, root target runners, and multi-language support (Go, Python, TypeScript).
- Why: Enable monorepos using moonrepo (such as zero-one-group monorepo templates) to automatically generate root and nested AGENTS.md across multiple programming languages.
- Files: presets/moonrepo/preset.json, src/detect/workspace.ts, src/types.ts, src/render/commands.ts, src/generate.ts, test/fixtures/moonrepo/, test/detect.test.ts, test/generate.test.ts

## 2026-09-30 — feat(TASK-2): optional per-repo tool setup during init
- What: `init` can run per-repo tool setup (graphify graph + git hooks, UI UX Pro Max skills) before generating files; new `--setup-tools` flag.
- Why: rtk, caveman and ponytail activate globally, but graphify and UI UX Pro Max need a step in every repo.
- Files: src/setup.ts, src/cli.ts, test/setup.test.ts, README.md

## 2026-09-30 — docs(TASK-1): add architecture page and dogfood agent config
- What: Ran agent-initiator on its own repo, added repo-specific context to AGENTS.md, an architecture wiki page, and a graphify graph (git-ignored). Rewrote README (why / what / how).
- Why: Use our own rules while developing the tool and make onboarding easier.
- Files: AGENTS.md, docs/wiki/{en,id}/architecture.md, README.md, .gitignore

## 2026-09-30 — chore: initialise agent configuration
- What: Added AGENTS.md, .agents rules/skills and this wiki via agent-initiator.
- Why: Give AI coding assistants consistent rules, constraints and workflows.
- Files: AGENTS.md, CLAUDE.md, .agents/, .claude/skills/, docs/wiki/
