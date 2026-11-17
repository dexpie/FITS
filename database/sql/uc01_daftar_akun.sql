-- UC-01 Daftar ke Akun FITS (Faishal)
-- Akun dibuat lewat Supabase Auth (supabase.auth.signUp) dari halaman /uc01.
-- File ini menyiapkan data profil (nama, NRP, peran) yang ikut dikirim saat mendaftar.
-- Independen: tabel profil hanya dibuat dan diatur kalau belum ada.
-- Aman dijalankan ulang. Jalankan sekali lewat Supabase SQL Editor.
begin;

-- Profil akun FITS, satu baris per akun Supabase Auth.
-- Definisi tabel ini sama persis dengan yang ada di uc15_02 dan uc16_02.
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

-- Saat akun baru dibuat dari form UC-01, profil ikut dibuat dari data pendaftaran.
-- Validasi di sisi database: NRP 10 digit dan email ITS. Kalau gagal, pendaftaran dibatalkan.
create or replace function public.buat_profil_uc01()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nama text := trim(coalesce(new.raw_user_meta_data ->> 'nama', ''));
  v_nrp text := trim(coalesce(new.raw_user_meta_data ->> 'nrp', ''));
begin
  -- Hanya akun yang didaftarkan lewat form UC-01 (membawa NRP) yang diproses.
  if v_nrp = '' then
    return new;
  end if;
  if v_nama = '' then
    raise exception 'Nama wajib diisi.';
  end if;
  if v_nrp !~ '^[0-9]{10}$' then
    raise exception 'NRP harus 10 digit angka.';
  end if;
  if new.email !~* '^[^@[:space:]]+@(its\.ac\.id|mhs\.its\.ac\.id)$' then
    raise exception 'Gunakan alamat email ITS.';
  end if;
  insert into public.profil (id, nama, nrp) values (new.id, v_nama, v_nrp);
  return new;
end;
$$;

drop trigger if exists buat_profil_uc01 on auth.users;
create trigger buat_profil_uc01
  after insert on auth.users
  for each row execute function public.buat_profil_uc01();

-- Dipanggil halaman /uc01 sebelum signUp: apakah NRP sudah dipakai akun lain?
create or replace function public.nrp_terpakai_uc01(p_nrp text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profil where nrp = trim(p_nrp));
$$;

revoke all on function public.buat_profil_uc01() from public, anon, authenticated;
revoke all on function public.nrp_terpakai_uc01(text) from public;
grant execute on function public.nrp_terpakai_uc01(text) to anon, authenticated;

commit;
