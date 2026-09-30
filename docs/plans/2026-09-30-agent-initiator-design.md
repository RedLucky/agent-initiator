# agent-initiator — CLI generator AGENTS.md + skills + rules

## Context
Repo `agent-initiator` kosong. Masalah: tiap repo aplikasi baru harus menulis ulang instruksi AI coding assistant (konteks, rule, constraint, skill) → lambat, tidak konsisten. Solusi: CLI `npx agent-initiator init` yang dijalankan di repo target (frontend / backend / fullstack / monorepo; repo sudah dibuat via create-next-app, nest new, dll), deteksi stack, lalu generate config agent universal dari library preset (deterministik, offline). Tidak scaffold kode aplikasi.

Keputusan hasil diskusi:
- Target AGENTS.md universal + adapter Claude Code (opsi B).
- CLI npx, TypeScript/Node, template + preset bawaan (tanpa preset custom dulu).
- File yang sudah ada **tidak ditimpa** — hanya buat yang belum ada; bila dilewati, tampilkan instruksi manual (opsi a).
- Konten: best practice + aturan tambahan user (rule, skill, constraint).
- Ponytail menggantikan Karpathy "Simplicity First"; Karpathy lain (Think Before Coding, Surgical Changes, Goal-Driven/DoD) tetap.
- Komentar informatif wajib untuk kode baru saja (jelaskan *kenapa*); tidak menyentuh kode lama.
- LLM Wiki `docs/wiki/{en,id}` wajib + kerangka di-generate.
- Command `rtk` disesuaikan per stack.
- Commit: `type(#123): subject`; tanpa issue → `type(TASK-<nomor dari plan>): subject`. Tidak auto commit/push; selalu konfirmasi.

Fakta standar (hasil riset):
- AGENTS.md: markdown bebas; nested = file terdekat menang; Codex cap 32 KiB → AGENTS.md harus ringkas, detail di rules.
- Agent Skills spec (agentskills.io): `<name>/SKILL.md`, frontmatter wajib `name` (a-z0-9-, = nama folder, ≤64) + `description` (≤1024, apa + kapan); opsional `license`, `compatibility`, `metadata`; body ≤500 baris. `.agents/skills/` dibaca Codex, Cursor, Copilot, Gemini, OpenCode; Claude Code hanya `.claude/skills/`.
- Rules: tidak ada standar lintas-tool; `.agents/rules/` tidak dibaca tool mana pun → wajib di-link dari AGENTS.md. Frontmatter sumber: `description`, `globs`, `alwaysApply` (kompatibel bila kelak compile ke Cursor/Copilot/Claude).
- Claude Code: baca AGENTS.md hanya bila CLAUDE.md tidak ada → generate `CLAUDE.md` berisi `@AGENTS.md`.

## Output di repo target
```
AGENTS.md                         # ringkas: overview, commands (rtk-prefixed), structure, required tooling,
                                  #   constraints MUST/NEVER, DoD, index link rules & skills
CLAUDE.md                         # "@AGENTS.md" (adapter Claude Code)
.agents/rules/*.md                # frontmatter description/globs/alwaysApply
.agents/skills/<name>/SKILL.md    # spec agentskills.io, hanya field standar
.claude/skills/<name>/SKILL.md    # copy mirror (bukan symlink, aman di Windows)
docs/wiki/en/{index.md,log.md}
docs/wiki/id/{index.md,log.md}
<package>/AGENTS.md               # monorepo: nested per package (stack spesifik + command filter)
```

## Konten preset
**Layer `base` (selalu ikut — aturan tambahan user):**
- Rules:
  - `llm-discipline` — Karpathy: Think Before Coding, Surgical Changes, Goal-Driven Execution (always).
  - `code-quality` — clean, SOLID, DRY, KISS, anti AI-slop/ngambang/over-engineering, mudah dibaca pemula, komentar informatif untuk kode baru.
  - `naming-conventions` — variabel, function, file, folder (base umum; layer bahasa override detail).
  - `error-handling-logging` — error handling eksplisit + structured logging (stack layer isi library: pino/Nest Logger/structlog/slog).
  - `security` — guardrails: secret, input validation, OWASP, dependency, least privilege.
  - `architecture` — reusability, testability, maintainability, batas layer.
  - `testing` — unit test wajib untuk setiap perubahan.
  - `git-workflow` — no auto commit/push, konfirmasi dulu, format `type(#123)` / `type(TASK-n)`.
  - `documentation` — update wiki en+id (index.md, log.md) tiap perubahan.
