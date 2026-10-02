# Wiki agent-initiator

## Singkatnya
Wiki ini menjelaskan agent-initiator untuk semua orang: yang tidak menulis kode, developer yang baru masuk project, dan developer yang sudah mengenalnya. Ditulis untuk manusia dan AI agent, dan selalu sinkron dengan `docs/wiki/en/`.

## Mulai dari mana

| Anda adalah… | Baca dengan urutan ini |
|--------------|------------------------|
| Bukan developer (produk, QA, stakeholder) | [overview](overview.md) → [glossary](glossary.md) → [faq](faq.md) |
| Developer baru | [overview](overview.md) → [getting-started](getting-started.md) → [architecture](architecture.md) → halaman fitur |
| Developer berpengalaman | [architecture](architecture.md) → halaman fitur → [log](log.md) |

## Untuk AI agent: task → halaman

AI agent cukup membaca halaman bahasa Inggris (`docs/wiki/en/`); `docs/wiki/id/` berisi konten yang sama dalam bahasa Indonesia. Lewati `log.md` kecuali sedang menyelidiki riwayat. Untuk pertanyaan "siapa memanggil apa" dan dampak perubahan, pakai `graphify affected "<simbol>"` atau `graphify path "<A>" "<B>"` alih-alih membaca kode.

| Task | Baca | Lalu lihat |
|------|------|------------|
| Memahami alur keseluruhan | [architecture](architecture.md) | `src/cli.ts` |
| Mengubah cara deteksi stack | [features/stack-detection.md](features/stack-detection.md) | `src/detect/` |
| Menambah atau mengubah preset, rule atau skill | [features/presets.md](features/presets.md) | `presets/<id>/`, `src/presets/` |
| Mengubah AGENTS.md atau output lain yang di-generate | [features/generated-files.md](features/generated-files.md) | `src/generate.ts`, `src/render/` |
| Menambah atau mengubah scaffolder atau layout | [features/scaffolding.md](features/scaffolding.md) | `src/scaffold/` |
| Mengubah tool pendukung, doctor atau setup | [features/tool-setup.md](features/tool-setup.md) | `src/tooling.ts`, `src/setup.ts`, `src/doctor.ts` |
| [features/wiki-knowledge-base.md](features/wiki-knowledge-base.md) | `presets/base/rules/documentation.md` |

## Semua halaman

| Halaman | Ringkasan |
|---------|-----------|
| [overview.md](overview.md) | Apa itu agent-initiator, untuk siapa, dan kenapa dibuat |
| [getting-started.md](getting-started.md) | Memasang command, memakainya, menjalankan test, membuat perubahan pertama |
| [architecture.md](architecture.md) | Bagaimana bagian-bagiannya saling terhubung, dengan diagram |
| [features/stack-detection.md](features/stack-detection.md) | Cara tool mengenali bahasa, framework, package manager dan tool monorepo |
| [features/presets.md](features/presets.md) | Paket aturan berlapis per stack |
| [features/generated-files.md](features/generated-files.md) | Apa yang ditulis ke repository dan kenapa tidak ada yang ditimpa |
| [features/scaffolding.md](features/scaffolding.md) | Membuat project baru dengan tool resmi, termasuk monorepo dan moon |
| [features/tool-setup.md](features/tool-setup.md) | Tool pendukung opsional, `doctor` dan setup per repository |
| [features/wiki-knowledge-base.md](features/wiki-knowledge-base.md) | Cara wiki dirawat sebagai knowledge base untuk semua pembaca |
| [glossary.md](glossary.md) | Istilah dan singkatan dalam bahasa sederhana |
| [faq.md](faq.md) | Pertanyaan dan masalah umum, beserta jawabannya |
| [log.md](log.md) | Catatan perubahan — terbaru di atas |
