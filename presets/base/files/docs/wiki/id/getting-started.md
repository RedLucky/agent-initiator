# Memulai

> Untuk developer baru. Ganti panduan ini dengan langkah dan command yang sebenarnya (pertahankan prefix `rtk` dari AGENTS.md).

## Singkatnya
Cara menjalankan {{projectName}} di mesin Anda, memastikan semuanya bekerja, dan membuat perubahan pertama.

## Kebutuhan
Tool dan versi yang harus terpasang (runtime, package manager, database, …) serta tooling agent wajib yang tercantum di AGENTS.md.

## Instal dan jalankan
Command yang tepat, berurutan, dari clone baru sampai project berjalan.

## Test
Cara menjalankan test dan seperti apa hasil yang "lolos".

## Git hook
Git hook ada di `.git/` dan tidak ikut di-commit, jadi jalankan ini sekali setelah clone:
1. `graphify hook install` — menjaga graph kode yang ditanyai AI agent tetap mutakhir. `graphify hook status` menunjukkan apakah hook sudah terpasang.
2. `lefthook install` — mengaktifkan hook di `lefthook.yml`: lint dan cek pesan commit sebelum setiap commit, typecheck dan test sebelum setiap push, dan pembaruan graph setiap kali commit.

Jangan pernah melewati hook dengan `--no-verify`; perbaiki apa yang dilaporkan.

## Perubahan pertama Anda
Alur kerjanya: rencanakan task, buat perubahan dengan test dan doc comment, perbarui halaman wiki topiknya, lolos Definition of Done, lalu minta persetujuan commit.
