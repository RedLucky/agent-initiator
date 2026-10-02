# agent-initiator Wiki

## In short
This wiki explains agent-initiator for everyone: people who do not write code, developers new to the project, and developers who already know it. It is written for humans and AI agents and kept in sync with `docs/wiki/id/`.

## Where to start

| You are… | Read in this order |
|----------|--------------------|
| Not a developer (product, QA, stakeholder) | [overview](overview.md) → [glossary](glossary.md) → [faq](faq.md) |
| A new developer | [overview](overview.md) → [getting-started](getting-started.md) → [architecture](architecture.md) → feature pages |
| An experienced developer | [architecture](architecture.md) → feature pages → [log](log.md) |

## For AI agents: task → page

Read the English pages only (`docs/wiki/en/`); `docs/wiki/id/` is the same content in Indonesian. Skip `log.md` unless you are investigating history. For "who calls what" and impact questions, use `graphify affected "<symbol>"` or `graphify path "<A>" "<B>"` instead of reading code.

| Task | Read | Then look at |
|------|------|--------------|
| Understand the overall flow | [architecture](architecture.md) | `src/cli.ts` |
| Change how stacks are detected | [features/stack-detection.md](features/stack-detection.md) | `src/detect/` |
| Add or change a preset, rule or skill | [features/presets.md](features/presets.md) | `presets/<id>/`, `src/presets/` |
| Change AGENTS.md or other generated output | [features/generated-files.md](features/generated-files.md) | `src/generate.ts`, `src/render/` |
| Add or change a scaffolder or layout | [features/scaffolding.md](features/scaffolding.md) | `src/scaffold/` |
| Change required tools, doctor or setup | [features/tool-setup.md](features/tool-setup.md) | `src/tooling.ts`, `src/setup.ts`, `src/doctor.ts` |
| Change git hooks or the commit message check | [features/quality-gates.md](features/quality-gates.md) | `src/render/lefthook.ts`, `presets/base/files/.lefthook/` |
| Change the wiki rules | [features/quality-gates.md](features/quality-gates.md) | Git hooks for every language: commit message check and graph refresh |
| [features/wiki-knowledge-base.md](features/wiki-knowledge-base.md) | `presets/base/rules/documentation.md` |

## All pages

| Page | Summary |
|------|---------|
| [overview.md](overview.md) | What agent-initiator is, who it is for and why it exists |
| [getting-started.md](getting-started.md) | Install the command, use it, run the tests, make a first change |
| [architecture.md](architecture.md) | How the parts fit together, with diagrams |
| [features/stack-detection.md](features/stack-detection.md) | How the tool recognises languages, frameworks, package managers and monorepo tools |
| [features/presets.md](features/presets.md) | The layered rule bundles per stack |
| [features/generated-files.md](features/generated-files.md) | What is written into a repository and why nothing is overwritten |
| [features/scaffolding.md](features/scaffolding.md) | Creating new projects with official tools, including monorepos and moon |
| [features/tool-setup.md](features/tool-setup.md) | Required helper tools, `doctor` and per-repository setup |
| [features/wiki-knowledge-base.md](features/wiki-knowledge-base.md) | How the wiki is kept as a knowledge base for every reader |
| [glossary.md](glossary.md) | Terms and abbreviations in plain words |
| [faq.md](faq.md) | Common questions and problems, with answers |
| [log.md](log.md) | Change log — newest first |
