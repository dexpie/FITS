-- UC-15 Memverifikasi Klaim Barang (Fawzy), bagian 2 dari 2. Jalankan setelah uc15_01_status_klaim.sql.
-- Petugas mencari klaim, membandingkan jawaban pengklaim dengan jawaban rahasia penemu,
-- lalu menyatakan Cocok atau Tidak Cocok setelah pemeriksaan tatap muka.
-- Independen: setiap tabel hanya dibuat dan diatur kalau belum ada.
--
-- PENTING untuk yang menjalankan migration:
--   Tabel klaim, jawaban_verifikasi, dan bukti_pendukung sebenarnya milik UC-14 (Fabio).
--   Kalau SQL UC-14 sudah dijalankan, tabel itu TIDAK dibuat ulang di sini, tetapi nama kolomnya
--   harus sama dengan yang dipakai fungsi di bawah (id_laporan_temuan, id_pengaju, status,
--   nomor_pengajuan, id_klaim, id_pertanyaan, isi_jawaban, jenis, keterangan, berkas).
--   Cocokkan dulu dengan SQL UC-14 sebelum menjalankan file ini.
begin;

-- Profil akun. Definisi sama persis dengan uc01 dan uc16_02.
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

-- Riwayat perubahan status laporan. Definisi sama persis dengan uc08, uc10_02, dan uc16_02.
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

-- Klaim (milik UC-14). Definisi sama persis dengan uc16_02.
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

-- Jawaban pengklaim untuk pertanyaan verifikasi (milik UC-14).
do $$
begin
  if to_regclass('public.jawaban_verifikasi') is null then
    create table public.jawaban_verifikasi (
      id uuid primary key default gen_random_uuid(),
      id_klaim uuid not null references public.klaim(id) on delete cascade,
      id_pertanyaan uuid not null references public.pertanyaan_verifikasi(id) on delete cascade,
      isi_jawaban text not null,
      unique (id_klaim, id_pertanyaan)
    );
    alter table public.jawaban_verifikasi enable row level security;
    revoke all on public.jawaban_verifikasi from anon, authenticated;
  end if;
end $$;

-- Bukti pendukung klaim (milik UC-14).
do $$
begin
  if to_regclass('public.bukti_pendukung') is null then
    create table public.bukti_pendukung (
      id uuid primary key default gen_random_uuid(),
      id_klaim uuid not null references public.klaim(id) on delete cascade,
      jenis text not null check (jenis in ('Nota', 'Kartu Garansi', 'Kemasan', 'Foto Lama')),
      keterangan text,
      berkas text not null
    );
    alter table public.bukti_pendukung enable row level security;
    revoke all on public.bukti_pendukung from anon, authenticated;
  end if;
end $$;

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

-- Apakah akun yang masuk berperan Petugas? Definisi sama persis dengan uc16_02.
create or replace function public.is_petugas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profil where id = (select auth.uid()) and peran = 'petugas');
$$;

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
    select k.id, k.nomor_pengajuan, t.barang_nama, coalesce(p.nama, u.email::text), k.created_at
    from public.klaim k
    join public.laporan_temuan t on t.id = k.id_laporan_temuan
    join auth.users u on u.id = k.id_pengaju
    left join public.profil p on p.id = k.id_pengaju
    where k.status = 'Diajukan'
    order by k.created_at;
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
  select k.id into v_id from public.klaim k where upper(k.nomor_pengajuan) = upper(trim(p_nomor));
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

  select k.id, k.nomor_pengajuan, k.status, k.created_at, k.id_pengaju,
         t.id as id_laporan, t.nomor_laporan, t.barang_nama, t.barang_kategori, t.lokasi,
         t.status_laporan::text as status_laporan, pos.nama as pos_drop_off,
         coalesce(p.nama, u.email::text) as pengaju_nama, p.nrp as pengaju_nrp
    into v_klaim
    from public.klaim k
    join public.laporan_temuan t on t.id = k.id_laporan_temuan
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
      select jsonb_agg(jsonb_build_object('jenis', b.jenis, 'keterangan', b.keterangan, 'berkas', b.berkas))
      from public.bukti_pendukung b where b.id_klaim = p_id), '[]'::jsonb),
    'laporan_kehilangan', coalesce((
      select jsonb_agg(jsonb_build_object('nomor_laporan', lk.nomor_laporan, 'barang_nama', lk.barang_nama,
                                          'deskripsi', lk.deskripsi, 'lokasi', array_to_string(lk.lokasi_dilewati, ' / '),
                                          'created_at', lk.created_at) order by lk.created_at desc)
      from public.laporan_kehilangan lk
      where lk.id_pembuat = v_klaim.id_pengaju and lk.barang_kategori = v_klaim.barang_kategori), '[]'::jsonb),
    'klaim_lain', coalesce((
      select jsonb_agg(k2.nomor_pengajuan order by k2.created_at)
      from public.klaim k2
      where k2.id_laporan_temuan = v_klaim.id_laporan and k2.status = 'Diajukan' and k2.id <> p_id), '[]'::jsonb),
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
  v_ada_notifikasi boolean := to_regprocedure('public.buat_notifikasi(uuid,text,text,uuid,uuid,uuid)') is not null;
begin
  if not public.is_petugas() then
    raise exception 'Halaman ini khusus untuk Petugas';
  end if;
  select k.id, k.nomor_pengajuan, k.status, k.id_pengaju, t.id as id_laporan, t.id_pembuat,
         t.barang_nama, t.status_laporan::text as status_laporan, pos.nama as pos_drop_off,
         coalesce(p.nama, '') as pengaju_nama
    into v_klaim
    from public.klaim k
    join public.laporan_temuan t on t.id = k.id_laporan_temuan
    left join public.profil p on p.id = k.id_pengaju
    left join public.pos_drop_off pos on pos.id = t.id_pos_drop_off
    where k.id = p_id
    for update of k;
  if not found then
    raise exception 'Klaim tidak ditemukan';
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
    if v_ada_notifikasi then
      perform public.buat_notifikasi(v_klaim.id_pengaju, 'Hasil Verifikasi Klaim',
        'Klaim ' || v_klaim.nomor_pengajuan || ' terverifikasi. Barang "' || v_klaim.barang_nama
          || '" dapat diambil di ' || coalesce(v_klaim.pos_drop_off, 'Pos Drop-off') || '.',
        null, null, p_id);
      perform public.buat_notifikasi(v_klaim.id_pembuat, 'Perubahan Status',
        'Barang temuanmu "' || v_klaim.barang_nama || '" telah diklaim oleh pemiliknya.',
        null, v_klaim.id_laporan, null);
    end if;
  else
    update public.klaim set status = 'Ditolak' where id = p_id;
    if v_ada_notifikasi then
      perform public.buat_notifikasi(v_klaim.id_pengaju, 'Hasil Verifikasi Klaim',
        'Klaim ' || v_klaim.nomor_pengajuan || ' ditolak karena bukti dan jawaban tidak cocok.',
        null, null, p_id);
    end if;
    -- Barang kembali Tersedia kalau tidak ada klaim lain yang masih menunggu.
    select count(*) into v_sisa from public.klaim
      where id_laporan_temuan = v_klaim.id_laporan and status = 'Diajukan';
    if v_sisa = 0 then
      update public.laporan_temuan set status_laporan = 'Tersedia' where id = v_klaim.id_laporan;
      insert into public.riwayat_status_laporan (jenis_laporan, id_laporan, status, keterangan, id_pengubah)
        values ('Temuan', v_klaim.id_laporan, 'Tersedia', 'Klaim ditolak', v_petugas);
      if v_ada_notifikasi then
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
