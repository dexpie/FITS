import { createClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, test } from 'vitest';
import { RepositoriSupabase } from './repositori-supabase';

// Klien Supabase asli, tetapi fetch-nya diganti peladen tiruan PostgREST, jadi test tidak menyentuh database.
type Permintaan = { metode: string; jalur: string; kueri: URLSearchParams; badan: unknown };
type Jawaban = { status?: number; isi: unknown };

const ID_LAPORAN = 'c0000000-0000-0000-0000-000000000044';

const BARIS_LAPORAN = {
  id: ID_LAPORAN, nomor_laporan: 'LT-20260921-0044', barang_nama: 'Dompet kulit coklat', barang_kategori: 'Dompet/KTP',
  foto_barang: '/uc12/4e0f2.png', lokasi: 'DSI Lantai 2', tanggal_penemuan: '2026-09-21',
  deskripsi: 'Dompet ditemukan di area DSI Lantai 2.', status_laporan: 'Tersedia',
  id_pos_drop_off: 'b0000000-0000-0000-0000-000000000001', nama_pos_drop_off: 'Pos SKK — Gedung DSI',
  created_at: '2026-11-11T12:00:00+00:00',
};

const KLAIM_SERVER = {
  nomorPengajuanKlaim: 'KL-20260922-0018', idLaporan: ID_LAPORAN,
  waktuPengajuan: '2026-09-22T02:00:00+00:00', status: 'Diajukan',
  jawaban: [{ idPertanyaan: 'd0000000-0000-0000-0000-000000004401', isiJawaban: 'Putih' }], bukti: [],
};

let rute: Record<string, (p: Permintaan) => Jawaban>;
let riwayat: Permintaan[];

