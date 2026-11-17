'use client';

// UC-01: halaman tujuan tautan verifikasi di email.
// Supabase memproses tautan dan mengaktifkan akun; halaman ini menampilkan hasilnya.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabase';

type Keadaan = { status: 'memuat' } | { status: 'berhasil'; nama: string } | { status: 'gagal'; pesan: string };

export default function Terverifikasi() {
  const [keadaan, setKeadaan] = useState<Keadaan>({ status: 'memuat' });

  useEffect(() => {
    const client = supabase;
    if (!client) { setKeadaan({ status: 'gagal', pesan: 'Konfigurasi Supabase belum tersedia.' }); return; }
    // Alternate 6: tautan kedaluwarsa atau sudah dipakai dikirim Supabase sebagai error di alamat.
    const parameter = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
    const galat = parameter.get('error_description');
    if (galat) { setKeadaan({ status: 'gagal', pesan: galat.replace(/\+/g, ' ') }); return; }

    const tampilkan = (nama: unknown) => setKeadaan({ status: 'berhasil', nama: String(nama || '') });
    const { data: langganan } = client.auth.onAuthStateChange((_, sesi) => {
      if (sesi?.user) tampilkan(sesi.user.user_metadata?.nama);
    });
    client.auth.getSession().then(({ data }) => {
      if (data.session?.user) tampilkan(data.session.user.user_metadata?.nama);
      else setTimeout(() => setKeadaan((k) => k.status === 'memuat'
        ? { status: 'gagal', pesan: 'Tautan verifikasi tidak berlaku atau sudah dipakai.' } : k), 3000);
    });
    return () => langganan.subscription.unsubscribe();
  }, []);

  return <main className="view-phone uc01">
    <header className="view-header"><h1>Verifikasi Akun</h1></header>
    <section className="view-content items-center justify-center text-center [&_h2]:mt-2 [&_h2]:mb-0 [&_h2]:text-[#073a75] [&_p]:m-0 [&_p]:text-[13px] [&_p]:text-gray-600">
      {keadaan.status === 'memuat' && <p className="m-0 text-xs text-gray-600 ">Memeriksa tautan verifikasi...</p>}
      {keadaan.status === 'berhasil' && <>
        <span className="grid h-16 w-16 place-items-center rounded-full bg-green-600 [&_img]:h-[30px] [&_img]:w-[30px]"><img src="/uc01/check-putih.svg" alt="" /></span>
        <h2>Akun Berhasil Diverifikasi</h2>
        <p>{keadaan.nama ? `Halo, ${keadaan.nama}! ` : ''}Akun FITS kamu sudah aktif dan siap digunakan.</p>
        <Link className="grid h-12 cursor-pointer place-items-center rounded-lg border-0 bg-[#ffcc29] text-sm font-bold text-gray-800 no-underline disabled:cursor-wait disabled:bg-[#e1e4e9] disabled:text-gray-500 mt-3 w-full" href="/">MASUK KE FITS</Link>
      </>}
      {keadaan.status === 'gagal' && <>
        <span className="grid h-16 w-16 place-items-center rounded-full bg-[#edf3fa] [&_img]:h-[30px] [&_img]:w-[30px]"><img src="/uc01/info-navy.svg" alt="" /></span>
        <h2>Tautan Tidak Berlaku</h2>
        <p>{keadaan.pesan}</p>
        <p>Daftar ulang atau minta tautan verifikasi baru dari Halaman Daftar.</p>
        <Link className="grid h-12 cursor-pointer place-items-center rounded-lg border-0 bg-[#ffcc29] text-sm font-bold text-gray-800 no-underline disabled:cursor-wait disabled:bg-[#e1e4e9] disabled:text-gray-500 mt-3 w-full" href="/uc01">Ke Halaman Daftar</Link>
      </>}
    </section>
  </main>;
}
