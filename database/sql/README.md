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
| `integrasi_jadwal_uc09_uc10.sql` | Penjadwalan pemeriksaan setiap jam |

`status_draf` dan `status_kadaluarsa` harus dijalankan dalam transaksi
terpisah sebelum SQL yang memakai nilai enum baru. Migrasi SQL Editor lama
UC-05 dan UC-06 tidak selalu muncul pada riwayat migrasi Supabase CLI.

Laporan temuan dan klaim lama yang belum punya informasi pemilik tetap
dipertahankan dengan kolom pemilik kosong. Jangan mengisi pemilik dengan
tebakan. Klaim lama tidak dapat dilihat melalui fungsi klaim pengguna sampai
pengajunya ditentukan dari data yang valid.

`pg_cron` dan dua jadwal UC-09/UC-10 sudah aktif pada Project FITS.
Pencatatan kecocokan pada pilihan "Ini Barang yang Sama" belum diimplementasi.

## UC-15 dan UC-16

Setelah profil UC-01, riwayat UC-08, notifikasi UC-09, dan integrasi klaim
UC-14 tersedia, jalankan SQL berikut secara berurutan. Jalankan setiap file
enum dalam transaksi terpisah.

1. `uc15_01_status_klaim.sql`
2. `uc15_02_verifikasi_klaim.sql`
3. `uc16_01_status_selesai.sql`
4. `uc16_02_pembaruan_status.sql`

Fungsi Petugas memakai tabel klaim yang sama dengan UC-14. Bukti klaim dan
dokumentasi serah terima berada di bucket privat. Akses Petugas ditentukan
oleh kolom `profil.peran` yang dikelola administrator.

Pada Project FITS, nilai enum sudah tersedia dan kedua skrip fungsi telah
diterapkan sebagai migrasi `integrasi_uc15_uc16_skema_klaim_fits`.
