# Catatan Perubahan

Entri terbaru di atas. Format:

```
## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- Apa: ...
- Kenapa: ...
- File: ...
```

## 2026-10-02 — feat(TASK-6182): support moonrepo multi-language workspaces
- Apa: Menambahkan deteksi workspace moonrepo (`.moon/workspace.yml`), parser pola proyek (glob dan map), preset `moonrepo`, runner target root, dan dukungan multi-bahasa (Go, Python, TypeScript).
- Kenapa: Memungkinkan monorepo berbasis moonrepo (seperti template zero-one-group monorepo) secara otomatis menghasilkan root dan nested AGENTS.md lintas bahasa pemrograman.
- File: presets/moonrepo/preset.json, src/detect/workspace.ts, src/types.ts, src/render/commands.ts, src/generate.ts, test/fixtures/moonrepo/, test/detect.test.ts, test/generate.test.ts

## 2026-09-30 — feat(TASK-2): optional per-repo tool setup during init
- Apa: `init` bisa menjalankan setup tool per repo (graph + git hook graphify, skill UI UX Pro Max) sebelum generate file; flag baru `--setup-tools`.
- Kenapa: rtk, caveman, dan ponytail aktif secara global, tetapi graphify dan UI UX Pro Max butuh satu langkah di setiap repo.
- File: src/setup.ts, src/cli.ts, test/setup.test.ts, README.md

## 2026-09-30 — docs(TASK-1): add architecture page and dogfood agent config
- Apa: Menjalankan agent-initiator pada repo ini sendiri, menambahkan konteks khusus repo ke AGENTS.md, halaman wiki arsitektur, dan graph graphify (di-ignore git). README ditulis ulang (why / what / how).
- Kenapa: Memakai aturan kita sendiri saat mengembangkan tool ini dan mempermudah onboarding.
- File: AGENTS.md, docs/wiki/{en,id}/architecture.md, README.md, .gitignore

## 2026-09-30 — chore: initialise agent configuration
- Apa: Menambahkan AGENTS.md, rules/skills .agents dan wiki ini melalui agent-initiator.
- Kenapa: Memberi AI coding assistant aturan, batasan, dan alur kerja yang konsisten.
- File: AGENTS.md, CLAUDE.md, .agents/, .claude/skills/, docs/wiki/
