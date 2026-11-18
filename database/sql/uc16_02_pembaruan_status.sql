-- UC-16 Memperbarui Status Laporan (Fawzy), bagian 2 dari 2. Jalankan setelah uc16_01_status_selesai.sql.
-- Petugas menyelesaikan laporan temuan berstatus Diklaim (klaim sudah Terverifikasi)
-- dengan mengunggah dokumentasi serah terima. Status laporan menjadi Selesai.
-- Independen: setiap tabel hanya dibuat dan diatur kalau belum ada.
--
-- PENTING untuk yang menjalankan migration: tabel klaim milik UC-14 (Fabio). Kalau sudah ada,
-- pastikan kolom id_laporan_temuan, id_pengaju, status, dan nomor_pengajuan sama namanya.
begin;

-- Profil akun. Definisi sama persis dengan uc01 dan uc15_02.
do $$
begin
  if to_regclass('public.profil') is null then
    create table public.profil (
      id uuid primary key references auth.users(id) on delete cascade,
      nama text not null check (length(trim(nama)) > 0),
      nrp text unique check (nrp ~ '^[0-9]{10}$'),
      peran text not null default 'pengguna' check (peran in ('pengguna', 'petugas')),
      created_at timestamptz not null default now()
    );
    alter table public.profil enable row level security;
    revoke all on public.profil from anon, authenticated;
    grant select on public.profil to authenticated;
    create policy "Profil: lihat milik sendiri" on public.profil
      for select to authenticated using ((select auth.uid()) = id);
  end if;
end $$;

-- Riwayat perubahan status laporan. Definisi sama persis dengan uc08, uc10_02, dan uc15_02.
do $$
begin
  if to_regclass('public.riwayat_status_laporan') is null then
    create table public.riwayat_status_laporan (
      id uuid primary key default gen_random_uuid(),
      jenis_laporan text not null check (jenis_laporan in ('Kehilangan', 'Temuan')),
      id_laporan uuid not null,
      status text not null,
      keterangan text not null,
      id_pengubah uuid references auth.users(id),   -- kosong = diubah Sistem
      catatan text,
      created_at timestamptz not null default now()
    );
    create index riwayat_status_laporan_idx on public.riwayat_status_laporan (jenis_laporan, id_laporan, created_at);
    alter table public.riwayat_status_laporan enable row level security;
    revoke all on public.riwayat_status_laporan from anon, authenticated;
  end if;
end $$;

-- Klaim (milik UC-14). Definisi sama persis dengan uc15_02.
do $$
begin
  if to_regclass('public.klaim') is null then
    create table public.klaim (
      id uuid primary key default gen_random_uuid(),
      nomor_pengajuan text not null unique
        default ('KL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
      id_laporan_temuan uuid not null references public.laporan_temuan(id) on delete cascade,
      id_pengaju uuid not null default auth.uid() references auth.users(id),
      status text not null default 'Diajukan' check (status in ('Diajukan', 'Terverifikasi', 'Ditolak')),
      created_at timestamptz not null default now()
    );
    create index klaim_laporan_status_idx on public.klaim (id_laporan_temuan, status);
    alter table public.klaim enable row level security;
    revoke all on public.klaim from anon, authenticated;
    grant select on public.klaim to authenticated;
    create policy "Klaim: lihat milik sendiri" on public.klaim
      for select to authenticated using ((select auth.uid()) = id_pengaju);
  end if;
end $$;

-- Dokumentasi serah terima. Satu klaim hanya punya satu serah terima.
do $$
begin
  if to_regclass('public.serah_terima') is null then
    create table public.serah_terima (
      id uuid primary key default gen_random_uuid(),
      id_klaim uuid not null unique references public.klaim(id) on delete cascade,
      id_petugas uuid not null references auth.users(id),
      jenis_dokumentasi text not null check (jenis_dokumentasi in ('Foto Penyerahan', 'Tanda Tangan Digital')),
      berkas text not null,
      created_at timestamptz not null default now()
    );
    alter table public.serah_terima enable row level security;
    revoke all on public.serah_terima from anon, authenticated;
  end if;
end $$;

-- Apakah akun yang masuk berperan Petugas? Definisi sama persis dengan uc15_02.
create or replace function public.is_petugas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profil where id = (select auth.uid()) and peran = 'petugas');
$$;

-- Bucket privat untuk berkas dokumentasi (maksimal 5 MB, gambar atau PDF).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dokumentasi-serah-terima', 'dokumentasi-serah-terima', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Hanya Petugas yang bisa mengunggah, melihat, dan menghapus, di folder miliknya sendiri.
do $$
declare
  v_syarat text := 'bucket_id = ''dokumentasi-serah-terima'' and (storage.foldername(name))[1] = (select auth.uid())::text and public.is_petugas()';
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'Dokumentasi serah terima: unggah petugas') then
    execute 'create policy "Dokumentasi serah terima: unggah petugas" on storage.objects for insert to authenticated with check (' || v_syarat || ')';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'Dokumentasi serah terima: lihat petugas') then
    execute 'create policy "Dokumentasi serah terima: lihat petugas" on storage.objects for select to authenticated using (' || v_syarat || ')';
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                 and policyname = 'Dokumentasi serah terima: hapus petugas') then
    execute 'create policy "Dokumentasi serah terima: hapus petugas" on storage.objects for delete to authenticated using (' || v_syarat || ')';
  end if;
