// UC-08 Memantau Status Laporan: kontrak data halaman dan repository.

export type JenisLaporan = 'Kehilangan' | 'Temuan';

// Satu baris dari fungsi ambil_laporan_saya_uc08 (database/sql/uc08_laporan_saya.sql)
export type LaporanSaya = {
  jenis: JenisLaporan;
  id: string;
  nomor_laporan: string;
  barang_nama: string;
  barang_kategori: string;
  status_laporan: string;
  tanggal: string | null;
  foto_barang: string | null;
  sisa_hari: number | null;
  created_at: string;
};

export type RiwayatStatus = {
  keterangan: string;
  status: string | null;
  catatan: string | null;
  waktu: string;
  aktor: 'Pengguna' | 'Petugas' | 'Sistem';
};

// Hasil fungsi ambil_detail_laporan_uc08
export type DetailLaporan = {
  jenis: JenisLaporan;
  id: string;
  nomor_laporan: string;
  barang_nama: string;
  barang_merek: string;
  barang_kategori: string;
  deskripsi: string;
  lokasi: string;
  tanggal: string | null;
  foto_barang: string | null;
  status_laporan: string;
  created_at: string;
  tanggal_kadaluarsa?: string;
  sisa_hari?: number;
  pos_drop_off?: string | null;
  batas_penyerahan?: string | null;
  riwayat: RiwayatStatus[];
};

export type Hasil<T> = { status: 'ok'; data: T } | { status: 'belum-masuk' } | { status: 'galat'; pesan: string };
