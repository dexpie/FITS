// UC-16 Memperbarui Status Laporan: akses Supabase.
// Dokumentasi diunggah ke bucket privat dokumentasi-serah-terima, lalu fungsi
// selesaikan_serah_terima_uc16 memeriksa semuanya dan mengubah status menjadi Selesai dalam satu transaksi.
import { supabase } from '../supabase';
import type { DataPetugas, JenisDokumentasi } from './types';

export const JENIS_DOKUMENTASI: JenisDokumentasi[] = ['Foto Penyerahan', 'Tanda Tangan Digital'];
const EKSTENSI_BERKAS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
};
const UKURAN_MAKSIMAL = 5 * 1024 * 1024;
const BUCKET = 'dokumentasi-serah-terima';

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
  else if (!Object.hasOwn(EKSTENSI_BERKAS, berkas.type) || !berkas.size || berkas.size > UKURAN_MAKSIMAL) {
    galat.push('Dokumentasi harus JPG, PNG, WEBP, atau PDF, maksimal 5 MB.');
  }
  return galat;
}

// tekanTombolSimpanPerubahan(Selesai) -> selesaikan(serahTerima, petugas)
export async function selesaikan(idKlaim: string, jenis: JenisDokumentasi, berkas: File): Promise<string | null> {
  if (!supabase) return 'Konfigurasi Supabase belum tersedia.';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Silakan masuk terlebih dahulu.';
  const ekstensi = EKSTENSI_BERKAS[berkas.type];
  const path = `${user.id}/${crypto.randomUUID()}.${ekstensi}`;
  const unggah = await supabase.storage.from(BUCKET).upload(path, berkas, { contentType: berkas.type });
  if (unggah.error) return 'Dokumentasi gagal diunggah: ' + unggah.error.message;
  const { error } = await supabase.rpc('selesaikan_serah_terima_uc16', { p_id_klaim: idKlaim, p_jenis: jenis, p_berkas: path });
  if (error) {
    // Jika respons terputus setelah commit, berkas sudah dipakai dan kebijakan Storage melindunginya.
    const { data: tersimpan } = await supabase.rpc('dokumentasi_sudah_dipakai_uc16', { p_path: path });
    if (tersimpan) return null;
    // Berkas yang sudah terunggah dihapus lagi supaya tidak menumpuk.
    await supabase.storage.from(BUCKET).remove([path]);
    return error.message;
  }
  return null;
}
