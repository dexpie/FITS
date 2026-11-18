// UC-16 Memperbarui Status Laporan: akses Supabase.
// Dokumentasi diunggah ke bucket privat dokumentasi-serah-terima, lalu fungsi
// selesaikan_serah_terima_uc16 memeriksa semuanya dan mengubah status menjadi Selesai dalam satu transaksi.
import { supabase } from '../supabase';
import type { AksesPetugas, DataPetugas, JenisDokumentasi } from './types';

export const JENIS_DOKUMENTASI: JenisDokumentasi[] = ['Foto Penyerahan', 'Tanda Tangan Digital'];
const TIPE_BERKAS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const UKURAN_MAKSIMAL = 5 * 1024 * 1024;
const BUCKET = 'dokumentasi-serah-terima';

export async function cekPetugas(): Promise<AksesPetugas> {
  if (!supabase) return 'tanpa-konfigurasi';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'belum-masuk';
  const { data } = await supabase.rpc('is_petugas');
  return data ? 'petugas' : 'bukan-petugas';
}

export async function ambilDataPetugas(): Promise<DataPetugas | string> {
  if (!supabase) return 'Konfigurasi Supabase belum tersedia.';
  const { data, error } = await supabase.rpc('ambil_pekerjaan_uc16');
  if (error) return 'Data belum bisa dimuat: ' + error.message;
  return data as DataPetugas;
}

// Status berikutnya yang boleh dipilih untuk laporan berstatus Diklaim
export function statusBerikutnya(statusLaporan: string): string | null {
  return statusLaporan === 'Diklaim' ? 'Selesai' : null;
}

// isDokumentasiLengkap()
export function periksaDokumentasi(status: string, jenis: string, berkas: File | null): string[] {
  const galat: string[] = [];
  if (status !== 'Selesai') galat.push('Pilih status berikutnya.');
  if (!JENIS_DOKUMENTASI.includes(jenis as JenisDokumentasi)) galat.push('Pilih jenis dokumentasi.');
  if (!berkas) galat.push('Dokumentasi Serah Terima wajib diunggah.');
  else if (!TIPE_BERKAS.includes(berkas.type) || berkas.size > UKURAN_MAKSIMAL) {
    galat.push('Dokumentasi harus JPG, PNG, WEBP, atau PDF, maksimal 5 MB.');
  }
  return galat;
}

// tekanTombolSimpanPerubahan(Selesai) -> selesaikan(serahTerima, petugas)
export async function selesaikan(idKlaim: string, jenis: JenisDokumentasi, berkas: File): Promise<string | null> {
  if (!supabase) return 'Konfigurasi Supabase belum tersedia.';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Silakan masuk terlebih dahulu.';
  const ekstensi = (berkas.name.split('.').pop() || 'bin').toLowerCase();
  // Nama berkas dibuat aplikasi, bukan nama asli dari perangkat; folder pertama = id Petugas.
  const path = `${user.id}/${Date.now()}-${Math.random().toString(16).slice(2, 10)}.${ekstensi}`;
  const unggah = await supabase.storage.from(BUCKET).upload(path, berkas, { contentType: berkas.type });
  if (unggah.error) return 'Dokumentasi gagal diunggah: ' + unggah.error.message;
  const { error } = await supabase.rpc('selesaikan_serah_terima_uc16', { p_id_klaim: idKlaim, p_jenis: jenis, p_berkas: path });
  if (error) {
    // Berkas yang sudah terunggah dihapus lagi supaya tidak menumpuk.
    await supabase.storage.from(BUCKET).remove([path]);
    return error.message;
  }
  return null;
}