end $$;

-- Data Halaman Petugas: laporan Diklaim yang klaimnya Terverifikasi, plus ringkasan jumlah.
create or replace function public.ambil_pekerjaan_uc16()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_petugas() then
    raise exception 'Halaman ini khusus untuk Petugas';
  end if;
  return jsonb_build_object(
    'pekerjaan', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id_klaim', k.id, 'nomor_pengajuan', k.nomor_pengajuan, 'diajukan', k.created_at,
               'id_laporan', t.id, 'nomor_laporan', t.nomor_laporan, 'barang_nama', t.barang_nama,
               'barang_kategori', t.barang_kategori, 'lokasi', t.lokasi, 'tanggal_penemuan', t.tanggal_penemuan,
               'status_laporan', t.status_laporan::text, 'pos_drop_off', pos.nama,
               'pengaju_nama', coalesce(p.nama, u.email::text)) order by k.created_at)
      from public.laporan_temuan t
      join public.klaim k on k.id_laporan_temuan = t.id and k.status = 'Terverifikasi'
      join auth.users u on u.id = k.id_pengaju
      left join public.profil p on p.id = k.id_pengaju
      left join public.pos_drop_off pos on pos.id = t.id_pos_drop_off
      where t.status_laporan::text = 'Diklaim'), '[]'::jsonb),
    'jumlah_tersedia', (select count(*) from public.laporan_temuan where status_laporan::text = 'Tersedia'),
    'jumlah_terverifikasi', (select count(*) from public.klaim where status = 'Terverifikasi'));
end;
$$;

-- Simpan Perubahan: dokumentasi wajib ada di storage, lalu laporan menjadi Selesai dalam satu transaksi.
create or replace function public.selesaikan_serah_terima_uc16(p_id_klaim uuid, p_jenis text, p_berkas text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_petugas uuid := (select auth.uid());
  v_data record;
  v_ada_notifikasi boolean := to_regprocedure('public.buat_notifikasi(uuid,text,text,uuid,uuid,uuid)') is not null;
begin
  if not public.is_petugas() then
    raise exception 'Halaman ini khusus untuk Petugas';
  end if;
  select k.id, k.status, k.id_pengaju, t.id as id_laporan, t.id_pembuat, t.nomor_laporan, t.barang_nama,
         t.status_laporan::text as status_laporan
    into v_data
    from public.klaim k
    join public.laporan_temuan t on t.id = k.id_laporan_temuan
    where k.id = p_id_klaim
    for update of t;
  if not found then
    raise exception 'Klaim tidak ditemukan';
  end if;
  if v_data.status <> 'Terverifikasi' or v_data.status_laporan <> 'Diklaim' then
    raise exception 'Pembaruan status hanya untuk laporan Diklaim dengan klaim yang sudah terverifikasi';
  end if;
  -- lengkap = isDokumentasiLengkap()
  if p_jenis is null or p_jenis not in ('Foto Penyerahan', 'Tanda Tangan Digital') then
    raise exception 'Pilih jenis dokumentasi';
  end if;
  if nullif(trim(coalesce(p_berkas, '')), '') is null
     or split_part(p_berkas, '/', 1) <> v_petugas::text
     or not exists (select 1 from storage.objects o
                    where o.bucket_id = 'dokumentasi-serah-terima' and o.name = p_berkas) then
    raise exception 'Dokumentasi Serah Terima wajib diunggah';
  end if;

  insert into public.serah_terima (id_klaim, id_petugas, jenis_dokumentasi, berkas)
    values (p_id_klaim, v_petugas, p_jenis, p_berkas);
  update public.laporan_temuan set status_laporan = 'Selesai' where id = v_data.id_laporan;
  insert into public.riwayat_status_laporan (jenis_laporan, id_laporan, status, keterangan, id_pengubah)
    values ('Temuan', v_data.id_laporan, 'Selesai', 'Barang diserahkan', v_petugas);
  if v_ada_notifikasi then
    perform public.buat_notifikasi(v_data.id_pembuat, 'Perubahan Status',
      'Barang temuanmu "' || v_data.barang_nama || '" sudah diserahkan kepada pemiliknya.',
      null, v_data.id_laporan, null);
    perform public.buat_notifikasi(v_data.id_pengaju, 'Perubahan Status',
      'Serah terima "' || v_data.barang_nama || '" selesai. Barang sudah kembali kepadamu.',
      null, null, p_id_klaim);
  end if;
  return v_data.nomor_laporan;
end;
$$;

revoke all on function public.is_petugas() from public, anon;
grant execute on function public.is_petugas() to authenticated;
revoke all on function public.ambil_pekerjaan_uc16() from public, anon;
grant execute on function public.ambil_pekerjaan_uc16() to authenticated;
revoke all on function public.selesaikan_serah_terima_uc16(uuid, text, text) from public, anon;
grant execute on function public.selesaikan_serah_terima_uc16(uuid, text, text) to authenticated;

commit;
