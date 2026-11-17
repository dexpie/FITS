// UC-01 Daftar ke Akun FITS: aturan isian dan akses Supabase.
// Akun dibuat lewat Supabase Auth. Nama dan NRP ikut dikirim sebagai data pendaftaran,
// lalu trigger buat_profil_uc01 (database/sql/uc01_daftar_akun.sql) membuat baris profil.
import { supabase } from '../supabase';
import type { GalatIsian, HasilDaftar, IsianDaftar } from './types';

export const PANJANG_MINIMAL_SANDI = 8;
const POLA_EMAIL_ITS = /^[^@\s]+@(its\.ac\.id|mhs\.its\.ac\.id)$/i;
const POLA_NRP = /^[0-9]{10}$/;

export function isEmailITS(email: string): boolean {
  return POLA_EMAIL_ITS.test(email.trim());
}

export function isKataSandiValid(kataSandi: string, ulangan: string): boolean {
  return kataSandi.length >= PANJANG_MINIMAL_SANDI && kataSandi === ulangan;
}

// periksaKelengkapan() lalu pemeriksaan format, urut seperti sequence diagram UC-01.
export function periksaIsian(isian: IsianDaftar): GalatIsian {
  const galat: GalatIsian = {};
  if (!isian.nama.trim()) galat.nama = 'Nama wajib diisi.';
  if (!isian.nrp.trim()) galat.nrp = 'NRP wajib diisi.';
  if (!isian.email.trim()) galat.email = 'Email ITS wajib diisi.';
  if (!isian.kataSandi) galat.kataSandi = 'Kata sandi wajib diisi.';
  if (!isian.ulangan) galat.ulangan = 'Ulangi kata sandi wajib diisi.';
  if (Object.keys(galat).length) return galat;

  if (!POLA_NRP.test(isian.nrp.trim())) galat.nrp = 'NRP harus 10 digit angka.';
  if (!isEmailITS(isian.email)) galat.email = 'Gunakan alamat email ITS (@its.ac.id atau @mhs.its.ac.id).';
  if (!isKataSandiValid(isian.kataSandi, isian.ulangan)) {
    if (isian.kataSandi.length < PANJANG_MINIMAL_SANDI) {
      galat.kataSandi = `Kata sandi belum memenuhi ketentuan panjang minimal (${PANJANG_MINIMAL_SANDI} karakter).`;
    }
    if (isian.kataSandi !== isian.ulangan) galat.ulangan = 'Ulangan kata sandi harus sama.';
  }
  return galat;
}

// Tautan verifikasi di email mengarah ke halaman ini.
function alamatVerifikasi(): string {
  return `${window.location.origin}/uc01/terverifikasi`;
}

// isTerpakai(nrp) -> daftar() -> terbitkanTautanVerifikasi() -> kirimKeEmail() (dikerjakan Supabase Auth)
export async function daftarAkun(isian: IsianDaftar): Promise<HasilDaftar> {
  if (!supabase) return { status: 'galat', pesan: 'Konfigurasi Supabase belum tersedia.' };
  const email = isian.email.trim().toLowerCase();
  const nrp = isian.nrp.trim();

  const { data: terpakai, error: galatCek } = await supabase.rpc('nrp_terpakai_uc01', { p_nrp: nrp });
  if (galatCek) return { status: 'galat', pesan: 'Pendaftaran gagal diproses. Coba lagi beberapa saat lagi.' };
  if (terpakai) {
    return { status: 'galat', pesan: 'NRP atau email ITS sudah digunakan oleh akun lain.', galat: { nrp: 'NRP sudah digunakan.' } };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: isian.kataSandi,
    options: { data: { nama: isian.nama.trim(), nrp }, emailRedirectTo: alamatVerifikasi() },
  });
  // Supabase tidak memberi galat untuk email yang sudah terdaftar; identities kosong menandakannya.
  const emailTerpakai = /already registered/i.test(error?.message ?? '') || (data.user && data.user.identities?.length === 0);
  if (emailTerpakai) {
    return { status: 'galat', pesan: 'NRP atau email ITS sudah digunakan oleh akun lain.', galat: { email: 'Email sudah digunakan.' } };
  }
  if (error) return { status: 'galat', pesan: 'Pendaftaran gagal: ' + error.message };
  return { status: 'berhasil', email };
}

// Alternate 5: kirim ulang tautan verifikasi. Supabase hanya memberlakukan tautan terbaru.
export async function kirimUlangTautan(email: string): Promise<string | null> {
  if (!supabase) return 'Konfigurasi Supabase belum tersedia.';
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: alamatVerifikasi() } });
  return error ? 'Tautan belum bisa dikirim ulang: ' + error.message : null;
}
