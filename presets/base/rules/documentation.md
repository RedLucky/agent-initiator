---
description: Documentation — keep the bilingual LLM wiki (docs/wiki/en and docs/wiki/id) and its log current
globs: []
alwaysApply: true
---

# Documentation (LLM Wiki)

The project wiki lives in `docs/wiki/` in two languages that must stay in sync:

```
docs/wiki/en/index.md   docs/wiki/en/log.md   docs/wiki/en/<topic>.md
docs/wiki/id/index.md   docs/wiki/id/log.md   docs/wiki/id/<topic>.md
```

- Every change that affects behaviour, architecture, setup, APIs or conventions updates the wiki in **both** `en` and `id`.
- `index.md` lists every wiki page with a one-line summary; add new pages there.
- `log.md` gets a new entry (newest first) for every change: date, commit/task reference, what changed and why.
- Topic pages describe *how the system works now*, not history (history belongs in `log.md`).
- Keep pages short and linkable; prefer one topic per page.
- Significant, hard-to-reverse decisions (framework, database, architecture pattern, integration) are recorded as ADRs in `docs/wiki/{en,id}/adr/` via the `write-adr` skill.
- Public APIs also get doc comments in code (and an OpenAPI spec for HTTP APIs); README covers setup and usage.
- Use the `update-wiki` skill for the workflow.
