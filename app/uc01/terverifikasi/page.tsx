'use client';

// UC-01: halaman tujuan tautan verifikasi di email.
// Supabase memproses tautan dan mengaktifkan akun; halaman ini menampilkan hasilnya.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabase';
import '../uc01.css';

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
    <section className="view-content uc01-tengah">
      {keadaan.status === 'memuat' && <p className="uc01-info">Memeriksa tautan verifikasi...</p>}
      {keadaan.status === 'berhasil' && <>
        <span className="uc01-ikon-bulat hijau"><img src="/uc01/check-putih.svg" alt="" /></span>
        <h2>Akun Berhasil Diverifikasi</h2>
        <p>{keadaan.nama ? `Halo, ${keadaan.nama}! ` : ''}Akun FITS kamu sudah aktif dan siap digunakan.</p>
        <Link className="uc01-tombol" href="/">MASUK KE FITS</Link>
      </>}
      {keadaan.status === 'gagal' && <>
        <span className="uc01-ikon-bulat"><img src="/uc01/info-navy.svg" alt="" /></span>
        <h2>Tautan Tidak Berlaku</h2>
        <p>{keadaan.pesan}</p>
        <p>Daftar ulang atau minta tautan verifikasi baru dari Halaman Daftar.</p>
        <Link className="uc01-tombol" href="/uc01">Ke Halaman Daftar</Link>
      </>}
    </section>
  </main>;
}
