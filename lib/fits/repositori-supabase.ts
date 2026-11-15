import type { SupabaseClient } from '@supabase/supabase-js';
import type { DetailKlaim, LampiranBukti, RepositoriFits } from './repositori';
import type { InfoPublik, Klaim, PertanyaanPublik, PosDropOff, StatusLaporan } from './tipe';

type BarisLaporanPublik = {
  id: string; barang_nama: string; barang_kategori: string; foto_barang: string; lokasi: string;
  tanggal_penemuan: string; deskripsi: string; status_laporan: StatusLaporan;
  id_pos_drop_off: string | null; nama_pos_drop_off: string | null;
};

const KOLOM_LAPORAN = 'id, barang_nama, barang_kategori, foto_barang, lokasi, tanggal_penemuan, deskripsi, status_laporan, id_pos_drop_off, nama_pos_drop_off';
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function petakanInfoPublik(baris: BarisLaporanPublik): InfoPublik {
  return {
    id: baris.id,
    namaBarang: baris.barang_nama,
    kategori: baris.barang_kategori,
    lokasi: baris.lokasi,
    tanggalPenemuan: baris.tanggal_penemuan,
    statusLaporan: baris.status_laporan,
    fotoBarang: baris.foto_barang,
    deskripsi: baris.deskripsi,
  };
}

// Postgres mengirim "+00:00", sedangkan tampilan memakai ISO dengan akhiran Z.
function petakanKlaim(klaim: Klaim): Klaim {
  return { ...klaim, waktuPengajuan: new Date(klaim.waktuPengajuan).toISOString() };
}

function periksa<T>(hasil: { data: T | null; error: { message: string } | null }): T {
  if (hasil.error) throw new Error(hasil.error.message);
  return hasil.data as T;
}

// UC-12 dan UC-14 tanpa auth dan tanpa identitas pengguna: baca lewat view publik,
// tulis lewat fungsi SQL security definer. Karena pengguna tidak dikenali, UC-13 Alternate 1
// (milik sendiri) dan Alternate 2 (sudah diajukan) tidak pernah terjadi.
export class RepositoriSupabase implements RepositoriFits {
  constructor(private klien: SupabaseClient) {}

  private async cariBarisLaporan(idLaporan: string) {
    if (!POLA_UUID.test(idLaporan)) return null;
    const daftar = periksa(await this.klien.from('v_laporan_publik').select(KOLOM_LAPORAN).eq('id', idLaporan).limit(1)) as BarisLaporanPublik[];
    return daftar[0] ?? null;
  }

  async ambilDaftarPublik() {
    const daftar = periksa(await this.klien.from('v_laporan_publik').select(KOLOM_LAPORAN)) as BarisLaporanPublik[];
    return daftar.map(petakanInfoPublik);
  }

  async ambilKategori() {
    const daftar = periksa(await this.klien.from('kategori').select('nama').order('nama')) as { nama: string }[];
    return daftar.map(x => x.nama);
  }

  async ambilLokasi() {
    const daftar = periksa(await this.klien.from('lokasi').select('nama').order('nama')) as { nama: string }[];
    return daftar.map(x => x.nama);
  }

  async ambilLaporanPublik(idLaporan: string) {
    const baris = await this.cariBarisLaporan(idLaporan);
    return baris ? { info: petakanInfoPublik(baris), milikSendiri: false } : null;
  }

  async ambilPertanyaan(idLaporan: string): Promise<PertanyaanPublik[]> {
    if (!POLA_UUID.test(idLaporan)) return [];
    const daftar = periksa(await this.klien.from('v_pertanyaan_publik').select('id, urutan, teks').eq('id_laporan', idLaporan)) as PertanyaanPublik[];
    return daftar.map(({ id, urutan, teks }) => ({ id, urutan, teks })).sort((a, b) => a.urutan - b.urutan);
  }

  async cariKlaimDiajukan(_idLaporan: string): Promise<Klaim | null> {
    return null;
  }

  // Pemeriksaan UC-14 (status laporan, kelengkapan jawaban, jenis berkas) dikerjakan ulang di database.
  async ajukanKlaim(idLaporan: string, jawaban: Record<string, string>, bukti: LampiranBukti[]) {
    const klaim = periksa(await this.klien.rpc('ajukan_klaim_uc14', {
      p_id_laporan: idLaporan,
      p_jawaban: jawaban,
      // Berkas belum diunggah ke Storage: yang disimpan baru metadatanya.
      p_bukti: bukti.map(({ jenis, namaBerkas, tipeBerkas }) => ({ jenis, namaBerkas, tipeBerkas })),
    })) as Klaim;
    return petakanKlaim(klaim);
  }

  async ambilDetailKlaim(nomorPengajuanKlaim: string): Promise<DetailKlaim | null> {
    const hasil = periksa(await this.klien.rpc('ambil_klaim_uc14', { p_nomor: nomorPengajuanKlaim })) as Klaim | null;
    const klaim = hasil && petakanKlaim(hasil);
    const baris = klaim && await this.cariBarisLaporan(klaim.idLaporan);
    if (!klaim || !baris) return null;
    const posDropOff: PosDropOff = { id: baris.id_pos_drop_off ?? '', nama: baris.nama_pos_drop_off ?? '' };
    return { klaim, info: petakanInfoPublik(baris), posDropOff };
  }
}
