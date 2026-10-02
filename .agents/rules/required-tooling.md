---
description: Required tooling — what each tool is for, how to install it once per machine and set it up per repository
globs: []
alwaysApply: false
---

# Required tooling

Mandatory for every contributor and agent. Read this when a tool is missing (`npx agent-initiator doctor` checks them) or when you set up a new machine or clone.

## [ponytail](https://github.com/DietrichGebert/ponytail)
Keeps generated code minimal: the least code that fully solves the task.

**Use:** Write the smallest solution that fully meets the requirement. Never drop validation, security, error handling or accessibility to save lines.

```bash
# Claude Code (run inside a session):
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
# Other agents: see the README (Codex plugin, Gemini extension, Cursor/Windsurf rule files)
```

## [caveman](https://github.com/JuliusBrussee/caveman)
Terse response mode that cuts output tokens without losing technical accuracy.

**Use:** Keep chat responses terse. Code, commit messages, PR descriptions and security warnings stay in normal, complete prose.

```bash
curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash   # review the script first
```

## [rtk (Rust Token Killer)](https://github.com/rtk-ai/rtk)
Filters shell command output so agents spend fewer tokens.

**Use:** Prefix every shell command with `rtk`, including git, file and script commands. rtk filters the tools it knows and runs any other command unchanged, keeping its exit code, so the prefix is always safe. Use `rtk proxy <cmd>` only for the raw output of a filtered tool.

```bash
brew install rtk   # or: cargo install --git https://github.com/rtk-ai/rtk  (NOT `cargo install rtk`, a different crate)
rtk init -g   # Claude Code / Copilot; use --codex, --gemini or --agent <name> for other agents
```

## [graphify](https://github.com/Graphify-Labs/graphify)
Builds a queryable knowledge graph of the codebase. Output goes to `graphify-out/` (git-ignored unless the team shares it); `.graphifyignore` keeps the Indonesian wiki and change logs out of the graph. The git hooks from `graphify hook install` rebuild it after each commit.

**Use:** Ask it before broad grep/find, with symbol names and `--budget <tokens>` (see Project knowledge); broad questions return noise. Refresh with `graphify update .` (code only: no LLM, no tokens). Run the full `/graphify` extraction, which uses an LLM, only occasionally: the English wiki already explains the concepts.

```bash
uv tool install graphifyy   # package name has two "y"
graphify install   # or: graphify <codex|cursor|gemini|copilot> install
```

## [lefthook](https://github.com/evilmartians/lefthook)
Runs the git hooks in lefthook.yml for every language (commit message check, lint before commit, typecheck and tests before push, graph refresh).

**Use:** The hooks run on every commit. Never bypass them with `--no-verify`; fix what they report. After cloning, run `lefthook install` once.

```bash
npm i -g lefthook   # or: uv tool install lefthook | go install github.com/evilmartians/lefthook/v2@latest | brew install lefthook
lefthook install    # once per clone: activates the hooks in lefthook.yml
```
