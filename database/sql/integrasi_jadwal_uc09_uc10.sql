-- Jalankan setelah fungsi UC-09 dan UC-10 tersedia.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule('fits_uc09_peringatan_kadaluarsa', '0 * * * *',
  'select public.kirim_peringatan_kadaluarsa_uc09()');
select cron.schedule('fits_uc10_tandai_kadaluarsa', '5 * * * *',
  'select public.tandai_kadaluarsa_uc10()');
