'use client';

// UC-08 Memantau Status Laporan: Halaman Laporan Saya (view page).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { alamatFoto, ambilLaporanSaya, tanggal, warnaStatus } from './repository';
import type { Hasil, JenisLaporan, LaporanSaya } from './types';
import './uc08.css';

const JENIS: (JenisLaporan | 'Semua')[] = ['Semua', 'Kehilangan', 'Temuan'];
const NAV = [['c9713.svg', 'Beranda', '/'], ['d872e.svg', 'Laporan', '/uc08'], ['bf7bc.svg', 'Temuan', '/uc12'], ['5c528.svg', 'Profil', '/uc02']];

export default function LaporanSayaPage() {
  const [jenis, setJenis] = useState<JenisLaporan | 'Semua'>('Semua');
  const [status, setStatus] = useState('Semua');
  const [daftarStatus, setDaftarStatus] = useState<string[]>([]);
  const [hasil, setHasil] = useState<Hasil<LaporanSaya[]> | null>(null);
  const [foto, setFoto] = useState<Record<string, string>>({});

  // Pilihan status diambil dari status yang memang dimiliki laporan akun ini.
  useEffect(() => {
    ambilLaporanSaya(null, null).then((h) => {
      if (h.status === 'ok') setDaftarStatus([...new Set(h.data.map((l) => l.status_laporan))].sort());
    });
  }, []);

  useEffect(() => {
    setHasil(null);
    ambilLaporanSaya(status === 'Semua' ? null : status, jenis === 'Semua' ? null : jenis).then(async (h) => {
      setHasil(h);
      if (h.status !== 'ok') return;
      const pasangan = await Promise.all(h.data.map(async (l) => [l.id, await alamatFoto(l.jenis, l.foto_barang)] as const));
      setFoto(Object.fromEntries(pasangan.filter(([, url]) => url)) as Record<string, string>);
    });
  }, [jenis, status]);

  const daftar = hasil?.status === 'ok' ? hasil.data : [];

  return <main className="view-phone uc08">
    <header className="view-header"><Link href="/" aria-label="Kembali"><img src="/uc08/5ce6a.svg" alt="" /></Link><h1>Laporan Saya</h1></header>
    <section className="view-content">
      {hasil?.status === 'belum-masuk' ? <div className="uc08-kosong">
        <p>Masuk terlebih dahulu untuk melihat laporanmu.</p>
        <Link href="/uc02" className="uc08-tombol">Masuk</Link>
      </div> : <>
        <div className="filter-group"><span>Jenis laporan</span><div className="pills">
          {JENIS.map((x) => <button key={x} className={jenis === x ? 'chosen' : ''} onClick={() => setJenis(x)}>{x}</button>)}
        </div></div>
        <div className="filter-group"><span>Status</span><div className="pills">
          {['Semua', ...daftarStatus].map((x) => <button key={x} className={status === x ? 'chosen' : ''} onClick={() => setStatus(x)}>{x}</button>)}
        </div></div>
        {!hasil && <p className="no-results">Memuat laporan...</p>}
        {hasil?.status === 'galat' && <p className="no-results uc08-merah" role="alert">{hasil.pesan}</p>}
        {hasil?.status === 'ok' && <>
          <div className="results-count"><span>{daftar.length} LAPORAN</span><b>Terbaru</b></div>
          {daftar.map((l) => <article className="report-card" key={l.jenis + l.id}>
            <div className="report-top">
              <img className="report-photo" src={foto[l.id] ?? '/uc08/no-photo.svg'} alt={l.barang_nama} />
              <div><h2>{l.barang_nama}</h2><p>Jenis Laporan: {l.jenis}</p><strong>{l.nomor_laporan}</strong><p>{tanggal(l.tanggal ?? l.created_at)}</p></div>
            </div>
            <div className="report-bottom">
              <span className={'badge ' + warnaStatus(l.status_laporan)}>{l.status_laporan}</span>
              <Link href={`/uc08/${l.id}?jenis=${l.jenis}`}>Detail <img src="/uc08/8c878.svg" alt="" /></Link>
            </div>
          </article>)}
          {!daftar.length && <div className="uc08-kosong"><img src="/uc08/empty-reports.svg" alt="" /><p>Belum Ada Laporan</p></div>}
        </>}
      </>}
    </section>
    <nav className="view-nav" aria-label="Navigasi">{NAV.map(([ikon, label, href]) =>
      <Link key={label} href={href} className={label === 'Laporan' ? 'active' : ''}><img src={'/uc08/' + ikon} alt="" /><span>{label}</span></Link>)}
    </nav>
  </main>;
}
