# Tool wajib, doctor dan setup per repository

## Singkatnya
Instruksi yang dihasilkan meminta AI assistant dan developer memakai lima tool pendukung. Sebagian besar cukup diinstal sekali per komputer lalu bekerja di mana-mana; dua di antaranya butuh langkah kecil di setiap repository. agent-initiator mengecek semuanya dan bisa menjalankan langkah per repository itu, tetapi tidak pernah menginstal apa pun sendiri.

## Tool-tool tersebut
| Tool | Untuk apa | Setelah instal sekali | Langkah per repository |
|------|-----------|-----------------------|------------------------|
| rtk | memperpendek output command | otomatis (hook global) | tidak ada |
| caveman | jawaban assistant yang singkat | otomatis di Claude Code | tidak ada |
| ponytail | kode paling kecil yang berfungsi | otomatis di Claude Code | tidak ada |
| graphify | peta kode yang bisa dicari | skill tersedia | `graphify update .`, opsional `graphify hook install` |
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

Dengan kata-kata: setelah preset diketahui, tool mendaftar langkah per repository. Langkah itu hanya dijalankan dengan `--setup-tools` atau kalau Anda setuju saat ditanya. Tool yang belum terinstal dilewati (tidak pernah diinstal), git hook hanya dipasang di dalam repository git, dan langkah yang gagal hanya memunculkan peringatan tanpa menghentikan `init`. Setup berjalan sebelum file dibuat supaya skill UI UX Pro Max terdaftar di AGENTS.md.

## Doctor
`agent-initiator doctor` menampilkan centang atau silang per tool, beserta command instal untuk yang belum ada. Exit code-nya 1 kalau ada yang kurang, sehingga bisa dipakai di CI.

## Letaknya di kode
`src/tooling.ts` (daftar tool dan teksnya), `src/setup.ts` (langkah per repo), `src/doctor.ts` (cek mesin).

## Cara mengeceknya
`rtk test pnpm vitest run test/setup.test.ts`.
