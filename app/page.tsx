import Link from 'next/link';
import './home.css';

const recentFinds = [
  { name: 'Dompet kulit coklat', location: 'DSI Lantai 2', date: '18 Sep 2026', image: '/uc12/4e0f2.png' },
  { name: 'Kunci motor', location: 'Parkiran DSI', date: '18 Sep 2026', image: '/uc12/f88cc.png' },
  { name: 'Laptop abu-abu', location: 'Perpustakaan', date: '17 Sep 2026', image: '/uc12/7eb19.png' },
];

const navigation = [
  { label: 'Beranda', href: '/', icon: '/icons/c9713.svg', active: true },
  { label: 'Laporan', href: '/uc08', icon: '/icons/d872e.svg' },
  { label: 'Temuan', href: '/uc12', icon: '/icons/bf7bc.svg' },
  { label: 'Profil', href: '/uc02', icon: '/icons/5c528.svg' },
];

export default function Home() {
  return <main className="home-phone">
    <header className="home-header">
      <Link className="home-brand" href="/" aria-label="FITS Beranda">FITS</Link>
      <div className="home-tools">
        <button type="button" aria-label="Notifikasi" className="home-icon-button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg><i>3</i></button>
        <Link href="/uc02" aria-label="Profil" className="home-profile"><img src="/icons/5c528.svg" alt="" /></Link>
      </div>
    </header>

    <section className="home-content">
      <div className="home-greeting"><h1>Halo, Yossi!</h1><p>Selamat datang kembali di FITS.</p></div>
      <p className="home-success"><span aria-hidden="true">✓</span>Kamu berhasil masuk ke akun FITS.</p>

      <div className="home-actions">
        <Link href="/uc05" className="home-action-card report-lost">
          <span className="action-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="7.2"/><path d="m16 16 5 5M8.5 8.5l4.6 4.6m0-4.6-4.6 4.6"/></svg></span>
          <strong>Lapor Hilang</strong><span>Kehilangan barang?<br />Laporkan di sini.</span>
        </Link>
        <Link href="/uc07" className="home-action-card report-found">
          <span className="action-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 8 9-5 9 5-9 5-9-5Zm0 0v9l9 5 9-5V8M12 13v9m5-11v5l-2-1.2-2 1.2v-5"/></svg></span>
          <strong>Lapor Temuan</strong><span>Bantu kembalikan barang<br />yang kamu temukan.</span>
        </Link>
      </div>

      <div className="home-section-heading"><h2>Barang Temuan Terbaru</h2><Link href="/uc12">Lihat Semua</Link></div>
      <div className="home-recent-list">
        {recentFinds.map(item => <Link className="home-find-card" href="/uc12" key={item.name}>
          <img src={item.image} alt={item.name} />
          <span className="find-copy"><strong>{item.name}</strong><span>{item.location}</span><small>{item.date}</small></span>
          <span className="find-status">Tersedia</span>
        </Link>)}
      </div>
    </section>

    <nav className="home-nav" aria-label="Navigasi utama">
      {navigation.map(item => <Link href={item.href} key={item.label} className={item.active ? 'active' : ''}>
        <img src={item.icon} alt="" /><span>{item.label}</span>
      </Link>)}
    </nav>
  </main>;
}
