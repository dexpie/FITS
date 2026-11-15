import { describe, expect, test } from 'vitest';
import {
  ambilInfoPublik,
  cariDaftarPublik,
  daftarKriteriaAktif,
  formatTanggal,
  hapusKriteria,
  isDapatDiklaim,
  isKriteriaKosong,
  kriteriaKosong,
  rentangTanggalCepat,
} from './laporan-temuan';
import type { InfoPublik, LaporanTemuan } from './tipe';

const laporan: LaporanTemuan = {
  id: 'lt-1',
  nomorLaporan: 'LT-20260921-0044',
  barang: { nama: 'Dompet kulit coklat', merek: 'Fossil', tipe: 'Logan', kategori: 'Dompet/KTP' },
  fotoBarang: '/uc12/4e0f2.png',
  lokasi: 'DSI Lantai 2',
  tanggalPenemuan: '2026-09-21',
  deskripsi: 'Dompet ditemukan di area DSI Lantai 2.',
  statusLaporan: 'Tersedia',
  posDropOff: { id: 'pos-1', nama: 'Pos SKK — Gedung DSI' },
};

const daftar: InfoPublik[] = [
  { id: 'a', namaBarang: 'Dompet kulit coklat', kategori: 'Dompet/KTP', lokasi: 'DSI Lantai 2', tanggalPenemuan: '2026-09-21', statusLaporan: 'Tersedia', fotoBarang: '', deskripsi: '' },
  { id: 'b', namaBarang: 'Kunci motor', kategori: 'Kunci', lokasi: 'Parkiran DSI', tanggalPenemuan: '2026-09-18', statusLaporan: 'Menunggu Verifikasi', fotoBarang: '', deskripsi: '' },
  { id: 'c', namaBarang: 'Laptop abu-abu', kategori: 'Elektronik', lokasi: 'Perpustakaan', tanggalPenemuan: '2026-09-17', statusLaporan: 'Selesai', fotoBarang: '', deskripsi: '' },
  { id: 'd', namaBarang: 'Dompet hitam', kategori: 'Dompet/KTP', lokasi: 'DSI Lantai 2', tanggalPenemuan: '2026-09-21', statusLaporan: 'Menunggu Penyerahan', fotoBarang: '', deskripsi: '' },
];
const id = (hasil: InfoPublik[]) => hasil.map(x => x.id);

describe('ambilInfoPublik', () => {
  test('tidak membawa merek, tipe, atau pembuat laporan', () => {
    const teks = JSON.stringify(ambilInfoPublik(laporan));
    expect(teks).not.toContain('Fossil');
    expect(teks).not.toContain('Logan');
    expect(teks).not.toContain('akun-penemu');
  });

  test('membawa data yang tampil di daftar dan detail', () => {
    expect(ambilInfoPublik(laporan)).toEqual({
      id: 'lt-1',
      namaBarang: 'Dompet kulit coklat',
      kategori: 'Dompet/KTP',
      lokasi: 'DSI Lantai 2',
      tanggalPenemuan: '2026-09-21',
      statusLaporan: 'Tersedia',
      fotoBarang: '/uc12/4e0f2.png',
      deskripsi: 'Dompet ditemukan di area DSI Lantai 2.',
    });
  });
});

