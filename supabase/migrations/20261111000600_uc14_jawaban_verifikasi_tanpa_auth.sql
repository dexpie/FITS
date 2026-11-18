-- ============================================================================
-- Migration UC-14 FITS (Find ITS): Mengisi Jawaban Verifikasi Rahasia, tanpa auth
-- Bergantung pada: 20261111000500_uc12_laporan_temuan_tanpa_auth.sql
--
-- Tidak ada login dan tidak ada identitas pengguna: klaim tidak menyimpan pengajunya.
-- Akibatnya UC-13 Alternate 1 (milik sendiri) dan Alternate 2 (sudah diajukan) tidak berlaku.
-- Baca: view pertanyaan publik (tanpa jawaban rahasia) + fungsi ambil klaim dari nomor.
-- Tulis: hanya lewat fungsi security definer. Tabel tertutup untuk anon.
-- ============================================================================

-- ============================================================
-- 1. ENUMERASI DOMAIN
-- ============================================================

create type public.status_klaim as enum ('Diajukan', 'Terverifikasi', 'Ditolak');

create type public.jenis_bukti as enum ('Nota Pembelian', 'Kartu Garansi', 'Foto Kemasan', 'Foto Lama Barang');

create type public.status_pertanyaan as enum ('Aktif', 'Diganti', 'Dihapus');

-- ============================================================
-- 2. PERTANYAAN VERIFIKASI & KLAIM
-- ============================================================

create table public.pertanyaan_verifikasi (
  id              uuid primary key default gen_random_uuid(),
  id_laporan      uuid not null references public.laporan_temuan(id) on delete cascade,
  urutan          smallint not null,
  teks_pertanyaan text not null,
  jawaban_rahasia text not null, -- hanya diketahui penemu & sistem
  status          public.status_pertanyaan not null default 'Aktif',
  created_at      timestamptz not null default now(),
  unique (id_laporan, urutan)
);

