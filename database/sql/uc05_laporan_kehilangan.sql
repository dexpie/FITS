-- UC-05: laporan kehilangan, berdasarkan struktur Project FITS.
-- Persyaratan: public.kategori dan public.status_laporan sudah ada.
-- Jalankan sekali di SQL Editor; tidak membuat ulang tabel kelompok.
-- Pengguna harus login melalui Supabase Auth untuk insert dan select.

begin;

create table public.laporan_kehilangan (
  id uuid primary key default gen_random_uuid(),
  nomor_laporan text not null unique default
    ('LH-' || upper(replace(gen_random_uuid()::text, '-', ''))),
  id_pembuat uuid not null default auth.uid() references auth.users(id),
  barang_nama text not null check (length(trim(barang_nama)) > 0),
  barang_merek text not null default '',
  barang_tipe text not null default '',
  barang_kategori text not null references public.kategori(nama) on update cascade,
  deskripsi text not null check (length(trim(deskripsi)) > 0),
  lokasi_dilewati text[] not null check (
    cardinality(lokasi_dilewati) > 0
    and array_position(lokasi_dilewati, null) is null
    and array_position(lokasi_dilewati, '') is null
  ),
  tanggal_kehilangan date,
  foto_barang text,
  status_laporan public.status_laporan not null default 'Aktif'
    check (status_laporan in ('Aktif', 'Batal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index laporan_kehilangan_pembuat_tanggal_idx
  on public.laporan_kehilangan (id_pembuat, created_at desc);

alter table public.laporan_kehilangan enable row level security;

-- Batasi privilege dasar; RLS menentukan baris yang dapat diakses.
revoke all on public.laporan_kehilangan from anon, authenticated;
grant select, insert on public.laporan_kehilangan to authenticated;

create policy "Laporan Kehilangan: lihat milik sendiri"
  on public.laporan_kehilangan for select to authenticated
  using ((select auth.uid()) = id_pembuat);

create policy "Laporan Kehilangan: buat milik sendiri"
  on public.laporan_kehilangan for insert to authenticated
  with check ((select auth.uid()) = id_pembuat and status_laporan = 'Aktif');

commit;
