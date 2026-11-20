import { formatTanggal, isDapatDiklaim } from './laporan-temuan';
import type { BuktiPendukung, HasilPeriksaPengajuan, Klaim, PertanyaanPublik, StatusLaporan } from './tipe';

// UC-13: urutan pemeriksaan
export function periksaPengajuanKlaim(masukan: { statusLaporan: StatusLaporan; milikSendiri: boolean; klaimLama: Klaim | null }): HasilPeriksaPengajuan {
  if (!isDapatDiklaim(masukan.statusLaporan)) return { hasil: 'tidak-dapat-diklaim' };
  if (masukan.milikSendiri) return { hasil: 'milik-sendiri' };
  if (masukan.klaimLama?.status === 'Diajukan') return { hasil: 'sudah-diajukan', klaim: masukan.klaimLama };
  return { hasil: 'lanjut' };
}

// UC-13: database memeriksa ulang saat Kirim Jawaban. Pesan harus sama dengan raise exception di ajukan_klaim_uc14.
const PENOLAKAN_KLAIM: Record<string, 'milik-sendiri' | 'sudah-diajukan' | 'tidak-dapat-diklaim'> = {
  'Tidak dapat mengklaim laporan sendiri': 'milik-sendiri',
  'Klaim sudah diajukan': 'sudah-diajukan',
  'tidak-dapat-diklaim': 'tidak-dapat-diklaim',
};

export function tafsirkanPenolakanKlaim(pesan: string) {
  return PENOLAKAN_KLAIM[pesan] ?? null;
}

// UC-14: mengembalikan id Pertanyaan Verifikasi yang jawabannya masih kosong.
export function periksaKelengkapan(pertanyaan: PertanyaanPublik[], jawaban: Record<string, string>) {
  return pertanyaan.filter(p => !jawaban[p.id]?.trim()).map(p => p.id);
}

export function terbitkanNomorPengajuan(tanggal: string, urutan: number) {
  return `KL-${tanggal.replaceAll('-', '')}-${String(urutan).padStart(4, '0')}`;
}

export function isBerkasBuktiValid(tipeBerkas: string) {
  return tipeBerkas.startsWith('image/') || tipeBerkas === 'application/pdf';
}

// Jawaban disimpan apa adanya. Sistem tidak menilai benar atau salahnya (FR-21).
export function buatKlaim(masukan: {
  nomorPengajuanKlaim: string;
  idLaporan: string;
  waktuPengajuan: string;
  pertanyaan: PertanyaanPublik[];
  jawaban: Record<string, string>;
  bukti: BuktiPendukung[];
}): Klaim {
  if (periksaKelengkapan(masukan.pertanyaan, masukan.jawaban).length) throw new Error('Jawaban Verifikasi belum lengkap');
  return {
    nomorPengajuanKlaim: masukan.nomorPengajuanKlaim,
    idLaporan: masukan.idLaporan,
    waktuPengajuan: masukan.waktuPengajuan,
    status: 'Diajukan',
    jawaban: [...masukan.pertanyaan].sort((a, b) => a.urutan - b.urutan).map(p => ({ idPertanyaan: p.id, isiJawaban: masukan.jawaban[p.id] })),
    bukti: masukan.bukti,
  };
}

const SELISIH_WIB = 7 * 60 * 60 * 1000;

export function tanggalWib(waktuIso: string) {
  return new Date(new Date(waktuIso).getTime() + SELISIH_WIB).toISOString().slice(0, 10);
}

export function formatWaktuPengajuan(waktuIso: string) {
  const wib = new Date(new Date(waktuIso).getTime() + SELISIH_WIB).toISOString();
  return `${formatTanggal(wib.slice(0, 10), 'panjang')}, ${wib.slice(11, 13)}.${wib.slice(14, 16)} WIB`;
}
