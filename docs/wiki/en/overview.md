# Overview of agent-initiator

## In short
agent-initiator is a command-line tool that prepares a software repository for AI coding assistants (such as Claude Code, Codex, Cursor or GitHub Copilot). With one command it writes the instructions, rules and step-by-step guides those assistants follow, so every project gets the same quality standards from day one. It can also create a brand-new project first, using each framework's official setup tool.

## Who uses it
- **Team leads and architects** who want every new repository to start with the same rules for code quality, security, testing, documentation and git.
- **Developers** who start a new project or add AI assistants to an existing one.
- **AI coding assistants** themselves: they read the files this tool produces and follow them.

## The problem it solves
Without shared instructions, AI assistants produce inconsistent code, skip tests, commit without asking and use outdated framework knowledge. Writing those instructions by hand for every repository takes time and drifts between projects.

## Main capabilities
| Capability | What it means | Details |
|------------|---------------|---------|
| Stack detection | Recognises the frameworks, languages and monorepo tools already in a repository | [stack detection](features/stack-detection.md) |
| Presets | Ready-made rules and guides per stack, combined in layers | [presets](features/presets.md) |
| Generated files | Writes `AGENTS.md`, rules, skills, `CLAUDE.md` and a bilingual wiki — never overwriting existing files | [generated files](features/generated-files.md) |
| Scaffolding | Creates a new project with the official framework tools before writing the instructions | [scaffolding](features/scaffolding.md) |
| Tool setup and doctor | Checks the required helper tools and sets up the per-repository ones | [tool setup](features/tool-setup.md) |
| Wiki knowledge base | Keeps a wiki like this one that every reader can follow | [wiki knowledge base](features/wiki-knowledge-base.md) |

## What it does not do
- It does not write your application's business code.
- It never overwrites files that already exist, never commits and never pushes.
- It does not install the required helper tools for you; it tells you how.
- It is not on npm yet; see [getting started](getting-started.md).
