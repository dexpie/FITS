import { describe, expect, test } from 'vitest';
import { buatKlaim, formatWaktuPengajuan, isBerkasBuktiValid, periksaKelengkapan, periksaPengajuanKlaim, tanggalWib, terbitkanNomorPengajuan } from './klaim';
import type { Klaim, PertanyaanPublik } from './tipe';

const pertanyaan: PertanyaanPublik[] = [
  { id: 'p1', urutan: 1, teks: 'Apa warna jahitan pada dompet?' },
  { id: 'p2', urutan: 2, teks: 'Apa ciri bagian dalam dompet?' },
];

const klaimLama: Klaim = {
  nomorPengajuanKlaim: 'KL-20260922-0018',
  idLaporan: 'lt-1',
  waktuPengajuan: '2026-09-22T02:00:00.000Z',
  status: 'Diajukan',
  jawaban: [],
  bukti: [],
};

describe('periksaPengajuanKlaim', () => {
  test('barang Menunggu Penyerahan tidak dapat diklaim', () => {
    expect(periksaPengajuanKlaim({ statusLaporan: 'Menunggu Penyerahan', milikSendiri: false, klaimLama: null })).toEqual({ hasil: 'tidak-dapat-diklaim' });
  });

  test('pembuat laporan ditolak mengklaim barang sendiri', () => {
    expect(periksaPengajuanKlaim({ statusLaporan: 'Tersedia', milikSendiri: true, klaimLama: null })).toEqual({ hasil: 'milik-sendiri' });
  });

  test('klaim Diajukan yang sudah ada dikembalikan, bukan dibuat ulang', () => {
    expect(periksaPengajuanKlaim({ statusLaporan: 'Menunggu Verifikasi', milikSendiri: false, klaimLama })).toEqual({ hasil: 'sudah-diajukan', klaim: klaimLama });
  });

  test('klaim lama yang sudah Ditolak tidak menghalangi pengajuan baru', () => {
    const ditolak = { ...klaimLama, status: 'Ditolak' as const };
    expect(periksaPengajuanKlaim({ statusLaporan: 'Tersedia', milikSendiri: false, klaimLama: ditolak })).toEqual({ hasil: 'lanjut' });
  });

  test('barang Tersedia milik orang lain boleh lanjut', () => {
    expect(periksaPengajuanKlaim({ statusLaporan: 'Tersedia', milikSendiri: false, klaimLama: null })).toEqual({ hasil: 'lanjut' });
  });

  test('barang Menunggu Verifikasi masih menerima klaim dari pengguna lain', () => {
    expect(periksaPengajuanKlaim({ statusLaporan: 'Menunggu Verifikasi', milikSendiri: false, klaimLama: null })).toEqual({ hasil: 'lanjut' });
  });
});

describe('periksaKelengkapan', () => {
  test('semua jawaban terisi berarti lengkap', () => {
    expect(periksaKelengkapan(pertanyaan, { p1: 'Putih', p2: 'Ada lapisan kain biru' })).toEqual([]);
  });

  test('jawaban yang belum diisi dilaporkan', () => {
    expect(periksaKelengkapan(pertanyaan, { p1: 'Putih' })).toEqual(['p2']);
  });

  test('jawaban berisi spasi saja dianggap kosong', () => {
    expect(periksaKelengkapan(pertanyaan, { p1: '   ', p2: 'biru' })).toEqual(['p1']);
  });
});

describe('terbitkanNomorPengajuan', () => {
  test('memakai tanggal pengajuan dan urutan empat digit', () => {
    expect(terbitkanNomorPengajuan('2026-09-22', 18)).toBe('KL-20260922-0018');
  });
});

describe('buatKlaim', () => {
  const klaim = buatKlaim({
    nomorPengajuanKlaim: 'KL-20260922-0018',
    idLaporan: 'lt-1',
    waktuPengajuan: '2026-09-22T02:00:00.000Z',
    pertanyaan,
    jawaban: { p1: ' putih ', p2: 'Ada lapisan kain biru' },
    bukti: [{ jenis: 'Foto Lama Barang', namaBerkas: 'foto-dompet-lama.jpg', tipeBerkas: 'image/jpeg' }],
  });

  test('klaim baru berstatus Diajukan', () => {
    expect(klaim.status).toBe('Diajukan');
  });

  test('jawaban disimpan apa adanya, mengikuti urutan pertanyaan', () => {
    expect(klaim.jawaban).toEqual([
      { idPertanyaan: 'p1', isiJawaban: ' putih ' },
      { idPertanyaan: 'p2', isiJawaban: 'Ada lapisan kain biru' },
    ]);
  });

  test('bukti pendukung ikut tersimpan', () => {
    expect(klaim.bukti).toEqual([{ jenis: 'Foto Lama Barang', namaBerkas: 'foto-dompet-lama.jpg', tipeBerkas: 'image/jpeg' }]);
  });

  test('menolak dibuat bila jawaban belum lengkap', () => {
    expect(() => buatKlaim({ nomorPengajuanKlaim: 'KL-1', idLaporan: 'lt-1', waktuPengajuan: '', pertanyaan, jawaban: { p1: 'Putih' }, bukti: [] })).toThrow('Jawaban Verifikasi belum lengkap');
  });
});

describe('isBerkasBuktiValid', () => {
  test.each([
    ['image/jpeg', true],
    ['image/png', true],
    ['application/pdf', true],
    ['video/mp4', false],
    ['', false],
  ])('%s -> %s', (tipe, harapan) => {
    expect(isBerkasBuktiValid(tipe)).toBe(harapan);
  });
});

describe('tanggalWib', () => {
  test('pengajuan lewat tengah malam WIB memakai tanggal WIB, bukan UTC', () => {
    expect(tanggalWib('2026-09-21T18:30:00.000Z')).toBe('2026-09-22');
  });
});

describe('formatWaktuPengajuan', () => {
  test('menampilkan waktu dalam WIB', () => {
    expect(formatWaktuPengajuan('2026-09-22T02:00:00.000Z')).toBe('22 September 2026, 09.00 WIB');
  });
});
