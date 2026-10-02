# Change Log

Newest entries first. Format:

```
## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- What: ...
- Why: ...
- Files: ...
```

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
