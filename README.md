# FITS

Proyek ini berisi halaman FITS yang dibuat dengan Next.js, React, TypeScript, dan CSS. UC-05 menggunakan Supabase untuk menyimpan dan menampilkan laporan kehilangan. Beberapa halaman lain masih menggunakan data contoh.

Jalankan `npm install`, lalu `npm run dev`.

Untuk fitur UC-05, salin `.env.example` menjadi `.env.local` dan isi URL serta publishable key proyek Supabase. Masuk menggunakan akun Supabase Auth melalui `/uc02`, lalu buat laporan melalui `/uc05`. Laporan yang tersimpan dapat dilihat di `/uc05/laporan`.

Penyimpanan foto UC-05 membutuhkan bucket privat `foto-kehilangan` dan kebijakan Storage. Tampilan `/uc08` masih menggunakan data contoh.

Halaman `/uc07` berisi rancangan form laporan temuan, dan `/uc06` untuk mencari laporan serupa. Pencarian memerlukan fungsi SQL yang disiapkan terpisah; penyimpanan laporan temuan dan pencatatan kecocokan masih dalam pengerjaan.

Tailwind CSS dapat digunakan bersama file CSS biasa yang sudah ada. Reset global Tailwind tidak diaktifkan agar gaya halaman yang lama tetap terjaga.

Skrip SQL yang digunakan untuk UC-05, UC-06, dan UC-07 tersedia di [`database/sql`](database/sql/README.md), beserta urutan dan status penerapannya.

| Use case | Halaman | File |
| --- | --- | --- |
| Beranda FITS | `/` | `app/page.tsx` |
| UC-02 Login | `/uc02` | `app/uc02/page.tsx` |
| UC-05 Melaporkan Kehilangan Barang | `/uc05` | `app/uc05/page.tsx` |
| UC-08 Laporan Saya | `/uc08` | `app/uc08/page.tsx` |
| UC-12 Barang Temuan | `/uc12` | `app/uc12/page.tsx` |
| UC-16 Halaman Petugas | `/uc16` | `app/uc16/page.tsx` |

Di Next.js App Router, folder dan file `page.tsx` menentukan alamat halaman. Proyek ini tidak memakai file view PHP atau `web.php`.
