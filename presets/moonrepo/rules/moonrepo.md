---
description: moonrepo — project/action graph, task runner, toolchains, caching and generators
globs: [".moon/**", ".config/moon/**", "**/moon.yml"]
alwaysApply: false
---

# moonrepo

Guidelines for working in a moonrepo multi-language monorepo (written for moon v2; check `moon --version`).

## Before running tasks
- moon needs at least **one git commit**: in a brand-new repo, tasks fail with `ambiguous argument 'HEAD'` until the first commit exists (make it with the `commit` skill, after approval).
- moon runs tools through proto. When a version is pinned (`packageManager` in package.json, `.prototools`), install it first with `moon setup` (or `proto install`).
- moon does **not** turn package.json scripts into tasks. Every project needs tasks in its `moon.yml` (or inherited from `.moon/tasks.*` / `.moon/tasks/**/*`); otherwise `moon run :test` reports "No tasks found".

## Project and action graph
- Use `moon project <name>` (or `moon project <name> --json`) to inspect project configuration, dependencies, and tasks before modifying code or configurations.
- Run `moon project-graph` to visualize workspace dependencies before adding cross-package references.
- Inspect `moon action-graph <target>` to understand the execution pipeline and task dependencies before running or debugging complex builds.

## Running tasks
- Always run tasks through moon (`moon run <target>`, `moon run :test`, `moon run :build`), never the underlying tool directly, so caching and dependency hashing remain effective.
- `moon check <project>` (or `--all`) runs a project's build **and** test tasks; it is not a lint command and needs an explicit project in non-interactive shells.
- Use scoped targets:
  - Individual task: `moon run <project>:<task>` (e.g. `moon run web:test`). The project ID is the folder name or the key in `.moon/workspace.yml`, not the package.json name.
  - All projects with task: `moon run :<task>` (e.g. `moon run :lint`)
  - Filtered by tag: `moon run '#tag:<task>'` (e.g. `moon run '#app:dev'`)
- In CI or pre-merge validation, use `moon ci` to run only affected tasks.
- Never guess CLI flags — inspect `moon <command> --help` first.

## Toolchains (.moon/toolchains.yml)
- moon manages versions of language runtimes (Node.js, Go, Python, Rust) through toolchain plugins. Respect `.moon/toolchains.yml` (named `toolchain.yml` in moon v1).
- Do not bypass toolchain binaries with incompatible host versions; let moon orchestrate runtime tools (`moon setup` / `moon teardown`).

## Caching and task definitions
- Define project-specific tasks in `<project>/moon.yml` and shared tasks in `.moon/tasks.yml` or `.moon/tasks/**/*.yml` (use `inheritedBy` to target languages or toolchains).
- moon v2 tasks accept only simple commands in `command`/`args`; use `script` for pipes, redirects or several commands.
- Always declare explicit `inputs` (source files, configs, relevant env vars) and `outputs` (build folders, bundles) for every task. Missing inputs or outputs cause stale or invalidated caches.
- Never commit `.moon/cache/` directories.

## Generators and scaffolding
- When scaffolding a new application, service, or library, list available templates with `moon templates` before writing manual boilerplate.
- Use `moon generate <template> [name]` to generate standardized applications that comply with repository structure and toolchains.
