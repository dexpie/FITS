'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { periksaPengajuanKlaim } from '../../../lib/fits/klaim';
import { formatTanggal, isDapatDiklaim } from '../../../lib/fits/laporan-temuan';
import { ambilRepositori } from '../../../lib/fits/repositori';
import type { InfoPublik } from '../../../lib/fits/tipe';
import { KepalaHalaman, LencanaStatus, NavBawah, Pemberitahuan } from '../../komponen/umum';
import { ambilKlienSupabase } from '../../../lib/supabase/klien';

type Muatan = { info: InfoPublik; milikSendiri: boolean } | null | undefined; // undefined = masih memuat

// Halaman Detail Barang: akhir UC-12 sekaligus awal UC-13.
export default function HalamanDetailBarang() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [muatan, setMuatan] = useState<Muatan>(undefined);
  const [ditolakMilikSendiri, setDitolakMilikSendiri] = useState(false);
  const [memeriksa, setMemeriksa] = useState(false);
  const [galat, setGalat] = useState('');

  useEffect(() => {
    ambilRepositori().ambilLaporanPublik(id).then(setMuatan).catch(() => setMuatan(null));
  }, [id]);

  // UC-13: pemeriksaan pembuat laporan dan klaim Diajukan sebelum UC-14 dijalankan.
  async function tekanTombolAjukanKlaim() {
    if (!muatan || memeriksa) return;
    setMemeriksa(true);
    setGalat('');
    try {
      const { data: { user } } = await ambilKlienSupabase().auth.getUser();
      if (!user) { router.push(`/uc02?next=${encodeURIComponent(`/uc12/${id}`)}`); return; }
      const klaimLama = await ambilRepositori().cariKlaimDiajukan(id);
      const periksa = periksaPengajuanKlaim({ statusLaporan: muatan.info.statusLaporan, milikSendiri: muatan.milikSendiri, klaimLama });
      if (periksa.hasil === 'milik-sendiri') setDitolakMilikSendiri(true);
      else if (periksa.hasil === 'sudah-diajukan') { router.push(`/uc13/${encodeURIComponent(periksa.klaim.nomorPengajuanKlaim)}?sudah=1`); return; }
      else if (periksa.hasil === 'lanjut') { router.push(`/uc14/${id}`); return; }
    } catch {
      setGalat('Pengajuan klaim belum bisa diperiksa. Coba lagi beberapa saat.');
    }
    setMemeriksa(false);
  }

  if (muatan === undefined) return <main className="view-phone"><KepalaHalaman judul="Detail Barang" kembali="/uc12" labelKembali="Kembali ke Barang Temuan" /><section className="view-content" aria-busy="true" /><NavBawah aktif="Temuan" /></main>;

  if (muatan === null) return <main className="view-phone">
    <KepalaHalaman judul="Detail Barang" kembali="/uc12" labelKembali="Kembali ke Barang Temuan" />
    <section className="view-content"><div className="hasil-kosong"><div><h2>Laporan Tidak Ditemukan</h2><p>Laporan temuan ini tidak tersedia atau sudah dihapus.</p></div><Link href="/uc12">Kembali ke Barang Temuan</Link></div></section>
    <NavBawah aktif="Temuan" />
  </main>;

  const { info } = muatan;
  const dapatDiklaim = isDapatDiklaim(info.statusLaporan);
  const menungguPenyerahan = info.statusLaporan === 'Menunggu Penyerahan';

  return <main className="view-phone">
    <KepalaHalaman judul="Detail Barang" kembali="/uc12" labelKembali="Kembali ke Barang Temuan" />

    <section className="view-content found-detail">
      <img className="found-hero" src={info.fotoBarang} alt={`Foto ${info.namaBarang}`} />
      <div><h2>{info.namaBarang}</h2><LencanaStatus status={info.statusLaporan} /></div>
      <div className="found-info">
        <div><span>Kategori</span><strong>{info.kategori}</strong></div>
        <div className="found-info-row">
          <div><span>Lokasi penemuan</span><strong>{info.lokasi}</strong></div>
          <div><span>Tanggal penemuan</span><strong>{formatTanggal(info.tanggalPenemuan)}</strong></div>
        </div>
        <div><span>Status Laporan</span><strong>{info.statusLaporan}</strong></div>
      </div>

      {ditolakMilikSendiri ? <Pemberitahuan nada="bahaya" judul="Tidak Dapat Mengajukan Klaim">Kamu tidak dapat mengklaim barang dari laporan temuan yang kamu buat sendiri.</Pemberitahuan>
        : menungguPenyerahan ? <Pemberitahuan nada="peringatan" judul="Barang Belum Tersedia">Barang masih menunggu penyerahan ke Pos Drop-off dan belum dapat diklaim.</Pemberitahuan>
        : <>
          <div className="found-description"><strong>Deskripsi</strong><p>{info.deskripsi}</p></div>
          <p className="found-description">{dapatDiklaim ? 'Barang tersedia untuk diklaim. Ajukan klaim untuk melanjutkan ke proses klaim.' : 'Barang ini sudah tidak tersedia untuk diklaim.'}</p>
          {galat && <Pemberitahuan nada="bahaya">{galat}</Pemberitahuan>}
        </>}
    </section>

    <div className="actions">
      {ditolakMilikSendiri
        ? <button onClick={() => setDitolakMilikSendiri(false)}>Kembali ke Detail Barang</button>
        : <button disabled={!dapatDiklaim || memeriksa} aria-busy={memeriksa} onClick={tekanTombolAjukanKlaim}>Ajukan Klaim</button>}
    </div>
    <NavBawah aktif="Temuan" />
  </main>;
}
