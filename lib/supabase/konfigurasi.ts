// Nilai di .env.example memuat penanda ini. Selama penanda masih ada, Supabase dianggap belum tersambung.
const PENANDA_PLACEHOLDER = 'ganti-dengan';

export function isKonfigurasiSupabaseSiap(url: string | undefined, kunci: string | undefined) {
  if (!url || !kunci) return false;
  if (url.includes(PENANDA_PLACEHOLDER) || kunci.includes(PENANDA_PLACEHOLDER)) return false;
  return url.startsWith('https://');
}
