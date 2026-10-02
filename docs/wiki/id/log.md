# Catatan Perubahan

Entri terbaru di atas. Format:

```
## 2026-10-02 — feat(TASK-6206): route AI agents to the English wiki and graphify first
- Apa: AGENTS.md hasil generate punya bagian Project knowledge (index wiki bahasa Inggris dulu, tanpa log, lalu graphify affected/path/explain dengan budget, grep paling akhir); AGENTS.md per package menunjuk ke bagian itu. init menulis .graphifyignore yang mengeluarkan docs/wiki/id/ dan log dari graph. Teks pemakaian graphify mengutamakan graph kode yang gratis. Rule documentation mendapat bagian "Written for AI agents too" dan kerangka index mendapat tabel task → halaman. Halaman topik generated-files, tool-setup dan wiki-knowledge-base diperbarui.
- Kenapa: AGENTS.md hanya menyuruh agent memperbarui wiki, tidak pernah membacanya, sehingga agent menjelajah kode dengan grep; membaca dua bahasa menggandakan token; dan wiki bahasa Indonesia serta log mengotori jawaban graphify.
- File: src/render/agents-md.ts, src/tooling.ts, presets/base/*, .graphifyignore, AGENTS.md, .agents/rules/documentation.md, docs/wiki/*, test/*

## 2026-10-02 — docs(TASK-6205): fill this repo's wiki as a knowledge base
- Apa: Halaman baru overview, getting-started, glossary, faq dan features/{stack-detection,presets,generated-files,scaffolding,tool-setup}, halaman architecture yang diperbarui (scaffolding, setup tool, moon, test) dan index dengan jalur baca, semuanya dalam bahasa Inggris dan Indonesia dengan bagian Singkatnya dan diagram Mermaid. test/wiki.test.ts menjaga pasangan bahasa, ringkasan, tautan index dan diagram. Index juga punya tabel task → halaman untuk AI agent, yang cukup membaca halaman bahasa Inggris.
- Kenapa: Wiki hanya punya halaman architecture dari commit pertama dan log, sehingga tidak lagi sesuai dengan kode dan tidak membantu non-developer maupun developer baru.
- File: docs/wiki/{en,id}/*, test/wiki.test.ts, README.md

## 2026-10-02 — feat(TASK-6204): generate a full bilingual wiki skeleton for new repos
- Apa: `init` sekarang membuat index (dengan jalur baca untuk non-developer, developer baru dan developer berpengalaman), overview, getting-started, architecture (dengan contoh diagram Mermaid), glossary dan faq dalam bahasa Inggris dan Indonesia, selain log. Setiap halaman dibuka dengan Singkatnya dan menjelaskan apa yang perlu ditulis. Halaman topik features/wiki-knowledge-base.md dan README diperbarui.
- Kenapa: Repository baru hanya mendapat index dan log, sehingga struktur knowledge base dari rule documentation harus dibangun manual.
- File: presets/base/files/docs/wiki/*, test/generate.test.ts, test/requirements.test.ts, README.md, docs/wiki/*/features/wiki-knowledge-base.md

## 2026-10-02 — docs(TASK-6203): make the wiki a knowledge base updated per topic
- Apa: Rule documentation, skill update-wiki, definition-of-done dan self-review, constraint MUST, serta Definition of Done hasil generate mewajibkan memperbarui (atau membuat) halaman topik yang dikerjakan, dengan bagian Singkatnya untuk non-developer dan struktur halaman yang tetap. Halaman baru: features/wiki-knowledge-base.md. Halaman yang menjelaskan alur, proses, atau arsitektur diberi diagram Mermaid atau ASCII.
- Kenapa: Selama ini hanya log.md yang diperbarui, sehingga wiki tertinggal dari kode dan tidak berguna bagi developer baru maupun non-developer.
- File: presets/base/*, src/render/agents-md.ts, .agents/*, .claude/skills/*, AGENTS.md, docs/wiki/*, test/*

## 2026-10-02 — docs(TASK-4417): clarify that every shell command goes through rtk
- Apa: Teks tooling rtk dan constraint MUST menyatakan prefix juga berlaku untuk command git, file dan script, karena rtk menjalankan tool tanpa filter apa adanya dan meneruskan exit code-nya; `rtk proxy` hanya untuk output mentah dari tool yang punya filter. Guard requirement menjaga kalimat ini.
- Kenapa: Agent melewatkan prefix untuk command git dan script, sebagian karena keliru mengira rtk gagal untuk tool tanpa filter (sudah diuji: `rtk python3`, `rtk cp`, `rtk node` jalan dan meneruskan exit code).
- File: src/tooling.ts, presets/base/preset.json, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-2638): forbid attribution trailers and changed commit messages
- Apa: Rule git-workflow, skill commit dan constraint NEVER melarang `Co-Authored-By:` dan trailer atribusi AI/tool lain, serta mewajibkan commit dengan pesan yang persis disetujui. Guard requirement menjaga aturan ini.
- Kenapa: Default agent menambahkan trailer `Co-Authored-By: Claude` yang tidak ada di pesan yang disetujui dan bukan bagian format commit repo; product owner memutuskan tidak memakainya.
- File: presets/base/*, .agents/*, .claude/skills/commit, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-9157): make one task = one commit an explicit rule
- Apa: Rule git-workflow, skill commit dan plan-task, serta constraint MUST kini menyatakan secara eksplisit: setiap task mendapat tepat satu commit dengan referensinya sendiri, di-commit sebelum task berikutnya dimulai. Guard requirement menjaga aturan ini.
- Kenapa: Skill plan-task hanya menulis "each ≈ one commit", dan beberapa task pernah digabung dalam satu commit yang kemudian harus dipecah.
- File: presets/base/*, .agents/*, .claude/skills/{commit,plan-task}, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-7346): add doc comments to changed detection and generate code
- Apa: Doc comment berbahasa sederhana untuk `detectProject`, `detectLayout`, `DetectOptions`, `WorkspaceInfo`, `readPatterns` dan `rootCommands`; komentar yang tertinggal dari refactor sebelumnya dipindah ke function yang dijelaskannya. Self-review dan Definition of Done formal dijalankan untuk seluruh audit.
- Kenapa: Rule baru mewajibkan doc comment pada setiap function yang diubah; self-review menemukan yang belum ada.
- File: src/detect/index.ts, src/detect/workspace.ts, src/generate.ts

## 2026-10-02 — docs(TASK-7345): allow test-created temp folders as file-system fakes
- Apa: Rule testing mengizinkan folder sementara dan fixture buatan test itu sendiri (`mkdtemp`, `test/fixtures/`) sebagai pengganti mock file system; folder milik user, home directory dan path bersama tetap dilarang. Guard requirement menjaga aturan ini.
- Kenapa: Untuk tool yang membaca file, me-mock file system membuat test tidak menguji apa-apa; rule butuh pengecualian yang jelas dan aman (keputusan: opsi a).
- File: presets/base/rules/testing.md, .agents/rules/testing.md, test/requirements.test.ts

## 2026-10-02 — test(TASK-7344): measure coverage and cover scaffold runner and guards
- Apa: Coverage diukur dengan `pnpm run test:coverage` (`@vitest/coverage-v8` 5.0.3, MIT, package resmi vitest). Test baru mencakup semua jenis step di runner scaffold, guard scaffold (offline, dengan tool palsu di PATH) dan `overridePresets`. AGENTS.md mencantumkan command coverage di Commands dan Definition of Done.
- Kenapa: Definition of Done meminta coverage minimal 80% untuk kode yang berubah, tetapi coverage belum pernah diukur.
- File: package.json, pnpm-lock.yaml, vitest.config.ts, AGENTS.md, test/run.test.ts, test/scaffold.test.ts, test/detect.test.ts

## 2026-10-02 — refactor(TASK-7343): move post-scaffold notes into a testable function
- Apa: Pengingat moonrepo (commit pertama, `moon setup`) dipindah dari `cli.ts` ke `postScaffoldNotes()` di `src/scaffold/index.ts`, dengan unit test.
- Kenapa: Kode di dalam `cli.ts` hanya tercapai lewat test end-to-end, padahal setiap function wajib punya unit test.
- File: src/cli.ts, src/scaffold/index.ts, test/scaffold.test.ts

## 2026-10-02 — fix(TASK-7342): report broken package.json instead of swallowing the error
- Apa: Step scaffold moon-tasks membaca package.json dengan `readJson`: file yang tidak ada berarti "tidak ada script", file yang rusak berhenti dengan error yang menyebut path-nya.
- Kenapa: Step itu memakai `.catch(() => null)` yang menyembunyikan semua error baca, melanggar rule error-handling.
- File: src/scaffold/run.ts, test/scaffold.test.ts

## 2026-10-02 — fix(TASK-5131): skip root install without package.json and document moon setup
- Apa: Monorepo tanpa package.json di root (misalnya repo moon Go + Python) tidak lagi mendapat command `npm install` di root. README menjelaskan cara memakai CLI sebelum dipublish ke npm dan prasyarat moon.
- Kenapa: `npm install` di root tidak menginstal apa pun di sana, dan `npx agent-initiator` menghasilkan 404 sampai package dipublish.
- File: src/detect/index.ts, src/generate.ts, test/generate.test.ts, README.md

## 2026-10-02 — docs(TASK-5130): require tests and plain-language doc comments for every function
- Apa: Rule testing dan code-quality menyatakan diri lebih kuat dari default plugin (ponytail): setiap function, termasuk helper private kecil, wajib punya unit test dan doc comment dengan bahasa sederhana; constraint yang dobel digabung; guard requirement baru.
- Kenapa: Tujuannya kode yang bisa dipahami developer junior maupun senior; kalimat lama bertentangan dengan ponytail dan mengulang constraint yang sama.
- File: presets/base/*, .agents/*, .claude/skills/write-unit-test, AGENTS.md, test/requirements.test.ts, test/__snapshots__

## 2026-10-02 — docs(TASK-5129): update moonrepo rule for moon v2 and detect .config/moon
- Apa: Rule dan preset moonrepo mengikuti moon v2: `.moon/toolchains.yml`, `.moon/tasks.*` dan `.moon/tasks/**`, `moon templates`, command task sederhana, bagian "Before running tasks" (commit pertama, `moon setup`, tanpa inferensi script) dan `moon mcp` di Framework docs. Deteksi juga mengenali `.config/moon`.
- Kenapa: Rule masih menggambarkan moon v1 padahal versi sekarang 2.5.6; v2 mengganti nama file toolchain dan menerima `.config/moon`.
- File: presets/moonrepo/*, src/detect/workspace.ts, test/detect.test.ts, test/fixtures/moon-config/

## 2026-10-02 — fix(TASK-5127): add moon CLI and per-app moon.yml when scaffolding
- Apa: Scaffold moonrepo menambahkan `@moonrepo/cli` sebagai dev dependency root dan menulis `moon.yml` per app (task dari script package yang ada; command tetap untuk Python dan Go), serta mengingatkan commit pertama dan `moon setup`.
- Kenapa: moon tidak membaca script package.json, sehingga repo moon baru gagal di semua command Definition of Done dengan "No tasks found".
- File: src/scaffold/*, src/cli.ts, test/scaffold.test.ts

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
