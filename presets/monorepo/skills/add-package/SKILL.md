---
name: add-package
description: Add a new app or shared package to the monorepo following workspace conventions. Use when the user asks to create a new app, service, library or shared package.
---

# Add Package

1. **Confirm scope** — app (`apps/`) or shared library (`packages/`/`libs/`)? Name and responsibility? Ask if unclear.
2. **Copy the closest sibling** — mirror an existing package's manifest, tsconfig/lint config and folder layout. Do not invent a new structure.
3. **Name** — follow the workspace naming scheme (e.g. `@<scope>/<name>`), kebab-case folder.
4. **Wire dependencies** — declare workspace deps with the workspace protocol; respect dependency direction (apps → packages).
5. **Scripts** — provide at least `build`, `test`, `lint` scripts so root pipelines pick it up.
6. **Agent config** — add a short `AGENTS.md` in the package (purpose, commands, package-specific rules).
7. **Verify** — install, then run the package's test and build commands via `rtk`; then the root pipeline.
8. **Document** — update the wiki (`update-wiki` skill).
