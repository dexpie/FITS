'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { kunciLoginBeranda, supabase } from '../supabase';

export function SapaanBeranda() {
  const [akun, setAkun] = useState<{ id: string; nama: string } | null | undefined>(undefined);
  const [akunBaruMasuk, setAkunBaruMasuk] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, sesi) => {
      const pengguna = sesi?.user;
      const nama = pengguna?.user_metadata.nama;
      setAkun(pengguna ? { id: pengguna.id, nama: typeof nama === 'string' ? nama.trim() : '' } : null);

      const loginTerakhir = sessionStorage.getItem(kunciLoginBeranda);
      if (loginTerakhir && pengguna?.id === loginTerakhir) {
        setAkunBaruMasuk(loginTerakhir);
        sessionStorage.removeItem(kunciLoginBeranda);
      }
      if (!pengguna) setAkunBaruMasuk(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>
    <div className="home-greeting">
      <h1>{akun?.nama ? `Halo, ${akun.nama}!` : 'Selamat datang di FITS'}</h1>
      {akun ? <p>Selamat datang kembali di FITS.</p> : (akun === null || !supabase) && <p><Link href="/uc02">Masuk ke akun FITS</Link></p>}
    </div>
    {akun && akun.id === akunBaruMasuk && <p className="home-success" role="status"><span aria-hidden="true">✓</span>Kamu berhasil masuk ke akun FITS.</p>}
  </>;
}
