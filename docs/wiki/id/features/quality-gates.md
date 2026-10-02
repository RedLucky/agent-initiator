# Quality gate (git hook)

## Singkatnya
Quality gate adalah pengecekan otomatis yang menghentikan perubahan kalau melanggar aturan yang sudah disepakati. agent-initiator menambahkan git hook untuk bahasa pemrograman apa pun: sebelum commit kode di-lint dan pesan commit harus mengikuti format project; sebelum push type check dan test harus lolos; dan peta kode yang dipakai AI assistant diperbarui setelah setiap commit. Hook dijalankan oleh lefthook, satu tool kecil yang bekerja sama untuk JavaScript, Python, Go dan lainnya.

## Apa yang berjalan dan kapan

| Saat | Pengecekan | Menghentikan? |
|------|------------|---------------|
| `pre-commit` (sebelum commit dibuat) | Command `lint` milik package. Di repo multi-package setiap package punya cek sendiri, dijalankan di dalam package itu dan hanya kalau ada file staged di dalamnya. | commit |
| `commit-msg` (setelah Anda menulis pesan) | Header berupa `type(#123): subject` atau `type(TASK-123): subject`, subject maksimal 72 karakter, tanpa trailer `Co-Authored-By`. Pesan buatan git sendiri (`Merge …`, `Revert …`) lolos. | commit |
| `pre-push` (sebelum commit dikirim) | Command `typecheck` dan `test` milik setiap package, masing-masing dijalankan di dalam package-nya | push |
| `pre-push` | `check-wiki.sh`: pengingat kalau kode berubah tapi `docs/wiki/en/` tidak ([detail](wiki-knowledge-base.md#pengingat-kalau-wiki-terlupa)) | tidak pernah (hanya peringatan) |
| `post-commit` (setelah commit tersimpan) | `graphify update .` memperbarui graph kode, hanya kalau graphify termasuk tool wajib | tidak pernah |

Command-nya sama dengan yang tercantum di AGENTS.md, tanpa awalan `rtk` (hook juga berjalan untuk orang yang tidak memakai rtk). Package tanpa command `lint`, `typecheck` atau `test` tidak mendapat cek untuk itu. `format` sengaja tidak dimasukkan: banyak script format menulis ulang file, dan hook tidak boleh mengubah kode Anda diam-diam. lefthook tidak menyaring command pre-push berdasarkan file yang berubah, jadi setiap package dicek sebelum push, seperti di CI.

```mermaid
flowchart LR
    A[git commit] --> L{Lint lolos di<br/>package yang berubah?}
    L -- tidak --> D
    L -- ya --> B[lefthook menjalankan commit-msg]
    B --> C{Pesan sesuai format<br/>dan tanpa trailer atribusi?}
    C -- tidak --> D[Commit dihentikan<br/>beserta alasannya]
    C -- ya --> E[Commit tersimpan]
    E --> F[lefthook menjalankan post-commit:<br/>graphify update]
    E -. nanti .-> P[git push]
    P --> T{Typecheck dan test lolos<br/>di setiap package?}
    T -- tidak --> X[Push dihentikan]
    T -- ya --> Y[Commit terkirim]
```

Dengan kata-kata: saat Anda commit, lefthook pertama menjalankan lint di package yang Anda ubah, lalu `check-message.sh` pada pesan Anda. Pesan yang salah menghentikan commit dan menampilkan format yang diharapkan. Pesan yang benar disimpan, lalu graph kode diperbarui oleh hook; langkah itu tidak pernah menggagalkan commit. Saat push, typecheck dan test harus lolos dulu. Tidak ada yang boleh melewati hook dengan `--no-verify`: AGENTS.md mencantumkannya di NEVER.

## Apa yang dibuat oleh init
- `lefthook.yml` — daftar hook (di-render, karena cek bergantung pada package dan command yang terdeteksi, dan langkah graphify pada tool wajib).
- `.lefthook/commit-msg/check-message.sh` dan `.lefthook/pre-push/check-wiki.sh` — `sh` POSIX biasa, jadi tidak butuh Node, Python atau Go.
- AGENTS.md: lefthook di Required tooling (instal lewat npm, uv, go atau brew), satu baris di Project knowledge, dan entri NEVER.

## Mengaktifkan hook
Hook ada di `.git/` dan tidak ikut di-commit, jadi setiap clone menjalankan `lefthook install` sekali. `init` menjalankannya untuk Anda (bahkan dengan `--yes`) di dalam repo git kalau lefthook sudah terinstal, kecuali ada `.husky/` atau `.pre-commit-config.yaml`: repo seperti itu sudah punya pengelola hook, dan init hanya mencetak perintahnya. Perintah ini berjalan setelah file ditulis, karena `lefthook install` tanpa `lefthook.yml` menulis config bawaan lefthook sendiri. Kalau repo sudah punya `lefthook.yml`, init mempertahankannya dan mencetak blok `commit-msg` untuk ditambahkan manual.

Urutan penting bersama graphify: jalankan `graphify hook install` dulu, lalu `lefthook install`. lefthook memindahkan hook post-commit graphify (ke `post-commit.old`) dan menjalankan graphify dari `lefthook.yml`. Kalau urutannya terbalik, graphify menambahkan dirinya ke hook lefthook dan graph dibangun dua kali per commit. Karena itu `doctor` mengecek hook post-checkout graphify, yang tidak disentuh lefthook.

## Letaknya di kode
| Apa | File |
|-----|------|
| Renderer daftar hook | `src/render/lefthook.ts` |
| Task mana berjalan di hook mana, per package | `hookChecks` di `src/generate.ts`, command dari `packageTaskCommands` di `src/render/commands.ts` |
| Cek pesan commit | `presets/base/files/.lefthook/commit-msg/check-message.sh` |
| Pengingat wiki (pre-push) | `presets/base/files/.lefthook/pre-push/check-wiki.sh` |
| `lefthook.yml` masuk ke output | `src/generate.ts` |
| Langkah setup `lefthook install` dan aturan lewatinya | `src/setup.ts` |
| Entri tool (instal, cara pakai) | `src/tooling.ts` |
| Teks rule | `presets/base/rules/ci-quality-gates.md` |

## Cara mengetesnya
`rtk test pnpm vitest run test/lefthook.test.ts test/setup.test.ts test/check-wiki.test.ts`.
