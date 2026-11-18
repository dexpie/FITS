import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isKonfigurasiSupabaseSiap } from './konfigurasi';

// Next.js hanya menyisipkan env NEXT_PUBLIC_* bila ditulis utuh seperti ini.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const kunci = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseSiap() {
  return isKonfigurasiSupabaseSiap(url, kunci);
}

let klien: SupabaseClient | null = null;

export function ambilKlienSupabase(): SupabaseClient {
  if (!isSupabaseSiap()) throw new Error('Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local.');
  klien ??= createClient(url!, kunci!);
  return klien;
}
