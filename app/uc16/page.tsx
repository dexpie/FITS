'use client';

// UC-16 Memperbarui Status Laporan: Halaman Petugas dan Halaman Pembaruan Status (insert page).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ambilDataPetugas, cekPetugas, JENIS_DOKUMENTASI, periksaDokumentasi, selesaikan, statusBerikutnya } from './repository';
import type { AksesPetugas, DataPetugas, JenisDokumentasi, Pekerjaan } from './types';
import './uc16.css';

const NAV = [['863b8.svg', 'Beranda', '/'], ['c3699.svg', 'Pekerjaan', '/uc16'], ['0685c.svg', 'Barang', '/uc15'], ['1d0ab.svg', 'Profil', '/uc02']];

function tanggal(nilai: string) {
  return new Date(nilai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
}

export default function HalamanPetugas() {
  const [akses, setAkses] = useState<AksesPetugas | null>(null);
  const [data, setData] = useState<DataPetugas | string | null>(null);
  const [dipilih, setDipilih] = useState<Pekerjaan | null>(null);
  const [status, setStatus] = useState('');
  const [jenis, setJenis] = useState<JenisDokumentasi | ''>('');
  const [berkas, setBerkas] = useState<File | null>(null);
  const [galat, setGalat] = useState<string[]>([]);
  const [hasil, setHasil] = useState<Pekerjaan | null>(null);
  const [proses, setProses] = useState(false);

  const muat = () => ambilDataPetugas().then(setData);
  useEffect(() => {
    cekPetugas().then((a) => { setAkses(a); if (a === 'petugas') muat(); });
  }, []);

  function bukaDetail(p: Pekerjaan) {
    setDipilih(p); setStatus(''); setJenis(''); setBerkas(null); setGalat([]);
  }

  async function simpan() {
    if (!dipilih) return;
    const galatIsian = periksaDokumentasi(status, jenis, berkas);
    setGalat(galatIsian);
    if (galatIsian.length || !berkas || !jenis) return;
    setProses(true);
    const pesan = await selesaikan(dipilih.id_klaim, jenis, berkas);
    setProses(false);
    if (pesan) { setGalat([pesan]); return; }
    setHasil(dipilih); setDipilih(null);
    muat();
  }

  const isi = typeof data === 'object' && data ? data : null;

  return <main className="view-phone uc16">
    <header className="view-header officer-header">
      {dipilih && <button className="back" aria-label="Kembali" onClick={() => setDipilih(null)}><img src="/uc16/6dca7.svg" alt="" /></button>}
      <h1>{dipilih ? 'Pembaruan Status' : 'Halaman Petugas'}</h1>
      {!dipilih && <span className="profile-icon"><img src="/uc16/76c33.svg" alt="Profil" /></span>}
    </header>

    {akses !== 'petugas' ? <section className="view-content officer-content">
      {akses === null && <p className="officer-note">Memeriksa akses...</p>}
      {akses === 'tanpa-konfigurasi' && <p className="officer-note">Konfigurasi Supabase belum tersedia.</p>}
      {akses === 'belum-masuk' && <p className="officer-note">Masuk dengan akun Petugas terlebih dahulu. <Link href="/uc02">Masuk</Link></p>}
      {akses === 'bukan-petugas' && <p className="uc16-galat" role="alert">Halaman ini khusus untuk Petugas.</p>}
    </section> : !dipilih ? <section className="view-content officer-content">
      <div className="greeting"><h2>Halo, Petugas!</h2><p>Pekerjaan serah terima barang</p></div>
      {typeof data === 'string' && <p className="uc16-galat" role="alert">{data}</p>}
      {hasil && <>
        <p className="uc16-berhasil" role="status">Status laporan berhasil diperbarui menjadi Selesai.</p>
        <article className="work-card claim-card">
          <strong>Hasil Pembaruan</strong>
          <div className="work-status"><span>{hasil.barang_nama} • {hasil.nomor_laporan}</span><span className="badge green">Selesai</span></div>
          <p>{hasil.pos_drop_off ?? 'Pos Drop-off'} • Klaim {hasil.nomor_pengajuan}</p>
        </article>
      </>}
      {isi && <>
        <div className="count-card"><strong>{isi.pekerjaan.length}</strong><b>Laporan Temuan Diklaim</b><img src="/uc16/3a01a.svg" alt="" /></div>
        <div className="stats">
          <div><strong>{isi.jumlah_tersedia}</strong><span>Barang Tersedia</span></div>
          <div><strong>{isi.jumlah_terverifikasi}</strong><span>Klaim Terverifikasi</span></div>
        </div>
        <Link href="/uc15" className="uc16-tautan">Verifikasi Klaim (UC-15)</Link>
        <div className="work-heading"><h2>Pekerjaan Menunggu</h2><span>{isi.pekerjaan.length} pekerjaan</span></div>
        {isi.pekerjaan.map((p) => <article className="work-card" key={p.id_klaim}>
          <div className="work-top"><div><h3>{p.barang_nama}</h3><p>{p.barang_kategori} • {p.lokasi}</p><p>{tanggal(p.tanggal_penemuan)}</p><p>{p.nomor_laporan}</p></div></div>
          <div className="work-status"><span className="badge blue">{p.status_laporan}</span><span>Klaim Terverifikasi</span></div>
          <strong className="claim-number">{p.nomor_pengajuan} • {p.pengaju_nama}</strong>
          <button className="work-button" onClick={() => bukaDetail(p)}>Detail Serah Terima</button>
        </article>)}
        {!isi.pekerjaan.length && <p className="officer-note">Tidak ada laporan yang menunggu serah terima.</p>}
      </>}
    </section> : <>
      <section className="view-content officer-content status-detail">
        <article className="work-card"><div className="work-top"><div>
          <h3>{dipilih.barang_nama}</h3><p>{dipilih.barang_kategori} • {dipilih.nomor_laporan}</p><span className="badge blue">{dipilih.status_laporan}</span>
        </div></div><p>{dipilih.lokasi} • {tanggal(dipilih.tanggal_penemuan)}</p></article>
        <article className="work-card claim-card"><strong>{dipilih.nomor_pengajuan}</strong>
          <div className="work-status"><span>Status Klaim</span><span className="badge green">Terverifikasi</span></div>
          <p>Pengklaim: {dipilih.pengaju_nama}</p><p>Diajukan {tanggal(dipilih.diajukan)}</p><strong>{dipilih.pos_drop_off ?? 'Pos Drop-off'}</strong></article>
        <article className="work-card claim-card">
          <div className="work-status"><span>Status Laporan Saat Ini</span><span className="badge blue">{dipilih.status_laporan}</span></div>
          <strong>Status Berikutnya</strong>
          {statusBerikutnya(dipilih.status_laporan) && <label className="status-choice">
            <input type="checkbox" checked={status === 'Selesai'} onChange={(e) => setStatus(e.target.checked ? 'Selesai' : '')} /> Selesai
          </label>}
        </article>
        <div className="documentation"><strong>Dokumentasi Serah Terima</strong>
          <select className="uc16-pilih" value={jenis} onChange={(e) => setJenis(e.target.value as JenisDokumentasi | '')}>
            <option value="">Pilih jenis dokumentasi</option>
            {JENIS_DOKUMENTASI.map((j) => <option key={j} value={j}>{j}</option>)}
          </select>
          <div className="documentation-box"><img src="/uc16/df8a6.svg" alt="" /><span>{berkas?.name || 'Belum ada dokumentasi'}</span>
            <label htmlFor="berkas-serah-terima">Unggah Dokumentasi</label>
            <input id="berkas-serah-terima" className="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setBerkas(e.target.files?.[0] ?? null)} /></div>
        </div>
        {galat.length > 0 && <ul className="uc16-galat" role="alert">{galat.map((g) => <li key={g}>{g}</li>)}</ul>}
      </section>
      <div className="status-actions">
        <button onClick={simpan} disabled={proses}>{proses ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
        <button onClick={() => setDipilih(null)}>Kembali</button>
      </div>
    </>}

    <nav className="view-nav officer-nav" aria-label="Navigasi petugas">{NAV.map(([ikon, label, href]) =>
      <Link key={label} href={href} className={label === 'Pekerjaan' ? 'active' : ''}><img src={'/uc16/' + ikon} alt="" /><span>{label}</span></Link>)}
    </nav>
  </main>;
}
