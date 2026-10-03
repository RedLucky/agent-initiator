# agent-initiator

**One command to give every new repository the same high-quality instructions for AI coding assistants.**

`agent-initiator` detects your stack (or creates a new project for you) and writes an `AGENTS.md`, rules, skills, constraints, a Definition of Done and a bilingual wiki. The files work in Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode and Claude Code.

```bash
npx agent-initiator init
```

---

## Contents

1. [Why](#why)
2. [What you get](#what-you-get)
3. [How it works](#how-it-works)
4. [Quick start](#quick-start)
5. [CLI reference](#cli-reference)
6. [Generated files](#generated-files)
7. [What the rules contain](#what-the-rules-contain)
8. [Supported stacks](#supported-stacks)
9. [Optional tooling](#optional-tooling)
10. [Safety principles](#safety-principles)
11. [FAQ and troubleshooting](#faq-and-troubleshooting)
12. [Development](#development)
13. [Limitations and roadmap](#limitations-and-roadmap)

---

## Why

AI coding assistants follow the instructions they find in the repository. Without instructions, you get:

- **Inconsistency** — every repo (and every developer) writes different prompts, rules and conventions, or none at all.
- **AI slop** — vague, over-engineered code with speculative abstractions, missing error handling and no tests.
- **Unsafe habits** — agents that commit or push on their own, leak secrets in logs, or "fix" unrelated code.
- **Stale knowledge** — agents write code for the framework version in their training data, not the one you installed.
- **Wasted time** — every new project starts by copying and adapting instruction files by hand.

agent-initiator fixes this by generating a **consistent, opinionated and stack-aware** setup in seconds, based on industry standards and the frameworks' own official guidance.

## What you get

- **An `AGENTS.md` entry point**, read automatically by most agents. It contains:
  - a project overview
  - the exact commands for your stack
  - how to use each helper tool installed on your machine (install steps are in `.agents/rules/required-tooling.md`)
  - MUST/NEVER constraints
  - the Definition of Done
  - links to every rule and skill
  
  It stays small (about 2,500 tokens, at most 12 KiB) because agents read it at the start of every session; details live in the files it links to.
- **Detailed rules** (`.agents/rules/`): code quality, naming, error handling and logging, security, architecture, testing, git workflow, documentation, privacy and more, plus framework-specific rules.
- **Skills** (`.agents/skills/`, in the open [Agent Skills](https://agentskills.io) format): step-by-step workflows such as `plan-task`, `self-review`, `debugging`, `definition-of-done`, `commit`, and framework recipes like `nextjs-add-route` or `nestjs-add-module`.
- **Claude Code support**: `CLAUDE.md` imports `AGENTS.md`, and skills are mirrored to `.claude/skills/`.
- **A bilingual LLM wiki** (`docs/wiki/en` + `docs/wiki/id`) with an index and a change log that agents keep up to date.
- **Monorepo awareness**: a root `AGENTS.md` plus one per package, with package-scoped commands.
- **Optional project scaffolding**: in an empty folder it creates the app first, with the framework's official scaffolder, and then generates the config.

## How it works

```
 empty folder? ──► 0. scaffold   official CLIs (create-next-app, nest new, create-nx-workspace, uv, …)
                        │
                        ▼
                  1. detect      package.json · pyproject.toml · go.mod · turbo.json · nx.json · .moon/workspace.yml · lockfiles
                        │
                        ▼
                  2. resolve     presets layered: base → language → shared → framework
                        │
                        ▼
                  3. generate    AGENTS.md · rules · skills · CLAUDE.md · wiki (per package in monorepos)
                        │
                        ▼
                  4. write       only files that do not exist yet — never overwrites
                        │
                        ▼
                  5. doctor      shows which optional tools are installed
```

Content lives in plain Markdown and JSON **presets**. The code only detects, merges and writes. Details: [`docs/wiki/en/architecture.md`](docs/wiki/en/architecture.md).

## Quick start

Requirements: Node.js ≥ 20. For scaffolding you also need the matching toolchain: a package manager for Node apps, [`uv`](https://docs.astral.sh/uv/) for Python, and `go` for Go.

> **Not on npm yet:** until the package is published, `npx agent-initiator` returns a 404. Install it from a clone instead:
> `git clone … && cd agent-initiator && pnpm install && pnpm run build && pnpm link --global` (run `pnpm setup` once if pnpm reports `ERR_PNPM_NO_GLOBAL_BIN_DIR`), then use `agent-initiator …` instead of `npx agent-initiator …`.

### 1. Existing repository

```bash
cd my-app
npx agent-initiator init            # detects the stack, asks for confirmation, writes the files
npx agent-initiator init --dry-run  # preview what would be written
```

### 2. New project (interactive)

```bash
npx agent-initiator init my-new-app
```

It asks, in order:

1. What to do (create a project, pick presets only, or base rules only).
2. The layout.
3. The framework(s) and app names.
4. The language.
5. The package manager.
6. Whether to install dependencies.

### 3. New project (non-interactive / CI)

```bash
npx agent-initiator init shop --framework nextjs --yes                               # single app
npx agent-initiator init acme --apps web:react-vite,api:fastapi --yes                 # web/ + api/ (fullstack)
npx agent-initiator init acme --layout turborepo --apps web:nextjs,api:nestjs --pm pnpm --yes
npx agent-initiator init acme --layout nx --apps web:nextjs,api:nestjs --yes
npx agent-initiator init acme --layout moonrepo --apps web:nextjs,api:fastapi --pm pnpm --yes
npx agent-initiator init acme --layout workspaces --apps web:vue-vite,api:hono --skip-install --yes
```

### 4. Check your machine

```bash
npx agent-initiator doctor   # ✓/○ for each optional tool, with install commands
```

Then review the generated files and commit them when you are happy. The tool never commits for you.

## CLI reference

| Command | What it does |
|---------|--------------|
| `init [dir]` (default) | Detect or scaffold, then generate agent config into `dir` (default: current folder) |
| `list` | List all presets by category |
| `status [dir]` | Compare the repository with what this version generates: outdated, edited, conflict, missing or obsolete files, with a `git diff` command for each; exit code 1 when files are outdated, in conflict or missing |
| `doctor` | Show which optional tools are installed, with install commands for the others |

`init` options:

| Option | Description |
|--------|-------------|
| `-y, --yes` | No prompts: accept detected presets |
| `--dry-run` | Show the file plan without writing anything |
| `-p, --preset <ids>` | Use these presets instead of detection, e.g. `typescript,nestjs` |
| `--framework <id>` | Scaffold a single-app project (new or empty folder only) |
| `--apps <list>` | Scaffold several apps: `name:framework,…`, e.g. `web:nextjs,api:nestjs` |
| `--layout <layout>` | `single` · `folders` · `turborepo` · `nx` · `moonrepo` · `workspaces` (default: `single`, or `folders` for several apps) |
| `--lang <ts\|js>` | Language for Node apps (default `ts`; TS-only frameworks ignore `js`) |
| `--pm <pm>` | `pnpm` · `npm` · `yarn` · `bun` (default: pnpm if installed, else npm) |
| `--skip-install` | Do not install dependencies, where the scaffolder allows it |
| `--upgrade` | Update files init wrote that nobody edited to this version and add missing ones; edited files are never touched (combine with `--dry-run`) |
| `--setup-tools` | Run per-repo tool setup without asking (see [Optional tooling](#optional-tooling)) |

In `--yes` mode, an empty folder without `--framework`, `--apps` or `--preset` stops with an error and example commands. It does not silently write a base-only setup.

## Generated files

```
AGENTS.md                           entry point for every agent (see "What you get")
CLAUDE.md                           "@AGENTS.md" so Claude Code reads the same instructions
.agents/rules/*.md                  rules (frontmatter: description, globs, alwaysApply)
.agents/skills/<name>/SKILL.md      skills (Agent Skills format)
.claude/skills/<name>/SKILL.md      copy of the skills for Claude Code
docs/wiki/{en,id}/                  bilingual wiki knowledge base: index (reading paths), overview,
                                    getting-started, architecture (Mermaid), glossary, faq, log
<package>/AGENTS.md                 monorepos / multi-folder repos: package commands, rules, docs
```

`AGENTS.md` sections:

- Project overview (plus a package table in monorepos)
- Commands, prefixed with `rtk`
- Framework docs
- Required tooling (one usage line per tool)
- Constraints (MUST / NEVER)
- Definition of Done
- Conventions
- Rules index (`always` rules on one line, scoped rules with their file patterns)
- Skills index (names only; agents read each skill's description themselves)

Commands come from your real `package.json` scripts. If `test` or `build` is missing, the Definition of Done says so instead of inventing a command.

## What the rules contain

### Always included (`base` preset)

| Area | Highlights |
|------|------------|
| LLM discipline (Karpathy-inspired) | Think before coding, surgical changes, goal-driven execution; check version-matched docs, never guess CLI flags |
| Code quality | KISS, DRY, SOLID, YAGNI, no AI slop, no abstractions for single-use code, beginner-readable, comments explain *why* |
| Naming | Variables, functions, booleans, files and folders |
| Error handling and logging | No swallowed errors, typed errors, structured logs, never log secrets |
| Security | Input validation, injection, authz, secrets, agent guardrails for destructive actions |
| Architecture | Reusability, testability, maintainability and **scalability** (stateless, bounded work, idempotency, resilience) |
| Testing | Unit tests for every change, ≥ 80% coverage on changed code, integration tests at boundaries |
| Git workflow | **No commit or push without approval**; format `type(#123): subject` or `type(TASK-n): subject` |
| Documentation | Bilingual wiki (`en` + `id`), `index.md`, `log.md`, ADRs |
| Dependencies | Justify, pin, licence check, vulnerability audit |
| CI quality gates | lint → typecheck → test → build → audit, pre-commit hooks, commitlint |
| Observability | Correlation IDs, OpenTelemetry, golden signals, health checks |
| Data privacy | PII minimisation and masking, retention, UU PDP (No. 27/2022) and GDPR |
| Release and versioning | SemVer, generated changelog, feature flags |

**Skills:** `plan-task`, `self-review`, `debugging`, `write-unit-test`, `definition-of-done`, `commit`, `update-wiki`, `write-adr`.

**Definition of Done:**

1. Code follows the conventions, and `self-review` found nothing left to fix.
2. Unit tests pass, with coverage on changed code.
3. The build succeeds.
4. Dependencies are audited when they changed.
5. The wiki (and an ADR, if needed) is updated in both languages.

### Stack-specific

- **Backend:** API design, API contracts (OpenAPI, breaking-change checks), database migrations (expand → migrate → contract).
- **Frontend:** components, state, accessibility (WCAG AA), performance, UI UX Pro Max for design.
- **Frameworks:** rules and a recipe skill for each framework, adapted from the maintainers' official agent guidance. Each preset also lists **version-matched docs**, so agents read the docs for the version you installed:
  - `node_modules/next/dist/docs/` and `node_modules/turbo/docs/`
  - the FastAPI skill bundled in the package
  - the NestJS and Hono `llms.txt`
  - the Nuxt MCP and `gopls mcp`
- **Next.js:** apps get the official `nextjs-agent-rules` block, so `next dev` leaves your `AGENTS.md` untouched.
- **Existing skills:** skills already in `.agents/skills/`, such as Nx's official skills, are indexed and mirrored for Claude Code.

## Supported stacks

| Category | Presets | Detected from | Scaffolded with |
|----------|---------|---------------|-----------------|
| Frontend | `nextjs` · `react-vite` · `vue-vite` · `nuxt` | `next` · `react`+`vite` · `vue`+`vite` · `nuxt` | `create-next-app` · `create-vite` · `create-vite` · `create-nuxt` |
| Backend (Node) | `nestjs` · `express` · `fastify` · `hono` | `@nestjs/core` · `express` · `fastify` · `hono` | `@nestjs/cli` · minimal TS template · `fastify-cli` · `create-hono` |
| Backend (other) | `fastapi` · `django` · `go-http` | `pyproject.toml` / `requirements.txt`, `go.mod` | `uv` · `uv` + `django-admin` · `go mod init` + Gin |
| Language | `typescript` · `node` · `python` · `go` | `tsconfig.json` / deps, manifests | — |
| Monorepo | `turborepo` · `nx` · `moonrepo` · `workspaces` | `turbo.json` · `nx.json` · `.moon/workspace.yml` · `pnpm-workspace.yaml` / `workspaces` | root files + `turbo` · `create-nx-workspace` + Nx generators · root files + `.moon` · root files |

- **Package manager:** decided by the lockfile.
- **Folders without a workspace tool** (e.g. `web/` + `api/`) are treated as a multi-package (fullstack) repo.
- **moonrepo (v2):**
  - Multi-language workspaces (Node/TS, Go, Python), detected from `.moon/workspace.yml` or `.config/moon/workspace.yml`.
  - Per-package commands use moon project IDs (folder name or map key), not package.json names.
  - Scaffolding adds `@moonrepo/cli` and a `moon.yml` per app, mapping `build`/`test`/`lint` to real commands (moon does not read package.json scripts).
  - Before running tasks in a new repo: make the first git commit and run `moon setup`.
- **Nx:**
  - Apps are created with Nx generators and use Vitest.
  - The official Nx skills are kept.
  - Competing agent files from the Nx template are removed.

## Optional tooling

All tools are optional. `init` checks which ones are installed on your machine and writes only those into `AGENTS.md`, where they are then required; a tool you do not have is not mentioned (for example, without rtk the commands have no `rtk` prefix). Install them once per machine; `doctor` shows what you have, and nothing is installed automatically.

| Tool | Purpose | Install |
|------|---------|---------|
| [rtk](https://github.com/rtk-ai/rtk) | Compresses shell output; all commands are `rtk`-prefixed | `brew install rtk` or `cargo install --git https://github.com/rtk-ai/rtk`, then `rtk init -g` |
| [graphify](https://github.com/Graphify-Labs/graphify) | Queryable knowledge graph of the codebase | `uv tool install graphifyy`, then `graphify install`; use `graphify update .` and `graphify query "…"` |
| [caveman](https://github.com/JuliusBrussee/caveman) | Terse responses that keep technical accuracy | `curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh \| bash` |
| [ponytail](https://github.com/DietrichGebert/ponytail) | Minimal-code discipline | Claude Code: `claude plugin marketplace add DietrichGebert/ponytail && claude plugin install ponytail@ponytail` |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | UI/UX design skill (frontend presets only) | `npm i -g ui-ux-pro-max-cli`, then `uipro init --ai <agent>` in the repo |

### What runs automatically and what needs per-repo setup

| Tool | After the one-time machine install | Per-repo step |
|------|------------------------------------|---------------|
| rtk | Automatic in every repo: a global hook rewrites shell commands; Codex follows the `rtk`-prefixed commands in AGENTS.md | none |
| caveman | Automatic in Claude Code (session hook); `/caveman` in Codex, Cursor or Windsurf | none |
| ponytail | Automatic in Claude Code (session and prompt hooks) | none |
| graphify | Skill available, but every repo needs its own graph | `graphify update .` and optionally `graphify hook install` (rebuilds on each commit; adds `.gitattributes`) |
| UI UX Pro Max | CLI available | `uipro init --ai universal` (`.agents/skills`) and `uipro init --ai claude` (`.claude/skills`) |

`init` offers to run the per-repo steps for you. It asks in interactive mode; with `--yes`, pass `--setup-tools`. Setup runs **before** the files are generated, so the UI UX Pro Max skills are indexed in `AGENTS.md`. The rules for setup:

- It never installs a tool: if a binary is missing, that step is skipped and `doctor` shows how to install it.
- Git hooks are only added inside a git repository.
- A failing step prints a warning without stopping `init`.

`graphify-out/` is yours to commit (graphify's merge driver supports sharing it) or to add to `.gitignore`.

## Safety principles

- **Never overwrites.** Existing files are kept. For `AGENTS.md` and `CLAUDE.md`, the CLI prints the snippet to add yourself.
- **Never commits or pushes.** In a new project it runs `git init` once and leaves the commit to you.
- **Scaffolds only into new or empty folders.** Required tools are checked before anything is written.
- **Verifies scaffolder output.** Some scaffolders exit with 0 even when they fail, so the CLI checks for the files it expects.
- **Never deletes your files.** If scaffolding fails, the partial folder is kept and you are told where it is.
- **Behaves the same inside an agent.** Agent-detection variables (`CLAUDECODE`, `OPENCODE`) are removed before running scaffolders, so the result matches a normal terminal run.

## FAQ and troubleshooting

**I already have an `AGENTS.md`. Will it be replaced?**
No. It is kept, and the CLI prints the *Rules* and *Skills* sections for you to paste in, so agents can find the new files.

**Claude Code does not pick up my instructions or skills.**
Claude Code reads `CLAUDE.md` and `.claude/skills/`. Make sure `CLAUDE.md` contains the line `@AGENTS.md`. The CLI tells you when it is missing.

**`init --yes` fails with "stack not detected".**
The folder is empty. Either scaffold it with `--framework` or `--apps`, or choose presets with `--preset`.

**Scaffolding failed halfway.**
The CLI prints the failed command and the folder that holds the partial output. Delete that folder and run the command again. Missing tools are reported before anything is written.

**The Definition of Done says "no `test` command configured yet".**
Your `package.json` has no `test` script (the React and Vue Vite templates ship without one). Add a test runner such as Vitest, and the command appears after the next run.

**`next dev` changed my `AGENTS.md`.**
It only manages the block between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->`. agent-initiator already includes the current block, so normally nothing changes.

**Can I change the rules?**
Yes. Generated files are plain Markdown and belong to your repo, so edit or delete them freely. Custom preset packs are on the roadmap.

## Development

```bash
pnpm install
pnpm test        # unit, snapshot, preset lint, requirements guard, CLI e2e
pnpm typecheck
pnpm build
node dist/cli.js init <dir> --dry-run
```

| Path | Purpose |
|------|---------|
| `src/detect/` | Stack detection |
| `src/presets/` | Preset loading, validation and merging |
| `src/generate.ts` | Pure: project + presets → files |
| `src/render/` | AGENTS.md and command rendering |
| `src/write/` | Writing without overwriting |
| `src/scaffold/` | New-project recipes and runner |
| `presets/<id>/` | `preset.json`, `rules/`, `skills/`, `files/`, optional `agents-md.md` |
| `test/requirements.test.ts` | Fails if any agreed rule, skill or constraint disappears from the output |
| `test/wiki.test.ts` | Keeps this repo's wiki complete: English/Indonesian twins, "In short", index links, diagrams |

### Adding or changing a preset

1. Create `presets/<id>/preset.json` with `id`, `name`, `category` and `description`. `extends` is usually `["node", "web-backend"]`, or similar.
2. Add rules in `rules/*.md`, each with frontmatter `description`, `globs` and `alwaysApply`.
3. Add skills in `skills/<name>/SKILL.md`, following the Agent Skills spec:
   - The `name` is unique and matches the folder name.
   - Prefix the name with the framework, e.g. `hono-add-endpoint`.
4. Add `docs` entries pointing to version-matched documentation.
5. Update the detection (`src/detect/`), and the scaffolding (`src/scaffold/`) if needed. Add a fixture and tests.
6. Run `pnpm test`.
   - Update snapshots with `pnpm vitest run -u` only for intentional changes, and review the diff.
   - For scaffolder changes, also do a real smoke run in a temp folder.

Command templates in `preset.json` can use `{{pm}}`, `{{pmx}}`, `{{pyRun}}` and `{{pyInstall}}`.

This repo uses its own output: see [`AGENTS.md`](AGENTS.md), [`.agents/`](.agents) and [`docs/wiki/`](docs/wiki/en/index.md). Design notes are in [`docs/plans/`](docs/plans/2026-09-30-agent-initiator-design.md).

## Limitations and roadmap

**Not verified yet:**
- The Go recipe has not been run end-to-end yet (it needs `go` installed).
- For React, Vue, Nuxt and Express in Nx, the generator flags follow the same pattern as the Next.js and NestJS ones, which were tested, but they have not been run themselves.

**Known gaps:**
- React and Vue Vite scaffolds ship without a test runner. Adding Vitest automatically is planned.
- Hono, Express and the Python/Go apps always install dependencies, because their scaffolders cannot skip it.

**Planned:**
- Custom or team preset packs.
- Performance budgets and i18n rules.

## License

MIT
