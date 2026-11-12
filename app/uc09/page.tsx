'use client';

// UC-09 Menerima Notifikasi: Halaman Notifikasi (view page).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ambilNotifikasi, bukaNotifikasi, hitungBelumDibaca } from './repository';
import type { HasilNotifikasi, JenisNotifikasi, Notifikasi } from './types';
import './uc09.css';

// Pembeda visual tiap jenis notifikasi
const TAMPILAN: Record<JenisNotifikasi, { judul: string; ikon: string; kelas: string }> = {
  'Tanggal Kadaluarsa': { judul: 'Masa Aktif Laporan Hampir Berakhir', ikon: 'notif-kadaluarsa', kelas: 'kuning' },
  'Hasil Verifikasi Klaim': { judul: 'Hasil Verifikasi Klaim', ikon: 'notif-klaim', kelas: 'hijau' },
  'Kecocokan Baru': { judul: 'Barang Serupa Ditemukan!', ikon: 'notif-kecocokan', kelas: 'biru' },
  'Perubahan Status': { judul: 'Status Barang Diperbarui', ikon: 'notif-status', kelas: 'abu' },
};

function waktuPendek(waktu: string) {
  return new Date(waktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

export default function HalamanNotifikasi() {
  const router = useRouter();
  const [hasil, setHasil] = useState<HasilNotifikasi | null>(null);

  useEffect(() => { ambilNotifikasi().then(setHasil); }, []);

  async function pilih(notifikasi: Notifikasi) {
    router.push(await bukaNotifikasi(notifikasi));
  }

  const daftar = hasil?.status === 'ok' ? hasil.daftar : [];
  const belumDibaca = hitungBelumDibaca(daftar);

  return <main className="view-phone uc09">
    <header className="view-header">
      <Link href="/" aria-label="Kembali ke Beranda"><img src="/uc09/arrow-left.svg" alt="" /></Link>
      <h1>Notifikasi</h1>
      {belumDibaca > 0 && <span className="uc09-penanda" aria-label={`${belumDibaca} belum dibaca`}>{belumDibaca > 9 ? '9+' : belumDibaca}</span>}
    </header>
    <section className="view-content">
      {!hasil && <p className="uc09-info">Memuat notifikasi...</p>}
      {hasil?.status === 'belum-masuk' && <div className="uc09-kosong">
        <p>Masuk terlebih dahulu untuk melihat notifikasi.</p>
        <Link href="/uc02" className="uc09-tombol">Masuk</Link>
      </div>}
      {hasil?.status === 'galat' && <p className="uc09-info merah" role="alert">{hasil.pesan}</p>}
      {hasil?.status === 'ok' && <>
        {daftar.some((n) => n.status_pengiriman === 'Izin Nonaktif') && <div className="uc09-banner">
          <img src="/uc09/info-navy.svg" alt="" />
          <div>
            <strong>Notifikasi Perangkat Dinonaktifkan</strong>
            <p>Kamu tidak menerima notifikasi di perangkat, tetapi semua pemberitahuan FITS tetap tersedia di halaman ini.</p>
          </div>
        </div>}
        <p className="uc09-info">{daftar.length} notifikasi, {belumDibaca} belum dibaca</p>
        {!daftar.length && <p className="uc09-info">Belum ada notifikasi.</p>}
        {daftar.map((n) => {
          const t = TAMPILAN[n.jenis];
          return <button type="button" key={n.id} className={'uc09-kartu' + (n.sudah_dibaca ? ' dibaca' : '')} onClick={() => pilih(n)}>
            <span className={'uc09-kategori ' + t.kelas}><img src={`/uc09/${t.ikon}.svg`} alt="" /></span>
            <span className="uc09-isi">
              <strong>{t.judul}</strong>
              <span>{n.pesan}</span>
              <small>{waktuPendek(n.created_at)}</small>
            </span>
            {n.sudah_dibaca
              ? <img className="uc09-arah" src="/uc09/notif-chevron.svg" alt="" />
              : <img className="uc09-arah" src="/uc09/notif-belum-dibaca.svg" alt="Belum dibaca" />}
          </button>;
        })}
      </>}
    </section>
  </main>;
}
