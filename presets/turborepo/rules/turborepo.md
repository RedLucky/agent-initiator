---
description: Turborepo — task pipeline in turbo.json, outputs/caching, --filter usage
globs: ["turbo.json", "**/package.json"]
alwaysApply: false
---

# Turborepo

- **Read the version-matched docs first**: `node_modules/turbo/docs/README.md` maps tasks to the right page (find it with `node -p "require.resolve('turbo/package.json')"`).
- Define tasks in `turbo.json` with correct `dependsOn` (`^build` for upstream builds) and `outputs` so caching is correct.
- Declare env vars that affect a task in `env`/`globalEnv`; otherwise caches go stale.
- Run scoped tasks with `--filter=<package>` (add `...` suffix to include dependents, e.g. `--filter=@acme/ui...`).
- Use `turbo run <task> --affected` to run only what changed (CI and large repos).
- Enforce package boundaries with `turbo boundaries` when the repo configures them.
- Never commit `.turbo/` cache folders.
- Package scripts stay simple (`build`, `test`, `lint`, `dev`); orchestration belongs in `turbo.json`.
