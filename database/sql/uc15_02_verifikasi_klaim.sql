-- UC-15 Memverifikasi Klaim Barang (Fawzy), bagian 2 dari 2. Jalankan setelah uc15_01_status_klaim.sql.
-- Petugas mencari klaim, membandingkan jawaban pengklaim dengan jawaban rahasia penemu,
-- lalu menyatakan Cocok atau Tidak Cocok setelah pemeriksaan tatap muka.
-- Memakai profil UC-01, riwayat UC-08, notifikasi UC-09, dan skema klaim UC-14.

begin;

-- Hasil pemeriksaan tatap muka oleh Petugas. Satu klaim hanya punya satu hasil.
do $$
begin
  if to_regclass('public.verifikasi_klaim') is null then
    create table public.verifikasi_klaim (
      id uuid primary key default gen_random_uuid(),
      id_klaim uuid not null unique references public.klaim(id) on delete cascade,
      id_petugas uuid not null references auth.users(id),
      hasil text not null check (hasil in ('Cocok', 'Tidak Cocok')),
      nama_ktm text not null,
      bukti_penguat text[] not null default '{}',
      created_at timestamptz not null default now()
    );
    alter table public.verifikasi_klaim enable row level security;
    revoke all on public.verifikasi_klaim from anon, authenticated;
  end if;
end $$;

-- Role dari profil dipakai bersama oleh UC-15 dan UC-16.
create or replace function public.is_petugas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profil where id = (select auth.uid()) and peran = 'petugas');
$$;

-- Petugas hanya dapat membuka berkas yang benar-benar tercatat sebagai bukti.
create or replace function public.boleh_baca_bukti_uc15(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_petugas() and exists (
    select 1 from public.bukti_pendukung where path_storage = p_path and path_storage <> ''
  );
$$;
revoke all on function public.boleh_baca_bukti_uc15(text) from public, anon;
grant execute on function public.boleh_baca_bukti_uc15(text) to authenticated;

drop policy if exists "Bukti klaim: lihat petugas" on storage.objects;
create policy "Bukti klaim: lihat petugas" on storage.objects
  for select to authenticated
  using (bucket_id = 'bukti-klaim' and public.boleh_baca_bukti_uc15(name));

-- Daftar klaim yang menunggu verifikasi (Halaman Verifikasi Klaim).
create or replace function public.ambil_klaim_diajukan_uc15()
returns table (id uuid, nomor_pengajuan text, barang_nama text, pengaju_nama text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_petugas() then
    raise exception 'Halaman ini khusus untuk Petugas';
  end if;
  return query
    select k.id, k.nomor_pengajuan_klaim, t.barang_nama, coalesce(p.nama, u.email::text), k.waktu_pengajuan
    from public.klaim k
    join public.laporan_temuan t on t.id = k.id_laporan
    join auth.users u on u.id = k.id_pengaju
    left join public.profil p on p.id = k.id_pengaju
    where k.status = 'Diajukan' and t.status_laporan in ('Menunggu Verifikasi', 'Tersedia')
    order by k.waktu_pengajuan;
end;
$$;

-- Cari klaim berdasarkan Nomor Pengajuan (huruf besar-kecil tidak berpengaruh).
create or replace function public.cari_klaim_uc15(p_nomor text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_petugas() then
    raise exception 'Halaman ini khusus untuk Petugas';
  end if;
  select k.id into v_id from public.klaim k
    where upper(k.nomor_pengajuan_klaim) = upper(trim(p_nomor)) and k.id_pengaju is not null;
  return v_id;
end;
$$;

-- Data Halaman Verifikasi Klaim: klaim, barang, jawaban rahasia di samping jawaban pengklaim,
-- bukti pendukung, laporan kehilangan pengklaim dengan kategori sama, dan hasil (kalau sudah diputuskan).
create or replace function public.ambil_verifikasi_klaim_uc15(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_klaim record;
  v_hasil jsonb;
begin
  if not public.is_petugas() then
    raise exception 'Halaman ini khusus untuk Petugas';
  end if;

  select k.id, k.nomor_pengajuan_klaim as nomor_pengajuan, k.status, k.waktu_pengajuan as created_at, k.id_pengaju,
         t.id as id_laporan, t.nomor_laporan, t.barang_nama, t.barang_kategori, t.lokasi,
         t.status_laporan::text as status_laporan, pos.nama as pos_drop_off,
         coalesce(p.nama, u.email::text) as pengaju_nama, p.nrp as pengaju_nrp
    into v_klaim
    from public.klaim k
    join public.laporan_temuan t on t.id = k.id_laporan
    join auth.users u on u.id = k.id_pengaju
    left join public.profil p on p.id = k.id_pengaju
    left join public.pos_drop_off pos on pos.id = t.id_pos_drop_off
    where k.id = p_id;
  if not found then
    return null;
  end if;

  select jsonb_build_object('hasil', v.hasil, 'nama_ktm', v.nama_ktm, 'bukti_penguat', to_jsonb(v.bukti_penguat),
                            'waktu', v.created_at, 'petugas', coalesce(pp.nama, 'Petugas'))
    into v_hasil
    from public.verifikasi_klaim v
    left join public.profil pp on pp.id = v.id_petugas
    where v.id_klaim = p_id;

  return jsonb_build_object(
    'id', v_klaim.id, 'nomor_pengajuan', v_klaim.nomor_pengajuan, 'status', v_klaim.status,
    'created_at', v_klaim.created_at, 'id_laporan', v_klaim.id_laporan, 'nomor_laporan', v_klaim.nomor_laporan,
    'barang_nama', v_klaim.barang_nama, 'barang_kategori', v_klaim.barang_kategori, 'lokasi', v_klaim.lokasi,
    'status_laporan', v_klaim.status_laporan, 'pos_drop_off', v_klaim.pos_drop_off,
    'pengaju_nama', v_klaim.pengaju_nama, 'pengaju_nrp', v_klaim.pengaju_nrp,
    'jawaban', coalesce((
      select jsonb_agg(jsonb_build_object('urutan', pv.urutan, 'pertanyaan', pv.teks_pertanyaan,
                                          'jawaban_rahasia', pv.jawaban_rahasia, 'jawaban_klaim', jv.isi_jawaban)
                       order by pv.urutan)
      from public.pertanyaan_verifikasi pv
      left join public.jawaban_verifikasi jv on jv.id_pertanyaan = pv.id and jv.id_klaim = p_id
      where pv.id_laporan = v_klaim.id_laporan), '[]'::jsonb),
    'bukti', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.id, 'jenis', b.jenis, 'nama_berkas', b.nama_berkas, 'path_storage', b.path_storage) order by b.created_at)
      from public.bukti_pendukung b where b.id_klaim = p_id), '[]'::jsonb),
    'laporan_kehilangan', coalesce((
      select jsonb_agg(jsonb_build_object('nomor_laporan', lk.nomor_laporan, 'barang_nama', lk.barang_nama,
                                          'deskripsi', lk.deskripsi, 'lokasi', array_to_string(lk.lokasi_dilewati, ' / '),
                                          'created_at', lk.created_at) order by lk.created_at desc)
      from public.laporan_kehilangan lk
      where lk.id_pembuat = v_klaim.id_pengaju and lk.barang_kategori = v_klaim.barang_kategori), '[]'::jsonb),
    'klaim_lain', coalesce((
      select jsonb_agg(k2.nomor_pengajuan_klaim order by k2.waktu_pengajuan)
      from public.klaim k2
      where k2.id_laporan = v_klaim.id_laporan and k2.status = 'Diajukan' and k2.id <> p_id), '[]'::jsonb),
    'hasil_verifikasi', v_hasil);
