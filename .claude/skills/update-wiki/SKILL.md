---
name: update-wiki
description: Update the bilingual LLM wiki (docs/wiki/en and docs/wiki/id) and its change log. Use after any change to behaviour, architecture, setup, APIs or conventions, as part of the definition of done.
---

# Update Wiki

1. **Pick pages** — find the topic page(s) in `docs/wiki/en/` affected by the change. Create a new page only for a genuinely new topic (kebab-case file name).
2. **Update English** — describe how the system works *now*: purpose, flow, key files, config, examples. Keep it concise.
3. **Update Indonesian** — mirror the same change in `docs/wiki/id/` with the same file name. Keep code, paths and identifiers untranslated.
4. **Index** — if a page was added/renamed, update `index.md` in both languages (link + one-line summary).
5. **Log** — prepend an entry to `log.md` in both languages:
   ```
   ## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
   - What: <what changed>
   - Why: <reason>
   - Files: <main files touched>
   ```
6. **Check** — both languages have the same pages and the same latest log entry.
