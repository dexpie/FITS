-- UC-07 alur dasar. Jalankan uc07_01_status_draf.sql terlebih dahulu.
-- Membatasi akses jawaban verifikasi dan mengubah izin tabel bersama.
-- Belum mencakup kecocokan dan notifikasi.
begin;

-- Jawaban rahasia tidak boleh dibaca langsung oleh akun biasa.
revoke select on public.pertanyaan_verifikasi from anon, authenticated;
grant select (id, id_laporan, urutan, teks_pertanyaan, status, created_at)
  on public.pertanyaan_verifikasi to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-temuan', 'foto-temuan', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Foto temuan: unggah milik sendiri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'foto-temuan' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Foto temuan: lihat milik sendiri"
  on storage.objects for select to authenticated
  using (bucket_id = 'foto-temuan' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Foto temuan: hapus milik sendiri"
  on storage.objects for delete to authenticated
  using (bucket_id = 'foto-temuan' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Pastikan satu pengguna tidak memiliki dua laporan menunggu penyerahan.
create unique index laporan_temuan_satu_menunggu_per_pengguna
  on public.laporan_temuan (id_pembuat)
  where status_laporan = 'Menunggu Penyerahan';

create function public.buat_laporan_temuan_uc07(
  p_barang_nama text, p_barang_kategori text, p_deskripsi text,
  p_barang_merek text, p_lokasi text, p_tanggal_penemuan date,
  p_foto_path text, p_pertanyaan text[], p_jawaban text[]
)
returns table(id uuid, nomor_laporan text, pos_nama text, batas_penyerahan timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_id uuid := gen_random_uuid();
  v_nomor text := 'LT-' || upper(replace(v_id::text, '-', ''));
  v_pos_id uuid;
  v_pos_nama text;
  v_batas timestamptz := now() + interval '24 hours';
begin
  if v_user is null then raise exception 'Silakan masuk terlebih dahulu'; end if;
  if nullif(trim(p_barang_nama), '') is null or nullif(trim(p_barang_kategori), '') is null
     or nullif(trim(p_lokasi), '') is null or p_tanggal_penemuan is null
     or nullif(trim(p_foto_path), '') is null
     or cardinality(p_pertanyaan) is distinct from 2 or cardinality(p_jawaban) is distinct from 2
     or nullif(trim(p_pertanyaan[1]), '') is null or nullif(trim(p_pertanyaan[2]), '') is null
     or nullif(trim(p_jawaban[1]), '') is null or nullif(trim(p_jawaban[2]), '') is null
  then raise exception 'Data laporan atau pertanyaan belum lengkap'; end if;
  if split_part(p_foto_path, '/', 1) <> v_user::text or not exists (
    select 1 from storage.objects o where o.bucket_id = 'foto-temuan' and o.name = p_foto_path
  ) then raise exception 'Foto barang tidak ditemukan'; end if;
  if not exists (select 1 from public.lokasi l where l.nama = p_lokasi) then
    raise exception 'Lokasi penemuan tidak ditemukan';
  end if;
  -- Jika pos hanya satu, pos tersebut dipakai. Beberapa pos membutuhkan koordinat
  -- dan perhitungan jarak; jangan memilih acak bila koordinat belum tersedia.
  if (select count(*) from public.pos_drop_off) <> 1 then
    raise exception 'Penentuan pos terdekat belum dikonfigurasi';
  end if;
  select p.id, p.nama into v_pos_id, v_pos_nama from public.pos_drop_off p limit 1;

  insert into public.laporan_temuan (
    id, nomor_laporan, id_pembuat, barang_nama, barang_merek, barang_kategori,
    deskripsi, lokasi, tanggal_penemuan, foto_barang, status_laporan,
    id_pos_drop_off, batas_penyerahan
  ) values (
    v_id, v_nomor, v_user, trim(p_barang_nama), coalesce(p_barang_merek, ''),
    p_barang_kategori, coalesce(p_deskripsi, ''), p_lokasi, p_tanggal_penemuan,
    p_foto_path, 'Menunggu Penyerahan', v_pos_id, v_batas
  );
  insert into public.pertanyaan_verifikasi (id_laporan, urutan, teks_pertanyaan, jawaban_rahasia, status)
  values (v_id, 1, trim(p_pertanyaan[1]), trim(p_jawaban[1]), 'Draf'),
         (v_id, 2, trim(p_pertanyaan[2]), trim(p_jawaban[2]), 'Draf');

  return query select v_id, v_nomor, v_pos_nama, v_batas;
end;
$$;

revoke all on function public.buat_laporan_temuan_uc07(text,text,text,text,text,date,text,text[],text[]) from public, anon;
grant execute on function public.buat_laporan_temuan_uc07(text,text,text,text,text,date,text,text[],text[]) to authenticated;
commit;
