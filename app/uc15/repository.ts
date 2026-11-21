// UC-15 Memverifikasi Klaim Barang: akses Supabase.
// Jawaban rahasia penemu tidak bisa dibaca langsung; hanya fungsi database khusus Petugas yang mengembalikannya.
import { supabase } from '../supabase';
import type { AksesPetugas, DataVerifikasi, KlaimDiajukan } from './types';

export const PILIHAN_BUKTI_PENGUAT = [
  'Peragaan buka kunci perangkat elektronik.',
  'Anak kunci sesuai dengan Barang.',
  'Kartu identitas sesuai ditemukan di dalam Barang.',
];

export async function cekPetugas(): Promise<AksesPetugas> {
  if (!supabase) return 'tanpa-konfigurasi';
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'belum-masuk';
  const { data, error } = await supabase.rpc('is_petugas');
  if (error) return 'gagal';
  return data ? 'petugas' : 'bukan-petugas';
}

export async function ambilKlaimDiajukan(): Promise<KlaimDiajukan[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('ambil_klaim_diajukan_uc15');
  if (error) throw error;
  return (data ?? []) as KlaimDiajukan[];
}

// isiNomorPengajuanKlaim(nomor) -> cariByNomor(nomor)
export async function cariKlaim(nomor: string): Promise<string | null> {
  if (!supabase || !nomor.trim()) return null;
  const { data, error } = await supabase.rpc('cari_klaim_uc15', { p_nomor: nomor.trim() });
  if (error) throw error;
  return (data as string | null) ?? null;
}

export async function ambilVerifikasi(id: string): Promise<DataVerifikasi | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('ambil_verifikasi_klaim_uc15', { p_id: id });
  if (error) throw error;
  const klaim = data as DataVerifikasi | null;
  if (!klaim) return null;

  const paths = klaim.bukti.map(bukti => bukti.path_storage).filter(Boolean);
  if (paths.length === 0) return klaim;
  const { data: tautan } = await supabase.storage.from('bukti-klaim').createSignedUrls(paths, 300);
  const urlPerBerkas = new Map(tautan?.map(item => [item.path, item.signedUrl]));
  return { ...klaim, bukti: klaim.bukti.map(bukti => ({ ...bukti, url: urlPerBerkas.get(bukti.path_storage) ?? undefined })) };
}

// nyatakanCocok(petugas, buktiPenguat) / nyatakanTidakCocok(petugas); semua perubahan dalam satu transaksi di database.
export async function putuskanKlaim(id: string, hasil: 'Cocok' | 'Tidak Cocok', namaKtm: string, buktiPenguat: string[]): Promise<string | null> {
  if (!supabase) return 'Konfigurasi Supabase belum tersedia.';
  if (!namaKtm.trim()) return 'Isi nama yang tertulis pada KTM pengklaim.';
  const { error } = await supabase.rpc('putuskan_klaim_uc15', {
    p_id: id, p_hasil: hasil, p_nama_ktm: namaKtm.trim(),
    p_bukti_penguat: buktiPenguat.filter((b) => PILIHAN_BUKTI_PENGUAT.includes(b)),
  });
  return error ? error.message : null;
}
