# Change Log

Newest entries first. Format:

```
## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- What: ...
- Why: ...
- Files: ...
```

## 2026-10-02 — fix(TASK-7114): close the coverage and graphify gaps from the evaluation
- What: A `test:coverage`, `coverage` or `test:cov` script becomes a `coverage` command (shown with `rtk test`; Go presets get `go test -cover ./...`) and the Definition of Done uses it. Without one, the DoD coverage step says to use the runner's coverage option or report coverage as not measured, asking before adding a dependency. Project knowledge tells agents to run `graphify update .` when `graphify-out/` does not exist yet. The evaluation page records which gaps were fixed and why the other two were left.
- Why: In the cross-model evaluation all three models got stuck on an unmeasurable coverage step, and Opus queried graphify before a graph existed.
- Files: src/render/{commands,agents-md}.ts, presets/go/preset.json, AGENTS.md, docs/wiki/*/features/{evaluation,generated-files}.md, test/*

## 2026-10-02 — docs(TASK-7107): record a cross-model evaluation of agent instructions
- What: New page features/evaluation.md (en/id): Claude Haiku 4.5, Sonnet 5.5 and Opus 5.5 each did the same slugify task in a repository set up by `init --yes`. All kept the hard limits (no commit, tests, doc comments, rtk commands); Sonnet and Opus followed the whole workflow, while Haiku skipped the wiki, the commit format and plan approval. Four gaps were found: no coverage command for the DoD, no rtk prefix on file/script commands, graphify queried before the graph exists, and MUST items skipped by the smallest model.
- Why: Claims of consistency across models needed evidence; this is a first, small sample (Claude models only, one run each).
- Files: docs/wiki/{en,id}/features/evaluation.md, docs/wiki/{en,id}/index.md

## 2026-10-02 — perf(TASK-7113): read topic rules on demand instead of on every task
- What: The documentation, architecture, data-privacy and observability rules are now on demand (`alwaysApply: false`) with descriptions that say when to read them; the seven core rules, including git-workflow, stay always. Rule texts and AGENTS.md MUST/NEVER are unchanged. The Rules intro mentions on-demand rules and the update-wiki skill points to the documentation rule. Per session, a generated Next.js repo now loads about 6,200 tokens instead of 8,600 (always rules 5,850 → 3,370).
- Why: Agents read every always rule before each task, so topic rules cost tokens on tasks that never touch their topic; their non-negotiable lines are already in AGENTS.md.
- Files: presets/base/rules/{documentation,architecture,data-privacy,observability}.md, presets/base/skills/update-wiki/SKILL.md, src/render/agents-md.ts, AGENTS.md, .agents/*, .claude/skills/update-wiki, docs/wiki/*/features/presets.md, test/*

## 2026-10-02 — feat(TASK-7112): make every helper tool optional, required once installed
- What: `init` checks which helper tools (ponytail, caveman, rtk, graphify, UI UX Pro Max) are installed and writes only those into AGENTS.md, where they are required; missing tools are not mentioned: commands without the `rtk` prefix, no graphify lines or `.graphifyignore`, no Required tooling section or required-tooling rule when nothing is installed. `doctor` lists every tool as optional and exits 0. Skills and rules (git, nx, moon, turbo) write shell commands as `{{rtk}}git status`, filled in as `rtk git status` only when rtk is installed (AGENTS.md commands: `rtk test` for tests, `rtk err` for builds and checks, `rtk proxy` for the rest); agents on a machine without a listed tool check once (`command -v`) and skip it instead of retrying, skills run AGENTS.md commands exactly as written there, and mention UI UX Pro Max and ponytail only "when installed"; the duplicate rtk and UI UX Pro Max MUST lines are gone.
- Why: A minimal setup for a fresh install: nothing has to be installed first, and every tool a developer already has is used.
- Files: src/{cli,generate,doctor}.ts, src/render/{agents-md,commands,tooling-rule}.ts, presets/*, AGENTS.md, .agents/*, .claude/skills/*, README.md, docs/wiki/*, test/*

## 2026-10-02 — refactor(TASK-7111): remove generated git hooks and lefthook
- What: `init` no longer writes `lefthook.yml` or `.lefthook/` (commit message check, lint before commit, typecheck and tests before push, wiki reminder) and no longer runs `lefthook install`; lefthook is no longer a required tool. Removed the renderer, the after-files setup step, the executable `.sh` writing, the kept-lefthook manual step, the `Wiki: not needed` line and the quality-gates wiki page. The rules, the commit skill and the wiki skeleton are back to their pre-TASK-7101 text (the audit level stays). This repository uninstalled lefthook; its graphify hooks are restored.
- Why: Back to pure agent configuration with fewer tools to install: one tool less for a fresh install and no extra files or hooks in every repository.
- Files: src/{generate,cli,setup,tooling,doctor}.ts, src/render/{lefthook,agents-md,commands}.ts, src/write/index.ts, presets/base/*, lefthook.yml, .lefthook/, AGENTS.md, .agents/*, docs/wiki/*, README.md, test/*

## 2026-10-02 — refactor(TASK-7110): remove CI pipeline generation
- What: `init` no longer writes GitHub Actions or GitLab CI files: removed the CI renderers, the `--ci` option, remote and existing-CI detection, the `packageManager` detection and pin notes, and the warning-only wiki job. This repository drops its `.github/workflows/ci.yml` and the pnpm pin. Kept: audits fail on high and critical advisories only, and Go audits with `go run …govulncheck@latest`. The ci-quality-gates rule is back to general guidance.
- Why: Generated CI needed constant upkeep (action versions, Docker images, corepack and toolchain workarounds) and went beyond agent configuration; the goal is a minimal tool, also for a fresh install.
- Files: src/generate.ts, src/cli.ts, src/types.ts, src/detect/*, src/render/{github-ci,gitlab-ci}.ts (removed), presets/base/rules/ci-quality-gates.md, package.json, docs/wiki/*, README.md, test/*

## 2026-10-02 — perf(TASK-7106): slim AGENTS.md to about 2,500 tokens
- What: The root AGENTS.md shrank from about 4,000 to about 2,500 tokens (16–17 KB to 9.5–11 KB): Required tooling keeps one usage line per tool and the purposes and install steps move to the generated rule `.agents/rules/required-tooling.md`; `always` rules are listed on one line and scoped rules with their file patterns (rules without globs show as "on demand" with their description, which also fixes `api-design` being shown as always); skills are listed by name. Constraints and the Definition of Done are unchanged. A test keeps every fixture's root AGENTS.md at or below 12 KiB. This repository's AGENTS.md uses the same sections.
- Why: Agents read AGENTS.md at the start of every session, so install commands and repeated descriptions cost tokens every time without changing behaviour.
- Files: src/render/agents-md.ts, src/render/tooling-rule.ts, src/generate.ts, src/tooling.ts, AGENTS.md, .agents/rules/required-tooling.md, README.md, test/*

## 2026-10-02 — feat(TASK-7105): warn when code changes without a wiki update
- What: New `.lefthook/pre-push/check-wiki.sh` (POSIX sh) warns when code (anything outside `docs/` and Markdown) changed but `docs/wiki/en/` did not, unless a commit message has `Wiki: not needed (<reason>)`. It runs before every push (lefthook, `use_stdin`) and in a `wiki check (warning only)` job for pull/merge requests; it never blocks. The documentation rule and commit skill explain the escape line. This repository uses the same hook and CI job.
- Why: Agents and people still forgot the wiki even though the rule requires it; a reminder at push and review time catches it while leaving the judgment to a person.
- Files: presets/base/files/.lefthook/pre-push/check-wiki.sh, src/render/{lefthook,github-ci,gitlab-ci}.ts, presets/base/rules/documentation.md, presets/base/skills/commit/SKILL.md, lefthook.yml, .github/workflows/ci.yml, test/*

## 2026-10-02 — feat(TASK-7104): choose GitLab or GitHub CI and keep existing CI
- What: `init --ci github|gitlab|none` chooses the pipeline. Without it, a repository that already has CI (GitHub workflows, `.gitlab-ci.yml`, Jenkins, CircleCI, Azure, Bitbucket, Travis) gets no CI file and a note to check its order; otherwise a git remote mentioning gitlab gets `.gitlab-ci.yml` (one job per package, official images, merge requests and the default branch), anything else GitHub Actions. `CiJob` moved to `src/types.ts` so both renderers share it.
- Why: GitLab projects got a GitHub workflow they cannot run, and repositories with their own CI got a second pipeline running the same checks twice.
- Files: src/render/gitlab-ci.ts, src/detect/ci.ts, src/generate.ts, src/cli.ts, src/types.ts, src/render/github-ci.ts, presets/base/rules/ci-quality-gates.md, test/*

## 2026-10-02 — feat(TASK-7103): generate a GitHub Actions CI workflow per package
- What: `init` writes `.github/workflows/ci.yml` (never overwriting one): one job per package that sets up its language, installs from the lockfile and runs lint → typecheck → test → build → audit with the AGENTS.md commands, with read-only permissions. pnpm/yarn come from corepack; `init` asks to pin `packageManager` when it is missing. Audits fail on high/critical only (`--audit-level high`); Go audits with `go run …govulncheck@latest` (`GOTOOLCHAIN=auto` on CI). Detection reads the `packageManager` field. This repository has the same workflow and pins pnpm 10.19.0 in package.json.
- Why: The quality-gates rule described the CI pipeline, but nothing created it, so merges were not protected by the checks.
- Files: src/render/github-ci.ts, src/generate.ts, src/render/commands.ts, src/detect/*, src/types.ts, src/cli.ts, presets/{node,monorepo,go}/preset.json, presets/base/rules/ci-quality-gates.md, .github/workflows/ci.yml, test/*

## 2026-10-02 — feat(TASK-7102): lint before commit, typecheck and tests before push
- What: `lefthook.yml` gets a `pre-commit` lint check and `pre-push` typecheck and test checks, built from the same detected commands as AGENTS.md but without the rtk prefix. Multi-package repos get one check per package, run inside it (`root`); before a commit only when staged files are in that package (`glob`). `format` is left out because format scripts often rewrite files. This repository runs typecheck and tests before push.
- Why: The quality-gates rule asked for local checks before commit and push, but nothing ran them, for any language.
- Files: src/render/lefthook.ts, src/render/commands.ts, src/generate.ts, src/tooling.ts, presets/base/rules/ci-quality-gates.md, lefthook.yml, test/*

## 2026-10-02 — fix(TASK-7109): install lefthook hooks after init writes lefthook.yml
- What: `lefthook install` now runs after the files are written; before, it ran first, wrote lefthook's default `lefthook.yml`, so ours was kept out and the commit-msg check never ran. A kept `lefthook.yml` gets a manual step with the `commit-msg` block. `.sh` files are written executable, so lefthook's chmod no longer leaves a mode change after the first commit.
- Why: A real smoke run with lefthook installed showed that `init --yes` accepted any commit message, and that the hook script showed up as modified after each first commit.
- Files: src/setup.ts, src/cli.ts, src/write/index.ts, .lefthook/commit-msg/check-message.sh (mode), test/setup.test.ts, test/write.test.ts

## 2026-10-02 — docs(TASK-7108): close the log format example before the entries
- What: The closing fence of the format example in `log.md` sat below most entries, so they rendered as one code block. The fence now closes right after the example, in both languages, and `test/wiki.test.ts` checks it.
- Why: Entries were added above the closing fence for several tasks, so the log was unreadable on GitHub and GitLab.
- Files: docs/wiki/{en,id}/log.md, test/wiki.test.ts, docs/wiki/{en,id}/features/wiki-knowledge-base.md, docs/wiki/{en,id}/architecture.md

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
