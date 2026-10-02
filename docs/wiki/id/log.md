# Catatan Perubahan

Entri terbaru di atas. Format:

```
## YYYY-MM-DD — <type>(#<issue>|TASK-<n>): <subject>
- Apa: ...
- Kenapa: ...
- File: ...
```

## 2026-10-02 — feat(TASK-7115): detect Python projects that have no manifest
- Apa: Root repository dengan file `.py` atau `tests/test_*.py` tetapi tanpa `pyproject.toml` atau `requirements.txt` sekarang terdeteksi sebagai Python. Project ini hanya mendapat command yang tidak butuh dependency yang dideklarasikan: `python3 -m compileall` (build) dan `python3 -m unittest discover`, atau `python3 -m pytest` kalau test-nya mengimpor pytest. Hanya root yang dihitung. Diverifikasi di salinan c-uas: 39 test lolos dengan command test yang dibuat.
- Kenapa: Repository c-uas (script Python biasa dengan test unittest) terdeteksi sebagai "no stack", sehingga AGENTS.md-nya tanpa command test dan tanpa rule Python.
- File: src/detect/python.ts, src/render/commands.ts, src/types.ts, docs/wiki/*/features/stack-detection.md, test/*

## 2026-10-02 — fix(TASK-7114): close the coverage and graphify gaps from the evaluation
- Apa: Script `test:coverage`, `coverage` atau `test:cov` menjadi command `coverage` (ditampilkan dengan `rtk test`; preset Go mendapat `go test -cover ./...`) dan Definition of Done memakainya. Kalau tidak ada, langkah coverage di DoD meminta memakai opsi coverage dari test runner atau melaporkan coverage tidak diukur, dan bertanya dulu sebelum menambah dependency. Project knowledge meminta agent menjalankan `graphify update .` kalau `graphify-out/` belum ada. Halaman evaluasi mencatat celah mana yang diperbaiki dan kenapa dua lainnya dibiarkan.
- Kenapa: Di evaluasi lintas model ketiga model mentok di langkah coverage yang tidak bisa diukur, dan Opus menanyai graphify sebelum graph-nya ada.
- File: src/render/{commands,agents-md}.ts, presets/go/preset.json, AGENTS.md, docs/wiki/*/features/{evaluation,generated-files}.md, test/*

## 2026-10-02 — docs(TASK-7107): record a cross-model evaluation of agent instructions
- Apa: Halaman baru features/evaluation.md (en/id): Claude Haiku 4.5, Sonnet 5.5 dan Opus 5.5 masing-masing mengerjakan tugas slugify yang sama di repository yang disiapkan dengan `init --yes`. Semuanya menjaga batasan keras (tidak commit, test, doc comment, command rtk); Sonnet dan Opus mengikuti seluruh alur kerja, sedangkan Haiku melewati wiki, format commit dan persetujuan rencana. Ditemukan empat celah: tidak ada command coverage untuk DoD, tanpa awalan rtk di perintah file/script, graphify ditanya sebelum graph ada, dan butir MUST dilewati oleh model terkecil.
- Kenapa: Klaim konsistensi lintas model butuh bukti; ini sampel pertama yang kecil (hanya model Claude, satu kali jalan per model).
- File: docs/wiki/{en,id}/features/evaluation.md, docs/wiki/{en,id}/index.md

## 2026-10-02 — perf(TASK-7113): read topic rules on demand instead of on every task
- Apa: Rule documentation, architecture, data-privacy dan observability sekarang on demand (`alwaysApply: false`) dengan deskripsi yang menyebut kapan dibaca; tujuh rule inti, termasuk git-workflow, tetap always. Isi rule dan MUST/NEVER di AGENTS.md tidak berubah. Pengantar bagian Rules menyebut rule on demand dan skill update-wiki menunjuk ke rule documentation. Per sesi, repo Next.js hasil generate kini memuat sekitar 6.200 token, bukan 8.600 (rule always 5.850 → 3.370).
- Kenapa: Agent membaca setiap rule always sebelum setiap tugas, jadi rule topik memakan token di tugas yang tidak menyentuh topiknya; baris yang tidak boleh dilanggar dari rule itu sudah ada di AGENTS.md.
- File: presets/base/rules/{documentation,architecture,data-privacy,observability}.md, presets/base/skills/update-wiki/SKILL.md, src/render/agents-md.ts, AGENTS.md, .agents/*, .claude/skills/update-wiki, docs/wiki/*/features/presets.md, test/*

## 2026-10-02 — feat(TASK-7112): make every helper tool optional, required once installed
- Apa: `init` mengecek tool pendukung mana (ponytail, caveman, rtk, graphify, UI UX Pro Max) yang terpasang dan hanya menuliskan itu ke AGENTS.md, di mana tool tersebut wajib; tool yang tidak ada tidak disebut: command tanpa awalan `rtk`, tanpa baris graphify atau `.graphifyignore`, tanpa bagian Required tooling atau rule required-tooling kalau tidak ada yang terpasang. `doctor` menampilkan semua tool sebagai opsional dan exit 0. Skill dan rule (git, nx, moon, turbo) menulis perintah shell sebagai `{{rtk}}git status`, yang diisi menjadi `rtk git status` hanya kalau rtk terpasang (command AGENTS.md: `rtk test` untuk test, `rtk err` untuk build dan cek, `rtk proxy` untuk sisanya); agent di mesin tanpa tool yang tercantum mengecek sekali (`command -v`) lalu melewatinya alih-alih mencoba berulang, skill menjalankan command AGENTS.md persis seperti tertulis di sana, dan menyebut UI UX Pro Max serta ponytail hanya "kalau terpasang"; baris MUST rtk dan UI UX Pro Max yang dobel dihapus.
- Kenapa: Setup minimalis untuk instal dari awal: tidak ada yang wajib diinstal dulu, dan setiap tool yang sudah dimiliki developer tetap dipakai.
- File: src/{cli,generate,doctor}.ts, src/render/{agents-md,commands,tooling-rule}.ts, presets/*, AGENTS.md, .agents/*, .claude/skills/*, README.md, docs/wiki/*, test/*

## 2026-10-02 — refactor(TASK-7111): remove generated git hooks and lefthook
- Apa: `init` tidak lagi menulis `lefthook.yml` atau `.lefthook/` (cek pesan commit, lint sebelum commit, typecheck dan test sebelum push, pengingat wiki) dan tidak lagi menjalankan `lefthook install`; lefthook bukan lagi tool wajib. Renderer, langkah setup setelah file ditulis, penulisan `.sh` executable, langkah manual lefthook, baris `Wiki: not needed` dan halaman wiki quality-gates dihapus. Rule, skill commit dan kerangka wiki kembali ke teks sebelum TASK-7101 (level audit tetap). Repository ini meng-uninstall lefthook; hook graphify-nya dipulihkan.
- Kenapa: Kembali ke konfigurasi agent murni dengan lebih sedikit tool yang harus dipasang: satu tool lebih sedikit saat instal dari awal dan tanpa file atau hook tambahan di setiap repository.
- File: src/{generate,cli,setup,tooling,doctor}.ts, src/render/{lefthook,agents-md,commands}.ts, src/write/index.ts, presets/base/*, lefthook.yml, .lefthook/, AGENTS.md, .agents/*, docs/wiki/*, README.md, test/*

## 2026-10-02 — refactor(TASK-7110): remove CI pipeline generation
- Apa: `init` tidak lagi menulis file GitHub Actions atau GitLab CI: renderer CI, opsi `--ci`, deteksi remote dan CI yang sudah ada, deteksi `packageManager` beserta catatan pin, dan job wiki khusus peringatan dihapus. Repository ini membuang `.github/workflows/ci.yml` dan pin pnpm. Yang tetap: audit hanya gagal untuk advisory high dan critical, dan audit Go memakai `go run …govulncheck@latest`. Rule ci-quality-gates kembali menjadi panduan umum.
- Kenapa: CI hasil generate butuh perawatan terus-menerus (versi action, image Docker, trik corepack dan toolchain) dan melampaui konfigurasi agent; tujuannya tool yang minimalis, termasuk saat instal dari awal.
- File: src/generate.ts, src/cli.ts, src/types.ts, src/detect/*, src/render/{github-ci,gitlab-ci}.ts (removed), presets/base/rules/ci-quality-gates.md, package.json, docs/wiki/*, README.md, test/*

## 2026-10-02 — perf(TASK-7106): slim AGENTS.md to about 2,500 tokens
- Apa: AGENTS.md root menyusut dari sekitar 4.000 menjadi sekitar 2.500 token (16–17 KB menjadi 9,5–11 KB): Required tooling menyisakan satu baris cara pakai per tool dan tujuan serta langkah instal pindah ke rule hasil generate `.agents/rules/required-tooling.md`; rule `always` dicantumkan dalam satu baris dan rule berlingkup dengan pola file-nya (rule tanpa globs tampil sebagai "on demand" dengan deskripsinya, sekaligus memperbaiki `api-design` yang tadinya tampil sebagai always); skill dicantumkan berdasarkan nama. Constraints dan Definition of Done tidak berubah. Sebuah test menjaga AGENTS.md root setiap fixture maksimal 12 KiB. AGENTS.md repository ini memakai bagian yang sama.
- Kenapa: Agent membaca AGENTS.md di awal setiap sesi, jadi perintah instal dan deskripsi yang berulang memakan token setiap kali tanpa mengubah perilaku.
- File: src/render/agents-md.ts, src/render/tooling-rule.ts, src/generate.ts, src/tooling.ts, AGENTS.md, .agents/rules/required-tooling.md, README.md, test/*

## 2026-10-02 — feat(TASK-7105): warn when code changes without a wiki update
- Apa: `.lefthook/pre-push/check-wiki.sh` (sh POSIX) baru memberi peringatan kalau kode (apa pun di luar `docs/` dan Markdown) berubah tapi `docs/wiki/en/` tidak, kecuali ada pesan commit dengan `Wiki: not needed (<alasan>)`. Script berjalan sebelum setiap push (lefthook, `use_stdin`) dan di job `wiki check (warning only)` untuk pull/merge request; tidak pernah memblokir. Rule documentation dan skill commit menjelaskan baris pengecualiannya. Repository ini memakai hook dan job CI yang sama.
- Kenapa: Agent dan orang masih lupa wiki walaupun rule mewajibkannya; pengingat saat push dan review menangkapnya sambil tetap menyerahkan penilaian ke manusia.
- File: presets/base/files/.lefthook/pre-push/check-wiki.sh, src/render/{lefthook,github-ci,gitlab-ci}.ts, presets/base/rules/documentation.md, presets/base/skills/commit/SKILL.md, lefthook.yml, .github/workflows/ci.yml, test/*

## 2026-10-02 — feat(TASK-7104): choose GitLab or GitHub CI and keep existing CI
- Apa: `init --ci github|gitlab|none` memilih pipeline. Tanpa itu, repository yang sudah punya CI (workflow GitHub, `.gitlab-ci.yml`, Jenkins, CircleCI, Azure, Bitbucket, Travis) tidak mendapat file CI dan mendapat catatan untuk mengecek urutannya; kalau tidak, git remote yang menyebut gitlab mendapat `.gitlab-ci.yml` (satu job per package, image resmi, merge request dan branch default), selain itu GitHub Actions. `CiJob` dipindah ke `src/types.ts` supaya dipakai kedua renderer.
- Kenapa: Project GitLab mendapat workflow GitHub yang tidak bisa dijalankan, dan repository dengan CI sendiri mendapat pipeline kedua yang menjalankan cek yang sama dua kali.
- File: src/render/gitlab-ci.ts, src/detect/ci.ts, src/generate.ts, src/cli.ts, src/types.ts, src/render/github-ci.ts, presets/base/rules/ci-quality-gates.md, test/*

## 2026-10-02 — feat(TASK-7103): generate a GitHub Actions CI workflow per package
- Apa: `init` menulis `.github/workflows/ci.yml` (tidak pernah menimpa yang sudah ada): satu job per package yang menyiapkan bahasanya, meng-install dari lockfile dan menjalankan lint → typecheck → test → build → audit dengan command AGENTS.md, dengan izin baca saja. pnpm/yarn dipasang lewat corepack; `init` meminta pin `packageManager` kalau belum ada. Audit hanya gagal untuk high/critical (`--audit-level high`); Go meng-audit dengan `go run …govulncheck@latest` (`GOTOOLCHAIN=auto` di CI). Deteksi membaca field `packageManager`. Repository ini memakai workflow yang sama dan mem-pin pnpm 10.19.0 di package.json.
- Kenapa: Rule quality-gates menjelaskan pipeline CI, tetapi belum ada yang membuatnya, sehingga merge tidak dilindungi oleh cek.
- File: src/render/github-ci.ts, src/generate.ts, src/render/commands.ts, src/detect/*, src/types.ts, src/cli.ts, presets/{node,monorepo,go}/preset.json, presets/base/rules/ci-quality-gates.md, .github/workflows/ci.yml, test/*

## 2026-10-02 — feat(TASK-7102): lint before commit, typecheck and tests before push
- Apa: `lefthook.yml` mendapat cek lint di `pre-commit` dan cek typecheck serta test di `pre-push`, dibuat dari command terdeteksi yang sama dengan AGENTS.md tetapi tanpa awalan rtk. Repo multi-package mendapat satu cek per package, dijalankan di dalamnya (`root`); sebelum commit hanya kalau ada file staged di package itu (`glob`). `format` tidak dimasukkan karena script format sering menulis ulang file. Repository ini menjalankan typecheck dan test sebelum push.
- Kenapa: Rule quality-gates meminta cek lokal sebelum commit dan push, tetapi belum ada yang menjalankannya, untuk bahasa apa pun.
- File: src/render/lefthook.ts, src/render/commands.ts, src/generate.ts, src/tooling.ts, presets/base/rules/ci-quality-gates.md, lefthook.yml, test/*

## 2026-10-02 — fix(TASK-7109): install lefthook hooks after init writes lefthook.yml
- Apa: `lefthook install` sekarang berjalan setelah file ditulis; sebelumnya ia berjalan duluan dan menulis `lefthook.yml` bawaan lefthook, sehingga milik kita tidak ditulis dan cek commit-msg tidak pernah berjalan. `lefthook.yml` yang dipertahankan mendapat langkah manual berisi blok `commit-msg`. File `.sh` ditulis executable, sehingga chmod dari lefthook tidak lagi meninggalkan perubahan mode setelah commit pertama.
- Kenapa: Smoke run nyata dengan lefthook terinstal menunjukkan `init --yes` menerima pesan commit apa pun, dan script hook muncul sebagai berubah setelah commit pertama.
- File: src/setup.ts, src/cli.ts, src/write/index.ts, .lefthook/commit-msg/check-message.sh (mode), test/setup.test.ts, test/write.test.ts

## 2026-10-02 — docs(TASK-7108): close the log format example before the entries
- Apa: Pagar penutup contoh format di `log.md` berada di bawah sebagian besar entri, sehingga entri tampil sebagai satu blok kode. Pagar itu sekarang ditutup tepat setelah contoh, di kedua bahasa, dan `test/wiki.test.ts` mengeceknya.
- Kenapa: Selama beberapa task entri ditambahkan di atas pagar penutup, sehingga log tidak terbaca di GitHub dan GitLab.
- File: docs/wiki/{en,id}/log.md, test/wiki.test.ts, docs/wiki/{en,id}/features/wiki-knowledge-base.md, docs/wiki/{en,id}/architecture.md

## 2026-10-02 — feat(TASK-7101): enforce the commit message format with lefthook
- Apa: `init` membuat `lefthook.yml` dan script commit-msg `sh` POSIX yang menolak header yang tidak sesuai `type(#n|TASK-n): subject` (subject ≤ 72 karakter) dan trailer atribusi; dengan graphify, `lefthook.yml` juga memperbarui graph setelah setiap commit. lefthook menjadi tool wajib; `init --yes` menjalankan `lefthook install` setelah `graphify hook install` kecuali ada `.husky/` atau `.pre-commit-config.yaml`. AGENTS.md melarang `--no-verify`. `doctor` sekarang mengecek hook post-checkout graphify. Repository ini memakai hook yang sama. Halaman baru features/quality-gates.md.
- Kenapa: Format commit sebelumnya hanya tertulis di rule, jadi agent dan orang masih bisa melanggarnya; hook menegakkannya dengan cara yang sama untuk semua bahasa.
- File: src/render/lefthook.ts, presets/base/files/.lefthook/, src/generate.ts, src/setup.ts, src/tooling.ts, src/doctor.ts, presets/base/rules/ci-quality-gates.md, lefthook.yml

## 2026-10-02 — feat(TASK-6209): install graphify hooks in initialised repos by default
- Apa: `init --yes` memasang git hook graphify tanpa --setup-tools kalau `.gitattributes` belum ada (kalau sudah ada, perintahnya dicetak, sehingga tidak ada file yang diubah); langkah setup lain tetap butuh --setup-tools. `doctor` menampilkan status hook di dalam repo git (hanya peringatan). Halaman getting-started hasil generate dan AGENTS.md → Project knowledge meminta kontributor menjalankan `graphify hook install` setelah clone.
- Kenapa: Repository yang disiapkan dengan --yes, clone baru dan repo tanpa git saat init tidak pernah mendapat hook, sehingga graph yang ditanyai agent menjadi usang.
- File: src/setup.ts, src/cli.ts, src/doctor.ts, src/render/agents-md.ts, presets/base/files/docs/wiki/*/getting-started.md, AGENTS.md, docs/wiki/*/features/tool-setup.md, test/*

## 2026-10-02 — chore(TASK-6208): install graphify git hooks in this repository
- Apa: Hook graphify post-commit dan post-checkout terpasang di repository ini, dan halaman getting-started meminta setiap kontributor menjalankan `graphify hook install` sekali setelah clone. Baris merge driver di `.gitattributes` yang ditulis graphify ikut di-commit supaya tidak muncul sebagai file untracked.
- Kenapa: Hook belum terpasang, sehingga graph kode hanya mutakhir lewat `graphify update .` manual; hook bersifat lokal per clone dan tidak pernah ikut di-commit.
- File: .gitattributes, docs/wiki/{en,id}/getting-started.md

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
