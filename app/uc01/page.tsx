'use client';

// UC-01 Daftar ke Akun FITS: Halaman Daftar (insert page).
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { daftarAkun, kirimUlangTautan, periksaIsian } from './repository';
import type { GalatIsian, IsianDaftar, NamaIsian } from './types';
import './uc01.css';

const KOSONG: IsianDaftar = { nama: '', nrp: '', email: '', kataSandi: '', ulangan: '' };
const KOLOM: { nama: NamaIsian; label: string; jenis: string; petunjuk: string; auto: string }[] = [
  { nama: 'nama', label: 'Nama', jenis: 'text', petunjuk: 'Masukkan nama lengkap', auto: 'name' },
  { nama: 'nrp', label: 'NRP', jenis: 'text', petunjuk: 'Masukkan NRP (10 digit)', auto: 'off' },
  { nama: 'email', label: 'Email ITS', jenis: 'email', petunjuk: 'nama@its.ac.id', auto: 'email' },
];

export default function DaftarAkun() {
  const [isian, setIsian] = useState<IsianDaftar>(KOSONG);
  const [galat, setGalat] = useState<GalatIsian>({});
  const [pesan, setPesan] = useState('');
  const [terdaftar, setTerdaftar] = useState('');
  const [kirimUlang, setKirimUlang] = useState('');
  const [proses, setProses] = useState(false);
  const [lihatSandi, setLihatSandi] = useState(false);

  const ubah = (nama: NamaIsian, nilai: string) => setIsian({ ...isian, [nama]: nilai });

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (proses) return;
    setPesan(''); setKirimUlang('');
    const galatIsian = periksaIsian(isian);
    setGalat(galatIsian);
    if (Object.keys(galatIsian).length) return;

    setProses(true);
    const hasil = await daftarAkun(isian);
    setProses(false);
    if (hasil.status === 'berhasil') {
      setTerdaftar(hasil.email);
      setIsian(KOSONG);
      return;
    }
    setGalat(hasil.galat ?? {});
    setPesan(hasil.pesan);
  }

  async function ulangi() {
    setProses(true);
    const galatKirim = await kirimUlangTautan(terdaftar);
    setProses(false);
    setKirimUlang(galatKirim ?? 'Tautan verifikasi terbaru telah dikirim. Gunakan tautan terbaru; tautan sebelumnya tidak berlaku.');
  }

  return <main className="view-phone uc01">
    <header className="view-header">
      <Link href="/uc02" aria-label="Kembali ke Halaman Login"><img src="/uc01/arrow-left.svg" alt="" /></Link>
      <h1>Daftar Akun FITS</h1>
    </header>
    <section className="view-content">
      <div className="uc01-pengantar">
        <div className="uc01-logo">FITS</div>
        <h2>Buat Akun FITS</h2>
        <p>Daftar menggunakan identitas dan email ITS untuk mulai menggunakan FITS.</p>
      </div>

      {terdaftar ? <>
        <div className="uc01-pemberitahuan" role="status">
          <div className="uc01-judul"><img src="/uc01/email.svg" alt="" /><strong>Pendaftaran Berhasil</strong></div>
          <p>Akun FITS berhasil dibuat. Periksa email <b>{terdaftar}</b> dan tekan tautan verifikasi untuk mengaktifkan akun.</p>
          <p><b>Status Akun: Menunggu Verifikasi</b></p>
        </div>
        {kirimUlang && <p className="uc01-info" role="status">{kirimUlang}</p>}
        <button type="button" className="uc01-tombol-garis" onClick={ulangi} disabled={proses}>Kirim Ulang Tautan Verifikasi</button>
        <Link className="uc01-tombol" href="/uc02">Ke Halaman Login</Link>
      </> : <form className="uc01-form" onSubmit={kirim} noValidate>
        {pesan && <p className="uc01-galat-umum" role="alert">{pesan}</p>}
        {KOLOM.map((k) => <label key={k.nama} className={galat[k.nama] ? 'salah' : ''}>
          {k.label}
          <input type={k.jenis} name={k.nama} autoComplete={k.auto} placeholder={k.petunjuk}
            value={isian[k.nama]} onChange={(e) => ubah(k.nama, e.target.value)} />
          {galat[k.nama] && <small>{galat[k.nama]}</small>}
        </label>)}
        {(['kataSandi', 'ulangan'] as const).map((nama) => <label key={nama} className={galat[nama] ? 'salah' : ''}>
          {nama === 'kataSandi' ? 'Kata Sandi' : 'Ulangi Kata Sandi'}
          <span className="uc01-sandi">
            <input type={lihatSandi ? 'text' : 'password'} name={nama} autoComplete="new-password"
              placeholder={nama === 'kataSandi' ? 'Buat kata sandi (min. 8 karakter)' : 'Ulangi kata sandi'}
              value={isian[nama]} onChange={(e) => ubah(nama, e.target.value)} />
            <button type="button" onClick={() => setLihatSandi(!lihatSandi)} aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              <img src="/uc01/eye-off.svg" alt="" />
            </button>
          </span>
          {galat[nama] && <small>{galat[nama]}</small>}
        </label>)}
        <button type="submit" className="uc01-tombol" disabled={proses}>{proses ? 'Memproses...' : 'DAFTAR'}</button>
        <p className="uc01-masuk">Sudah punya akun? <Link href="/uc02">Masuk</Link></p>
      </form>}
    </section>
  </main>;
}
