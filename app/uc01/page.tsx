'use client';

// UC-01 Daftar ke Akun FITS: Halaman Daftar (insert page).
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { daftarAkun, kirimUlangTautan, periksaIsian } from './repository';
import type { GalatIsian, IsianDaftar, NamaIsian } from './types';

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
      <div className="flex flex-col items-center gap-1.5 pt-0 pb-1 text-center [&_h2]:mt-1.5 [&_h2]:mb-0 [&_h2]:text-xl [&_h2]:text-[#073a75] [&_p]:m-0 [&_p]:text-xs [&_p]:leading-[18px] [&_p]:text-gray-500">
        <div className="grid h-[60px] w-24 place-items-center rounded-lg border border-[#dde1e7] bg-white text-[30px] font-extrabold text-[#073a75]">FITS</div>
        <h2>Buat Akun FITS</h2>
        <p>Daftar menggunakan identitas dan email ITS untuk mulai menggunakan FITS.</p>
      </div>

      {terdaftar ? <>
        <div className="rounded-xl border border-[#c9d8ec] bg-[#edf3fa] p-3 text-xs leading-[18px] [&_p]:mt-1.5 [&_p]:mb-0" role="status">
          <div className="flex items-center gap-2 text-[#073a75] [&_img]:h-5 [&_img]:w-5"><img src="/uc01/email.svg" alt="" /><strong>Pendaftaran Berhasil</strong></div>
          <p>Akun FITS berhasil dibuat. Periksa email <b>{terdaftar}</b> dan tekan tautan verifikasi untuk mengaktifkan akun.</p>
          <p><b>Status Akun: Menunggu Verifikasi</b></p>
        </div>
        {kirimUlang && <p className="m-0 text-xs text-gray-600" role="status">{kirimUlang}</p>}
        <button type="button" className="h-11 cursor-pointer rounded-lg border border-[#073a75] bg-white font-bold text-[#073a75]" onClick={ulangi} disabled={proses}>Kirim Ulang Tautan Verifikasi</button>
        <Link className="grid h-12 cursor-pointer place-items-center rounded-lg border-0 bg-[#ffcc29] text-sm font-bold text-gray-800 no-underline disabled:cursor-wait disabled:bg-[#e1e4e9] disabled:text-gray-500" href="/uc02">Ke Halaman Login</Link>
      </> : <form className="flex !flex-none flex-col gap-3 rounded-xl border border-[#dde1e7] bg-white p-5 [&_label]:flex [&_label]:flex-col [&_label]:gap-1.5 [&_label]:text-[13px] [&_label]:font-semibold [&_input]:box-border [&_input]:!h-11 [&_input]:w-full [&_input]:!rounded-lg [&_input]:border [&_input]:!border-[#dde1e7] [&_input]:!bg-white [&_input]:px-3 [&_input]:!text-sm [&_small]:text-[11px] [&_small]:font-medium [&_small]:text-red-600" onSubmit={kirim} noValidate>
        {pesan && <p className="m-0 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700" role="alert">{pesan}</p>}
        {KOLOM.map((k) => <label key={k.nama} className={galat[k.nama] ? '[&_input]:!border-red-600 [&_input]:!bg-red-50' : ''}>
          <span>{k.label} <span className="text-red-600">*</span></span>
          <input type={k.jenis} name={k.nama} autoComplete={k.auto} placeholder={k.petunjuk}
            value={isian[k.nama]} onChange={(e) => ubah(k.nama, e.target.value)} />
          {galat[k.nama] && <small>{galat[k.nama]}</small>}
        </label>)}
        {(['kataSandi', 'ulangan'] as const).map((nama) => <label key={nama} className={galat[nama] ? '[&_input]:!border-red-600 [&_input]:!bg-red-50' : ''}>
          <span>{nama === 'kataSandi' ? 'Kata Sandi' : 'Ulangi Kata Sandi'} <span className="text-red-600">*</span></span>
          <span className="relative block [&_button]:absolute [&_button]:top-3 [&_button]:right-2.5 [&_button]:cursor-pointer [&_button]:border-0 [&_button]:bg-transparent [&_button]:p-0 [&_img]:block [&_img]:h-5 [&_img]:w-5">
            <input type={lihatSandi ? 'text' : 'password'} name={nama} autoComplete="new-password"
              placeholder={nama === 'kataSandi' ? 'Buat kata sandi (min. 8 karakter)' : 'Ulangi kata sandi'}
              value={isian[nama]} onChange={(e) => ubah(nama, e.target.value)} />
            <button type="button" onClick={() => setLihatSandi(!lihatSandi)} aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              <img src="/uc01/eye-off.svg" alt="" />
            </button>
          </span>
          {galat[nama] && <small>{galat[nama]}</small>}
        </label>)}
        <button type="submit" className="grid h-12 cursor-pointer place-items-center rounded-lg border-0 bg-[#ffcc29] text-sm font-bold text-gray-800 no-underline disabled:cursor-wait disabled:bg-[#e1e4e9] disabled:text-gray-500" disabled={proses}>{proses ? 'Memproses...' : 'DAFTAR'}</button>
        <p className="m-0 text-center text-xs text-gray-500 [&_a]:font-bold [&_a]:text-[#073a75]">Sudah punya akun? <Link href="/uc02">Masuk</Link></p>
      </form>}
    </section>
  </main>;
}
