-- ============================================================================
-- Migration UC-12 FITS (Find ITS): Melihat dan Memfilter Laporan Temuan, tanpa auth
-- Migration pertama: dijalankan pada schema public yang kosong.
-- Dilanjutkan oleh: 20261111000600_uc14_jawaban_verifikasi_tanpa_auth.sql
--
-- Tidak ada login dan tidak ada identitas pengguna: laporan tidak menyimpan pembuatnya.
-- Baca: view publik (tanpa merek dan tipe, FR-15) + master kategori, lokasi, pos.
-- Tabel laporan_temuan tertutup untuk anon.
-- ============================================================================

-- ============================================================
-- 1. ENUMERASI DOMAIN
-- ============================================================

create type public.status_laporan as enum (
  'Tersedia',
  'Menunggu Penyerahan',
  'Menunggu Verifikasi',
  'Diklaim',
  'Selesai',
  'Aktif',  
  'Batal'
);

-- ============================================================
-- 2. TABEL MASTER
-- ============================================================

create table public.kategori (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique,
  created_at  timestamptz not null default now()
);

create table public.lokasi (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique,
  latitude    numeric(10, 7),
  longitude   numeric(10, 7),
  created_at  timestamptz not null default now()
);

create table public.pos_drop_off (
  id          uuid primary key default gen_random_uuid(),
  nama        text not null unique,
  latitude    numeric(10, 7),
  longitude   numeric(10, 7),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. LAPORAN TEMUAN
-- ============================================================

create table public.laporan_temuan (
  id                  uuid primary key default gen_random_uuid(),
  nomor_laporan       text not null unique,
  barang_nama         text not null,
  barang_merek        text not null default '',
  barang_tipe         text not null default '',
  barang_kategori     text not null references public.kategori(nama) on update cascade,
  foto_barang         text not null default '',
  lokasi              text not null,
  tanggal_penemuan    date not null,
  deskripsi           text not null default '',
  status_laporan      public.status_laporan not null default 'Menunggu Penyerahan',
  id_pos_drop_off     uuid references public.pos_drop_off(id),
  batas_penyerahan    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_laporan_status on public.laporan_temuan(status_laporan);
create index idx_laporan_kategori on public.laporan_temuan(barang_kategori);
create index idx_laporan_lokasi on public.laporan_temuan(lokasi);
create index idx_laporan_tanggal on public.laporan_temuan(tanggal_penemuan desc);

-- ============================================================
-- 4. VIEW PUBLIK (FR-15: tanpa merek dan tipe)
-- View berjalan dengan hak pemiliknya, jadi tetap terbaca walau tabelnya tertutup untuk anon.
-- ============================================================

create view public.v_laporan_publik as
  select
    lt.id,
    lt.nomor_laporan,
    lt.barang_nama,
    lt.barang_kategori,
    lt.foto_barang,
    lt.lokasi,
    lt.tanggal_penemuan,
    lt.deskripsi,
    lt.status_laporan,
    lt.id_pos_drop_off,
    pdo.nama as nama_pos_drop_off,
    lt.created_at
  from public.laporan_temuan lt
  left join public.pos_drop_off pdo on pdo.id = lt.id_pos_drop_off;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- Hanya master yang boleh dibaca langsung. Tidak ada policy tulis untuk siapa pun.
-- ============================================================

alter table public.kategori enable row level security;
alter table public.lokasi enable row level security;
alter table public.pos_drop_off enable row level security;
alter table public.laporan_temuan enable row level security;

create policy "Kategori: baca publik" on public.kategori for select to anon, authenticated using (true);
create policy "Lokasi: baca publik" on public.lokasi for select to anon, authenticated using (true);
create policy "Pos: baca publik" on public.pos_drop_off for select to anon, authenticated using (true);

-- ============================================================
-- 6. TRIGGER updated_at (juga dipakai migration UC-14)
-- ============================================================

create or replace function public.trigger_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at_laporan before update on public.laporan_temuan
  for each row execute function public.trigger_set_updated_at();
