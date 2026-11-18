// Tipe domain FITS untuk UC-12, UC-13, dan UC-14. Nama mengikuti class diagram.

export const STATUS_LAPORAN = ['Tersedia', 'Menunggu Penyerahan', 'Menunggu Verifikasi', 'Diklaim', 'Selesai'] as const;
export type StatusLaporan = (typeof STATUS_LAPORAN)[number];

export type StatusKlaim = 'Diajukan' | 'Terverifikasi' | 'Ditolak';

export const JENIS_BUKTI = ['Nota Pembelian', 'Kartu Garansi', 'Foto Kemasan', 'Foto Lama Barang'] as const;
export type JenisBukti = (typeof JENIS_BUKTI)[number];

export type PosDropOff = { id: string; nama: string };

// Data lengkap Laporan Temuan. Hanya hidup di sisi penyimpanan, tidak pernah dikirim ke tampilan publik.
export type LaporanTemuan = {
  id: string;
  nomorLaporan: string;
  barang: { nama: string; merek: string; tipe: string; kategori: string };
  fotoBarang: string;
  lokasi: string;
  tanggalPenemuan: string; // yyyy-mm-dd
  deskripsi: string;
  statusLaporan: StatusLaporan;
  posDropOff: PosDropOff;
};

// Info yang boleh tampil di Halaman Barang Temuan dan Halaman Detail Barang (FR-15: tanpa merek dan tipe).
export type InfoPublik = {
  id: string;
  namaBarang: string;
  kategori: string;
  lokasi: string;
  tanggalPenemuan: string;
  statusLaporan: StatusLaporan;
  fotoBarang: string;
  deskripsi: string;
};

export type KriteriaFilter = {
  kataKunci: string;
  kategori: string[];
  lokasi: string[];
  tanggalDari: string;
  tanggalSampai: string;
  status: StatusLaporan[];
};

export type KriteriaAktif =
  | { jenis: 'kategori'; nilai: string; label: string }
  | { jenis: 'lokasi'; nilai: string; label: string }
  | { jenis: 'status'; nilai: StatusLaporan; label: string }
  | { jenis: 'tanggal'; nilai: 'rentang'; label: string };

export type Urutan = 'terbaru' | 'terlama';

// Pertanyaan Verifikasi versi pengklaim: tanpa jawaban rahasia penemu.
export type PertanyaanPublik = { id: string; urutan: number; teks: string };

export type JawabanVerifikasi = { idPertanyaan: string; isiJawaban: string };

export type BuktiPendukung = { jenis: JenisBukti; namaBerkas: string; tipeBerkas: string };

export type Klaim = {
  nomorPengajuanKlaim: string;
  idLaporan: string;
  waktuPengajuan: string; // ISO
  status: StatusKlaim;
  jawaban: JawabanVerifikasi[];
  bukti: BuktiPendukung[];
};

export type HasilPeriksaPengajuan =
  | { hasil: 'tidak-dapat-diklaim' }
  | { hasil: 'milik-sendiri' }
  | { hasil: 'sudah-diajukan'; klaim: Klaim }
  | { hasil: 'lanjut' };
