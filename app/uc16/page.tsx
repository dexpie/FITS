'use client';

import { useState } from 'react';

const nav = [['863b8.svg', 'Beranda'], ['c3699.svg', 'Pekerjaan'], ['0685c.svg', 'Barang'], ['1d0ab.svg', 'Profil']];

export default function HalamanPetugas() {
  const [showDetail, setShowDetail] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [saved, setSaved] = useState(false);
  return <main className="view-phone">
    <header className="view-header officer-header">{showDetail && <button className="back" aria-label="Kembali" onClick={() => setShowDetail(false)}><img src="/uc16/6dca7.svg" alt="" /></button>}<h1>{showDetail ? 'Pembaruan Status' : 'Halaman Petugas'}</h1>{!showDetail && <span className="profile-icon"><img src="/uc16/76c33.svg" alt="Profil" /></span>}</header>
    {!showDetail ? <section className="view-content officer-content">
      <div className="greeting"><h2>Halo, Petugas!</h2><p>Pos SKK — Gedung DSI</p></div>
      <div className="count-card"><strong>{saved ? '0' : '1'}</strong><b>Laporan Temuan Diklaim</b><img src="/uc16/3a01a.svg" alt="" /></div>
      <div className="stats"><div><strong>2</strong><span>Barang Tersedia</span></div><div><strong>1</strong><span>Klaim Terverifikasi</span></div></div>
      {saved ? <><p className="demo-confirmation" role="status">Pratinjau: status diubah menjadi Selesai. Data belum tersimpan di server.</p><div className="work-heading"><h2>Hasil Pembaruan</h2><span>0 pekerjaan menunggu</span></div><article className="work-card claim-card"><div className="work-top"><img src="/uc16/4e0f2.png" alt="Dompet kulit coklat" /><div><h3>Dompet kulit coklat</h3><p>LT-20260921-0044</p></div></div><div className="work-status"><span>Status Laporan</span><span className="badge green">Selesai</span></div><div className="work-status"><span>Status Klaim • KL-20260922-0018</span><span className="badge green">Terverifikasi</span></div><p>Pos SKK — Gedung DSI</p><p>Dokumentasi: {documentName}</p></article><article className="work-card claim-card"><strong>Riwayat Status</strong><p>Laporan Dibuat → Menunggu Penyerahan → Tersedia → Menunggu Verifikasi → Diklaim → Selesai</p></article><button className="work-button" onClick={() => setShowDetail(true)}>Lihat Detail Laporan</button></> : <><div className="work-heading"><h2>Pekerjaan Menunggu</h2><span>1 pekerjaan</span></div>
      <article className="work-card"><div className="work-top"><img src="/uc16/4e0f2.png" alt="Dompet kulit coklat" /><div><h3>Dompet kulit coklat</h3><p>Dompet/KTP • DSI Lantai 2</p><p>21 September 2026</p><p>LT-20260921-0044</p></div></div>
        <div className="work-status"><span className="badge blue">Diklaim</span><span>Klaim Terverifikasi</span></div><strong className="claim-number">KL-20260922-0018</strong>
        <button className="work-button" onClick={() => setShowDetail(true)}>Detail Serah Terima</button>
      </article>
      <p className="officer-note">Periksa barang dan dokumentasi penyerahan sebelum menyelesaikan laporan.</p>
      </>}
    </section> : <><section className="view-content officer-content status-detail">
      <article className="work-card"><div className="work-top"><img src="/uc16/4e0f2.png" alt="Dompet kulit coklat" /><div><h3>Dompet kulit coklat</h3><p>Dompet/KTP • LT-20260921-0044</p><span className="badge blue">Diklaim</span></div></div><p>DSI Lantai 2 • 21 September 2026</p></article>
      <article className="work-card claim-card"><strong>KL-20260922-0018</strong><div className="work-status"><span>Status Klaim</span><span className="badge green">Terverifikasi</span></div><p>Diajukan 22 Sep 2026, 09.00 WIB</p><p>Terverifikasi 22 Sep 2026, 10.00 WIB</p><strong>Pos SKK — Gedung DSI</strong></article>
      <article className="work-card claim-card"><div className="work-status"><span>Status Laporan Saat Ini</span><span className="badge blue">Diklaim</span></div><strong>Status Berikutnya</strong><label className="status-choice"><input type="checkbox" checked={completed} onChange={e => setCompleted(e.target.checked)} /> Selesai</label></article>
      <div className="documentation"><strong>Dokumentasi Serah Terima</strong><div className="documentation-box"><img src="/uc16/df8a6.svg" alt="" /><span>{documentName || 'Belum ada dokumentasi'}</span><label htmlFor="handover-file">Unggah Dokumentasi</label><input id="handover-file" className="file" type="file" accept="image/*,application/pdf" onChange={e => setDocumentName(e.target.files?.[0]?.name || '')} /></div></div>
    </section><div className="status-actions"><button disabled={!completed || !documentName} onClick={() => { setSaved(true); setShowDetail(false); }}>Simpan Perubahan</button><button onClick={() => setShowDetail(false)}>Kembali</button></div></>}
    <nav className="view-nav officer-nav" aria-label="Navigasi petugas">{nav.map(([icon,label]) => <div key={label} className={label === 'Pekerjaan' ? 'active' : ''}><img src={'/uc16/' + icon} alt="" /><span>{label}</span></div>)}</nav>
  </main>;
}
