# Gambaran umum agent-initiator

## Singkatnya
agent-initiator adalah tool command-line yang menyiapkan sebuah repository untuk AI coding assistant (seperti Claude Code, Codex, Cursor atau GitHub Copilot). Dengan satu perintah, tool ini menulis instruksi, aturan dan panduan langkah demi langkah yang diikuti assistant tersebut, sehingga setiap project punya standar kualitas yang sama sejak hari pertama. Tool ini juga bisa membuat project baru lebih dulu, memakai tool setup resmi dari setiap framework.

## Siapa yang memakainya
- **Team lead dan arsitek** yang ingin setiap repository baru dimulai dengan aturan yang sama untuk kualitas kode, keamanan, testing, dokumentasi dan git.
- **Developer** yang memulai project baru atau menambahkan AI assistant ke project yang sudah ada.
- **AI coding assistant** itu sendiri: mereka membaca file yang dihasilkan tool ini dan mengikutinya.

## Masalah yang diselesaikan
Tanpa instruksi bersama, AI assistant menghasilkan kode yang tidak konsisten, melewatkan test, melakukan commit tanpa bertanya, dan memakai pengetahuan framework yang sudah usang. Menulis instruksi itu manual untuk setiap repository memakan waktu dan lama-lama berbeda antar project.

## Kemampuan utama
| Kemampuan | Artinya | Detail |
|-----------|---------|--------|
| Deteksi stack | Mengenali framework, bahasa dan tool monorepo yang sudah ada di repository | [deteksi stack](features/stack-detection.md) |
| Preset | Aturan dan panduan siap pakai per stack, digabung berlapis | [preset](features/presets.md) |
| File yang dihasilkan | Menulis `AGENTS.md`, rules, skills, `CLAUDE.md` dan wiki dua bahasa — tidak pernah menimpa file yang sudah ada | [file yang dihasilkan](features/generated-files.md) |
| Scaffolding | Membuat project baru dengan tool resmi framework sebelum menulis instruksinya | [scaffolding](features/scaffolding.md) |
| Setup tool dan doctor | Mengecek tool pendukung opsional dan menyiapkan yang perlu langkah per repository | [setup tool](features/tool-setup.md) |
| Wiki knowledge base | Merawat wiki seperti ini yang bisa diikuti semua pembaca | [wiki knowledge base](features/wiki-knowledge-base.md) |

## Yang tidak dilakukan
- Tidak menulis kode bisnis aplikasi Anda.
- Tidak pernah menimpa file yang sudah ada, tidak pernah commit dan tidak pernah push.
- Tidak menginstal tool pendukung untuk Anda; tool ini hanya memberi tahu caranya.
- Belum ada di npm; lihat [getting started](getting-started.md).
