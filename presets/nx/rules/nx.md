---
description: Nx — explore first, run tasks through nx, generators with --no-interactive, workspace linking, module boundaries
globs: ["nx.json", "**/project.json", "**/package.json"]
alwaysApply: false
---

# Nx

Based on Nx's official agent guidelines. When the official Nx skills are present in `.agents/skills/`, use them.

## Explore before acting
- Use the `nx-workspace` skill (or `nx show projects`, `nx show project <name> --json`) to see projects and their **inferred targets** before running or editing anything; `package.json` scripts do not show inferred targets.
- `nx graph --print` shows dependencies; run it before moving code between projects.
- If configuration looks stale, run `nx sync` (or `nx reset` for cache/daemon issues).

## Running tasks
- Always run tasks through Nx (`nx run <project>:<target>`, `nx run-many -t build test lint typecheck`, `nx affected -t lint test build`), never the underlying tool directly.
- Prefix with the workspace package manager (`pnpm nx …`, `npx nx …`) instead of a global `nx`.
- Never guess CLI flags — check `--help` first.

## Generators
- For scaffolding (apps, libs, features) use the `nx-generate` skill first. Prefer local workspace generators, then plugin generators (`nx list @nx/<plugin>`); add plugins with `nx add @nx/<plugin>`.
- Always pass `--no-interactive`, dry-run first (`--dry-run`), read the generator's source (not just its schema), match existing project patterns, then run lint/test/build/typecheck on the result.

## Workspace packages
- Link workspace packages with the package manager (e.g. `pnpm add @org/ui --filter @org/app --workspace`); do not patch around with tsconfig `paths` or hand-edited `package.json` (use the `link-workspace-packages` skill).
- Enforce boundaries with project `tags` and `@nx/enforce-module-boundaries`; do not bypass it.
- Configure caching via `targetDefaults`/`inputs`/`outputs` in `nx.json`; check `node_modules/@nx/<plugin>/PLUGIN.md` for plugin best practices.
