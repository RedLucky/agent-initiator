---
description: moonrepo — project/action graph, task runner, toolchains, caching and generators
globs: [".moon/**", "**/moon.yml"]
alwaysApply: false
---

# moonrepo

Guidelines for working in a moonrepo multi-language monorepo.

## Project and action graph
- Use `moon project <name>` (or `moon project <name> --json`) to inspect project configuration, dependencies, and tasks before modifying code or configurations.
- Run `moon project-graph` to visualize workspace dependencies before adding cross-package references.
- Inspect `moon action-graph <target>` to understand the execution pipeline and task dependencies before running or debugging complex builds.

## Running tasks
- Always run tasks through moon (`moon run <target>`, `moon run :test`, `moon run :build`, `moon check`), never the underlying tool directly, so caching and dependency hashing remain effective.
- Use scoped targets:
  - Individual task: `moon run <project>:<task>` (e.g. `moon run web:test`)
  - All projects with task: `moon run :<task>` (e.g. `moon run :lint`)
  - Filtered by tag: `moon run '#tag:<task>'` (e.g. `moon run '#app:dev'`)
- In CI or pre-merge validation, use `moon ci` to run only affected tasks.
- Never guess CLI flags — inspect `moon <command> --help` first.

## Toolchain (.moon/toolchain.yml)
- Moon manages versions of language runtimes (Node.js, Go, Python, Rust). Respect configurations in `.moon/toolchain.yml`.
- Do not bypass toolchain binaries with incompatible host versions; let moon orchestrate runtime tools (`moon setup` / `moon teardown`).

## Caching and task definitions
- Define project-specific tasks in `<project>/moon.yml` and shared tasks in `.moon/tasks.yml` or `.moon/tasks/*.yml`.
- Always declare explicit `inputs` (source files, configs, relevant env vars) and `outputs` (build folders, bundles) for every task. Missing inputs or outputs cause stale or invalidated caches.
- Never commit `.moon/cache/` directories.

## Generators and scaffolding
- When scaffolding a new application, service, or library, check available templates with `moon generate` before writing manual boilerplate.
- Use `moon generate <template> [name]` to generate standardized applications that comply with repository structure and toolchains.
