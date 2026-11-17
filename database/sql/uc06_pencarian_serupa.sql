-- UC-06: pencarian data terbatas untuk pengguna yang sudah login.
-- Jalankan sendiri sekali lewat SQL Editor setelah ditinjau bersama tim.
-- Hasil hanya memuat ID, kategori, lokasi, dan tanggal; tidak mengembalikan
-- nama, merek, tipe, deskripsi, identitas pembuat, atau jawaban verifikasi.
-- Sesuaikan jika nanti pencarian foto publik dan kebijakan privasi ditetapkan.
begin;

create function public.cari_laporan_serupa(
  p_asal text, p_nama text, p_kategori text, p_lokasi text[]
)
returns table(id uuid, barang_kategori text, lokasi text, tanggal date)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Silakan masuk terlebih dahulu';
  end if;
  if p_asal is null or p_asal not in ('uc05', 'uc07') or nullif(trim(p_nama), '') is null
     or nullif(trim(p_kategori), '') is null or coalesce(cardinality(p_lokasi), 0) = 0 then
    raise exception 'Data pencarian tidak lengkap';
  end if;

  if p_asal = 'uc05' then
    return query
      select t.id, t.barang_kategori, t.lokasi, t.tanggal_penemuan
      from public.laporan_temuan t
      where t.status_laporan = 'Tersedia'
        and t.barang_kategori = p_kategori
        and strpos(lower(t.barang_nama), lower(trim(p_nama))) > 0
        and exists (select 1 from unnest(p_lokasi) l where lower(trim(l)) = lower(trim(t.lokasi)));
  else
    return query
      select k.id, k.barang_kategori, lokasi_cocok.nama, k.tanggal_kehilangan
      from public.laporan_kehilangan k
      cross join lateral (
        select l as nama from unnest(k.lokasi_dilewati) l
        where exists (select 1 from unnest(p_lokasi) p where lower(trim(p)) = lower(trim(l)))
        limit 1
      ) lokasi_cocok
      where k.status_laporan = 'Aktif'
        and k.id_pembuat <> (select auth.uid())
        and k.barang_kategori = p_kategori
        and strpos(lower(k.barang_nama), lower(trim(p_nama))) > 0;
  end if;
end;
$$;

revoke all on function public.cari_laporan_serupa(text, text, text, text[]) from public, anon;
grant execute on function public.cari_laporan_serupa(text, text, text, text[]) to authenticated;
commit;
