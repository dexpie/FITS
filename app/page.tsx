'use client';

import { useState, type FormEvent } from 'react';

const icons = '/icons/';

export default function Home() {
  const [category, setCategory] = useState('Dompet/KTP');
  const [photo, setPhoto] = useState('');
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [report, setReport] = useState({ barang: '', deskripsi: '', tanggal: '' });

  function lanjut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      const data = new FormData(event.currentTarget);
      setReport({ barang: String(data.get('barang') || ''), deskripsi: String(data.get('deskripsi') || ''), tanggal: String(data.get('tanggal') || '') });
      setStep(2); setNotice(''); return;
    }
    if (step === 2) {
      if (!locations.length && !location.trim()) { setNotice('Tambahkan minimal satu lokasi yang dilewati.'); return; }
      if (location.trim()) { setLocations([...locations, location.trim()]); setLocation(''); }
      setStep(3); setNotice(''); return;
    }
    if (step === 3) { setStep(4); setNotice(''); }
  }

  return <main className="phone">
    <header><button className="back" type="button" aria-label="Kembali" onClick={() => { setStep(Math.max(1, step - 1)); setNotice(''); }}><img src={icons + '5ce6a.svg'} alt="" /></button><h1>{step === 3 ? 'Barang Serupa' : step === 4 ? 'Ringkasan Laporan' : 'Lapor Hilang'}</h1></header>
    <form onSubmit={lanjut}>
      <div className="content" hidden={step !== 1}>
        <div className="progress"><div className="steps"><span className="active">1</span><span>2</span><span>3</span></div><strong>LANGKAH 1 DARI 3 - DATA BARANG</strong></div>
        <label>Nama Barang <i>*</i><input required name="barang" defaultValue="Dompet kulit coklat" /></label>
        <fieldset><legend>Kategori <i>*</i></legend><div className="categories">{['Elektronik','Dompet/KTP','Kunci','Lainnya'].map(item => <button type="button" className={category === item ? 'selected' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></fieldset>
        <label>Deskripsi Barang<textarea name="deskripsi" defaultValue="Dompet kulit coklat berisi kartu identitas." /></label>
        <label>Merek dan tipe (tambahan)<input name="merek" defaultValue="Fossil Logan" /><small>Hanya untuk pencocokan, tidak ditampilkan ke publik.</small></label>
        <label>Tanggal kehilangan<input type="date" name="tanggal" defaultValue="2026-09-21" /></label>
        <label>Foto Barang (opsional)<span className="upload"><img src={icons + '5590e.svg'} alt="" />{photo || 'Tambah foto (opsional)'}</span><input className="file" id="photo" type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0]?.name || '')} /></label>
        <div className="photo-actions"><label htmlFor="photo"><img src={icons + 'f8b6d.svg'} alt="" />Dari Galeri</label><label htmlFor="photo"><img src={icons + '031e4.svg'} alt="" />Ambil Foto</label></div>
      </div>
      {step === 2 && <div className="content">
        <div className="progress"><div className="steps"><span>1</span><span className="active">2</span><span>3</span></div><strong>LANGKAH 2 DARI 3 - LOKASI YANG DILEWATI</strong></div>
        <p className="intro">Tambahkan semua tempat yang kamu lewati. Kamu bisa menambahkan lebih dari satu lokasi.</p>
        <img className="map" src={icons + 'map.png'} alt="Ilustrasi peta lokasi" />
        <label htmlFor="location">Gedung / Area <i>*</i></label>
        <div className="location-row"><input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Contoh: DSI Lantai 2" /><button type="button" onClick={() => { if (location.trim()) { setLocations([...locations, location.trim()]); setLocation(''); setNotice(''); } }}>Tambah Lokasi</button></div>
        <div className="locations">{locations.map((item, index) => <button type="button" key={index} onClick={() => setLocations(locations.filter((_, i) => i !== index))} aria-label={'Hapus ' + item}>{item} ×</button>)}</div>
      </div>}
      {step === 3 && <div className="content result">
        <div className="progress"><div className="steps"><span>1</span><span>2</span><span className="active">3</span></div><strong>LANGKAH 3 DARI 3 - BARANG SERUPA</strong></div>
        <div className="empty"><span className="empty-icon">⌕</span><h2>Belum Ada Barang Serupa</h2><p>Belum ada contoh barang temuan yang cocok. Kamu bisa melanjutkan pelaporan.</p></div>
        <p className="hint">Ini tampilan contoh. Pencarian laporan temuan belum terhubung ke database.</p>
      </div>}
      {step === 4 && <div className="content result report-preview">
        <div className="success-ring"><div className="success-icon"><img src={icons + '24f50.svg'} alt="" /></div></div><h2 className="success-title">Ringkasan Laporan Kehilangan</h2><p className="intro success-title">Periksa kembali data laporan yang kamu isi.</p>
        <div className="summary"><strong>Ringkasan Laporan</strong><span className="status">Contoh</span><dl><dt>Nama Barang</dt><dd>{report.barang}</dd><dt>Kategori</dt><dd>{category}</dd><dt>Lokasi</dt><dd>{locations.join(', ')}</dd><dt>Tanggal kehilangan</dt><dd>{report.tanggal || '—'}</dd></dl></div>
        <p className="hint">Data ini hanya contoh dan belum disimpan ke database.</p>
      </div>}
      <div className="actions">{notice && <p className="notice" role="status">{notice}</p>}{step === 2 && <p className="hint">Selanjutnya memeriksa barang serupa sebelum laporan disimpan.</p>}{step < 4 ? <button type="submit">{step === 3 ? 'LANJUTKAN PELAPORAN' : 'LANJUT'}</button> : <button type="button" onClick={() => { setStep(1); setLocations([]); setLocation(''); }}>BUAT LAPORAN BARU</button>}</div>
    </form>
    <nav aria-label="Navigasi utama">{[['c9713','Beranda'],['d872e','Laporan'],['bf7bc','Temuan'],['5c528','Profil']].map(([icon, label]) => <div key={label} className={label === 'Laporan' ? 'current' : ''}><img src={icons + icon + '.svg'} alt="" /><span>{label}</span></div>)}</nav>
  </main>;
}
