// UC-09 Menerima Notifikasi: akses Supabase.
// Tabel notifikasi hanya bisa dibaca pemiliknya (RLS); menandai dibaca lewat fungsi tandai_dibaca_uc09.
import { supabase } from '../supabase';
import type { HasilNotifikasi, Notifikasi } from './types';

const KOLOM = 'id,jenis,pesan,id_laporan_kehilangan,id_laporan_temuan,id_klaim,sudah_dibaca,status_pengiriman,created_at';

// tekanIkonNotifikasi() -> daftar = ambilNotifikasi()
export async function ambilNotifikasi(): Promise<HasilNotifikasi> {
  if (!supabase) return { status: 'galat', pesan: 'Konfigurasi Supabase belum tersedia.' };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'belum-masuk' };

  // Pemeriksaan berkala juga dijadwalkan pg_cron; dipanggil di sini supaya peringatan N4 tidak menunggu jadwal.
  await supabase.rpc('kirim_peringatan_kadaluarsa_uc09');

  const { data, error } = await supabase.from('notifikasi').select(KOLOM).order('created_at', { ascending: false });
  if (error) return { status: 'galat', pesan: 'Notifikasi belum bisa dimuat: ' + error.message };
  return { status: 'ok', daftar: (data ?? []) as Notifikasi[] };
}

export function hitungBelumDibaca(daftar: Notifikasi[]): number {
  return daftar.filter((n) => !n.sudah_dibaca).length;
}

// pilihNotifikasi() -> tandaiDibaca() -> tujuan = ambilHalamanTujuan()
export async function bukaNotifikasi(notifikasi: Notifikasi): Promise<string> {
  if (supabase && !notifikasi.sudah_dibaca) {
    await supabase.rpc('tandai_dibaca_uc09', { p_id: notifikasi.id });
  }
  return ambilHalamanTujuan(notifikasi);
}

// Notifikasi laporan -> Detail Laporan Saya (UC-08); notifikasi klaim -> Barang Temuan (UC-12).
export function ambilHalamanTujuan(notifikasi: Notifikasi): string {
  if (notifikasi.id_laporan_kehilangan) return `/uc08/${notifikasi.id_laporan_kehilangan}?jenis=Kehilangan`;
  if (notifikasi.id_laporan_temuan) return `/uc08/${notifikasi.id_laporan_temuan}?jenis=Temuan`;
  if (notifikasi.id_klaim) return '/uc12';
  return '/uc09';
}
