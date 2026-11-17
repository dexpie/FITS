import Link from 'next/link';
import type { ReactNode } from 'react';
import type { StatusLaporan } from '../../lib/fits/tipe';

type Tab = 'Beranda' | 'Laporan' | 'Temuan' | 'Profil';

// Ikon navigasi bawaan Figma / UC-12
const TAB: { label: Tab; href: string; ikon: string }[] = [
  { label: 'Beranda', href: '/', ikon: '/uc12/c9713.svg' },
  { label: 'Laporan', href: '/uc08', ikon: '/uc12/5ab5d.svg' },
  { label: 'Temuan', href: '/uc12', ikon: '/uc12/985aa.svg' },
  { label: 'Profil', href: '/uc02', ikon: '/uc12/5c528.svg' },
];

export function NavBawah({ aktif }: { aktif: Tab }) {
  return <nav className="flex h-[72px] shrink-0 border-t border-[#dde1e7] bg-white" aria-label="Navigasi utama">
    {TAB.map(tab => <Link key={tab.label} href={tab.href} className={'flex flex-1 flex-col items-center justify-center gap-[5px] text-[11px] no-underline ' + (tab.label === aktif ? 'border-t-2 border-[#073a75] font-semibold text-[#073a75]' : 'text-gray-500')} aria-current={tab.label === aktif ? 'page' : undefined}>
      <img className="h-[19px] w-[19px]" src={tab.ikon} alt="" />
      <span>{tab.label}</span>
    </Link>)}
  </nav>;
}

export function KepalaHalaman({ judul, kembali, labelKembali, onKembali }: { judul: string; kembali?: string; labelKembali: string; onKembali?: () => void }) {
  return <header className="view-header">
    {onKembali ? (
      <button type="button" onClick={onKembali} aria-label={labelKembali} className="back">
        <img src="/uc12/5ce6a.svg" alt="" />
      </button>
    ) : kembali ? (
      <Link href={kembali} aria-label={labelKembali}>
        <img src="/uc12/5ce6a.svg" alt="" />
      </Link>
    ) : (
      <Link href="/" aria-label={labelKembali}>
        <img src="/uc12/5ce6a.svg" alt="" />
      </Link>
    )}
    <h1>{judul}</h1>
  </header>;
}

const IKON_NADA = {
  info: '/uc12/info-biru.svg',
  bahaya: '/uc12/info-merah.svg',
  peringatan: '/uc12/info-jingga.svg'
};

export function Pemberitahuan({ nada = 'info', judul, children }: { nada?: keyof typeof IKON_NADA; judul?: string; children: ReactNode }) {
  const warna = { info: 'border-[#bed0e4] bg-[#edf3fa] text-[#073a75]', bahaya: 'border-red-300 bg-[#fde8e8] text-red-800', peringatan: 'border-amber-300 bg-[#fff3d6] text-amber-800' };
  return <div className={`flex w-full gap-2.5 rounded-xl border p-3 text-left text-[13px] leading-[18px] ${warna[nada]}`} role={nada === 'info' ? 'note' : 'alert'}>
    <img className="mt-px h-5 w-5 shrink-0" src={IKON_NADA[nada]} alt="" />
    <div>
      {judul && <strong className="mb-[3px] block text-sm">{judul}</strong>}
      <p className="m-0">{children}</p>
    </div>
  </div>;
}

const KELAS_STATUS: Record<StatusLaporan, string> = {
  'Tersedia': 'available',
  'Menunggu Verifikasi': 'pending',
  'Menunggu Penyerahan': 'menunggu-penyerahan',
  'Diklaim': 'finished',
  'Selesai': 'finished',
};

export function LencanaStatus({ status }: { status: StatusLaporan }) {
  return <span className={`found-status ${KELAS_STATUS[status] || 'pending'}`}>{status}</span>;
}
