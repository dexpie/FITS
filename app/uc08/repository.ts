// UC-08 Memantau Status Laporan: akses Supabase dan aturan tampilan.
// Data dibaca lewat fungsi database yang hanya mengembalikan laporan milik akun yang masuk.
import { supabase } from '../supabase';
import type { DetailLaporan, Hasil, JenisLaporan, LaporanSaya } from './types';

const BUCKET_FOTO: Record<JenisLaporan, string> = { Kehilangan: 'foto-kehilangan', Temuan: 'foto-temuan' };

async function sudahMasuk(): Promise<boolean> {
  if (!supabase) return false;
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

// tekanMenuLaporan() -> daftar = ambilLaporanSaya(status, jenis); null = tanpa saringan
export async function ambilLaporanSaya(status: string | null, jenis: JenisLaporan | null): Promise<Hasil<LaporanSaya[]>> {
  if (!supabase) return { status: 'galat', pesan: 'Konfigurasi Supabase belum tersedia.' };
  if (!(await sudahMasuk())) return { status: 'belum-masuk' };
  // Laporan yang lewat tanggal ditandai Kadaluarsa dulu (UC-10, juga dijadwalkan pg_cron).
  await supabase.rpc('tandai_kadaluarsa_uc10');
  const { data, error } = await supabase.rpc('ambil_laporan_saya_uc08', { p_status: status, p_jenis: jenis });
  if (error) return { status: 'galat', pesan: 'Laporan belum bisa dimuat: ' + error.message };
  return { status: 'ok', data: (data ?? []) as LaporanSaya[] };
}

// pilihLaporan(laporan) -> Detail Laporan Saya, beserta riwayat status
export async function ambilDetailLaporan(jenis: JenisLaporan, id: string): Promise<Hasil<DetailLaporan | null>> {
  if (!supabase) return { status: 'galat', pesan: 'Konfigurasi Supabase belum tersedia.' };
  if (!(await sudahMasuk())) return { status: 'belum-masuk' };
  const { data, error } = await supabase.rpc('ambil_detail_laporan_uc08', { p_jenis: jenis, p_id: id });
  if (error) return { status: 'galat', pesan: 'Detail laporan belum bisa dimuat: ' + error.message };
  return { status: 'ok', data: (data ?? null) as DetailLaporan | null };
}

// Foto disimpan di bucket privat; tampilkan lewat tautan sementara.
export async function alamatFoto(jenis: JenisLaporan, path: string | null): Promise<string | null> {
  if (!supabase || !path) return null;
  const { data } = await supabase.storage.from(BUCKET_FOTO[jenis]).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// Tombol Perpanjang Laporan muncul mulai 3 hari sebelum tanggal kadaluarsa (UC-10).
export function isMendekatiKadaluarsa(laporan: { jenis: JenisLaporan; status_laporan: string; sisa_hari?: number | null }): boolean {
  return laporan.jenis === 'Kehilangan' && laporan.status_laporan === 'Aktif'
    && laporan.sisa_hari != null && laporan.sisa_hari >= 0 && laporan.sisa_hari <= 3;
}

export function isKadaluarsa(laporan: { jenis: JenisLaporan; status_laporan: string; sisa_hari?: number | null }): boolean {
  return laporan.jenis === 'Kehilangan'
    && (laporan.status_laporan === 'Kadaluarsa' || (laporan.sisa_hari != null && laporan.sisa_hari < 0));
}

export function tanggal(nilai: string | null | undefined): string {
  if (!nilai) return '—';
  const d = new Date(nilai.length === 10 ? `${nilai}T00:00:00Z` : nilai);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: nilai.length === 10 ? 'UTC' : 'Asia/Jakarta' });
}

export function waktu(nilai: string): string {
  return new Date(nilai).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

export function warnaStatus(status: string): string {
  if (status === 'Aktif' || status === 'Selesai' || status === 'Tersedia') return 'green';
  if (status === 'Kadaluarsa' || status === 'Batal') return 'merah';
  return 'yellow';
}
