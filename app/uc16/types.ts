// UC-16 Memperbarui Status Laporan: kontrak data halaman dan repository.

export type Pekerjaan = {
  id_klaim: string;
  nomor_pengajuan: string;
  diajukan: string;
  id_laporan: string;
  nomor_laporan: string;
  barang_nama: string;
  barang_kategori: string;
  lokasi: string;
  tanggal_penemuan: string;
  status_laporan: string;
  pos_drop_off: string | null;
  pengaju_nama: string;
};

// Hasil fungsi ambil_pekerjaan_uc16 (database/sql/uc16_02_pembaruan_status.sql)
export type DataPetugas = {
  pekerjaan: Pekerjaan[];
  jumlah_tersedia: number;
  jumlah_terverifikasi: number;
};

export type JenisDokumentasi = 'Foto Penyerahan' | 'Tanda Tangan Digital';
