-- UC-10 Memperpanjang Laporan (Logica), bagian 2 dari 2. Jalankan setelah uc10_01_status_kadaluarsa.sql.
-- Laporan kehilangan Aktif yang tinggal 0-3 hari bisa diperpanjang 7, 14, atau 30 hari.
-- Laporan yang lewat tanggal kadaluarsa ditandai Kadaluarsa oleh pemeriksaan berkala (pg_cron).
-- Independen: tabel riwayat_status_laporan hanya dibuat kalau belum ada.
begin;

-- Riwayat perubahan status laporan. Definisi sama persis dengan uc08, uc15_02, dan uc16_02.
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

-- Masa aktif. Definisi tanggal_kadaluarsa sama dengan uc08 dan uc09.
alter table public.laporan_kehilangan
  add column if not exists tanggal_kadaluarsa date
  default ((now() at time zone 'Asia/Jakarta')::date + 30);
alter table public.laporan_kehilangan
  add column if not exists terakhir_diperpanjang timestamptz;
update public.laporan_kehilangan
  set tanggal_kadaluarsa = (created_at at time zone 'Asia/Jakarta')::date + 30
  where tanggal_kadaluarsa is null;
create index if not exists laporan_kehilangan_kadaluarsa_idx on public.laporan_kehilangan (tanggal_kadaluarsa);

-- Status Kadaluarsa menjadi status yang sah untuk laporan kehilangan (uc05 hanya Aktif/Batal).
alter table public.laporan_kehilangan drop constraint if exists laporan_kehilangan_status_laporan_check;
alter table public.laporan_kehilangan add constraint laporan_kehilangan_status_laporan_check
  check (status_laporan in ('Aktif', 'Batal', 'Kadaluarsa'));

-- Data untuk halaman Perpanjang Laporan: hanya laporan kehilangan milik akun yang masuk. Null kalau bukan miliknya.
create or replace function public.ambil_perpanjangan_uc10(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', k.id, 'nomor_laporan', k.nomor_laporan, 'barang_nama', k.barang_nama,
    'status_laporan', k.status_laporan::text, 'tanggal_kadaluarsa', k.tanggal_kadaluarsa,
    'sisa_hari', (k.tanggal_kadaluarsa - (now() at time zone 'Asia/Jakarta')::date)::integer)
  from public.laporan_kehilangan k
  where k.id = p_id and k.id_pembuat = (select auth.uid());
$$;

-- perpanjang(durasiHari, catatan): pemeriksaan lengkap lalu update + catat riwayat dalam satu transaksi.
create or replace function public.perpanjang_laporan_uc10(p_id uuid, p_durasi integer, p_catatan text default null)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
  v_laporan record;
  v_baru date;
begin
  if v_user is null then
    raise exception 'Silakan masuk terlebih dahulu';
  end if;
  select k.id, k.status_laporan::text as status, k.tanggal_kadaluarsa into v_laporan
    from public.laporan_kehilangan k
    where k.id = p_id and k.id_pembuat = v_user
    for update;
  if not found then
    raise exception 'Laporan tidak ditemukan';
  end if;
  -- alt [kadaluarsa = true]
  if v_laporan.status = 'Kadaluarsa' or v_laporan.tanggal_kadaluarsa < v_hari_ini then
    raise exception 'Laporan sudah kadaluarsa, buat laporan baru';
  end if;
  if v_laporan.status <> 'Aktif' or v_laporan.tanggal_kadaluarsa - v_hari_ini > 3 then
    raise exception 'Laporan belum bisa diperpanjang';
  end if;
  if p_durasi is null or p_durasi not in (7, 14, 30) then
    raise exception 'Pilih durasi perpanjangan 7, 14, atau 30 hari';
  end if;

  update public.laporan_kehilangan
    set tanggal_kadaluarsa = tanggal_kadaluarsa + p_durasi, terakhir_diperpanjang = now()
    where id = p_id
    returning tanggal_kadaluarsa into v_baru;
  insert into public.riwayat_status_laporan (jenis_laporan, id_laporan, status, keterangan, id_pengubah, catatan)
    values ('Kehilangan', p_id, v_laporan.status, 'Laporan diperpanjang ' || p_durasi || ' hari', v_user,
            nullif(trim(coalesce(p_catatan, '')), ''));
  return v_baru;
end;
$$;

-- Pemeriksaan berkala: laporan Aktif yang lewat tanggal kadaluarsa menjadi Kadaluarsa (diubah Sistem).
create or replace function public.tandai_kadaluarsa_uc10()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jumlah integer;
begin
  with diubah as (
    update public.laporan_kehilangan
      set status_laporan = 'Kadaluarsa'
      where status_laporan = 'Aktif' and tanggal_kadaluarsa < (now() at time zone 'Asia/Jakarta')::date
      returning id
  )
  insert into public.riwayat_status_laporan (jenis_laporan, id_laporan, status, keterangan)
    select 'Kehilangan', id, 'Kadaluarsa', 'Masa aktif laporan berakhir' from diubah;
  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

revoke all on function public.ambil_perpanjangan_uc10(uuid) from public, anon;
grant execute on function public.ambil_perpanjangan_uc10(uuid) to authenticated;
revoke all on function public.perpanjang_laporan_uc10(uuid, integer, text) from public, anon;
grant execute on function public.perpanjang_laporan_uc10(uuid, integer, text) to authenticated;
revoke all on function public.tandai_kadaluarsa_uc10() from public, anon;
grant execute on function public.tandai_kadaluarsa_uc10() to authenticated;

-- Pemicu terjadwal: setiap jam. Dilewati kalau ekstensi pg_cron belum diaktifkan.
do $$
begin
  if to_regnamespace('cron') is not null then
    perform cron.schedule('fits_uc10_tandai_kadaluarsa', '0 * * * *', 'select public.tandai_kadaluarsa_uc10()');
  else
    raise notice 'pg_cron belum aktif: jadwal penandaan kadaluarsa UC-10 dilewati.';
  end if;
end $$;

commit;
