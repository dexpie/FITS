-- UC-09 Menerima Notifikasi (Faishal)
-- Jenis: N1 Kecocokan Baru, N2 Perubahan Status, N3 Hasil Verifikasi Klaim, N4 Tanggal Kadaluarsa.
-- Notifikasi dibuat use case lain lewat public.buat_notifikasi(...) dan oleh pemeriksaan berkala (N4).
-- Independen: tabel notifikasi hanya dibuat dan diatur kalau belum ada.
-- Butuh tabel kelompok laporan_kehilangan (uc05) dan laporan_temuan.
-- Pemeriksaan berkala memakai pg_cron; kalau pg_cron belum aktif, bagian jadwal dilewati.
begin;

do $$
begin
  if to_regclass('public.notifikasi') is null then
    create table public.notifikasi (
      id uuid primary key default gen_random_uuid(),
      id_penerima uuid not null references auth.users(id) on delete cascade,
      jenis text not null check (jenis in ('Kecocokan Baru', 'Perubahan Status', 'Hasil Verifikasi Klaim', 'Tanggal Kadaluarsa')),
      pesan text not null,
      id_laporan_kehilangan uuid references public.laporan_kehilangan(id) on delete cascade,
      id_laporan_temuan uuid references public.laporan_temuan(id) on delete cascade,
      id_klaim uuid,
      sudah_dibaca boolean not null default false,
      dibaca_pada timestamptz,
      -- Notifikasi push ke perangkat belum disambungkan; notifikasi tetap tampil di halaman /uc09.
      status_pengiriman text not null default 'Izin Nonaktif'
        check (status_pengiriman in ('Belum Dikirim', 'Terkirim', 'Gagal', 'Izin Nonaktif')),
      created_at timestamptz not null default now()
    );
    create index notifikasi_penerima_idx on public.notifikasi (id_penerima, sudah_dibaca, created_at desc);
    alter table public.notifikasi enable row level security;
    revoke all on public.notifikasi from anon, authenticated;
    grant select on public.notifikasi to authenticated;
    create policy "Notifikasi: lihat milik sendiri" on public.notifikasi
      for select to authenticated using ((select auth.uid()) = id_penerima);
  end if;
end $$;

-- Masa aktif laporan kehilangan (dipakai N4). Definisi sama dengan uc08 dan uc10_02.
alter table public.laporan_kehilangan
  add column if not exists tanggal_kadaluarsa date
  default ((now() at time zone 'Asia/Jakarta')::date + 30);
update public.laporan_kehilangan
  set tanggal_kadaluarsa = (created_at at time zone 'Asia/Jakarta')::date + 30
  where tanggal_kadaluarsa is null;

-- Dipakai use case lain (UC-15, UC-16, ...) untuk membuat notifikasi. Tidak bisa dipanggil langsung dari aplikasi.
create or replace function public.buat_notifikasi(
  p_penerima uuid, p_jenis text, p_pesan text,
  p_id_laporan_kehilangan uuid default null, p_id_laporan_temuan uuid default null, p_id_klaim uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.notifikasi (id_penerima, jenis, pesan, id_laporan_kehilangan, id_laporan_temuan, id_klaim)
  values (p_penerima, p_jenis, p_pesan, p_id_laporan_kehilangan, p_id_laporan_temuan, p_id_klaim)
  returning id into v_id;
  return v_id;
end;
$$;

-- Saat kartu dipilih: tandai dibaca, hanya untuk notifikasi milik akun yang masuk.
create or replace function public.tandai_dibaca_uc09(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notifikasi
    set sudah_dibaca = true, dibaca_pada = coalesce(dibaca_pada, now())
    where id = p_id and id_penerima = (select auth.uid());
  return found;
end;
$$;

-- N4: laporan kehilangan Aktif yang tinggal 0-3 hari mendapat satu peringatan per masa aktif.
create or replace function public.kirim_peringatan_kadaluarsa_uc09()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jumlah integer := 0;
  r record;
begin
  for r in
    select k.id, k.id_pembuat, k.barang_nama, k.created_at
    from public.laporan_kehilangan k
    where k.status_laporan::text = 'Aktif'
      and k.tanggal_kadaluarsa - (now() at time zone 'Asia/Jakarta')::date between 0 and 3
      and not exists (
        select 1 from public.notifikasi n
        where n.id_laporan_kehilangan = k.id and n.jenis = 'Tanggal Kadaluarsa'
          and n.created_at > k.created_at
          and n.created_at > coalesce((to_jsonb(k) ->> 'terakhir_diperpanjang')::timestamptz, k.created_at)
      )
  loop
    perform public.buat_notifikasi(
      r.id_pembuat, 'Tanggal Kadaluarsa',
      'Laporan kehilangan ' || lower(r.barang_nama) || ' mendekati tanggal kadaluarsa. Perpanjang laporan agar tetap aktif.',
      r.id, null, null);
    v_jumlah := v_jumlah + 1;
  end loop;
  return v_jumlah;
end;
$$;

revoke all on function public.buat_notifikasi(uuid, text, text, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.tandai_dibaca_uc09(uuid) from public, anon;
grant execute on function public.tandai_dibaca_uc09(uuid) to authenticated;
revoke all on function public.kirim_peringatan_kadaluarsa_uc09() from public, anon;
grant execute on function public.kirim_peringatan_kadaluarsa_uc09() to authenticated;

-- Pemicu terjadwal: setiap jam. Dilewati kalau ekstensi pg_cron belum diaktifkan.
do $$
begin
  if to_regnamespace('cron') is not null then
    perform cron.schedule('fits_uc09_peringatan_kadaluarsa', '0 * * * *',
      'select public.kirim_peringatan_kadaluarsa_uc09()');
  else
    raise notice 'pg_cron belum aktif: jadwal peringatan kadaluarsa UC-09 dilewati.';
  end if;
end $$;

commit;
