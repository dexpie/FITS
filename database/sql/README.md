# Skrip SQL FITS

Folder ini berisi SQL yang digunakan untuk integrasi database kelompok. Periksa
riwayat migrasi dan struktur Project FITS sebelum menjalankan ulang: beberapa
file memakai `create table` atau `create function` dan tidak dapat dijalankan
ulang pada objek yang sudah ada. Database kosong juga memerlukan skema dasar
UC-12/14 yang ada di `supabase/migrations`.

Pada pemeriksaan 17 November 2026, Project FITS sudah memiliki tabel UC-05,
fungsi pencarian UC-06, dan migrasi berikut di riwayat Supabase:

| SQL | Keperluan |
| --- | --- |
| `uc01_daftar_akun.sql`, `uc09_notifikasi.sql` | Profil dan notifikasi |
| `integrasi_pemilik_laporan_temuan.sql` | Kolom pemilik laporan temuan dan akses pemilik |
| `uc08_laporan_saya.sql` | Daftar laporan dan riwayat |
| `uc10_01_status_kadaluarsa.sql`, `uc10_02_perpanjang.sql` | Status dan perpanjangan laporan |
| `uc05_foto_storage.sql` | Bucket privat foto kehilangan |
| `uc07_01_status_draf.sql`, `uc07_02_penyimpanan.sql` | Penyimpanan laporan temuan dan foto |
| `integrasi_klaim_uc14.sql` | Identitas pengaju dan bukti klaim privat |

`status_draf` dan `status_kadaluarsa` harus dijalankan dalam transaksi
terpisah sebelum SQL yang memakai nilai enum baru. Migrasi SQL Editor lama
UC-05 dan UC-06 tidak selalu muncul pada riwayat migrasi Supabase CLI.

Laporan temuan dan klaim lama yang belum punya informasi pemilik tetap
dipertahankan dengan kolom pemilik kosong. Jangan mengisi pemilik dengan
tebakan. Klaim lama tidak dapat dilihat melalui fungsi klaim pengguna sampai
pengajunya ditentukan dari data yang valid.

Pemeriksaan berkala UC-09 dan UC-10 hanya terjadwal jika `pg_cron` aktif.
Pencatatan kecocokan pada pilihan "Ini Barang yang Sama" belum diimplementasi.
