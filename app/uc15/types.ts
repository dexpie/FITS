// UC-15 Memverifikasi Klaim Barang: kontrak data halaman dan repository.

export type KlaimDiajukan = {
  id: string;
  nomor_pengajuan: string;
  barang_nama: string;
  pengaju_nama: string;
  created_at: string;
};

export type JawabanVerifikasi = {
  urutan: number;
  pertanyaan: string;
  jawaban_rahasia: string;      // dari penemu, hanya terlihat Petugas
  jawaban_klaim: string | null; // dari pengklaim
};

export type HasilVerifikasi = {
  hasil: 'Cocok' | 'Tidak Cocok';
  nama_ktm: string;
  bukti_penguat: string[];
  waktu: string;
  petugas: string;
};

// Hasil fungsi ambil_verifikasi_klaim_uc15 (database/sql/uc15_02_verifikasi_klaim.sql)
export type DataVerifikasi = {
  id: string;
  nomor_pengajuan: string;
  status: 'Diajukan' | 'Terverifikasi' | 'Ditolak';
  created_at: string;
  nomor_laporan: string;
  barang_nama: string;
  barang_kategori: string;
  lokasi: string;
  status_laporan: string;
  pos_drop_off: string | null;
  pengaju_nama: string;
  pengaju_nrp: string | null;
  jawaban: JawabanVerifikasi[];
  bukti: { id: string; jenis: string; nama_berkas: string; path_storage: string; url?: string }[];
  laporan_kehilangan: { nomor_laporan: string; barang_nama: string; deskripsi: string; lokasi: string; created_at: string }[];
  klaim_lain: string[];
  hasil_verifikasi: HasilVerifikasi | null;
};

export type AksesPetugas = 'petugas' | 'bukan-petugas' | 'belum-masuk' | 'tanpa-konfigurasi' | 'gagal';
