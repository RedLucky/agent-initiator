# Preset

## Singkatnya
Preset adalah paket siap pakai berisi aturan, panduan langkah demi langkah (skill), command dan batasan untuk satu teknologi. agent-initiator menumpuk beberapa preset — dari aturan umum sampai aturan khusus framework — sehingga app Next.js dan service FastAPI masing-masing mendapat aturan yang cocok, di atas standar perusahaan yang sama.

## Bagaimana preset ditumpuk

```mermaid
flowchart LR
    B[base<br/>kualitas, keamanan, testing, git, wiki] --> L[bahasa<br/>node, typescript, python, go]
    L --> S[shared<br/>web-frontend, web-backend, monorepo]
    S --> F[framework<br/>nextjs, nestjs, fastapi, ...]
```

Dengan kata-kata: setiap repository mendapat `base`. Preset bahasa menambah aturan bahasa, preset shared menambah aturan frontend, backend atau monorepo, dan preset framework menambah aturan framework itu sendiri. Lapisan yang lebih belakang bisa menimpa command, rule dan skill dengan nama yang sama.

## Isi sebuah preset
| File | Isi |
|------|-----|
| `presets/<id>/preset.json` | id, nama, kategori, `extends`, command, konvensi, batasan MUST/NEVER, tool wajib, `docs` sesuai versi |
| `rules/*.md` | file rule dengan `description`, `globs` dan `alwaysApply` |
| `skills/<nama>/SKILL.md` | skill dalam format Agent Skills |
| `files/` | file yang disalin ke repository, seperti kerangka wiki |
| `agents-md.md` | blok yang disalin apa adanya ke AGENTS.md (dipakai untuk blok resmi Next.js) |

## Preset base
Selalu ikut. Berisi standar yang disepakati dengan product owner: disiplin LLM ala Karpathy, kualitas kode (KISS, DRY, SOLID, tanpa AI slop), penamaan, error handling dan logging, keamanan, arsitektur termasuk skalabilitas, testing (setiap function, coverage, mocking), alur git (persetujuan, satu task satu commit, tanpa trailer atribusi), dokumentasi (wiki ini), dependency, quality gate CI, observability, privasi data (UU PDP dan GDPR) dan versioning rilis. Jalankan `agent-initiator list` untuk melihat semua preset.

## Letaknya di kode
`src/presets/registry.ts` memuat dan mengecek preset (nama skill harus sama dengan foldernya); `src/presets/resolve.ts` menggabungkan rantai preset mulai dari induk.

## Cara mengeceknya
`rtk test pnpm vitest run test/presets.test.ts test/requirements.test.ts`.
