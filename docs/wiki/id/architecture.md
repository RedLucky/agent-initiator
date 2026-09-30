# Arsitektur

agent-initiator adalah CLI Node.js. Satu kali `init` berjalan melalui lima tahap. Setiap tahap adalah modul terpisah sehingga bisa diuji sendiri.

```
                ┌─────────────────────────────┐
 folder baru/   │ 0. scaffold (opsional)      │  src/scaffold/  scaffolder resmi → project nyata
 kosong?        └──────────────┬──────────────┘
                               ▼
 1. detect      src/detect/     package.json / pyproject / go.mod / file workspace → package + stack
 2. resolve     src/presets/    id preset → rantai parent-first (base → bahasa → shared → framework) → config gabungan
 3. generate    src/generate.ts pure: project + config → daftar file (AGENTS.md, rules, skills, wiki…)
 4. write       src/write/      hanya membuat file yang belum ada; mencetak langkah manual untuk file yang sudah ada
 5. doctor      src/doctor.ts   cek tooling wajib di mesin ini (tidak pernah menginstal)
```

## Keputusan desain utama

| Keputusan | Alasan |
|-----------|--------|
| Konten ada di `presets/` (Markdown + JSON), bukan di kode | Rules dan skills bisa diperbaiki tanpa menyentuh TypeScript. |
| `generate.ts` dan recipe scaffold adalah pure function | Output deterministik; unit test dan snapshot test cepat. |
| File yang sudah ada tidak pernah ditimpa | Aman dijalankan di repo yang sudah punya instruksi tulisan tangan. |
| Sumbernya `AGENTS.md` + `.agents/`; adapternya `CLAUDE.md` (`@AGENTS.md`) dan `.claude/skills/` | AGENTS.md dan `.agents/skills` dibaca sebagian besar agent; Claude Code butuh adapter. |
| Pengetahuan framework menunjuk ke docs yang sesuai versi terpasang | Data training agent cepat basi; docs bawaan (Next.js, Turborepo, FastAPI) tidak. |
| Scaffolding memakai CLI resmi | Hasil project sesuai rekomendasi terbaru tiap framework; hanya Express yang memakai template minimal. |

## Preset

- `preset.json`: `id`, `category`, `extends`, `commands`, `conventions`, `must`, `never`, `tooling`, `docs`.
- `rules/*.md`: frontmatter `description`, `globs`, `alwaysApply`.
- `skills/<name>/SKILL.md`: mengikuti spesifikasi Agent Skills.
- `files/`: file statis, misalnya kerangka wiki.
- `agents-md.md`: blok verbatim untuk AGENTS.md (dipakai untuk blok terkelola Next.js).

Rantai preset digabung mulai dari parent. List di-dedupe. Commands, rules, dan skills dengan key yang sama dioverride oleh preset yang lebih belakang.

## Test

- `test/detect|commands|generate|write|scaffold`: unit test dan snapshot test.
- `test/cli.e2e.test.ts`: CLI hasil build dijalankan pada salinan fixture.
- `test/requirements.test.ts`: setiap rule, skill, dan constraint yang disepakati dengan product owner wajib muncul di output.
