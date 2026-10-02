# Quality gates (git hooks)

## In short
A quality gate is an automatic check that stops a change when it breaks an agreed rule. agent-initiator adds git hooks for any programming language: before a commit the code is linted and the commit message must follow the project format; before a push the type check and tests must pass; and the code map used by AI assistants is refreshed after each commit. The hooks are run by lefthook, one small tool that works the same for JavaScript, Python, Go and others. The same checks run again on GitHub for every pull request, so nothing that skips them on a laptop can be merged.

## What runs and when

| Moment | Check | Blocks? |
|--------|-------|---------|
| `pre-commit` (before the commit is made) | The package's `lint` command. In a multi-package repo each package has its own check, run inside that package and only when staged files are in it. | the commit |
| `commit-msg` (after you write the message) | Header is `type(#123): subject` or `type(TASK-123): subject`, subject at most 72 characters, no `Co-Authored-By` trailer. Messages made by git itself (`Merge …`, `Revert …`) pass. | the commit |
| `pre-push` (before commits are sent) | The `typecheck` and `test` commands of every package, each run inside its package | the push |
| `post-commit` (after the commit is saved) | `graphify update .` refreshes the code graph, only when graphify is a required tool | never |

The commands are the same ones AGENTS.md lists, without the `rtk` prefix (hooks also run for people who do not use rtk). A package without a `lint`, `typecheck` or `test` command gets no check for it. `format` is left out on purpose: many format scripts rewrite files, and a hook must not change your code behind your back. lefthook does not filter pre-push commands by changed files, so every package is checked before a push, like CI does.

```mermaid
flowchart LR
    A[git commit] --> L{Lint passes in<br/>changed packages?}
    L -- no --> D
    L -- yes --> B[lefthook runs commit-msg]
    B --> C{Message follows the format<br/>and has no attribution trailer?}
    C -- no --> D[Commit stopped<br/>with the reason]
    C -- yes --> E[Commit saved]
    E --> F[lefthook runs post-commit:<br/>graphify update]
    E -. later .-> P[git push]
    P --> T{Typecheck and tests pass<br/>in every package?}
    T -- no --> X[Push stopped]
    T -- yes --> Y[Commits sent]
```

In words: when you commit, lefthook first runs lint in the packages you changed, then `check-message.sh` on your message. A wrong message stops the commit and prints what is expected. A good message is saved, and then the code graph is refreshed by the hook; that step never fails a commit. When you push, typecheck and tests must pass first. Nobody may skip the hooks with `--no-verify`: AGENTS.md lists it under NEVER.

## What init generates
- `lefthook.yml` — the hook list (rendered, because the checks depend on the detected packages and commands, and the graphify step on the required tools).
- `.lefthook/commit-msg/check-message.sh` — plain POSIX `sh`, so it needs no Node, Python or Go.
- AGENTS.md: lefthook under Required tooling (install with npm, uv, go or brew), a Project knowledge line, and the NEVER entry.

## Activating the hooks
Hooks live in `.git/` and are not committed, so each clone runs `lefthook install` once. `init` runs it for you (even with `--yes`) inside a git repo when lefthook is installed, unless `.husky/` or `.pre-commit-config.yaml` exists: those repos already have a hook manager, and init then prints the command instead. It runs after the files are written, because `lefthook install` without a `lefthook.yml` writes lefthook's own default config. If the repo already has a `lefthook.yml`, init keeps it and prints the `commit-msg` block to add by hand.

Order matters with graphify: run `graphify hook install` first, then `lefthook install`. lefthook moves graphify's post-commit hook aside (to `post-commit.old`) and runs graphify from `lefthook.yml` instead. The other way round, graphify appends to lefthook's hook and the graph is rebuilt twice per commit. Because of this, `doctor` checks graphify's post-checkout hook, which lefthook leaves alone.

## CI on GitHub Actions
`init` also writes `.github/workflows/ci.yml`. It runs on every push to `main`/`master` and on every pull request, with one job per package:

```mermaid
flowchart LR
    A[Push or pull request] --> B[Set up the language<br/>and package manager]
    B --> C[Install from the lockfile]
    C --> D[lint]
    D --> E[typecheck]
    E --> F[test]
    F --> G[build]
    G --> H[audit]
    H --> I[Check passes]
    C & D & E & F & G & H -. a step fails .-> X[Check fails:<br/>merge blocked]
```

In words: each job prepares the language (Node.js LTS, Bun, uv, Python 3 or the Go version in `go.mod`), installs exactly what the lockfile says (`npm ci`, `pnpm install --frozen-lockfile`, `uv sync --locked`, …), and then runs the checks in the order from the quality-gates rule. A package without a command for a step skips that step. The commands are the same ones AGENTS.md lists, so a green run on your machine predicts a green run on CI.

Details worth knowing:
- **Permissions:** the workflow can only read the code (`permissions: contents: read`).
- **Monorepos:** each package runs in its own folder; JavaScript workspace packages install from the repo root, where the shared lockfile is.
- **pnpm and yarn** are installed with corepack, which reads `packageManager` in `package.json`. Without that field CI gets the newest version, which can reject your lockfile, so `init` asks you to pin it: `npm pkg set packageManager=pnpm@$(pnpm -v)`.
- **Audit** fails on high and critical advisories only (`--audit-level high` for npm, pnpm and bun; plain `yarn audit` for yarn). Go uses `go run …govulncheck@latest`, so nothing has to be installed; on CI it runs with `GOTOOLCHAIN=auto` because the latest govulncheck can need a newer Go than the module.
- **Existing workflow:** an existing `ci.yml` is kept. Other workflow files are not looked at, so remove duplicates by hand.

## Where it lives in the code
| What | File |
|------|------|
| Hook list renderer | `src/render/lefthook.ts` |
| Which task runs in which hook, per package | `hookChecks` in `src/generate.ts`, commands from `packageTaskCommands` in `src/render/commands.ts` |
| Commit message check | `presets/base/files/.lefthook/commit-msg/check-message.sh` |
| `lefthook.yml` added to the output | `src/generate.ts` |
| `lefthook install` setup step and its skip rule | `src/setup.ts` |
| Tool entry (install, usage) | `src/tooling.ts` |
| CI workflow renderer (actions and their versions) | `src/render/github-ci.ts` |
| CI jobs per package, lockfile install commands, pin notes | `ciJobs` in `src/generate.ts` |
| Rule text | `presets/base/rules/ci-quality-gates.md` |

## How to test it
`rtk test pnpm vitest run test/lefthook.test.ts test/setup.test.ts test/github-ci.test.ts`. To check a generated workflow's syntax: `go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/ci.yml`. The message tests run the real script with `sh`, so they cover the exact regex git uses.
