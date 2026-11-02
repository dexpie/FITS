'use client';

import { useState } from 'react';

const reports = [
  { name: 'Dompet kulit coklat', type: 'Kehilangan', id: 'LH-20260921-0042', status: 'Aktif', image: '4e0f2.png' },
  { name: 'Dompet hitam', type: 'Temuan', id: 'LT-20260921-0043', status: 'Menunggu Penyerahan', image: '94200.png' },
];
const nav = [['c9713.svg', 'Beranda'], ['d872e.svg', 'Laporan'], ['bf7bc.svg', 'Temuan'], ['5c528.svg', 'Profil']];

export default function LaporanSaya() {
  const [type, setType] = useState('Semua');
  const [status, setStatus] = useState('Semua');
  const [detail, setDetail] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const visible = reports.filter(item => (type === 'Semua' || item.type === type) && (status === 'Semua' || item.status === status));
  const selected = reports.find(item => item.id === detail);
  return <main className="view-phone">
    <header className="view-header">{selected ? <button className="back" aria-label="Kembali ke daftar laporan" onClick={() => { setDetail(null); setHistory(false); }}><img src="/uc08/5ce6a.svg" alt="" /></button> : <a href="/" aria-label="Kembali"><img src="/uc08/5ce6a.svg" alt="" /></a>}<h1>{selected ? 'Detail Laporan' : 'Laporan Saya'}</h1></header>
    {!selected ? <section className="view-content">
      <div className="filter-group"><span>Jenis laporan</span><div className="pills">{['Semua', 'Kehilangan', 'Temuan'].map(x => <button key={x} className={type === x ? 'chosen' : ''} onClick={() => setType(x)}>{x}</button>)}</div></div>
      <div className="filter-group"><span>Status</span><div className="pills">{['Semua', 'Aktif', 'Menunggu Penyerahan', 'Batal'].map(x => <button key={x} className={status === x ? 'chosen' : ''} onClick={() => setStatus(x)}>{x}</button>)}</div></div>
      <div className="results-count"><span>{visible.length} LAPORAN</span><b>Terbaru</b></div>
      {visible.map(item => <article className="report-card" key={item.id}>
        <div className="report-top"><img className="report-photo" src={'/uc08/' + item.image} alt={item.name} /><div><h2>{item.name}</h2><p>Jenis Laporan: {item.type}</p><strong>{item.id}</strong><p>21 September 2026</p></div></div>
        <div className="report-bottom"><span className={'badge ' + (item.status === 'Aktif' ? 'green' : 'yellow')}>{item.status}</span><button onClick={() => setDetail(item.id)}>Detail <img src="/uc08/8c878.svg" alt="" /></button></div>
      </article>)}
      {!visible.length && <p className="no-results">Tidak ada laporan untuk filter ini.</p>}
    </section> : <section className="view-content report-detail">
      <article className="detail-card"><div className="report-top"><img className="report-photo" src={'/uc08/' + selected.image} alt={selected.name} /><div><h2>{selected.name}</h2><p>{selected.type} • Dompet/KTP</p>{selected.type === 'Temuan' && <><p>DSI Lantai 2</p><p>21 Sep 2026 • 14.20 WIB</p></>}<span className={'badge ' + (selected.status === 'Aktif' ? 'green' : 'yellow')}>{selected.status}</span></div></div>{selected.type === 'Temuan' && <div className="detail-number"><span>Nomor laporan</span><strong>{selected.id}</strong></div>}</article>
      {selected.type === 'Kehilangan' ? <article className="detail-card info-card"><div><span>Nomor laporan</span><strong>{selected.id}</strong></div><div className="info-row"><div><span>Kategori</span><strong>Dompet/KTP</strong></div><div><span>Tanggal kehilangan</span><strong>21 September 2026</strong></div></div><div><span>Rute kehilangan</span><strong>DSI Lantai 2 / Perpustakaan / Masjid Manarul Ilmi</strong></div><div className="detail-number"><span>Aktif sampai</span><strong>21 Oktober 2026</strong></div></article> : <>
        <article className="handover-notice"><img src="/uc08/1d73d.svg" alt="" /><div><strong>Antar barang ke pos sebelum batas waktu</strong><span>24 jam sejak laporan dibuat</span><b>22 Sep 2026, 14.20 WIB</b></div></article>
        <article className="detail-card dropoff"><h2>Pos Drop-off</h2><div className="dropoff-row"><span className="dropoff-icon"><img src="/uc08/9a5d9.svg" alt="" /></span><div><strong>Pos SKK — Gedung DSI</strong><p>350 m • Buka 08.00–16.00 WIB</p></div><button type="button" onClick={() => setHistory(true)}>Navigasi</button></div>{history && <p className="detail-text">Navigasi peta belum tersedia pada versi contoh.</p>}</article>
      </>}
      <article className="detail-card history-card"><h2>Riwayat Status</h2><div className="history-item"><img src="/uc08/92b85.svg" alt="" /><div><strong>Laporan Dibuat</strong><p>21 Sep 2026, 14.20 WIB — Pengguna</p></div></div>{selected.type === 'Temuan' && <div className="history-item"><img src="/uc08/92b85.svg" alt="" /><div><strong>Menunggu Penyerahan</strong><p>21 Sep 2026, 14.20 WIB — Sistem</p></div></div>}{selected.type === 'Kehilangan' && <><button className="history-button" onClick={() => setHistory(!history)}>{history ? 'Tutup Riwayat' : 'Lihat Riwayat Lengkap'}<img src="/uc08/9221c.svg" alt="" /></button>{history && <p className="detail-text">Belum ada perubahan status lain pada data contoh.</p>}</>}</article>
    </section>}
    <nav className="view-nav" aria-label="Navigasi">{nav.map(([icon,label]) => <div key={label} className={label === 'Laporan' ? 'active' : ''}><img src={'/uc08/' + icon} alt="" /><span>{label}</span></div>)}</nav>
  </main>;
}
