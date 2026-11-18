import { describe, expect, test } from 'vitest';
import { isKonfigurasiSupabaseSiap } from './konfigurasi';

describe('isKonfigurasiSupabaseSiap', () => {
  test('nilai placeholder dari .env.example belum siap', () => {
    expect(isKonfigurasiSupabaseSiap('https://ganti-dengan-project-ref.supabase.co', 'ganti-dengan-publishable-key')).toBe(false);
  });

  test('env kosong belum siap', () => {
    expect(isKonfigurasiSupabaseSiap(undefined, undefined)).toBe(false);
  });

  test('URL tanpa kunci belum siap', () => {
    expect(isKonfigurasiSupabaseSiap('https://abcdefghijklmnop.supabase.co', '')).toBe(false);
  });

  test('URL yang bukan https belum siap', () => {
    expect(isKonfigurasiSupabaseSiap('abcdefghijklmnop', 'sb_publishable_abc123')).toBe(false);
  });

  test('URL project dan kunci asli dianggap siap', () => {
    expect(isKonfigurasiSupabaseSiap('https://abcdefghijklmnop.supabase.co', 'sb_publishable_abc123')).toBe(true);
  });
});
