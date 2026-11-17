'use client';

// UC-09 Menerima Notifikasi: Halaman Notifikasi (view page).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ambilNotifikasi, bukaNotifikasi, hitungBelumDibaca } from './repository';
import type { HasilNotifikasi, JenisNotifikasi, Notifikasi } from './types';

// Pembeda visual tiap jenis notifikasi
const TAMPILAN: Record<JenisNotifikasi, { judul: string; ikon: string; kelas: string }> = {
  'Tanggal Kadaluarsa': { judul: 'Masa Aktif Laporan Hampir Berakhir', ikon: 'notif-kadaluarsa', kelas: 'bg-[#fff7d6]' },
  'Hasil Verifikasi Klaim': { judul: 'Hasil Verifikasi Klaim', ikon: 'notif-klaim', kelas: 'bg-green-100' },
  'Kecocokan Baru': { judul: 'Barang Serupa Ditemukan!', ikon: 'notif-kecocokan', kelas: 'bg-[#edf3fa]' },
  'Perubahan Status': { judul: 'Status Barang Diperbarui', ikon: 'notif-status', kelas: 'bg-[#f1f2f4]' },
};

function waktuPendek(waktu: string) {
  return new Date(waktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

export default function HalamanNotifikasi() {
  const router = useRouter();
  const [hasil, setHasil] = useState<HasilNotifikasi | null>(null);

  useEffect(() => { ambilNotifikasi().then(setHasil); }, []);

  async function pilih(notifikasi: Notifikasi) {
    router.push(await bukaNotifikasi(notifikasi));
  }

  const daftar = hasil?.status === 'ok' ? hasil.daftar : [];
  const belumDibaca = hitungBelumDibaca(daftar);

  return <main className="view-phone uc09">
    <header className="view-header">
      <Link href="/" aria-label="Kembali ke Beranda"><img src="/uc09/arrow-left.svg" alt="" /></Link>
      <h1 className="flex-1">Notifikasi</h1>
      {belumDibaca > 0 && <span className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#ffcc29] px-1.5 text-[11px] font-bold text-gray-800" aria-label={`${belumDibaca} belum dibaca`}>{belumDibaca > 9 ? '9+' : belumDibaca}</span>}
    </header>
    <section className="view-content">
      {!hasil && <p className="m-0 text-xs text-gray-500">Memuat notifikasi...</p>}
      {hasil?.status === 'belum-masuk' && <div className="flex flex-col items-stretch gap-2.5 text-center text-[13px] text-gray-600">
        <p>Masuk terlebih dahulu untuk melihat notifikasi.</p>
        <Link href="/uc02" className="grid h-11 place-items-center rounded-lg bg-[#ffcc29] font-bold text-gray-800 no-underline">Masuk</Link>
      </div>}
      {hasil?.status === 'galat' && <p className="m-0 text-xs text-red-700" role="alert">{hasil.pesan}</p>}
      {hasil?.status === 'ok' && <>
        {daftar.some((n) => n.status_pengiriman === 'Izin Nonaktif') && <div className="flex items-start gap-2.5 rounded-xl border border-[#c9d8ec] bg-[#edf3fa] p-3 [&_img]:h-5 [&_img]:w-5 [&_strong]:text-xs [&_strong]:text-[#073a75] [&_p]:mt-1 [&_p]:mb-0 [&_p]:text-[11px] [&_p]:leading-4 [&_p]:text-gray-600">
          <img src="/uc09/info-navy.svg" alt="" />
          <div>
            <strong>Notifikasi Perangkat Dinonaktifkan</strong>
            <p>Kamu tidak menerima notifikasi di perangkat, tetapi semua pemberitahuan FITS tetap tersedia di halaman ini.</p>
          </div>
        </div>}
        {!daftar.length && <p className="m-0 text-xs text-gray-500">Belum ada notifikasi.</p>}
        {daftar.map((n) => {
          const t = TAMPILAN[n.jenis];
          return <button type="button" key={n.id} className={'flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left text-inherit ' + (n.sudah_dibaca ? 'border-[#dde1e7] bg-[#fbfbfc]' : 'border-[#c9d8ec] bg-white [&_strong]:text-[#073a75]')} onClick={() => pilih(n)}>
            <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-[10px] [&_img]:h-5 [&_img]:w-5 ' + t.kelas}><img src={`/uc09/${t.ikon}.svg`} alt="" /></span>
            <span className="flex flex-1 flex-col gap-1 [&_strong]:text-[13px] [&_span]:text-xs [&_span]:leading-[17px] [&_span]:text-gray-600 [&_small]:text-[11px] [&_small]:text-gray-400">
              <strong>{t.judul}</strong>
              <span>{n.pesan}</span>
              <small>{waktuPendek(n.created_at)}</small>
            </span>
            {n.sudah_dibaca
              ? <img className="mt-0.5 h-4 w-4" src="/uc09/notif-chevron.svg" alt="" />
              : <img className="mt-0.5 h-4 w-4" src="/uc09/notif-belum-dibaca.svg" alt="Belum dibaca" />}
          </button>;
        })}
      </>}
    </section>
    <nav className="flex h-[72px] shrink-0 border-t border-[#dde1e7] bg-white" aria-label="Navigasi utama">
      {[
        { label: 'Beranda', href: '/', icon: '/icons/c9713.svg' },
        { label: 'Laporan', href: '/uc05/laporan', icon: '/icons/d872e.svg' },
        { label: 'Temuan', href: '/uc12', icon: '/icons/bf7bc.svg' },
        { label: 'Profil', href: '/uc02', icon: '/icons/5c528.svg' },
      ].map((item) => <Link key={item.label} href={item.href} className={'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] no-underline ' + (item.label === 'Beranda' ? 'border-t-2 border-[#073a75] font-semibold text-[#073a75]' : 'text-gray-500')}><img className="h-[19px] w-[19px]" src={item.icon} alt="" /><span>{item.label}</span></Link>)}
    </nav>
  </main>;
}
