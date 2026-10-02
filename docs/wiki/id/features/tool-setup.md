# Tool wajib, doctor dan setup per repository

## Singkatnya
Instruksi yang dihasilkan meminta AI assistant dan developer memakai enam tool pendukung. Sebagian besar cukup diinstal sekali per komputer lalu bekerja di mana-mana; tiga di antaranya butuh langkah kecil di setiap repository. agent-initiator mengecek semuanya dan bisa menjalankan langkah per repository itu, tetapi tidak pernah menginstal apa pun sendiri.

## Tool-tool tersebut
| Tool | Untuk apa | Setelah instal sekali | Langkah per repository |
|------|-----------|-----------------------|------------------------|
| rtk | memperpendek output command | otomatis (hook global) | tidak ada |
| caveman | jawaban assistant yang singkat | otomatis di Claude Code | tidak ada |
| ponytail | kode paling kecil yang berfungsi | otomatis di Claude Code | tidak ada |
| graphify | peta kode yang bisa dicari | skill tersedia | `graphify update .`, opsional `graphify hook install` |
| lefthook | git hook untuk semua bahasa ([quality gate](quality-gates.md)) | CLI tersedia | `lefthook install` |
| UI UX Pro Max (frontend saja) | panduan desain | CLI tersedia | `uipro init --ai universal` dan `--ai claude` |

## Cara kerja setup

```mermaid
flowchart TD
    A[init: preset sudah digabung] --> B{Ada langkah per repo untuk tool wajib?}
    B -- tidak --> G[Buat file]
    B -- ada --> C{--setup-tools, atau jawab ya pada pertanyaan?}
    C -- tidak --> G
    C -- ya --> D{Tool sudah terinstal?}
    D -- belum --> E[Lewati dan arahkan ke doctor]
    D -- sudah --> F[Jalankan langkahnya<br/>hook hanya di dalam repo git]
    E --> G
    F --> G
```

Dengan kata-kata: setelah preset diketahui, tool mendaftar langkah per repository. Langkah itu dijalankan dengan `--setup-tools` atau kalau Anda setuju saat ditanya. Di mode `--yes` tanpa `--setup-tools`, hanya langkah git hook yang dijalankan: `graphify hook install` selama `.gitattributes` belum ada (graphify menambahkan baris ke file itu, dan file yang sudah ada tidak pernah diubah tanpa bertanya), lalu `lefthook install` selama `.husky/` maupun `.pre-commit-config.yaml` belum ada (repo seperti itu sudah punya pengelola hook); kalau tidak, tool mencetak perintahnya untuk Anda jalankan sendiri. Tool yang belum terinstal dilewati (tidak pernah diinstal), git hook hanya dipasang di dalam repository git, dan langkah yang gagal hanya memunculkan peringatan tanpa menghentikan `init`. Setup berjalan sebelum file dibuat supaya skill UI UX Pro Max terdaftar di AGENTS.md; hanya `lefthook install` yang berjalan setelah file ditulis, karena perintah itu membaca `lefthook.yml` hasil generate (tanpa file itu, lefthook menulis config bawaannya sendiri).

## Memakai graphify dengan hemat
- `graphify update .` membangun graph dari kode saja (tanpa LLM, tanpa token); git hook menjaganya tetap mutakhir.
- Ekstraksi penuh `/graphify` membaca dokumen dengan LLM dan mahal; jalankan hanya sesekali, karena wiki bahasa Inggris sudah menjelaskan konsepnya.
- Bertanya dengan nama simbol dan budget: `graphify affected "detectWorkspace"` menampilkan apa yang tersentuh sebuah perubahan dalam sekitar 140 token; `graphify path "runInit" "moonProjectConfig"` menampilkan rantai panggilan dalam satu baris. Pertanyaan umum menghasilkan noise.
- `.graphifyignore` (dibuat oleh `init`) mengeluarkan `docs/wiki/id/` dan log perubahan dari graph.

## Doctor
`agent-initiator doctor` menampilkan centang atau silang per tool, beserta command instal untuk yang belum ada. Exit code-nya 1 kalau ada tool yang kurang, sehingga bisa dipakai di CI. Di dalam repository git, doctor juga menampilkan apakah git hook graphify sudah terpasang (yang dicek hook post-checkout, karena post-commit diambil alih lefthook); hook yang belum terpasang hanya peringatan, karena clone di CI memang tidak pernah punya hook.

Setelah meng-clone repository, setiap kontributor menjalankan `graphify hook install` lalu `lefthook install` sekali (hook ada di `.git/` dan tidak ikut di-commit). Halaman getting-started hasil generate dan AGENTS.md → Project knowledge sama-sama menyebutkannya.

## Letaknya di kode
`src/tooling.ts` (daftar tool dan teksnya: baris cara pakai masuk ke AGENTS.md, tujuan dan langkah instal ke rule hasil generate `.agents/rules/required-tooling.md` lewat `src/render/tooling-rule.ts`), `src/setup.ts` (langkah per repo), `src/doctor.ts` (cek mesin).

## Cara mengeceknya
`rtk test pnpm vitest run test/setup.test.ts`.
