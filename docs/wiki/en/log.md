# Change Log

Newest entries first. Format:

```
## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- What: ...
- Why: ...
- Files: ...
```

## 2026-09-30 — docs(TASK-1): add architecture page and dogfood agent config
- What: Ran agent-initiator on its own repo, added repo-specific context to AGENTS.md, an architecture wiki page, and a graphify graph (git-ignored). Rewrote README (why / what / how).
- Why: Use our own rules while developing the tool and make onboarding easier.
- Files: AGENTS.md, docs/wiki/{en,id}/architecture.md, README.md, .gitignore

## 2026-09-30 — chore: initialise agent configuration
- What: Added AGENTS.md, .agents rules/skills and this wiki via agent-initiator.
- Why: Give AI coding assistants consistent rules, constraints and workflows.
- Files: AGENTS.md, CLAUDE.md, .agents/, .claude/skills/, docs/wiki/
