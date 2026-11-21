'use client';

// UC-15 Memverifikasi Klaim Barang: Halaman Verifikasi Klaim (view page + form keputusan).
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ambilKlaimDiajukan, ambilVerifikasi, cariKlaim, cekPetugas, PILIHAN_BUKTI_PENGUAT, putuskanKlaim } from './repository';
import type { AksesPetugas, DataVerifikasi, KlaimDiajukan } from './types';
import './uc15.css';

function waktu(nilai: string) {
  return new Date(nilai).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

export default function VerifikasiKlaim() {
  const [akses, setAkses] = useState<AksesPetugas | null>(null);
  const [daftar, setDaftar] = useState<KlaimDiajukan[]>([]);
  const [nomor, setNomor] = useState('');
  const [galatCari, setGalatCari] = useState('');
  const [data, setData] = useState<DataVerifikasi | null>(null);
  const [namaKtm, setNamaKtm] = useState('');
  const [bukti, setBukti] = useState<string[]>([]);
  const [galat, setGalat] = useState('');
  const [ditunda, setDitunda] = useState(false);
  const [proses, setProses] = useState(false);
  const [memuatDaftar, setMemuatDaftar] = useState(true);
  const [galatDaftar, setGalatDaftar] = useState('');

  async function muatDaftar() {
    setMemuatDaftar(true);
    setGalatDaftar('');
    try {
      setDaftar(await ambilKlaimDiajukan());
    } catch {
      setGalatDaftar('Daftar klaim belum bisa dimuat. Coba lagi.');
    } finally {
      setMemuatDaftar(false);
    }
  }

  useEffect(() => {
    cekPetugas().then((a) => { setAkses(a); if (a === 'petugas') void muatDaftar(); })
      .catch(() => setAkses('gagal'));
  }, []);

  async function buka(id: string) {
    setGalat(''); setDitunda(false); setNamaKtm(''); setBukti([]);
    const klaim = await ambilVerifikasi(id);
    if (!klaim) throw new Error('Klaim tidak tersedia.');
    setData(klaim);
  }

  async function bukaDariDaftar(id: string) {
    setGalatCari('');
    setProses(true);
    try {
      await buka(id);
    } catch {
      setGalatCari('Detail klaim belum bisa dimuat. Coba lagi.');
    } finally {
      setProses(false);
    }
  }

  async function cari(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (proses) return;
    if (!nomor.trim()) { setGalatCari('Isi Nomor Pengajuan Klaim terlebih dahulu.'); return; }
    setGalatCari('');
    setProses(true);
    try {
      const id = await cariKlaim(nomor);
      if (!id) { setGalatCari('Nomor Pengajuan Klaim tidak ditemukan.'); return; }
      await buka(id);
    } catch {
      setGalatCari('Klaim belum bisa dimuat. Coba lagi.');
    } finally {
      setProses(false);
    }
  }

  async function putuskan(hasil: 'Cocok' | 'Tidak Cocok') {
    if (!data || proses) return;
    setProses(true); setGalat(''); setDitunda(false);
    try {
      const pesan = await putuskanKlaim(data.id, hasil, namaKtm, bukti);
      if (pesan) { setGalat(pesan); return; }
      await buka(data.id);
    } catch {
      setGalat('Keputusan belum bisa ditampilkan. Buka ulang klaim untuk memeriksa hasilnya.');
    } finally {
      setProses(false);
    }
  }

  const kembali = () => { setData(null); void muatDaftar(); };

  return <main className="view-phone uc15">
    <header className="view-header">
      {data ? <button className="back" onClick={kembali} disabled={proses} aria-label="Kembali ke daftar klaim"><img src="/uc15/arrow-left.svg" alt="" /></button>
        : <Link href="/uc16" aria-label="Kembali ke Halaman Petugas"><img src="/uc15/arrow-left.svg" alt="" /></Link>}
      <h1>Verifikasi Klaim</h1>
    </header>
    <section className="view-content">
      {akses === null && <p className="uc15-info">Memeriksa akses...</p>}
      {akses === 'tanpa-konfigurasi' && <p className="uc15-info">Konfigurasi Supabase belum tersedia.</p>}
      {akses === 'belum-masuk' && <p className="uc15-info">Masuk dengan akun Petugas terlebih dahulu. <Link href="/uc02?next=/uc15">Masuk</Link></p>}
      {akses === 'gagal' && <p className="uc15-galat" role="alert">Akses Petugas belum bisa diperiksa. Muat ulang halaman untuk mencoba lagi.</p>}
      {akses === 'bukan-petugas' && <p className="uc15-galat" role="alert">Halaman ini khusus untuk Petugas.</p>}

      {akses === 'petugas' && !data && <>
        <form className="uc15-cari" onSubmit={cari}>
          <label>Nomor Pengajuan Klaim<input value={nomor} onChange={(e) => setNomor(e.target.value)} placeholder="KL-YYYYMMDD-XXXX" /></label>
          <button type="submit" disabled={proses}>Cari Klaim</button>
          {galatCari && <p className="uc15-galat" role="alert">{galatCari}</p>}
        </form>
        <div className="work-heading"><h2>Klaim Diajukan</h2><span>{daftar.length} klaim</span></div>
        {daftar.map((k) => <article className="work-card" key={k.id}>
          <strong>{k.barang_nama}</strong>
          <span className="uc15-kecil">{k.nomor_pengajuan} • {k.pengaju_nama}</span>
          <span className="uc15-kecil">Diajukan {waktu(k.created_at)}</span>
          <button className="work-button" disabled={proses} onClick={() => bukaDariDaftar(k.id)}>Detail Klaim</button>
        </article>)}
        {memuatDaftar && <p className="uc15-info" role="status">Memuat daftar klaim...</p>}
        {galatDaftar && <div className="uc15-galat" role="alert">{galatDaftar} <button type="button" onClick={muatDaftar}>Muat ulang</button></div>}
        {!memuatDaftar && !galatDaftar && !daftar.length && <p className="uc15-info">Tidak ada klaim yang menunggu verifikasi.</p>}
      </>}

      {akses === 'petugas' && data && <>
        <article className="work-card">
          <strong>{data.barang_nama}</strong>
          <span className="uc15-kecil">{data.barang_kategori} • {data.lokasi} • {data.nomor_laporan}</span>
          <div className="uc15-baris"><span>Status Klaim</span><b>{data.status}</b></div>
          <div className="uc15-baris"><span>Status Laporan</span><b>{data.status_laporan}</b></div>
          <div className="uc15-baris"><span>Pengklaim</span><b>{data.pengaju_nama}{data.pengaju_nrp ? ` (${data.pengaju_nrp})` : ''}</b></div>
          <span className="uc15-kecil">{data.nomor_pengajuan} • diajukan {waktu(data.created_at)}</span>
        </article>

        <article className="work-card">
          <h2 className="uc15-judul">Pertanyaan Verifikasi</h2>
          {data.jawaban.map((j) => <div className="uc15-jawaban" key={j.urutan}>
            <b>{j.urutan}. {j.pertanyaan}</b>
            <span className="temuan">Temuan: {j.jawaban_rahasia}</span>
            <span className="klaim">Klaim: {j.jawaban_klaim ?? '— belum dijawab'}</span>
          </div>)}
          {!data.jawaban.length && <span className="uc15-kecil">Laporan temuan ini belum memiliki pertanyaan verifikasi.</span>}
        </article>

        <article className="work-card">
          <h2 className="uc15-judul">Bukti Pendukung</h2>
          {data.bukti.map((b) => <span className="uc15-kecil" key={b.id}>
            <b>{b.jenis}</b> • {b.url ? <a href={b.url} target="_blank" rel="noreferrer">Buka {b.nama_berkas}</a> : `${b.nama_berkas} (berkas tidak tersedia)`}
          </span>)}
          {!data.bukti.length && <span className="uc15-kecil">Tidak ada bukti pendukung.</span>}
        </article>

        <article className="work-card">
          <h2 className="uc15-judul">Laporan Kehilangan Terkait</h2>
          {data.laporan_kehilangan.map((l) => <div className="uc15-jawaban" key={l.nomor_laporan}>
            <b>{l.barang_nama} • {l.nomor_laporan}</b><span>{l.deskripsi}</span><span className="uc15-kecil">Rute: {l.lokasi}</span>
          </div>)}
          {!data.laporan_kehilangan.length && <span className="uc15-kecil">Pengklaim tidak memiliki laporan kehilangan dengan kategori yang sama.</span>}
          {data.klaim_lain.length > 0 && <span className="uc15-peringatan">Klaim lain untuk barang ini: {data.klaim_lain.join(', ')}</span>}
        </article>

        {data.hasil_verifikasi ? <article className={'uc15-hasil ' + (data.hasil_verifikasi.hasil === 'Cocok' ? 'cocok' : 'tidak')} role="status">
          <img src={data.hasil_verifikasi.hasil === 'Cocok' ? '/uc15/check-navy.svg' : '/uc15/segitiga-peringatan.svg'} alt="" />
          <strong>{data.hasil_verifikasi.hasil === 'Cocok' ? 'Klaim Berhasil Diverifikasi' : 'Klaim Tidak Cocok'}</strong>
          <span>Diperiksa {data.hasil_verifikasi.petugas} • {waktu(data.hasil_verifikasi.waktu)}</span>
          {data.hasil_verifikasi.bukti_penguat.length > 0 && <span>Bukti fisik penguat: {data.hasil_verifikasi.bukti_penguat.join(' ')}</span>}
          {data.hasil_verifikasi.hasil === 'Cocok' && data.pos_drop_off && <span>Barang diambil di {data.pos_drop_off}.</span>}
          <Link href="/uc16" className="uc15-tombol">Ke Halaman Petugas</Link>
        </article> : data.status === 'Diajukan' && ['Menunggu Verifikasi', 'Tersedia'].includes(data.status_laporan) ? <form className="uc15-form" onSubmit={(e) => e.preventDefault()}>
          <h2 className="uc15-judul">Pemeriksaan Identitas</h2>
          <label>Nama pada KTM<input value={namaKtm} onChange={(e) => setNamaKtm(e.target.value)} placeholder="Tulis nama yang tertera pada KTM" /></label>
          <fieldset><legend>Bukti Fisik Penguat Klaim</legend>
            {PILIHAN_BUKTI_PENGUAT.map((b) => <label key={b} className="uc15-centang">
              <input type="checkbox" checked={bukti.includes(b)} onChange={(e) => setBukti(e.target.checked ? [...bukti, b] : bukti.filter((x) => x !== b))} />{b}
            </label>)}
          </fieldset>
          {galat && <p className="uc15-galat" role="alert">{galat}</p>}
          {ditunda && <p className="uc15-peringatan" role="status"><b>Verifikasi Ditunda.</b> Minta pengklaim kembali membawa identitas yang sesuai.</p>}
          <button type="button" className="uc15-tombol" disabled={proses} onClick={() => putuskan('Cocok')}>Nyatakan Cocok</button>
          <button type="button" className="uc15-tombol-garis" disabled={proses} onClick={() => putuskan('Tidak Cocok')}>Nyatakan Tidak Cocok</button>
          <button type="button" className="uc15-tombol-teks" disabled={proses} onClick={() => { setGalat(''); setDitunda(true); }}>Tunda Verifikasi</button>
        </form> : <p className="uc15-info">Klaim ini sudah tidak menunggu verifikasi.</p>}
      </>}
    </section>
  </main>;
}
