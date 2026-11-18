import { ambilKlienSupabase } from '../supabase/klien';
import { RepositoriSupabase } from './repositori-supabase';
import type { BuktiPendukung, InfoPublik, Klaim, PertanyaanPublik, PosDropOff } from './tipe';

export type DetailKlaim = { klaim: Klaim; info: InfoPublik; posDropOff: PosDropOff };
export type LampiranBukti = BuktiPendukung & { berkas?: Blob };

// Kontrak data UC-12 sampai UC-14. Tampilan hanya bicara ke kontrak ini, bukan ke sumber datanya.
export interface RepositoriFits {
  ambilDaftarPublik(): Promise<InfoPublik[]>;
  ambilKategori(): Promise<string[]>;
  ambilLokasi(): Promise<string[]>;
  ambilLaporanPublik(idLaporan: string): Promise<{ info: InfoPublik; milikSendiri: boolean } | null>;
  ambilPertanyaan(idLaporan: string): Promise<PertanyaanPublik[]>;
  cariKlaimDiajukan(idLaporan: string): Promise<Klaim | null>;
  ajukanKlaim(idLaporan: string, jawaban: Record<string, string>, bukti: LampiranBukti[]): Promise<Klaim>;
  ambilDetailKlaim(nomorPengajuanKlaim: string): Promise<DetailKlaim | null>;
}

let repositori: RepositoriFits | null = null;

// Galat bila .env.local belum berisi URL dan kunci Supabase.
export function ambilRepositori(): RepositoriFits {
  repositori ??= new RepositoriSupabase(ambilKlienSupabase());
  return repositori;
}
