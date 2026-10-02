# Glosarium

## Singkatnya
Kata-kata yang dipakai di project ini, dijelaskan dengan bahasa sederhana. Kalau sebuah halaman memakai istilah yang belum ada di sini, tambahkan.

| Istilah | Arti dalam bahasa sederhana |
|---------|-----------------------------|
| AI coding assistant / agent | Program seperti Claude Code, Codex, Cursor atau Copilot yang menulis dan mengubah kode untuk seseorang. |
| AGENTS.md | File pertama yang dibaca AI assistant di sebuah repository: gambaran project, command, aturan, batasan dan tautan. |
| CLAUDE.md | File instruksi Claude Code. agent-initiator menulis versi yang isinya hanya "baca AGENTS.md". |
| Rule | File Markdown di `.agents/rules/` yang menjelaskan bagaimana kode harus ditulis (misalnya penamaan atau keamanan). |
| Skill | Panduan langkah demi langkah di `.agents/skills/<nama>/SKILL.md` yang diikuti assistant untuk sebuah tugas, seperti `commit` atau `update-wiki`. |
| Format Agent Skills | Standar terbuka untuk skill (agentskills.io): sebuah folder berisi `SKILL.md` dengan `name` dan `description`. |
| Preset | Paket siap pakai berisi rules, skills, command dan batasan untuk satu stack, misalnya `nextjs` atau `fastapi`. |
| Stack | Kumpulan teknologi yang dipakai project: bahasa, framework, package manager, tool monorepo. |
| Monorepo | Satu repository yang berisi beberapa app atau package, dikelola tool seperti Turborepo, Nx atau moon. |
| Scaffolding | Membuat file-file awal project baru dengan tool resmi framework (misalnya `create-next-app`). |
| Package manager | Tool yang menginstal dependency project: npm, pnpm, yarn, bun untuk JavaScript; uv, poetry, pip untuk Python. |
| rtk | Rust Token Killer: menjalankan command shell dan memperpendek outputnya supaya AI assistant memakai lebih sedikit token. Setiap command diawali `rtk`. |
| graphify | Membuat peta kode yang bisa dicari (knowledge graph) supaya assistant cepat menemukan sesuatu. |
| CI (continuous integration) | Layanan yang menjalankan cek project di setiap push atau pull request, di mesin yang bersih. agent-initiator membuatnya untuk GitHub Actions. |
| Lockfile | File yang mencatat versi persis setiap dependency (`pnpm-lock.yaml`, `uv.lock`, `go.sum`, …), supaya setiap mesin meng-install hal yang sama. |
| Git hook | Script kecil yang dijalankan git pada saat tertentu, misalnya tepat sebelum commit disimpan. Hook ada di `.git/hooks/` dan tidak ikut dibagikan lewat repository. |
| lefthook | Menjalankan git hook yang terdaftar di `lefthook.yml`, untuk bahasa pemrograman apa pun. Lihat [quality gate](features/quality-gates.md). |
| Quality gate | Pengecekan otomatis yang menghentikan perubahan kalau melanggar aturan yang disepakati, misalnya format pesan commit. |
| caveman | Mode yang membuat AI assistant menjawab dengan singkat. |
| ponytail | Mode yang membuat AI assistant menulis solusi paling kecil yang tetap berfungsi. |
| UI UX Pro Max | Skill desain untuk pekerjaan antarmuka pengguna, ditambahkan untuk project frontend. |
| Definition of Done (DoD) | Daftar cek yang harus dilewati sebuah perubahan sebelum selesai: self-review, test dengan coverage, build, audit dependency, wiki. |
| Coverage | Persentase baris kode yang benar-benar dijalankan oleh test. Definition of Done meminta minimal 80% pada kode yang berubah. |
| ADR | Architecture Decision Record: halaman singkat yang menjelaskan sebuah keputusan teknis penting dan alasannya. |
| Mermaid | Format teks untuk diagram yang ditampilkan GitHub sebagai gambar dan bisa dibaca AI assistant sebagai teks. |
| Dogfooding | Memakai tool kita sendiri di repository kita sendiri; `AGENTS.md` repository ini dibuat oleh agent-initiator. |
