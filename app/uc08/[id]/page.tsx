'use client';

// UC-08 Memantau Status Laporan: Halaman Detail Laporan Saya, beserta riwayat status.
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { alamatFoto, ambilDetailLaporan, isKadaluarsa, isMendekatiKadaluarsa, tanggal, waktu, warnaStatus } from '../repository';
import type { DetailLaporan, Hasil, JenisLaporan } from '../types';
import '../uc08.css';

function Detail() {
  const { id } = useParams<{ id: string }>();
  const jenis: JenisLaporan = useSearchParams().get('jenis') === 'Temuan' ? 'Temuan' : 'Kehilangan';
  const [hasil, setHasil] = useState<Hasil<DetailLaporan | null> | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [riwayatLengkap, setRiwayatLengkap] = useState(false);

  useEffect(() => {
    ambilDetailLaporan(jenis, id).then(async (h) => {
      setHasil(h);
      if (h.status === 'ok' && h.data) setFoto(await alamatFoto(h.data.jenis, h.data.foto_barang));
    });
  }, [jenis, id]);

  const laporan = hasil?.status === 'ok' ? hasil.data : null;
  const riwayat = laporan?.riwayat ?? [];
  // Riwayat ringkas hanya menampilkan entri terakhir; riwayat lengkap menampilkan semuanya.
  const riwayatTampil = riwayatLengkap ? riwayat : riwayat.slice(-1);

  return <main className="view-phone uc08">
    <header className="view-header"><Link href="/uc08" aria-label="Kembali ke Laporan Saya"><img src="/uc08/5ce6a.svg" alt="" /></Link><h1>Detail Laporan</h1></header>
    <section className="view-content report-detail">
      {!hasil && <p className="no-results">Memuat detail laporan...</p>}
      {hasil?.status === 'belum-masuk' && <div className="uc08-kosong"><p>Masuk terlebih dahulu.</p><Link href="/uc02" className="uc08-tombol">Masuk</Link></div>}
      {hasil?.status === 'galat' && <p className="no-results uc08-merah" role="alert">{hasil.pesan}</p>}
      {hasil?.status === 'ok' && !laporan && <p className="no-results">Laporan tidak ditemukan di Laporan Saya.</p>}
      {laporan && <>
        <article className="detail-card"><div className="report-top">
          <img className="report-photo" src={foto ?? '/uc08/no-photo.svg'} alt={laporan.barang_nama} />
          <div><h2>{laporan.barang_nama}</h2><p>{laporan.jenis} • {laporan.barang_kategori}</p>
            <span className={'badge ' + warnaStatus(laporan.status_laporan)}>{laporan.status_laporan}</span></div>
        </div></article>

        {isMendekatiKadaluarsa(laporan) && <article className="uc08-peringatan">
          <img src="/uc08/jam-peringatan.svg" alt="" />
          <div><strong>Masa Aktif Laporan Hampir Berakhir</strong><span>Tinggal {laporan.sisa_hari} hari. Perpanjang agar laporan tetap aktif.</span>
            <Link href={`/uc10/${laporan.id}`} className="uc08-tombol">Perpanjang Laporan</Link></div>
        </article>}
        {isKadaluarsa(laporan) && <article className="uc08-peringatan merah">
          <img src="/uc08/jam-peringatan.svg" alt="" />
          <div><strong>Laporan Sudah Kadaluarsa</strong><span>Laporan yang kadaluarsa tidak bisa diperpanjang.</span>
            <Link href="/uc05" className="uc08-tombol">Buat Laporan Baru</Link></div>
        </article>}

        <article className="detail-card info-card">
          <div><span>Nomor laporan</span><strong>{laporan.nomor_laporan}</strong></div>
          <div className="info-row">
            <div><span>Kategori</span><strong>{laporan.barang_kategori}</strong></div>
            <div><span>{laporan.jenis === 'Kehilangan' ? 'Tanggal kehilangan' : 'Tanggal ditemukan'}</span><strong>{tanggal(laporan.tanggal)}</strong></div>
          </div>
          <div><span>{laporan.jenis === 'Kehilangan' ? 'Rute kehilangan' : 'Lokasi ditemukan'}</span><strong>{laporan.lokasi || '—'}</strong></div>
          {laporan.deskripsi && <div><span>Deskripsi</span><strong>{laporan.deskripsi}</strong></div>}
          <div><span>Tanggal dilaporkan</span><strong>{waktu(laporan.created_at)}</strong></div>
          {laporan.jenis === 'Kehilangan' && <div className="detail-number"><span>Aktif sampai</span><strong>{tanggal(laporan.tanggal_kadaluarsa)}</strong></div>}
        </article>

        {laporan.jenis === 'Temuan' && laporan.status_laporan === 'Menunggu Penyerahan' && <article className="handover-notice">
          <img src="/uc08/1d73d.svg" alt="" />
          <div><strong>Antar barang ke pos sebelum batas waktu</strong><span>{laporan.pos_drop_off ?? 'Pos Drop-off'}</span>
            <b>{laporan.batas_penyerahan ? waktu(laporan.batas_penyerahan) : '—'}</b></div>
        </article>}

        <article className="detail-card history-card">
          <h2>Riwayat Status</h2>
          {riwayatTampil.map((r, i) => <div className={'history-item' + (r.status === 'Kadaluarsa' ? ' uc08-merah' : '')} key={i}>
            <img src="/uc08/92b85.svg" alt="" />
            <div><strong>{r.keterangan}</strong><p>{waktu(r.waktu)} — {r.aktor}</p>{r.catatan && <p>Catatan: {r.catatan}</p>}</div>
          </div>)}
          {riwayat.length > 1 && <button className="history-button" onClick={() => setRiwayatLengkap(!riwayatLengkap)}>
            {riwayatLengkap ? 'Sembunyikan Riwayat' : 'Lihat Riwayat Lengkap'}<img src="/uc08/9221c.svg" alt="" />
          </button>}
        </article>
      </>}
    </section>
  </main>;
}

export default function DetailLaporanPage() {
  return <Suspense fallback={null}><Detail /></Suspense>;
}
