---
description: CI quality gates — pipeline order, pre-commit hooks, commit linting, branch protection
globs: [".github/workflows/**", ".gitlab-ci.yml", ".husky/**", "lefthook.yml", ".pre-commit-config.yaml", "commitlint.config.*"]
alwaysApply: false
---

# CI Quality Gates

- Every pull request runs, in order: **lint → typecheck → test (with coverage) → build → dependency audit**. Any failure blocks the merge. `init` generates this pipeline for GitHub Actions (`.github/workflows/ci.yml`) or GitLab CI (`.gitlab-ci.yml`), one job per package with the same commands as AGENTS.md, unless the repo already has CI; the audit fails on high and critical advisories. Existing CI is kept: check it follows this order.
- The same checks run locally before pushing: pre-commit hooks run format + lint on staged files; heavier checks run pre-push or in CI. Git hooks are managed by **lefthook** (`lefthook.yml`), which works for every language: lint before each commit (per package, only when it changed), typecheck and tests before each push; a repo that already uses husky or `pre-commit` keeps it.
- Commit messages are validated by the commit-msg hook (`.lefthook/commit-msg/check-message.sh`, or commitlint in repos that already use it) against the project format `type(#<issue>|TASK-<n>): subject`, with no attribution trailers.
- Never bypass hooks with `--no-verify`; fix what they report.
- The default branch is protected: PR + passing checks + review required; no direct pushes.
- CI uses the lockfile (`npm ci`, `pnpm install --frozen-lockfile`, `uv sync --locked`, …) and caches dependencies. Pin the package manager version (`packageManager` in package.json) so CI installs the same one you use.
- Workflows get the least permissions they need (`permissions: contents: read` for checks).
- Secrets come from the CI secret store, never from the repo; CI logs must not print them.
- Never weaken or skip a gate to get a change merged; fix the cause.