create table public.klaim (
  id                      uuid primary key default gen_random_uuid(),
  nomor_pengajuan_klaim   text not null unique,
  id_laporan              uuid not null references public.laporan_temuan(id),
  waktu_pengajuan         timestamptz not null default now(),
  status                  public.status_klaim not null default 'Diajukan',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index idx_klaim_laporan on public.klaim(id_laporan);

create table public.jawaban_verifikasi (
  id              uuid primary key default gen_random_uuid(),
  id_klaim        uuid not null references public.klaim(id) on delete cascade,
  id_pertanyaan   uuid not null references public.pertanyaan_verifikasi(id),
  isi_jawaban     text not null,
  created_at      timestamptz not null default now(),
  unique (id_klaim, id_pertanyaan)
);

create table public.bukti_pendukung (
  id              uuid primary key default gen_random_uuid(),
  id_klaim        uuid not null references public.klaim(id) on delete cascade,
  jenis           public.jenis_bukti not null,
  nama_berkas     text not null,
  tipe_berkas     text not null,
  path_storage    text not null default '',
  created_at      timestamptz not null default now()
);

-- ============================================================
-- 3. VIEW PUBLIK (tanpa jawaban rahasia)
-- ============================================================

create view public.v_pertanyaan_publik as
  select id, id_laporan, urutan, teks_pertanyaan as teks
  from public.pertanyaan_verifikasi
  where status = 'Aktif'
  order by urutan asc;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- Tidak ada policy sama sekali: semua akses lewat view dan fungsi di bawah.
-- ============================================================

alter table public.pertanyaan_verifikasi enable row level security;
alter table public.klaim enable row level security;
alter table public.jawaban_verifikasi enable row level security;
alter table public.bukti_pendukung enable row level security;

-- Jawaban rahasia tidak boleh terbaca walau kelak ada policy select yang terlalu longgar.
revoke select on public.pertanyaan_verifikasi from anon, authenticated;

-- ============================================================
-- 5. TRIGGER updated_at (fungsi dibuat di migration UC-12)
-- ============================================================

create trigger set_updated_at_klaim before update on public.klaim
  for each row execute function public.trigger_set_updated_at();

-- ============================================================
-- 6. AMBIL KLAIM DARI NOMOR (bentuk JSON sama dengan tipe Klaim di lib/fits/tipe.ts)
-- ============================================================

create or replace function public.ambil_klaim_uc14(p_nomor text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nomorPengajuanKlaim', k.nomor_pengajuan_klaim,
    'idLaporan', k.id_laporan,
    'waktuPengajuan', k.waktu_pengajuan,
    'status', k.status,
    'jawaban', coalesce((
      select jsonb_agg(jsonb_build_object('idPertanyaan', j.id_pertanyaan, 'isiJawaban', j.isi_jawaban) order by p.urutan)
      from public.jawaban_verifikasi j
      join public.pertanyaan_verifikasi p on p.id = j.id_pertanyaan
      where j.id_klaim = k.id
    ), '[]'::jsonb),
    'bukti', coalesce((
      select jsonb_agg(jsonb_build_object('jenis', b.jenis, 'namaBerkas', b.nama_berkas, 'tipeBerkas', b.tipe_berkas) order by b.created_at)
      from public.bukti_pendukung b
      where b.id_klaim = k.id
    ), '[]'::jsonb)
  )
  from public.klaim k
  where k.nomor_pengajuan_klaim = p_nomor;
$$;

-- ============================================================
-- 7. AJUKAN KLAIM
-- Pesan galat dipakai apa adanya oleh aplikasi, jadi jangan diubah tanpa mengubah aplikasi.
-- ============================================================

create or replace function public.ajukan_klaim_uc14(p_id_laporan uuid, p_jawaban jsonb, p_bukti jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_laporan public.laporan_temuan%rowtype;
  v_jawaban jsonb := coalesce(p_jawaban, '{}'::jsonb);
  v_bukti jsonb := coalesce(p_bukti, '[]'::jsonb);
  v_waktu timestamptz := now();
  v_urutan integer;
  v_nomor text;
  v_id_klaim uuid;
begin
  -- Kunci baris laporan agar dua klaim bersamaan tidak saling menimpa status.
  select * into v_laporan from public.laporan_temuan where id = p_id_laporan for update;
  if not found then raise exception 'Laporan Temuan tidak ditemukan'; end if;

  if v_laporan.status_laporan not in ('Tersedia', 'Menunggu Verifikasi') then raise exception 'tidak-dapat-diklaim'; end if;

  -- Jawaban disimpan apa adanya, tidak dinilai benar-salahnya (FR-21). Yang diperiksa hanya kelengkapannya.
  if jsonb_typeof(v_jawaban) <> 'object' or exists (
    select 1 from public.pertanyaan_verifikasi p
    where p.id_laporan = p_id_laporan and p.status = 'Aktif'
      and coalesce(btrim(v_jawaban ->> p.id::text), '') = ''
  ) then
    raise exception 'Jawaban Verifikasi belum lengkap';
  end if;

  if jsonb_typeof(v_bukti) <> 'array' or exists (
    select 1 from jsonb_array_elements(v_bukti) b
    where not (coalesce(b ->> 'tipeBerkas', '') like 'image/%' or b ->> 'tipeBerkas' = 'application/pdf')
  ) then
    raise exception 'Bukti Pendukung harus berupa gambar atau PDF';
  end if;

  -- Nomor Pengajuan Klaim: tanggal WIB + urutan berikutnya. Kunci transaksi mencegah nomor ganda.
  perform pg_advisory_xact_lock(hashtext('fits_nomor_pengajuan_klaim'));
  select coalesce(max(split_part(nomor_pengajuan_klaim, '-', 3)::integer), 0) + 1 into v_urutan
    from public.klaim where nomor_pengajuan_klaim ~ '^KL-[0-9]{8}-[0-9]+$';
  v_nomor := 'KL-' || to_char(v_waktu at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-' || lpad(v_urutan::text, 4, '0');

  insert into public.klaim (nomor_pengajuan_klaim, id_laporan, waktu_pengajuan, status)
    values (v_nomor, p_id_laporan, v_waktu, 'Diajukan')
    returning id into v_id_klaim;

  insert into public.jawaban_verifikasi (id_klaim, id_pertanyaan, isi_jawaban)
    select v_id_klaim, p.id, v_jawaban ->> p.id::text
    from public.pertanyaan_verifikasi p
    where p.id_laporan = p_id_laporan and p.status = 'Aktif';

  insert into public.bukti_pendukung (id_klaim, jenis, nama_berkas, tipe_berkas)
    select v_id_klaim, (b ->> 'jenis')::public.jenis_bukti, b ->> 'namaBerkas', b ->> 'tipeBerkas'
    from jsonb_array_elements(v_bukti) b;

  update public.laporan_temuan set status_laporan = 'Menunggu Verifikasi' where id = p_id_laporan;

  return public.ambil_klaim_uc14(v_nomor);
end;
$$;

-- ============================================================
-- 8. HAK EKSEKUSI
-- ============================================================

revoke all on function public.ambil_klaim_uc14(text) from public;
revoke all on function public.ajukan_klaim_uc14(uuid, jsonb, jsonb) from public;

grant execute on function public.ambil_klaim_uc14(text) to anon, authenticated;
grant execute on function public.ajukan_klaim_uc14(uuid, jsonb, jsonb) to anon, authenticated;
