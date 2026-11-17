-- UC-05: bucket privat untuk foto laporan kehilangan.
-- Jalankan sendiri sekali melalui SQL Editor setelah meninjau kebijakan akses.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-kehilangan', 'foto-kehilangan', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy "Foto kehilangan: unggah milik sendiri"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'foto-kehilangan'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Foto kehilangan: lihat milik sendiri"
  on storage.objects for select to authenticated
  using (bucket_id = 'foto-kehilangan'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
