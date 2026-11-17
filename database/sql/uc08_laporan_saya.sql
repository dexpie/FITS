-- UC-08 Memantau Status Laporan (Logica)
-- Menampilkan laporan kehilangan dan laporan temuan milik akun yang masuk, beserta riwayat statusnya.
-- Independen: tabel riwayat_status_laporan hanya dibuat dan diatur kalau belum ada.
-- Butuh tabel kelompok laporan_kehilangan (uc05) dan laporan_temuan.
begin;

-- Riwayat perubahan status laporan. Definisi sama persis dengan uc10_02, uc15_02, dan uc16_02.
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
    -- Dibaca lewat fungsi di bawah saja.
    revoke all on public.riwayat_status_laporan from anon, authenticated;
  end if;
end $$;

-- Masa aktif laporan kehilangan. Definisi sama dengan uc09 dan uc10_02.
alter table public.laporan_kehilangan
  add column if not exists tanggal_kadaluarsa date
  default ((now() at time zone 'Asia/Jakarta')::date + 30);
update public.laporan_kehilangan
  set tanggal_kadaluarsa = (created_at at time zone 'Asia/Jakarta')::date + 30
  where tanggal_kadaluarsa is null;

-- Daftar Laporan Saya: gabungan laporan kehilangan dan temuan milik akun yang masuk.
-- p_status dan p_jenis boleh null (tanpa saringan).
create or replace function public.ambil_laporan_saya_uc08(p_status text default null, p_jenis text default null)
returns table (
  jenis text, id uuid, nomor_laporan text, barang_nama text, barang_kategori text,
  status_laporan text, tanggal date, foto_barang text, sisa_hari integer, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
begin
  if v_user is null then
    raise exception 'Silakan masuk terlebih dahulu';
  end if;
  return query
    select * from (
      select 'Kehilangan'::text, k.id, k.nomor_laporan, k.barang_nama, k.barang_kategori,
             k.status_laporan::text, k.tanggal_kehilangan, k.foto_barang,
             (k.tanggal_kadaluarsa - v_hari_ini)::integer, k.created_at
      from public.laporan_kehilangan k where k.id_pembuat = v_user
      union all
      select 'Temuan'::text, t.id, t.nomor_laporan, t.barang_nama, t.barang_kategori,
             t.status_laporan::text, t.tanggal_penemuan, t.foto_barang,
             null::integer, t.created_at
      from public.laporan_temuan t where t.id_pembuat = v_user
    ) x (jenis, id, nomor_laporan, barang_nama, barang_kategori, status_laporan, tanggal, foto_barang, sisa_hari, created_at)
    where (p_status is null or x.status_laporan = p_status)
      and (p_jenis is null or x.jenis = p_jenis)
    order by x.created_at desc, x.id;
end;
$$;

-- Detail satu laporan milik akun yang masuk, beserta riwayat statusnya. Null kalau bukan miliknya.
create or replace function public.ambil_detail_laporan_uc08(p_jenis text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_hari_ini date := (now() at time zone 'Asia/Jakarta')::date;
  v_laporan jsonb;
  v_dibuat timestamptz;
  v_riwayat jsonb;
begin
  if v_user is null then
    raise exception 'Silakan masuk terlebih dahulu';
  end if;

  if p_jenis = 'Kehilangan' then
    select jsonb_build_object(
             'jenis', 'Kehilangan', 'id', k.id, 'nomor_laporan', k.nomor_laporan,
             'barang_nama', k.barang_nama, 'barang_merek', k.barang_merek, 'barang_kategori', k.barang_kategori,
             'deskripsi', k.deskripsi, 'lokasi', array_to_string(k.lokasi_dilewati, ' / '),
             'tanggal', k.tanggal_kehilangan, 'foto_barang', k.foto_barang,
             'status_laporan', k.status_laporan::text, 'created_at', k.created_at,
             'tanggal_kadaluarsa', k.tanggal_kadaluarsa,
             'sisa_hari', (k.tanggal_kadaluarsa - v_hari_ini)::integer),
           k.created_at
      into v_laporan, v_dibuat
      from public.laporan_kehilangan k
      where k.id = p_id and k.id_pembuat = v_user;
  elsif p_jenis = 'Temuan' then
    select jsonb_build_object(
             'jenis', 'Temuan', 'id', t.id, 'nomor_laporan', t.nomor_laporan,
             'barang_nama', t.barang_nama, 'barang_merek', t.barang_merek, 'barang_kategori', t.barang_kategori,
             'deskripsi', t.deskripsi, 'lokasi', t.lokasi,
             'tanggal', t.tanggal_penemuan, 'foto_barang', t.foto_barang,
             'status_laporan', t.status_laporan::text, 'created_at', t.created_at,
             'pos_drop_off', p.nama, 'batas_penyerahan', t.batas_penyerahan),
           t.created_at
      into v_laporan, v_dibuat
      from public.laporan_temuan t
      left join public.pos_drop_off p on p.id = t.id_pos_drop_off
      where t.id = p_id and t.id_pembuat = v_user;
  end if;

  if v_laporan is null then
    return null;
  end if;

  -- Entri pertama "Laporan dibuat", lalu riwayat yang tercatat. Pengubah kosong = Sistem.
  select jsonb_agg(r order by r.waktu) into v_riwayat
  from (
    select 'Laporan dibuat'::text as keterangan, null::text as status, null::text as catatan,
           v_dibuat as waktu, 'Pengguna'::text as aktor
    union all
    select rs.keterangan, rs.status, rs.catatan, rs.created_at,
           case
             when rs.id_pengubah is null then 'Sistem'
             when rs.id_pengubah = v_user then 'Pengguna'
             else 'Petugas'
           end
    from public.riwayat_status_laporan rs
    where rs.jenis_laporan = p_jenis and rs.id_laporan = p_id
  ) r;

  return v_laporan || jsonb_build_object('riwayat', v_riwayat);
end;
$$;

revoke all on function public.ambil_laporan_saya_uc08(text, text) from public, anon;
grant execute on function public.ambil_laporan_saya_uc08(text, text) to authenticated;
revoke all on function public.ambil_detail_laporan_uc08(text, uuid) from public, anon;
grant execute on function public.ambil_detail_laporan_uc08(text, uuid) to authenticated;

commit;