function buatRepo() {
  const fetchTiruan = async (masukan: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(masukan instanceof Request ? masukan.url : String(masukan));
    const metode = init?.method ?? 'GET';
    const permintaan = { metode, jalur: url.pathname, kueri: url.searchParams, badan: init?.body ? JSON.parse(String(init.body)) : null };
    riwayat.push(permintaan);
    const penangan = rute[`${metode} ${url.pathname}`];
    const jawaban = penangan ? penangan(permintaan) : { status: 404, isi: { message: `rute tiruan tidak ada: ${metode} ${url.pathname}` } };
    return new Response(JSON.stringify(jawaban.isi), { status: jawaban.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  const klien = createClient('https://fits.test', 'kunci-uji', { global: { fetch: fetchTiruan }, auth: { persistSession: false } });
  return new RepositoriSupabase(klien);
}

beforeEach(() => {
  riwayat = [];
  rute = {
    'GET /rest/v1/v_laporan_publik': p => ({ isi: p.kueri.get('id') === `eq.${ID_LAPORAN}` || !p.kueri.has('id') ? [BARIS_LAPORAN] : [] }),
    'POST /rest/v1/rpc/ambil_klaim_uc14': p => ({ isi: (p.badan as { p_nomor: string }).p_nomor === KLAIM_SERVER.nomorPengajuanKlaim ? KLAIM_SERVER : null }),
  };
});

describe('daftar publik', () => {
  test('memetakan baris v_laporan_publik ke Info Publik', async () => {
    expect(await buatRepo().ambilDaftarPublik()).toEqual([{
      id: ID_LAPORAN, namaBarang: 'Dompet kulit coklat', kategori: 'Dompet/KTP', lokasi: 'DSI Lantai 2',
      tanggalPenemuan: '2026-09-21', statusLaporan: 'Tersedia', fotoBarang: '/uc12/4e0f2.png', deskripsi: 'Dompet ditemukan di area DSI Lantai 2.',
    }]);
  });

  test('kegagalan database diteruskan sebagai galat', async () => {
    rute['GET /rest/v1/v_laporan_publik'] = () => ({ status: 500, isi: { message: 'database mati' } });
    await expect(buatRepo().ambilDaftarPublik()).rejects.toThrow('database mati');
  });

  test('kategori dan lokasi diambil dari tabel master', async () => {
    rute['GET /rest/v1/kategori'] = () => ({ isi: [{ nama: 'Elektronik' }, { nama: 'Kunci' }] });
    rute['GET /rest/v1/lokasi'] = () => ({ isi: [{ nama: 'Perpustakaan' }] });
    const repo = buatRepo();
    expect(await repo.ambilKategori()).toEqual(['Elektronik', 'Kunci']);
    expect(await repo.ambilLokasi()).toEqual(['Perpustakaan']);
  });
});

describe('detail laporan', () => {
  test('id yang bukan uuid langsung null tanpa bertanya ke database', async () => {
    expect(await buatRepo().ambilLaporanPublik('tidak-ada')).toBeNull();
    expect(riwayat).toEqual([]);
  });

  test('laporan yang tidak ada mengembalikan null', async () => {
    expect(await buatRepo().ambilLaporanPublik('c0000000-0000-0000-0000-000000000099')).toBeNull();
  });

  test('tanpa identitas pengguna, laporan tidak pernah milikSendiri', async () => {
    expect(await buatRepo().ambilLaporanPublik(ID_LAPORAN)).toMatchObject({ info: { namaBarang: 'Dompet kulit coklat' }, milikSendiri: false });
    expect(riwayat.map(p => p.jalur)).toEqual(['/rest/v1/v_laporan_publik']);
  });

  test('pertanyaan verifikasi datang berurutan tanpa jawaban rahasia', async () => {
    rute['GET /rest/v1/v_pertanyaan_publik'] = () => ({ isi: [
      { id: 'p2', id_laporan: ID_LAPORAN, urutan: 2, teks: 'Apa ciri bagian dalam dompet?' },
      { id: 'p1', id_laporan: ID_LAPORAN, urutan: 1, teks: 'Apa warna jahitan pada dompet?' },
    ] });
    expect(await buatRepo().ambilPertanyaan(ID_LAPORAN)).toEqual([
      { id: 'p1', urutan: 1, teks: 'Apa warna jahitan pada dompet?' },
      { id: 'p2', urutan: 2, teks: 'Apa ciri bagian dalam dompet?' },
    ]);
  });
});

describe('klaim', () => {
  test('tanpa identitas pengguna tidak ada klaim lama yang bisa dikenali', async () => {
    expect(await buatRepo().cariKlaimDiajukan(ID_LAPORAN)).toBeNull();
    expect(riwayat).toEqual([]);
  });

  test('detail klaim dicari dari Nomor Pengajuan Klaim', async () => {
    expect(await buatRepo().ambilDetailKlaim('KL-20260922-0018')).toEqual({
      klaim: { ...KLAIM_SERVER, waktuPengajuan: '2026-09-22T02:00:00.000Z' },
      info: expect.objectContaining({ namaBarang: 'Dompet kulit coklat' }),
      posDropOff: { id: 'b0000000-0000-0000-0000-000000000001', nama: 'Pos SKK — Gedung DSI' },
    });
  });

  test('nomor klaim yang tidak ada mengembalikan null', async () => {
    expect(await buatRepo().ambilDetailKlaim('KL-20260101-9999')).toBeNull();
  });
});

describe('ajukanKlaim', () => {
  test('mengirim jawaban dan metadata bukti ke fungsi ajukan_klaim_uc14', async () => {
    let badan: unknown;
    rute['POST /rest/v1/rpc/ajukan_klaim_uc14'] = p => { badan = p.badan; return { isi: KLAIM_SERVER }; };
    const berkas = new Blob(['isi']);
    const klaim = await buatRepo().ajukanKlaim(ID_LAPORAN, { p1: 'Putih' }, [{ jenis: 'Foto Lama Barang', namaBerkas: 'lama.jpg', tipeBerkas: 'image/jpeg', berkas }]);
    expect(badan).toEqual({
      p_id_laporan: ID_LAPORAN, p_jawaban: { p1: 'Putih' },
      p_bukti: [{ jenis: 'Foto Lama Barang', namaBerkas: 'lama.jpg', tipeBerkas: 'image/jpeg' }],
    });
    expect(klaim.waktuPengajuan).toBe('2026-09-22T02:00:00.000Z');
  });

  test('penolakan dari database diteruskan apa adanya', async () => {
    rute['POST /rest/v1/rpc/ajukan_klaim_uc14'] = () => ({ status: 400, isi: { code: 'P0001', message: 'tidak-dapat-diklaim' } });
    await expect(buatRepo().ajukanKlaim(ID_LAPORAN, {}, [])).rejects.toThrow('tidak-dapat-diklaim');
  });
});
