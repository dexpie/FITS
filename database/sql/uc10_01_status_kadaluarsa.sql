-- UC-10 Memperpanjang Laporan (Logica), bagian 1 dari 2.
-- Jalankan file ini sendiri lebih dulu, lalu uc10_02_perpanjang.sql.
-- Nilai enum baru tidak bisa dipakai dalam transaksi yang sama dengan saat ditambahkan.
alter type public.status_laporan add value if not exists 'Kadaluarsa';
