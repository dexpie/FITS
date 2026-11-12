'use client';

// UC-10 Memperpanjang Laporan: Halaman Perpanjang Laporan (insert page).
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ambilLaporan, bolehDiperpanjang, formatTanggal, perpanjang, pilihanDurasi } from '../repository';
import type { LaporanPerpanjangan } from '../types';
import '../uc10.css';

export default function PerpanjangLaporan() {
  const { id } = useParams<{ id: string }>();
  const [laporan, setLaporan] = useState<LaporanPerpanjangan | null | 'belum-masuk' | undefined>(undefined);
  const [durasi, setDurasi] = useState<number | null>(null);
  const [catatan, setCatatan] = useState('');
  const [galat, setGalat] = useState('');
  const [berhasil, setBerhasil] = useState('');
  const [proses, setProses] = useState(false);

  useEffect(() => { ambilLaporan(id).then(setLaporan); }, [id]);

  const detail = `/uc08/${id}?jenis=Kehilangan`;

  async function konfirmasi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!durasi) { setGalat('Pilih durasi perpanjangan.'); return; }
    setProses(true); setGalat('');
    const hasil = await perpanjang(id, durasi, catatan);
    setProses(false);
    if (hasil.status === 'galat') { setGalat(hasil.pesan); return; }
    setBerhasil(hasil.tanggalBaru);
  }

  return <main className="view-phone uc10">
    <header className="view-header"><Link href={detail} aria-label="Kembali ke Detail Laporan"><img src="/uc10/arrow-left.svg" alt="" /></Link><h1>Perpanjang Laporan</h1></header>
    <section className="view-content">
      {laporan === undefined && <p className="uc10-info">Memuat laporan...</p>}
      {laporan === 'belum-masuk' && <p className="uc10-info">Masuk terlebih dahulu. <Link href="/uc02">Masuk</Link></p>}
      {laporan === null && <p className="uc10-info">Laporan tidak ditemukan.</p>}
      {laporan && laporan !== 'belum-masuk' && (berhasil ? <div className="uc10-berhasil" role="status">
        <strong>Perpanjangan laporan berhasil</strong>
        <p>Laporan {laporan.barang_nama} aktif sampai <b>{berhasil}</b>.</p>
        <Link href={detail} className="uc10-tombol">Kembali ke Detail Laporan</Link>
      </div> : !bolehDiperpanjang(laporan) ? <div className="uc10-peringatan">
        <img src="/uc10/jam-peringatan.svg" alt="" />
        <div><strong>{laporan.status_laporan === 'Kadaluarsa' || laporan.sisa_hari < 0 ? 'Laporan Sudah Kadaluarsa' : 'Laporan Belum Bisa Diperpanjang'}</strong>
          <span>Perpanjangan hanya untuk laporan Aktif yang masa aktifnya tinggal 3 hari atau kurang.</span>
          <Link href={detail}>Kembali ke Detail Laporan</Link></div>
      </div> : <form className="uc10-form" onSubmit={konfirmasi}>
        <div className="uc10-kartu">
          <span>{laporan.nomor_laporan}</span><strong>{laporan.barang_nama}</strong>
          <div className="uc10-baris"><span>Tanggal Kadaluarsa Saat Ini</span><b>{formatTanggal(laporan.tanggal_kadaluarsa)}</b></div>
        </div>
        <fieldset className="uc10-durasi">
          <legend>Pilih Durasi Perpanjangan</legend>
          {pilihanDurasi(laporan).map((p) => <label key={p.hari} className={durasi === p.hari ? 'dipilih' : ''}>
            <input type="radio" name="durasi" value={p.hari} checked={durasi === p.hari} onChange={() => setDurasi(p.hari)} />
            <span><b>{p.hari} hari</b><small>Aktif sampai {p.tanggalBaru}</small></span>
            {durasi === p.hari && <img src="/uc10/check-pilihan.svg" alt="" />}
          </label>)}
        </fieldset>
        <label className="uc10-catatan">Catatan Perkembangan (Opsional)
          <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tambahkan informasi terbaru mengenai barang yang hilang..." />
        </label>
        {galat && <p className="uc10-galat" role="alert">{galat}</p>}
        <button type="submit" className="uc10-tombol" disabled={proses}>{proses ? 'Menyimpan...' : 'Konfirmasi Perpanjangan'}</button>
      </form>)}
    </section>
  </main>;
}
