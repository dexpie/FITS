'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import BarangSerupa from './BarangSerupa';

export default function CariBarangSerupa() {
  const [nama, setNama] = useState('');
  const [kategori, setKategori] = useState('Dompet/KTP');
  const [lokasi, setLokasi] = useState('');
  const [asal, setAsal] = useState<'uc05' | 'uc07'>('uc05');
  const [dicari, setDicari] = useState(false);
  const [pesan, setPesan] = useState('');
  function cari(e: FormEvent) { e.preventDefault(); setPesan(''); setDicari(true); }
  return <main className="phone"><header><Link href="/" aria-label="Kembali"><img src="/icons/5ce6a.svg" alt="" /></Link><h1>Barang Serupa</h1></header>
    {!dicari ? <form onSubmit={cari}><div className="content"><p className="intro">Isi data barang untuk memeriksa laporan pasangan yang serupa.</p>
      <label>Jenis laporan<select value={asal} onChange={e => setAsal(e.target.value as 'uc05' | 'uc07')}><option value="uc05">Kehilangan</option><option value="uc07">Temuan</option></select></label>
      <label>Nama barang<input required value={nama} onChange={e => setNama(e.target.value)} /></label>
      <label>Kategori<select value={kategori} onChange={e => setKategori(e.target.value)}>{['Elektronik','Dompet/KTP','Kunci','Lainnya'].map(x => <option key={x}>{x}</option>)}</select></label>
      <label>Lokasi<input required value={lokasi} onChange={e => setLokasi(e.target.value)} /></label>
    </div><div className="actions"><button type="submit">CARI</button></div></form> : <div className="content"><BarangSerupa nama={nama} kategori={kategori} lokasi={[lokasi]} asal={asal} onLanjut={() => setDicari(false)} onPilih={() => setPesan('Pencatatan kecocokan belum tersedia.')} />{pesan && <p className="notice" role="status">{pesan}</p>}<button type="button" onClick={() => setDicari(false)}>Ubah pencarian</button></div>}
  </main>;
}
