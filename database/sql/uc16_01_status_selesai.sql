-- UC-16 Memperbarui Status Laporan (Fawzy), bagian 1 dari 2.
-- Jalankan file ini sendiri lebih dulu, lalu uc16_02_pembaruan_status.sql.
-- Nilai enum baru tidak bisa dipakai dalam transaksi yang sama dengan saat ditambahkan.
alter type public.status_laporan add value if not exists 'Tersedia';
alter type public.status_laporan add value if not exists 'Diklaim';
alter type public.status_laporan add value if not exists 'Selesai';
