// UC-10 Memperpanjang Laporan: kontrak data halaman dan repository.

// Hasil fungsi ambil_perpanjangan_uc10 (database/sql/uc10_02_perpanjang.sql)
export type LaporanPerpanjangan = {
  id: string;
  nomor_laporan: string;
  barang_nama: string;
  status_laporan: string;
  tanggal_kadaluarsa: string;   // YYYY-MM-DD
  sisa_hari: number;
};

export type PilihanDurasi = { hari: number; tanggalBaru: string };

export type HasilPerpanjang = { status: 'berhasil'; tanggalBaru: string } | { status: 'galat'; pesan: string };
