-- Tambahkan pemilik untuk laporan baru tanpa menebak pemilik laporan lama.
-- Laporan lama tetap memiliki id_pembuat NULL sampai pemiliknya diketahui.
begin;
alter table public.laporan_temuan
  add column if not exists id_pembuat uuid references auth.users(id);
alter table public.laporan_temuan enable row level security;
grant select on public.laporan_temuan to authenticated;
drop policy if exists "Laporan temuan: lihat milik sendiri" on public.laporan_temuan;
create policy "Laporan temuan: lihat milik sendiri"
  on public.laporan_temuan for select to authenticated
  using (id_pembuat = (select auth.uid()));
commit;
