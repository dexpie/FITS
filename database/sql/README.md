# Skrip SQL FITS

Folder ini menyimpan skrip yang dijalankan secara manual melalui Supabase SQL Editor. File-file ini bukan riwayat migration Supabase CLI dan tidak otomatis dijalankan saat aplikasi dimulai. Skrip membuat objek baru, sehingga tidak aman untuk dijalankan ulang tanpa memeriksa database terlebih dahulu.

Skrip bergantung pada struktur kelompok yang sudah ada, termasuk tabel `kategori`, `lokasi`, `pos_drop_off`, `laporan_temuan`, `pertanyaan_verifikasi`, tipe `status_laporan` dan `status_pertanyaan`, serta Supabase Auth dan Storage. Folder ini belum berisi skema dasar lengkap untuk membuat database FITS dari awal.

| Urutan | File | Kegunaan | Status di Project FITS saat diperiksa pada 11 November 2026 |
| --- | --- | --- | --- |
| 1 | `uc05_laporan_kehilangan.sql` | Tabel laporan kehilangan dan kebijakan akses pemilik | Sudah dijalankan |
| 2 | `uc06_pencarian_serupa.sql` | Fungsi pencarian laporan pasangan dengan hasil terbatas | Sudah dijalankan |
| 3 | `uc07_01_status_draf.sql` | Menambahkan status Draf untuk pertanyaan verifikasi | Sudah dijalankan |
| 4 | `uc07_02_penyimpanan.sql` | Penyimpanan laporan temuan, pertanyaan dan bucket foto | Sudah dijalankan setelah file nomor 3 |
| 5 | `uc05_foto_storage.sql` | Bucket privat untuk foto laporan kehilangan | Belum terpasang saat pemeriksaan terakhir |

File nomor 3 dan 4 dijalankan terpisah; tunggu file nomor 3 selesai sebelum menjalankan file nomor 4. File nomor 4 membatasi akses langsung ke kolom jawaban rahasia pada `pertanyaan_verifikasi`, sehingga fitur lain yang membaca kolom itu perlu memakai mekanisme verifikasi yang sesuai.

Pencatatan kecocokan dan notifikasi untuk pilihan barang yang sama belum dicakup oleh skrip ini. Konfigurasi bucket foto kehilangan perlu diterapkan sebelum aplikasi dapat menyimpan laporan yang menyertakan foto; laporan tanpa foto tidak memerlukan bucket tersebut.
