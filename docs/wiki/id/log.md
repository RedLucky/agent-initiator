# Catatan Perubahan

Entri terbaru di atas. Format:

```
## 2026-10-02 — fix(TASK-5128): use moon project IDs and moon run :lint
- Apa: Target moon per package memakai ID project moon (key map di .moon/workspace.yml, atau nama folder), bukan nama di package.json; `lint` memakai `moon run :lint`, bukan `moon check`.
- Kenapa: `moon check` butuh ID project di shell non-interaktif dan menjalankan build+test, dan `moon run @acme/web:test` bukan target yang valid.
- File: src/detect/workspace.ts, src/detect/index.ts, src/types.ts, src/generate.ts, src/scaffold/templates.ts, presets/moonrepo/preset.json, test/*

## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- Apa: ...
- Kenapa: ...
- File: ...
```

## 2026-10-02 — feat(TASK-3814): enforce beginner-friendly doc comments, unit tests, and external mocking
- Apa: Menambahkan aturan wajib dokumentasi (JSDoc untuk JS/TS, GoDoc untuk Go, docstrings untuk Python) pada function, class, object, dan tipe data dengan bahasa yang mudah dipahami pemula (beginner-friendly), komentar inline spesifik untuk alasan non-obvious, kewajiban mutlak unit test, serta kewajiban mock untuk batas eksternal (database, Redis/cache, antrean, API HTTP) pada preset dan aturan agent.
- Kenapa: Menjamin maintainability kode, kemudahan pemahaman bahkan bagi pemula, alasan logika yang transparan, pengujian ketat pada setiap perubahan, dan pengujian unit yang terisolasi tanpa menyentuh layanan eksternal langsung.
- File: presets/base/rules/code-quality.md, presets/base/rules/testing.md, presets/base/preset.json, presets/node/rules/javascript.md, presets/typescript/rules/typescript.md, presets/go/rules/go.md, presets/python/rules/python.md, AGENTS.md, .agents/rules/, test/__snapshots__/generate.test.ts.snap

## 2026-10-02 — docs(TASK-8819): update README with moonrepo support and scaffolding command
- Apa: Memperbarui diagram README.md, bagian quickstart nomor 3, referensi CLI, dan tabel supported stacks untuk mencerminkan dukungan moonrepo serta menambahkan contoh command `--layout moonrepo`. Menambahkan dukungan scaffolding untuk layout moonrepo.
- Kenapa: Mendokumentasikan kapabilitas monorepo moonrepo secara jelas untuk pengguna dan automasi CI.
- File: README.md, src/scaffold/types.ts, src/scaffold/index.ts, src/scaffold/templates.ts, src/scaffold/recipes.ts, test/scaffold.test.ts

## 2026-10-02 — feat(TASK-4192): add moonrepo rules, constraints, and task guidelines
- Apa: Menambahkan file rule khusus moonrepo (`rules/moonrepo.md`) serta batasan workspace (`must`/`never`) yang mencakup project/action graph, versi toolchain, caching build, target task, dan generator scaffolding.
- Kenapa: Memandu coding agent agar mematuhi konvensi moonrepo (inputs/outputs, caching, toolchain, dan inspeksi graph) saat bekerja di workspace moonrepo.
- File: presets/moonrepo/rules/moonrepo.md, presets/moonrepo/preset.json, test/generate.test.ts

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
