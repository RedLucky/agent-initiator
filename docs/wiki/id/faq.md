# FAQ

## Singkatnya
Jawaban untuk pertanyaan umum dan cara mengatasi masalah yang sering muncul saat memakai atau mengembangkan agent-initiator.

## Memakai tool

### `npx agent-initiator` menampilkan 404 / not found
Package-nya belum ada di npm. Pasang dari hasil clone dengan `pnpm link --global`; lihat [getting started](getting-started.md).

### `pnpm link --global` gagal dengan ERR_PNPM_NO_GLOBAL_BIN_DIR
Jalankan `pnpm setup` sekali, lalu `source ~/.bashrc` (atau buka terminal baru) dan link lagi.

### Project terbuat di folder yang salah
`init <nama>` membuat `<nama>` relatif terhadap folder tempat terminal Anda berada. Jalankan dari folder induk yang dimaksud atau beri path lengkap.

### AGENTS.md saya yang sudah ada tidak berubah
Memang begitu: file yang sudah ada tidak pernah ditimpa. `init` mencetak bagian Rules dan Skills yang bisa Anda tempel sendiri.

### `init --yes` berhenti dengan "stack not detected"
Foldernya kosong. Tambahkan `--framework`, `--apps` atau `--preset`, atau jalankan tanpa `--yes` untuk menjawab pertanyaannya.

### Scaffolding berhenti di tengah jalan
Pesan error menyebut command yang gagal dan folder berisi file setengah jadi. Hapus folder itu lalu jalankan lagi. Tool yang belum terinstal dilaporkan sebelum ada file yang ditulis.

### moon menampilkan "No tasks found" atau "ambiguous argument 'HEAD'"
moon butuh minimal satu commit git dan task di `moon.yml` setiap project. Buat commit pertama lalu jalankan `moon setup`; lihat [scaffolding](features/scaffolding.md).

### Repository saya sudah punya CI. Apakah init menambah satu lagi?
Tidak. Kalau init menemukan CI yang sudah ada (workflow GitHub, `.gitlab-ci.yml`, Jenkins, CircleCI, Azure, Bitbucket, Travis), init tidak menulis file CI dan menampilkan apa yang ditemukan. Tetap tambahkan punya kita dengan `--ci github` atau `--ci gitlab`; file yang sudah ada tetap tidak pernah ditimpa. Lihat [quality gate](features/quality-gates.md).

### CI gagal saat install dengan error lockfile atau "ignored builds"
CI memasang versi pnpm atau yarn yang berbeda dari milik Anda. Pin versi Anda di package.json: `npm pkg set packageManager=pnpm@$(pnpm -v)`; lihat [quality gate](features/quality-gates.md).

### `doctor` menampilkan tanda silang merah
Tool pendukung itu belum terinstal. `doctor` mencetak command instalnya; tidak ada yang diinstal otomatis.

## Mengembangkan tool

### Test requirement gagal setelah saya mengubah sebuah rule
`test/requirements.test.ts` menjaga aturan yang disepakati dengan product owner. Kembalikan kalimatnya, atau kalau perubahannya memang disengaja, perbarui guard-nya di task yang sama.

### Test snapshot gagal
Jalankan `rtk test pnpm vitest run -u` hanya kalau perubahan output memang disengaja, dan periksa diff snapshot sebelum commit.