describe('cariDaftarPublik', () => {
  test('kriteria kosong mengembalikan semua laporan, terbaru dulu', () => {
    expect(id(cariDaftarPublik(daftar, kriteriaKosong))).toEqual(['a', 'd', 'b', 'c']);
  });

  test('urutan terlama membalik urutan tanggal', () => {
    expect(id(cariDaftarPublik(daftar, kriteriaKosong, 'terlama'))).toEqual(['c', 'b', 'a', 'd']);
  });

  test('kata kunci mencocokkan nama barang tanpa peduli huruf besar', () => {
    expect(id(cariDaftarPublik(daftar, { ...kriteriaKosong, kataKunci: '  DOMPET ' }))).toEqual(['a', 'd']);
  });

  test('beberapa kategori digabung dengan ATAU', () => {
    expect(id(cariDaftarPublik(daftar, { ...kriteriaKosong, kategori: ['Elektronik', 'Kunci'] }))).toEqual(['b', 'c']);
  });

  test('kriteria berbeda jenis digabung dengan DAN', () => {
    const kriteria = { ...kriteriaKosong, kategori: ['Elektronik', 'Dompet/KTP'], lokasi: ['DSI Lantai 2'], status: ['Tersedia' as const] };
    expect(id(cariDaftarPublik(daftar, kriteria))).toEqual(['a']);
  });

  test('rentang tanggal menyertakan batas awal dan akhir', () => {
    expect(id(cariDaftarPublik(daftar, { ...kriteriaKosong, tanggalDari: '2026-09-17', tanggalSampai: '2026-09-18' }))).toEqual(['b', 'c']);
  });

  test('tanpa hasil mengembalikan daftar kosong', () => {
    expect(cariDaftarPublik(daftar, { ...kriteriaKosong, kategori: ['Kunci'], lokasi: ['Perpustakaan'] })).toEqual([]);
  });
});

describe('kriteria aktif', () => {
  const kriteria = { ...kriteriaKosong, kataKunci: 'dompet', kategori: ['Elektronik', 'Dompet/KTP'], lokasi: ['DSI Lantai 2'], status: ['Tersedia' as const] };

  test('setiap pilihan menjadi satu chip, kata kunci bukan chip', () => {
    expect(daftarKriteriaAktif(kriteria).map(k => k.label)).toEqual(['Elektronik', 'Dompet/KTP', 'DSI Lantai 2', 'Tersedia']);
  });

  test('rentang tanggal menjadi satu chip', () => {
    const aktif = daftarKriteriaAktif({ ...kriteriaKosong, tanggalDari: '2026-09-17', tanggalSampai: '2026-09-21' });
    expect(aktif.map(k => k.label)).toEqual(['17 Sep 2026 - 21 Sep 2026']);
  });

  test('menghapus satu chip menyisakan kriteria lain', () => {
    const tersisa = hapusKriteria(kriteria, { jenis: 'kategori', nilai: 'Elektronik', label: 'Elektronik' });
    expect(tersisa).toEqual({ ...kriteria, kategori: ['Dompet/KTP'] });
  });

  test('menghapus chip tanggal mengosongkan kedua batas', () => {
    const awal = { ...kriteriaKosong, tanggalDari: '2026-09-17', tanggalSampai: '2026-09-21' };
    expect(hapusKriteria(awal, { jenis: 'tanggal', nilai: 'rentang', label: '' })).toEqual(kriteriaKosong);
  });

  test('isKriteriaKosong mengabaikan kata kunci', () => {
    expect(isKriteriaKosong({ ...kriteriaKosong, kataKunci: 'dompet' })).toBe(true);
    expect(isKriteriaKosong(kriteria)).toBe(false);
  });
});

describe('isDapatDiklaim', () => {
  test.each([
    ['Tersedia', true],
    ['Menunggu Verifikasi', true],
    ['Menunggu Penyerahan', false],
    ['Diklaim', false],
    ['Selesai', false],
  ] as const)('%s -> %s', (status, harapan) => {
    expect(isDapatDiklaim(status)).toBe(harapan);
  });
});

describe('tanggal', () => {
  test('format singkat', () => {
    expect(formatTanggal('2026-09-21')).toBe('21 Sep 2026');
  });

  test('format panjang', () => {
    expect(formatTanggal('2026-09-21', 'panjang')).toBe('21 September 2026');
  });

  test('tanggal cepat Hari Ini', () => {
    expect(rentangTanggalCepat(0, '2026-09-21')).toEqual({ tanggalDari: '2026-09-21', tanggalSampai: '2026-09-21' });
  });

  test('tanggal cepat 7 Hari melewati batas bulan', () => {
    expect(rentangTanggalCepat(7, '2026-10-03')).toEqual({ tanggalDari: '2026-09-26', tanggalSampai: '2026-10-03' });
  });
});
