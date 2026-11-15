-- ============================================================================
-- Seed data dummy FITS (Find ITS) untuk UC-12 dan UC-14, tanpa akun auth
-- Isi mengikuti storyboard Figma UC-12 sampai UC-14. Berkas ini satu-satunya sumber data contoh:
-- aplikasi tidak lagi menyimpan data contoh di kode.
-- Jalankan setelah migration 20261111000500 (UC-12) dan 20261111000600 (UC-14), misalnya lewat Supabase SQL Editor.
-- Aman dijalankan ulang: setiap insert memakai on conflict do nothing.
-- ============================================================================

-- ============================================================
-- 1. DATA MASTER
-- ============================================================

insert into kategori (nama) values
  ('Elektronik'),
  ('Dompet/KTP'),
  ('Kunci'),
  ('Lainnya')
on conflict (nama) do nothing;

insert into lokasi (nama) values
  ('DSI Lantai 2'),
  ('Perpustakaan'),
  ('Parkiran DSI')
on conflict (nama) do nothing;

insert into pos_drop_off (id, nama) values
  ('b0000000-0000-0000-0000-000000000001', 'Pos SKK — Gedung DSI')
on conflict (nama) do nothing;

-- ============================================================
-- 2. LAPORAN TEMUAN (UC-12)
-- Satu laporan untuk tiap status yang tampil di storyboard.
-- ============================================================

insert into laporan_temuan (
  id, nomor_laporan, barang_nama, barang_merek, barang_tipe, barang_kategori,
  foto_barang, lokasi, tanggal_penemuan, deskripsi, status_laporan, id_pos_drop_off
) values
  ('c0000000-0000-0000-0000-000000000044', 'LT-20260921-0044',
   'Dompet kulit coklat', 'Fossil', 'Logan', 'Dompet/KTP',
   '/uc12/4e0f2.png', 'DSI Lantai 2', '2026-09-21',
   'Dompet ditemukan di area DSI Lantai 2 dan telah diamankan oleh Petugas.',
   'Tersedia', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000041', 'LT-20260918-0041',
   'Kunci motor', 'Honda', 'Remote keyless', 'Kunci',
   '/uc12/f88cc.png', 'Parkiran DSI', '2026-09-18',
   'Kunci motor ditemukan di area Parkiran DSI dan telah diamankan oleh Petugas.',
   'Menunggu Verifikasi', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000038', 'LT-20260917-0038',
   'Laptop abu-abu', 'Asus', 'Vivobook 14', 'Elektronik',
   '/uc12/7eb19.png', 'Perpustakaan', '2026-09-17',
   'Laptop ditemukan di area Perpustakaan dan sudah diserahkan kepada pemiliknya.',
   'Selesai', 'b0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000043', 'LT-20260921-0043',
   'Dompet hitam', 'Eiger', 'Bifold', 'Dompet/KTP',
   '/uc12/94200.png', 'DSI Lantai 2', '2026-09-21',
   'Dompet kulit hitam dengan jahitan putih.',
   'Menunggu Penyerahan', 'b0000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

-- ============================================================
-- 3. PERTANYAAN VERIFIKASI (UC-14)
-- Jawaban rahasia tidak ada di storyboard, jadi nilai di bawah ini karangan untuk uji coba.
-- ============================================================

insert into pertanyaan_verifikasi (id, id_laporan, urutan, teks_pertanyaan, jawaban_rahasia) values
  ('d0000000-0000-0000-0000-000000004401', 'c0000000-0000-0000-0000-000000000044', 1,
   'Apa warna jahitan pada dompet?', 'Krem'),
  ('d0000000-0000-0000-0000-000000004402', 'c0000000-0000-0000-0000-000000000044', 2,
   'Apa ciri bagian dalam dompet?', 'Ada slot kartu transparan berisi KTM'),
  ('d0000000-0000-0000-0000-000000004101', 'c0000000-0000-0000-0000-000000000041', 1,
   'Apa warna gantungan kunci?', 'Biru'),
  ('d0000000-0000-0000-0000-000000004102', 'c0000000-0000-0000-0000-000000000041', 2,
   'Ada berapa anak kunci pada gantungan?', '2')
on conflict (id) do nothing;

-- ============================================================
-- 4. KLAIM (UC-14)
-- Klaim yang sudah ada atas Kunci motor, sebab laporan itu sudah Menunggu Verifikasi.
-- ============================================================

insert into klaim (id, nomor_pengajuan_klaim, id_laporan, waktu_pengajuan, status) values
  ('e0000000-0000-0000-0000-000000000017', 'KL-20260919-0017',
   'c0000000-0000-0000-0000-000000000041', '2026-09-19T03:15:00.000Z', 'Diajukan')
on conflict (id) do nothing;

insert into jawaban_verifikasi (id_klaim, id_pertanyaan, isi_jawaban) values
  ('e0000000-0000-0000-0000-000000000017', 'd0000000-0000-0000-0000-000000004101', 'Biru tua'),
  ('e0000000-0000-0000-0000-000000000017', 'd0000000-0000-0000-0000-000000004102', '2')
on conflict (id_klaim, id_pertanyaan) do nothing;

-- ============================================================
-- 5. PERIKSA HASIL
-- ============================================================

select 'kategori' as tabel, count(*) as jumlah from kategori
union all select 'lokasi', count(*) from lokasi
union all select 'pos_drop_off', count(*) from pos_drop_off
union all select 'laporan_temuan', count(*) from laporan_temuan
union all select 'pertanyaan_verifikasi', count(*) from pertanyaan_verifikasi
union all select 'klaim', count(*) from klaim
union all select 'jawaban_verifikasi', count(*) from jawaban_verifikasi;
