# Change Log

Newest entries first. Format:

```
## 2026-10-02 — feat(TASK-7101): enforce the commit message format with lefthook
- What: `init` generates `lefthook.yml` and a POSIX `sh` commit-msg script that rejects headers not matching `type(#n|TASK-n): subject` (subject ≤ 72 characters) and attribution trailers; with graphify, `lefthook.yml` also refreshes the graph after each commit. lefthook is a required tool; `init --yes` runs `lefthook install` after `graphify hook install` unless `.husky/` or `.pre-commit-config.yaml` exists. AGENTS.md forbids `--no-verify`. `doctor` now checks graphify's post-checkout hook. This repository uses the same hooks. New page features/quality-gates.md.
- Why: The commit format was only written in a rule, so agents and people could still break it; a hook enforces it the same way for every language.
- Files: src/render/lefthook.ts, presets/base/files/.lefthook/, src/generate.ts, src/setup.ts, src/tooling.ts, src/doctor.ts, presets/base/rules/ci-quality-gates.md, lefthook.yml

## 2026-10-02 — feat(TASK-6209): install graphify hooks in initialised repos by default
- What: `init --yes` installs the graphify git hooks without --setup-tools when `.gitattributes` does not exist yet (otherwise it prints the command, so no existing file is changed); other setup steps still need --setup-tools. `doctor` reports the hook status inside a git repo (warning only). Generated getting-started pages and AGENTS.md → Project knowledge tell contributors to run `graphify hook install` after cloning.
- Why: Repositories set up with --yes, fresh clones and repos without git at init time never got the hooks, so the graph agents query went stale.
- Files: src/setup.ts, src/cli.ts, src/doctor.ts, src/render/agents-md.ts, presets/base/files/docs/wiki/*/getting-started.md, AGENTS.md, docs/wiki/*/features/tool-setup.md, test/*

## 2026-10-02 — chore(TASK-6208): install graphify git hooks in this repository
- What: graphify post-commit and post-checkout hooks are installed in this repository and the getting-started page tells each contributor to run `graphify hook install` once after cloning. The `.gitattributes` merge driver line written by graphify is committed so it does not show up as an untracked file.
- Why: The hooks were not installed, so the code graph only stayed current through manual `graphify update .` runs; hooks are local to each clone and are never committed.
- Files: .gitattributes, docs/wiki/{en,id}/getting-started.md

## 2026-10-02 — feat(TASK-6206): route AI agents to the English wiki and graphify first
- What: Generated AGENTS.md has a Project knowledge section (English wiki index first, no log, then graphify affected/path/explain with a budget, grep last); package AGENTS.md files point to it. init writes a .graphifyignore that keeps docs/wiki/id/ and change logs out of the graph. The graphify usage text prefers the free code graph. The documentation rule gains "Written for AI agents too" and the wiki skeleton index a task → page table. Topic pages generated-files, tool-setup and wiki-knowledge-base updated.
- Why: AGENTS.md only told agents to update the wiki, never to read it, so they explored code with grep; reading both languages doubled the tokens; and the Indonesian wiki and logs polluted graphify answers.
- Files: src/render/agents-md.ts, src/tooling.ts, presets/base/*, .graphifyignore, AGENTS.md, .agents/rules/documentation.md, docs/wiki/*, test/*

## 2026-10-02 — docs(TASK-6205): fill this repo's wiki as a knowledge base
- What: New pages overview, getting-started, glossary, faq and features/{stack-detection,presets,generated-files,scaffolding,tool-setup}, an updated architecture page (scaffolding, tool setup, moon, tests) and an index with reading paths, all in English and Indonesian with In short sections and Mermaid diagrams. test/wiki.test.ts guards twins, summaries, index links and diagrams. The index also has a task → page table for AI agents, who read the English pages only.
- Why: The wiki only had an architecture page from the first commit and a log, so it no longer matched the code and did not help non-developers or new developers.
- Files: docs/wiki/{en,id}/*, test/wiki.test.ts, README.md

## 2026-10-02 — feat(TASK-6204): generate a full bilingual wiki skeleton for new repos
- What: `init` now creates index (with reading paths for non-developers, new and experienced developers), overview, getting-started, architecture (with an example Mermaid diagram), glossary and faq in English and Indonesian, next to log. Each page starts with In short and explains what to write. Topic page features/wiki-knowledge-base.md and README updated.
- Why: New repositories only got index and log, so the knowledge base structure from the documentation rule had to be built by hand.
- Files: presets/base/files/docs/wiki/*, test/generate.test.ts, test/requirements.test.ts, README.md, docs/wiki/*/features/wiki-knowledge-base.md

## 2026-10-02 — docs(TASK-6203): make the wiki a knowledge base updated per topic
- What: The documentation rule, the update-wiki, definition-of-done and self-review skills, the MUST constraint and the generated Definition of Done require updating (or creating) the page of the topic you worked on, with an In short section for non-developers and a fixed page structure. New page: features/wiki-knowledge-base.md. Pages describing a flow, process or architecture get a Mermaid or ASCII diagram.
- Why: Only log.md was being updated, so the wiki fell behind the code and was not useful for new developers or non-developers.
- Files: presets/base/*, src/render/agents-md.ts, .agents/*, .claude/skills/*, AGENTS.md, docs/wiki/*, test/*

## 2026-10-02 — docs(TASK-4417): clarify that every shell command goes through rtk
- What: The rtk tooling text and the MUST constraint say the prefix covers git, file and script commands too, because rtk runs tools it has no filter for unchanged and keeps their exit code; `rtk proxy` is only for raw output of a filtered tool. A requirement guard protects the wording.
- Why: Agents skipped the prefix for git and script commands, partly from the wrong belief that rtk fails on tools it does not filter (tested: `rtk python3`, `rtk cp`, `rtk node` work and keep exit codes).
- Files: src/tooling.ts, presets/base/preset.json, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-2638): forbid attribution trailers and changed commit messages
- What: The git-workflow rule, the commit skill and the NEVER constraints forbid `Co-Authored-By:` and other AI/tool attribution trailers, and require committing exactly the approved message. Requirement guards protect it.
- Why: Agent defaults added a `Co-Authored-By: Claude` trailer that was not in the approved messages and is not part of the repo's commit format; the product owner decided not to use it.
- Files: presets/base/*, .agents/*, .claude/skills/commit, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-9157): make one task = one commit an explicit rule
- What: The git-workflow rule, the commit and plan-task skills and the MUST constraints now say explicitly: each task gets exactly one commit with its own reference, committed before the next task starts. Requirement guards protect it.
- Why: The plan-task skill only said "each ≈ one commit", and several tasks were once batched into a single commit that later had to be split.
- Files: presets/base/*, .agents/*, .claude/skills/{commit,plan-task}, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-7346): add doc comments to changed detection and generate code
- What: Plain-language doc comments for `detectProject`, `detectLayout`, `DetectOptions`, `WorkspaceInfo`, `readPatterns` and `rootCommands`; an orphaned comment left by an earlier refactor was moved to the function it describes. The formal self-review and Definition of Done ran for the whole audit.
- Why: The new rule requires a doc comment on every changed function; the self-review found these missing.
- Files: src/detect/index.ts, src/detect/workspace.ts, src/generate.ts

## 2026-10-02 — docs(TASK-7345): allow test-created temp folders as file-system fakes
- What: The testing rule allows temporary folders and fixture files that a test creates itself (`mkdtemp`, `test/fixtures/`) as a local fake instead of mocking the file system; real user folders, home directories and shared paths stay forbidden. A requirement guard protects this.
- Why: For tools that read files, mocking the file system would test nothing; the rule needed an explicit, safe exception (decision: option a).
- Files: presets/base/rules/testing.md, .agents/rules/testing.md, test/requirements.test.ts

## 2026-10-02 — test(TASK-7344): measure coverage and cover scaffold runner and guards
- What: Coverage is measured with `pnpm run test:coverage` (`@vitest/coverage-v8` 5.0.3, MIT, official vitest package). New tests cover every step type of the scaffold runner, the scaffold guards (offline, with fake tools on PATH) and `overridePresets`. AGENTS.md lists the coverage command in Commands and the Definition of Done.
- Why: The Definition of Done asks for at least 80% coverage on changed code, but coverage was never measured.
- Files: package.json, pnpm-lock.yaml, vitest.config.ts, AGENTS.md, test/run.test.ts, test/scaffold.test.ts, test/detect.test.ts

## 2026-10-02 — refactor(TASK-7343): move post-scaffold notes into a testable function
- What: The moonrepo reminder (first commit, `moon setup`) moved from `cli.ts` into `postScaffoldNotes()` in `src/scaffold/index.ts`, with unit tests.
- Why: Code inside `cli.ts` is only reached by end-to-end tests, and every function must have a unit test.
- Files: src/cli.ts, src/scaffold/index.ts, test/scaffold.test.ts

## 2026-10-02 — fix(TASK-7342): report broken package.json instead of swallowing the error
- What: The moon-tasks scaffold step reads package.json with `readJson`: a missing file means "no scripts", a broken file stops with an error that names its path.
- Why: The step used `.catch(() => null)`, which hid every read error, against the error-handling rule.
- Files: src/scaffold/run.ts, test/scaffold.test.ts

## 2026-10-02 — fix(TASK-5131): skip root install without package.json and document moon setup
- What: Monorepos without a root package.json (for example a Go + Python moon repo) no longer get an `npm install` root command. The README explains how to use the CLI before it is published to npm and lists the moon prerequisites.
- Why: A root `npm install` has nothing to install there, and `npx agent-initiator` returns 404 until the package is published.
- Files: src/detect/index.ts, src/generate.ts, test/generate.test.ts, README.md

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
