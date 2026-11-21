-- UC-15 Memverifikasi Klaim Barang (Fawzy), bagian 1 dari 2.
-- Jalankan file ini sendiri lebih dulu, lalu uc15_02_verifikasi_klaim.sql.
-- Nilai enum baru tidak bisa dipakai dalam transaksi yang sama dengan saat ditambahkan.
alter type public.status_laporan add value if not exists 'Tersedia';
alter type public.status_laporan add value if not exists 'Menunggu Verifikasi';
alter type public.status_laporan add value if not exists 'Diklaim';
