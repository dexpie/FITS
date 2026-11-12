// UC-09 Menerima Notifikasi: kontrak data halaman dan repository.

export type JenisNotifikasi = 'Kecocokan Baru' | 'Perubahan Status' | 'Hasil Verifikasi Klaim' | 'Tanggal Kadaluarsa';

// Satu baris tabel public.notifikasi (database/sql/uc09_notifikasi.sql)
export type Notifikasi = {
  id: string;
  jenis: JenisNotifikasi;
  pesan: string;
  id_laporan_kehilangan: string | null;
  id_laporan_temuan: string | null;
  id_klaim: string | null;
  sudah_dibaca: boolean;
  status_pengiriman: string;
  created_at: string;
};

export type HasilNotifikasi =
  | { status: 'ok'; daftar: Notifikasi[] }
  | { status: 'belum-masuk' }
  | { status: 'galat'; pesan: string };
