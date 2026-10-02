# Wiki {{projectName}}

## Singkatnya
Wiki ini menjelaskan {{projectName}} untuk semua orang: yang tidak menulis kode, developer yang baru masuk project, dan developer yang sudah lama mengenalnya. Ditulis untuk manusia dan AI agent, dan selalu sinkron dengan `docs/wiki/en/`.

## Mulai dari mana

| Anda adalah… | Baca dengan urutan ini |
|--------------|------------------------|
| Bukan developer (produk, QA, stakeholder) | [overview](overview.md) → [glossary](glossary.md) → [faq](faq.md) |
| Developer baru | [overview](overview.md) → [getting-started](getting-started.md) → [architecture](architecture.md) → `features/` |
| Developer berpengalaman | [architecture](architecture.md) → `features/` → [log](log.md) |

## Untuk AI agent: task → halaman

AI agent cukup membaca halaman bahasa Inggris (`docs/wiki/en/`); lewati `log.md` kecuali sedang menyelidiki riwayat. Tambahkan satu baris per task umum saat halamannya dibuat.

| Task | Baca | Lalu lihat |
|------|------|------------|
| Memahami alur keseluruhan | [architecture](architecture.md) | titik masuk kode |

## Semua halaman

| Halaman | Ringkasan |
|---------|-----------|
| [overview.md](overview.md) | Apa itu {{projectName}}, untuk siapa, dan kenapa dibuat |
| [getting-started.md](getting-started.md) | Instal, jalankan, dan test project; membuat perubahan pertama |
| [architecture.md](architecture.md) | Bagaimana bagian-bagian utama saling terhubung, dengan diagram |
| [glossary.md](glossary.md) | Istilah dan singkatan dalam bahasa sederhana |
| [faq.md](faq.md) | Pertanyaan dan masalah umum, beserta jawabannya |
| [log.md](log.md) | Catatan perubahan — terbaru di atas |

Halaman fitur dan topik ada di `features/<topik>.md` dan ditambahkan ke tabel ini saat dibuat.
