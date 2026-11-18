import type { InfoPublik, KriteriaAktif, KriteriaFilter, LaporanTemuan, StatusLaporan, Urutan } from './tipe';

export const kriteriaKosong: KriteriaFilter = { kataKunci: '', kategori: [], lokasi: [], tanggalDari: '', tanggalSampai: '', status: [] };

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function formatTanggal(tanggal: string, gaya: 'singkat' | 'panjang' = 'singkat') {
  const [tahun, bulan, hari] = tanggal.split('-');
  const nama = (gaya === 'panjang' ? BULAN_PANJANG : BULAN_SINGKAT)[Number(bulan) - 1];
  return `${Number(hari)} ${nama} ${tahun}`;
}

export function tanggalHariIni() {
  const kini = new Date();
  return [kini.getFullYear(), String(kini.getMonth() + 1).padStart(2, '0'), String(kini.getDate()).padStart(2, '0')].join('-');
}

// Pilihan "Hari Ini", "7 Hari", "30 Hari" pada Panel Filter.
export function rentangTanggalCepat(hariMundur: number, hariIni: string) {
  const awal = new Date(`${hariIni}T00:00:00Z`);
  awal.setUTCDate(awal.getUTCDate() - hariMundur);
  return { tanggalDari: awal.toISOString().slice(0, 10), tanggalSampai: hariIni };
}

// FR-15: merek, tipe, dan pembuat laporan tidak ikut ke tampilan publik.
export function ambilInfoPublik(laporan: LaporanTemuan): InfoPublik {
  return {
    id: laporan.id,
    namaBarang: laporan.barang.nama,
    kategori: laporan.barang.kategori,
    lokasi: laporan.lokasi,
    tanggalPenemuan: laporan.tanggalPenemuan,
    statusLaporan: laporan.statusLaporan,
    fotoBarang: laporan.fotoBarang,
    deskripsi: laporan.deskripsi,
  };
}

export function cariDaftarPublik(daftar: InfoPublik[], kriteria: KriteriaFilter, urutan: Urutan = 'terbaru') {
  const kataKunci = kriteria.kataKunci.trim().toLowerCase();
  const arah = urutan === 'terbaru' ? -1 : 1;
  return daftar
    .filter(info =>
      info.namaBarang.toLowerCase().includes(kataKunci) &&
      (!kriteria.kategori.length || kriteria.kategori.includes(info.kategori)) &&
      (!kriteria.lokasi.length || kriteria.lokasi.includes(info.lokasi)) &&
      (!kriteria.status.length || kriteria.status.includes(info.statusLaporan)) &&
      (!kriteria.tanggalDari || info.tanggalPenemuan >= kriteria.tanggalDari) &&
      (!kriteria.tanggalSampai || info.tanggalPenemuan <= kriteria.tanggalSampai))
    .sort((a, b) => arah * a.tanggalPenemuan.localeCompare(b.tanggalPenemuan));
}

function labelRentang(dari: string, sampai: string) {
  if (dari && sampai) return `${formatTanggal(dari)} - ${formatTanggal(sampai)}`;
  return dari ? `Sejak ${formatTanggal(dari)}` : `Sampai ${formatTanggal(sampai)}`;
}

// Chip kriteria aktif di Halaman Barang Temuan. Kata kunci tampil di kolom pencarian, bukan sebagai chip.
export function daftarKriteriaAktif(kriteria: KriteriaFilter): KriteriaAktif[] {
  const aktif: KriteriaAktif[] = [
    ...kriteria.kategori.map(nilai => ({ jenis: 'kategori' as const, nilai, label: nilai })),
    ...kriteria.lokasi.map(nilai => ({ jenis: 'lokasi' as const, nilai, label: nilai })),
  ];
  if (kriteria.tanggalDari || kriteria.tanggalSampai) aktif.push({ jenis: 'tanggal', nilai: 'rentang', label: labelRentang(kriteria.tanggalDari, kriteria.tanggalSampai) });
  return [...aktif, ...kriteria.status.map(nilai => ({ jenis: 'status' as const, nilai, label: nilai }))];
}

export function hapusKriteria(kriteria: KriteriaFilter, aktif: KriteriaAktif): KriteriaFilter {
  if (aktif.jenis === 'tanggal') return { ...kriteria, tanggalDari: '', tanggalSampai: '' };
  if (aktif.jenis === 'status') return { ...kriteria, status: kriteria.status.filter(x => x !== aktif.nilai) };
  return { ...kriteria, [aktif.jenis]: kriteria[aktif.jenis].filter(x => x !== aktif.nilai) };
}

export function isKriteriaKosong(kriteria: KriteriaFilter) {
  return daftarKriteriaAktif(kriteria).length === 0;
}

// UC-13: klaim hanya untuk barang berstatus Tersedia atau Menunggu Verifikasi.
export function isDapatDiklaim(status: StatusLaporan) {
  return status === 'Tersedia' || status === 'Menunggu Verifikasi';
}
