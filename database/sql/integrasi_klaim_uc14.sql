-- Integrasi klaim dengan akun FITS; data lama tanpa pengaju tetap dipertahankan.
begin;
alter table public.klaim add column if not exists id_pengaju uuid references auth.users(id);
insert into storage.buckets (id, name, public, file_size_limit)
values ('bukti-klaim', 'bukti-klaim', false, 5242880) on conflict (id) do nothing;
drop policy if exists "Bukti klaim: unggah milik sendiri" on storage.objects;
create policy "Bukti klaim: unggah milik sendiri" on storage.objects for insert to authenticated
  with check (bucket_id = 'bukti-klaim' and (storage.foldername(name))[1] = (select auth.uid())::text);
create or replace function public.bukti_klaim_sudah_dipakai(p_path text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.bukti_pendukung where path_storage = p_path); $$;
revoke all on function public.bukti_klaim_sudah_dipakai(text) from public, anon;
grant execute on function public.bukti_klaim_sudah_dipakai(text) to authenticated;
drop policy if exists "Bukti klaim: hapus milik sendiri" on storage.objects;
create policy "Bukti klaim: hapus milik sendiri" on storage.objects for delete to authenticated
  using (bucket_id = 'bukti-klaim' and (storage.foldername(name))[1] = (select auth.uid())::text and not public.bukti_klaim_sudah_dipakai(name));

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
  where k.nomor_pengajuan_klaim = p_nomor and k.id_pengaju = (select auth.uid());
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
  if (select auth.uid()) is null then raise exception 'Silakan masuk terlebih dahulu'; end if;
  -- Kunci baris laporan agar dua klaim bersamaan tidak saling menimpa status.
  select * into v_laporan from public.laporan_temuan where id = p_id_laporan for update;
  if not found then raise exception 'Laporan Temuan tidak ditemukan'; end if;
  if v_laporan.id_pembuat = (select auth.uid()) then raise exception 'Tidak dapat mengklaim laporan sendiri'; end if;
  if exists (select 1 from public.klaim where id_laporan = p_id_laporan and id_pengaju = (select auth.uid()) and status = 'Diajukan') then raise exception 'Klaim sudah diajukan'; end if;
  if (select count(*) from public.pertanyaan_verifikasi where id_laporan = p_id_laporan and status = 'Aktif') <> 2 then raise exception 'Pertanyaan verifikasi belum tersedia'; end if;

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

  if exists (select 1 from jsonb_array_elements(v_bukti) b where
    split_part(coalesce(b ->> 'pathStorage', ''), '/', 1) <> (select auth.uid())::text
    or not exists (select 1 from storage.objects o where o.bucket_id = 'bukti-klaim' and o.name = b ->> 'pathStorage'))
  then raise exception 'Berkas bukti tidak ditemukan'; end if;

  -- Nomor Pengajuan Klaim: tanggal WIB + urutan berikutnya. Kunci transaksi mencegah nomor ganda.
  perform pg_advisory_xact_lock(hashtext('fits_nomor_pengajuan_klaim'));
  select coalesce(max(split_part(nomor_pengajuan_klaim, '-', 3)::integer), 0) + 1 into v_urutan
    from public.klaim where nomor_pengajuan_klaim ~ '^KL-[0-9]{8}-[0-9]+$';
  v_nomor := 'KL-' || to_char(v_waktu at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-' || lpad(v_urutan::text, 4, '0');

  insert into public.klaim (nomor_pengajuan_klaim, id_laporan, waktu_pengajuan, status, id_pengaju)
    values (v_nomor, p_id_laporan, v_waktu, 'Diajukan', (select auth.uid()))
    returning id into v_id_klaim;

  insert into public.jawaban_verifikasi (id_klaim, id_pertanyaan, isi_jawaban)
    select v_id_klaim, p.id, v_jawaban ->> p.id::text
    from public.pertanyaan_verifikasi p
    where p.id_laporan = p_id_laporan and p.status = 'Aktif';

  insert into public.bukti_pendukung (id_klaim, jenis, nama_berkas, tipe_berkas, path_storage)
    select v_id_klaim, (b ->> 'jenis')::public.jenis_bukti, b ->> 'namaBerkas', b ->> 'tipeBerkas', b ->> 'pathStorage'
    from jsonb_array_elements(v_bukti) b;

  update public.laporan_temuan set status_laporan = 'Menunggu Verifikasi' where id = p_id_laporan;

  return public.ambil_klaim_uc14(v_nomor);
end;
$$;


create or replace function public.cari_klaim_saya_uc14(p_id_laporan uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select public.ambil_klaim_uc14(k.nomor_pengajuan_klaim) from public.klaim k
  where k.id_laporan = p_id_laporan and k.id_pengaju = (select auth.uid()) and k.status = 'Diajukan'
  order by k.created_at desc limit 1;
$$;
revoke all on function public.ambil_klaim_uc14(text) from public, anon;
revoke all on function public.ajukan_klaim_uc14(uuid,jsonb,jsonb) from public, anon;
revoke all on function public.cari_klaim_saya_uc14(uuid) from public, anon;
grant execute on function public.ambil_klaim_uc14(text) to authenticated;
grant execute on function public.ajukan_klaim_uc14(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.cari_klaim_saya_uc14(uuid) to authenticated;
commit;
