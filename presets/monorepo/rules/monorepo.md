---
description: Monorepo rules — package boundaries, dependency direction, shared code, scoped tasks
globs: []
alwaysApply: true
---

# Monorepo

- Each package has one clear responsibility and a public entry point; never import another package's internal paths.
- Dependency direction: apps → shared packages. Shared packages never import from apps. No circular dependencies.
- Declare every cross-package dependency in the consumer's manifest using the workspace protocol (e.g. `"workspace:*"`).
- Put code in a shared package only when two or more apps really use it.
- Package-specific conventions live in that package's `AGENTS.md`; the nearest `AGENTS.md` wins.
- Run tasks scoped to the affected package while iterating; run the full build/test pipeline from the root before finishing.
- Keep tooling config (tsconfig, eslint, prettier) in shared config packages or the root; packages extend it.