end;
$$;

-- Keputusan Petugas: Cocok atau Tidak Cocok. Semua perubahan terjadi dalam satu transaksi.
create or replace function public.putuskan_klaim_uc15(
  p_id uuid, p_hasil text, p_nama_ktm text, p_bukti_penguat text[] default '{}'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_petugas uuid := (select auth.uid());
  v_klaim record;
  v_bukti text[];
  v_sisa integer;
begin
  if not public.is_petugas() then
    raise exception 'Halaman ini khusus untuk Petugas';
  end if;
  -- UC-14 juga mengunci laporan sebelum menulis klaim. Serialkan keputusan
  -- atas klaim berbeda untuk barang yang sama dengan urutan kunci yang sama.
  perform 1 from public.laporan_temuan t
    join public.klaim k on k.id_laporan = t.id
    where k.id = p_id
    for update of t;

  select k.id, k.nomor_pengajuan_klaim as nomor_pengajuan, k.status, k.id_pengaju, t.id as id_laporan, t.id_pembuat,
         t.barang_nama, t.status_laporan::text as status_laporan, pos.nama as pos_drop_off,
         coalesce(p.nama, '') as pengaju_nama
    into v_klaim
    from public.klaim k
    join public.laporan_temuan t on t.id = k.id_laporan
    left join public.profil p on p.id = k.id_pengaju
    left join public.pos_drop_off pos on pos.id = t.id_pos_drop_off
    where k.id = p_id
    for update of k;
  if not found then
    raise exception 'Klaim tidak ditemukan';
  end if;
  if v_klaim.id_pengaju is null or v_klaim.pengaju_nama = '' then
    raise exception 'Profil pengklaim belum lengkap untuk diperiksa';
  end if;
  if v_klaim.status <> 'Diajukan' then
    raise exception 'Klaim sudah diputuskan';
  end if;
  if p_hasil is null or p_hasil not in ('Cocok', 'Tidak Cocok') then
    raise exception 'Pilih hasil verifikasi';
  end if;
  if nullif(trim(coalesce(p_nama_ktm, '')), '') is null then
    raise exception 'Isi nama yang tertulis pada KTM pengklaim';
  end if;
  -- alt [nama pada KTM berbeda]: hanya bisa ditunda
  if lower(trim(p_nama_ktm)) <> lower(trim(v_klaim.pengaju_nama)) then
    raise exception 'Nama pada KTM tidak sesuai dengan identitas pemilik Klaim';
  end if;
  if v_klaim.status_laporan not in ('Menunggu Verifikasi', 'Tersedia') then
    raise exception 'Status laporan "%" tidak dapat diverifikasi lagi', v_klaim.status_laporan;
  end if;

  -- Hanya bukti penguat dari pilihan yang disediakan yang disimpan.
  select coalesce(array_agg(b), '{}') into v_bukti
    from unnest(coalesce(p_bukti_penguat, '{}')) b
    where b in ('Peragaan buka kunci perangkat elektronik.', 'Anak kunci sesuai dengan Barang.',
                'Kartu identitas sesuai ditemukan di dalam Barang.');

  insert into public.verifikasi_klaim (id_klaim, id_petugas, hasil, nama_ktm, bukti_penguat)
    values (p_id, v_petugas, p_hasil, trim(p_nama_ktm), v_bukti);

  if p_hasil = 'Cocok' then
    update public.klaim set status = 'Terverifikasi' where id = p_id;
    update public.laporan_temuan set status_laporan = 'Diklaim' where id = v_klaim.id_laporan;
    insert into public.riwayat_status_laporan (jenis_laporan, id_laporan, status, keterangan, id_pengubah)
      values ('Temuan', v_klaim.id_laporan, 'Diklaim', 'Klaim terverifikasi', v_petugas);
    perform public.buat_notifikasi(v_klaim.id_pengaju, 'Hasil Verifikasi Klaim',
      'Klaim ' || v_klaim.nomor_pengajuan || ' terverifikasi. Barang "' || v_klaim.barang_nama
        || '" dapat diambil di ' || coalesce(v_klaim.pos_drop_off, 'Pos Drop-off') || '.',
      null, null, p_id);
    if v_klaim.id_pembuat is not null then
      perform public.buat_notifikasi(v_klaim.id_pembuat, 'Perubahan Status',
        'Barang temuanmu "' || v_klaim.barang_nama || '" telah diklaim oleh pemiliknya.',
        null, v_klaim.id_laporan, null);
    end if;
  else
    update public.klaim set status = 'Ditolak' where id = p_id;
    perform public.buat_notifikasi(v_klaim.id_pengaju, 'Hasil Verifikasi Klaim',
      'Klaim ' || v_klaim.nomor_pengajuan || ' ditolak karena bukti dan jawaban tidak cocok.',
      null, null, p_id);
    -- Barang kembali Tersedia kalau tidak ada klaim lain yang masih menunggu.
    select count(*) into v_sisa from public.klaim
      where id_laporan = v_klaim.id_laporan and status = 'Diajukan';
    if v_sisa = 0 then
      update public.laporan_temuan set status_laporan = 'Tersedia' where id = v_klaim.id_laporan;
      insert into public.riwayat_status_laporan (jenis_laporan, id_laporan, status, keterangan, id_pengubah)
        values ('Temuan', v_klaim.id_laporan, 'Tersedia', 'Klaim ditolak', v_petugas);
      if v_klaim.id_pembuat is not null then
        perform public.buat_notifikasi(v_klaim.id_pembuat, 'Perubahan Status',
          'Barang temuanmu "' || v_klaim.barang_nama || '" kembali berstatus Tersedia.',
          null, v_klaim.id_laporan, null);
      end if;
    end if;
  end if;
  return p_hasil;
end;
$$;

revoke all on function public.is_petugas() from public, anon;
grant execute on function public.is_petugas() to authenticated;
revoke all on function public.ambil_klaim_diajukan_uc15() from public, anon;
grant execute on function public.ambil_klaim_diajukan_uc15() to authenticated;
revoke all on function public.cari_klaim_uc15(text) from public, anon;
grant execute on function public.cari_klaim_uc15(text) to authenticated;
revoke all on function public.ambil_verifikasi_klaim_uc15(uuid) from public, anon;
grant execute on function public.ambil_verifikasi_klaim_uc15(uuid) to authenticated;
revoke all on function public.putuskan_klaim_uc15(uuid, text, text, text[]) from public, anon;
grant execute on function public.putuskan_klaim_uc15(uuid, text, text, text[]) to authenticated;

commit;
