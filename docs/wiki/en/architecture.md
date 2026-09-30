# Architecture

agent-initiator is a Node.js CLI. One run of `init` goes through five stages; each stage is a separate module so it can be tested on its own.

```
                ┌─────────────────────────────┐
 new/empty dir? │ 0. scaffold (optional)      │  src/scaffold/  official scaffolders → real project
                └──────────────┬──────────────┘
                               ▼
 1. detect      src/detect/     package.json / pyproject / go.mod / workspace files → packages + stacks
 2. resolve     src/presets/    preset ids → parent-first chain (base → language → shared → framework) → merged config
 3. generate    src/generate.ts pure: project + config → list of files (AGENTS.md, rules, skills, wiki…)
 4. write       src/write/      create missing files only; print manual steps for files that already exist
 5. doctor      src/doctor.ts   check required tooling on this machine (never installs)
```

## Key design decisions

| Decision | Why |
|----------|-----|
| Content lives in `presets/` (Markdown + JSON), not in code | Rules and skills can be improved without touching TypeScript. |
| `generate.ts` and scaffold recipes are pure functions | Deterministic output, fast unit and snapshot tests. |
| Existing files are never overwritten | The tool is safe to run on repos with hand-written instructions. |
| `AGENTS.md` + `.agents/` as the source, `CLAUDE.md` (`@AGENTS.md`) and `.claude/skills/` as adapters | AGENTS.md and `.agents/skills` are read by most agents; Claude Code needs the adapter. |
| Framework knowledge points to version-matched docs | Agents' training data goes stale; bundled docs (Next.js, Turborepo, FastAPI) do not. |
| Scaffolding uses official CLIs | Projects match what each framework recommends today; only Express gets a minimal template. |

## Presets

- `preset.json`: `id`, `category`, `extends`, `commands`, `conventions`, `must`, `never`, `tooling`, `docs`.
- `rules/*.md`: frontmatter `description`, `globs`, `alwaysApply`.
- `skills/<name>/SKILL.md`: Agent Skills spec.
- `files/`: static files such as the wiki skeleton.
- `agents-md.md`: a verbatim block for AGENTS.md (used for the Next.js managed block).

Chains merge parent-first. Lists are de-duplicated. Commands, rules and skills with the same key are overridden by later presets.

## Tests

- `test/detect|commands|generate|write|scaffold`: unit and snapshot tests.
- `test/cli.e2e.test.ts`: the built CLI against fixture copies.
- `test/requirements.test.ts`: every rule, skill and constraint agreed with the product owner must appear in the generated output.
