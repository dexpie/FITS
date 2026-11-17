# Migrasi FITS

Database Project FITS sudah memiliki skema dan data kelompok. File lama di
`supabase/migrations` dibuat untuk database kosong dan tidak boleh dijalankan
ulang begitu saja pada proyek tersebut. Riwayat database juga memuat migrasi
yang sebelumnya dijalankan lewat dashboard atau konektor.

SQL integrasi tambahan disimpan di `database/sql`. Periksa riwayat dan objek
database sebelum menjalankan perintah migrasi otomatis agar tabel yang sudah
ada tidak dibuat ulang. File `integrasi_klaim_uc14.sql` mempertahankan klaim
lama tanpa pengaju, tetapi klaim tersebut tidak muncul sebagai milik akun
mana pun sampai kepemilikannya ditetapkan berdasarkan data yang valid.
