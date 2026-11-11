'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../supabase';
import './laporan.css';

type Laporan = {
  id: string;
  nomor_laporan: string;
  barang_nama: string;
  barang_kategori: string;
  deskripsi: string;
  lokasi: string;
  tanggal: string | null;
  status_laporan: string;
  created_at: string;
  jenis: 'Kehilangan' | 'Temuan';
  foto: string | null;
};

function tanggalLabel(tanggal: string | null) {
  if (!tanggal) return '—';
  const date = new Date(tanggal.length === 10 ? `${tanggal}T00:00:00Z` : tanggal);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

const nav = [
  ['c9713.svg', 'Beranda', '/'], ['d872e.svg', 'Laporan', '/uc05/laporan'],
  ['bf7bc.svg', 'Temuan', '/uc12'], ['5c528.svg', 'Profil', '/uc02'],
];

export default function LaporanSaya() {
  const [laporan, setLaporan] = useState<Laporan[]>([]);
  const [jenis, setJenis] = useState('Semua');
  const [status, setStatus] = useState('Semua');
  const [selected, setSelected] = useState<Laporan | null>(null);
  const [pesan, setPesan] = useState('Memuat laporan...');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    let aktif = true;
    async function muat() {
      if (!supabase) { setPesan('Konfigurasi Supabase belum tersedia.'); return; }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setPesan('Masuk untuk melihat laporan kamu.'); setShowLogin(true); return; }

      const [hilang, temuan] = await Promise.all([
        supabase.from('laporan_kehilangan').select('id,nomor_laporan,barang_nama,barang_kategori,deskripsi,lokasi_dilewati,tanggal_kehilangan,status_laporan,created_at,foto_barang').eq('id_pembuat', user.id),
        supabase.from('laporan_temuan').select('id,nomor_laporan,barang_nama,barang_kategori,deskripsi,lokasi,tanggal_penemuan,status_laporan,created_at,foto_barang').eq('id_pembuat', user.id),
      ]);
      if (!aktif) return;
      if (hilang.error || temuan.error) { setPesan('Laporan belum bisa dimuat. Coba lagi nanti.'); return; }

      const all = [
        ...(hilang.data || []).map(item => ({ ...item, jenis: 'Kehilangan' as const, lokasi: item.lokasi_dilewati.join(', '), tanggal: item.tanggal_kehilangan, bucket: 'foto-kehilangan' })),
        ...(temuan.data || []).map(item => ({ ...item, jenis: 'Temuan' as const, tanggal: item.tanggal_penemuan, bucket: 'foto-temuan' })),
      ];
      const withPhotos = await Promise.all(all.map(async item => {
        let foto: string | null = null;
        if (item.foto_barang && supabase) {
          const { data } = await supabase.storage.from(item.bucket).createSignedUrl(item.foto_barang, 3600);
          foto = data?.signedUrl || null;
        }
        return { ...item, foto };
      }));
      if (!aktif) return;
      withPhotos.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setLaporan(withPhotos); setPesan('');
    }
    void muat();
    return () => { aktif = false; };
  }, []);

  const visible = laporan.filter(item => (jenis === 'Semua' || item.jenis === jenis) && (status === 'Semua' || item.status_laporan === status));
  const badge = (value: string) => value === 'Aktif' ? 'green' : value === 'Menunggu Penyerahan' ? 'yellow' : 'blue';
  const fotoBarang = (item: Laporan) => item.foto
    ? <img className="report-photo" src={item.foto} alt={'Foto ' + item.barang_nama} />
    : <span className="report-photo report-photo-placeholder" aria-label="Tidak ada foto"><img src="/uc08/no-photo.svg" alt="" /></span>;

  return <main className="view-phone laporan-view">
    <header className="view-header">{selected
      ? <button className="back" type="button" aria-label="Kembali ke daftar" onClick={() => setSelected(null)}><img src="/uc08/5ce6a.svg" alt="" /></button>
      : <Link href="/" aria-label="Kembali ke beranda"><img src="/uc08/5ce6a.svg" alt="" /></Link>}
      <h1>{selected ? 'Detail Laporan' : 'Laporan Saya'}</h1>
    </header>

    {!selected ? <section className="view-content">
      <div className="filter-group"><span>Jenis laporan</span><div className="pills">{['Semua', 'Kehilangan', 'Temuan'].map(value => <button type="button" key={value} aria-pressed={jenis === value} className={jenis === value ? 'chosen' : ''} onClick={() => setJenis(value)}>{value}</button>)}</div></div>
      <div className="filter-group"><span>Status</span><div className="pills">{['Semua', 'Aktif', 'Menunggu Penyerahan', 'Batal'].map(value => <button type="button" key={value} aria-pressed={status === value} className={status === value ? 'chosen' : ''} onClick={() => setStatus(value)}>{value}</button>)}</div></div>
      {!pesan && <div className="results-count"><span>{visible.length} LAPORAN</span><b>Terbaru</b></div>}
      {pesan && <p className="intro" role="status">{pesan} {showLogin && <Link href="/uc02">Masuk</Link>}</p>}
      {!pesan && !visible.length && <div className="report-empty"><img src="/uc08/empty-reports.svg" alt="" /><h2>{laporan.length ? 'Tidak Ada Laporan' : 'Belum Ada Laporan'}</h2><p>{laporan.length ? 'Tidak ada laporan yang sesuai dengan filter.' : 'Kamu belum membuat laporan kehilangan atau barang temuan.'}</p>{!laporan.length && <><Link className="report-empty-primary" href="/uc05">Lapor Hilang</Link><Link className="report-empty-secondary" href="/uc07">Lapor Temuan</Link></>}</div>}
      {visible.map(item => <article className="report-card" key={`${item.jenis}-${item.id}`}>
        <div className="report-top">{fotoBarang(item)}<div className="report-card-text"><h2>{item.barang_nama}</h2><p>Jenis Laporan: {item.jenis}</p><strong className="report-id">{item.nomor_laporan}</strong><p>{tanggalLabel(item.tanggal)}</p></div></div>
        <div className="report-bottom"><span className={'badge ' + badge(item.status_laporan)}>{item.status_laporan}</span><button type="button" onClick={() => setSelected(item)}>Detail <img src="/uc08/8c878.svg" alt="" /></button></div>
      </article>)}
    </section> : <section className="view-content report-detail">
      <article className="detail-card"><div className="report-top">{fotoBarang(selected)}<div><h2>{selected.barang_nama}</h2><p>{selected.jenis} • {selected.barang_kategori}</p><span className={'badge ' + badge(selected.status_laporan)}>{selected.status_laporan}</span></div></div></article>
      <article className="detail-card info-card"><div><span>Nomor laporan</span><strong className="report-id">{selected.nomor_laporan}</strong></div><div className="info-row"><div><span>Kategori</span><strong>{selected.barang_kategori}</strong></div><div><span>Tanggal {selected.jenis === 'Kehilangan' ? 'kehilangan' : 'penemuan'}</span><strong>{tanggalLabel(selected.tanggal)}</strong></div></div><div><span>{selected.jenis === 'Kehilangan' ? 'Rute kehilangan' : 'Lokasi penemuan'}</span><strong>{selected.lokasi || '—'}</strong></div><div><span>Deskripsi</span><strong>{selected.deskripsi || '—'}</strong></div></article>
      <article className="detail-card history-card"><h2>Riwayat Status</h2><div className="history-item"><img src="/uc08/92b85.svg" alt="" /><div><strong>Laporan Dibuat</strong><p>{tanggalLabel(selected.created_at)} — Pengguna</p></div></div></article>
    </section>}

    <nav className="view-nav" aria-label="Navigasi">{nav.map(([icon, label, href]) => <div key={label} className={label === 'Laporan' ? 'active' : ''}><Link href={href}><img src={'/uc08/' + icon} alt="" /><span>{label}</span></Link></div>)}</nav>
  </main>;
}