- Skills: `definition-of-done`, `write-unit-test`, `commit` (susun pesan → minta konfirmasi), `update-wiki`.
- Constraints AGENTS.md: NEVER commit/push tanpa izin, NEVER commit secret, NEVER refactor kode tak terkait; MUST unit test + build lolos + wiki updated sebelum selesai; MUST pakai rtk untuk shell command.
- DoD: (1) kode sesuai konvensi, (2) `rtk <pm> test` lolos, (3) `rtk <pm> run build` lolos, (4) wiki en+id + index.md + log.md updated.
- Required tooling (section AGENTS.md: fungsi, cara install, aturan pakai): ponytail, caveman, rtk, graphify (`graphify query` sebelum grep); UI UX Pro Max hanya untuk preset frontend/fullstack.

**Layer bahasa:** `typescript`, `python`, `go` (naming, lint/format, test runner, logging lib).
**Layer framework:** frontend `react-vite`, `nextjs`, `vue-vite`, `nuxt`; backend Node `express`, `nestjs`, `fastify`, `hono`; non-Node `fastapi`, `django`, `go-http`. Masing-masing 1–3 rule + 1–3 skill (contoh: nextjs `add-route`, nestjs `add-module`, fastapi `add-endpoint`, go-http `add-handler`).
**Layer monorepo:** `turborepo`, `nx`, `pnpm-workspaces` (batas dependency antar package, command filter, skill `add-package`).

## Struktur repo tool
```
src/
  cli.ts            # commander: init [dir] (--preset, --yes, --dry-run), list, doctor
  prompts.ts        # @clack/prompts: konfirmasi stack & preset
  detect/           # index, node (deps), python, go, workspace, package-manager
  presets/          # registry (load), resolve (extends chain, dedupe, override)
  render/           # agents-md (eta), claude-md, context (projectName, pm, commands rtk-prefixed)
  write/            # plan (new/skip per file), apply (tulis file baru saja + laporan skip + instruksi manual)
  doctor.ts         # cek rtk/graphify/uipro/caveman/ponytail terpasang → print perintah install (tidak auto-install)
  types.ts
presets/<id>/preset.json · sections/*.md · rules/*.md · skills/<name>/SKILL.md
test/fixtures/<stack>/ · test/*.test.ts
```
Deps: commander, @clack/prompts, eta, yaml, gray-matter, picocolors. Dev: typescript, tsup, vitest. Node ≥ 20. `bin` → `dist/cli.js`, `files: [dist, presets]`.

## Alur `init`
1. Detect → kind (frontend/backend/fullstack/monorepo), packages + stacks, package manager.
2. Konfirmasi via prompt (`--yes` skip, `--preset` override).
3. Resolve chain `base → bahasa → framework` (+ monorepo root/per package).
4. Render → daftar file; `--dry-run` berhenti di sini.
5. Tulis hanya file yang belum ada; file eksisting → skip + cetak snippet yang perlu ditambahkan manual.
6. Jalankan `doctor` ringkas di akhir.

## Langkah implementasi (TDD per modul)
1. Setup project + `types.ts`.
2. `detect/*` + fixtures (nextjs, react-vite, nestjs, express, fastapi, django, go, turborepo, nx, pnpm, fullstack web+api).
3. Registry + resolve + preset `base` (isi lengkap aturan user).
4. Render AGENTS.md / CLAUDE.md + snapshot test.
5. Write plan/apply (skip-existing, dry-run).
6. CLI + prompts + doctor.
7. Preset bahasa, framework, monorepo.
8. README + dokumentasi repo tool sendiri.

## Verifikasi
- `pnpm test`: unit detect/resolve/render/apply; snapshot per fixture; lint preset (SKILL.md frontmatter valid sesuai spec, `name` = folder, `extends` valid, tanpa siklus); AGENTS.md hasil < 32 KiB.
- `pnpm build && node dist/cli.js init test/fixtures/nextjs --yes --dry-run` → daftar file benar.
- E2E temp dir: copy fixture turborepo → `init --yes` → cek root + nested AGENTS.md, CLAUDE.md, `.agents/`, `.claude/skills/`, `docs/wiki/`; tambah AGENTS.md manual lalu run ulang → file tidak berubah, instruksi manual tercetak.
- `node dist/cli.js list` dan `doctor` jalan.
