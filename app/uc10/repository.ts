// UC-10 Memperpanjang Laporan: akses Supabase.
// Semua aturan (pemilik, Aktif, sisa 0-3 hari, durasi 7/14/30) diperiksa ulang oleh fungsi
// perpanjang_laporan_uc10 di database, dan update + riwayat terjadi dalam satu transaksi.
import { supabase } from '../supabase';
import type { HasilPerpanjang, LaporanPerpanjangan, PilihanDurasi } from './types';

export const DURASI_PERPANJANGAN = [7, 14, 30];

export async function ambilLaporan(id: string): Promise<LaporanPerpanjangan | null | 'belum-masuk'> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'belum-masuk';
  const { data } = await supabase.rpc('ambil_perpanjangan_uc10', { p_id: id });
  return (data ?? null) as LaporanPerpanjangan | null;
}

// Tombol Perpanjang hanya tersedia untuk laporan Aktif yang tinggal 0-3 hari.
export function bolehDiperpanjang(laporan: LaporanPerpanjangan): boolean {
  return laporan.status_laporan === 'Aktif' && laporan.sisa_hari >= 0 && laporan.sisa_hari <= 3;
}

// Tanggal kadaluarsa baru untuk tiap pilihan durasi, ditampilkan sebelum konfirmasi.
export function pilihanDurasi(laporan: LaporanPerpanjangan): PilihanDurasi[] {
  return DURASI_PERPANJANGAN.map((hari) => {
    const baru = new Date(`${laporan.tanggal_kadaluarsa}T00:00:00Z`);
    baru.setUTCDate(baru.getUTCDate() + hari);
    return { hari, tanggalBaru: formatTanggal(baru.toISOString().slice(0, 10)) };
  });
}

// tekanTombolKonfirmasi(durasiHari, catatan) -> perpanjang(durasiHari, catatan)
export async function perpanjang(id: string, durasi: number, catatan: string): Promise<HasilPerpanjang> {
  if (!supabase) return { status: 'galat', pesan: 'Konfigurasi Supabase belum tersedia.' };
  if (!DURASI_PERPANJANGAN.includes(durasi)) return { status: 'galat', pesan: 'Pilih durasi perpanjangan.' };
  const { data, error } = await supabase.rpc('perpanjang_laporan_uc10', { p_id: id, p_durasi: durasi, p_catatan: catatan.trim() || null });
  if (error) return { status: 'galat', pesan: error.message };
  return { status: 'berhasil', tanggalBaru: formatTanggal(String(data)) };
}

export function formatTanggal(nilai: string): string {
  return new Date(`${nilai.slice(0, 10)}T00:00:00Z`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
