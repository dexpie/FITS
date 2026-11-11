'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '../supabase';
import BarangSerupa from '../uc06/BarangSerupa';

const icons = '/icons/';

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const uploadedPhoto = useRef<{ file: File; path: string } | null>(null);
  const [category, setCategory] = useState('Dompet/KTP');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [report, setReport] = useState({ barang: '', deskripsi: '', tanggal: '', merek: '' });
  const [saving, setSaving] = useState(false);
  const [nomorLaporan, setNomorLaporan] = useState('');

  useEffect(() => {
    if (!photo) { setPhotoPreview(''); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function pilihFoto(file: File | undefined) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setNotice('Foto harus JPG, PNG, atau WebP dan maksimal 5 MB.');
      return;
    }
    setNotice(''); setPhoto(file); uploadedPhoto.current = null;
  }

  async function lanjut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      const data = new FormData(event.currentTarget);
      const barang = String(data.get('barang') || '').trim();
      const deskripsi = String(data.get('deskripsi') || '').trim();
      if (!barang) { setNotice('Isi nama barang terlebih dahulu.'); return; }
      if (!deskripsi) { setNotice('Isi deskripsi barang terlebih dahulu.'); return; }
      setReport({ barang, deskripsi, tanggal: String(data.get('tanggal') || ''), merek: String(data.get('merek') || '').trim() });
      setStep(2); setNotice(''); return;
    }
    if (step === 2) {
      if (!locations.length && !location.trim()) { setNotice('Tambahkan minimal satu lokasi yang dilewati.'); return; }
      if (location.trim()) { setLocations([...locations, location.trim()]); setLocation(''); }
      setStep(3); setNotice(''); return;
    }
    if (step === 3 && !saving) {
      if (!supabase) { setNotice('Konfigurasi Supabase belum tersedia.'); return; }
      setSaving(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setNotice('Silakan masuk terlebih dahulu sebelum menyimpan laporan.'); setSaving(false); return; }
      let photoPath: string | null = null;
      if (photo) {
        if (uploadedPhoto.current?.file === photo) {
          photoPath = uploadedPhoto.current.path;
        } else {
          const extension = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
          const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from('foto-kehilangan').upload(path, photo, { contentType: photo.type });
          if (uploadError) { setNotice('Foto belum berhasil diunggah. Periksa pengaturan Storage lalu coba lagi.'); setSaving(false); return; }
          uploadedPhoto.current = { file: photo, path };
          photoPath = path;
        }
      }
      const { data, error } = await supabase.from('laporan_kehilangan').insert({
        id_pembuat: user.id, barang_nama: report.barang, barang_merek: report.merek,
        barang_kategori: category, deskripsi: report.deskripsi,
        lokasi_dilewati: locations, tanggal_kehilangan: report.tanggal || null, foto_barang: photoPath,
      }).select('nomor_laporan').single();
      setSaving(false);
      if (error) { setNotice('Laporan belum tersimpan. Periksa data dan coba lagi.'); return; }
      setNomorLaporan(data.nomor_laporan); setStep(4); setNotice('');
    }
  }

  return <main className="phone">
    <header>{step === 4 ? <Link href="/" aria-label="Kembali ke beranda"><img src={icons + '5ce6a.svg'} alt="" /></Link> : <button className="back" type="button" aria-label="Kembali" disabled={saving} onClick={() => { setStep(Math.max(1, step - 1)); setNotice(''); }}><img src={icons + '5ce6a.svg'} alt="" /></button>}<h1>{step === 3 ? 'Barang Serupa' : step === 4 ? 'Laporan Berhasil' : 'Lapor Hilang'}</h1></header>
    <form ref={formRef} onSubmit={lanjut}>
      <div className="content" hidden={step !== 1}>
        <div className="progress"><div className="steps"><span className="active">1</span><span>2</span><span>3</span></div><strong>LANGKAH 1 DARI 3 - DATA BARANG</strong></div>
        <label>Nama Barang <i>*</i><input required name="barang" placeholder="Contoh: Dompet kulit coklat" /></label>
        <fieldset><legend>Kategori <i>*</i></legend><div className="categories">{['Elektronik','Dompet/KTP','Kunci','Lainnya'].map(item => <button type="button" className={category === item ? 'selected' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div></fieldset>
        <label>Deskripsi Barang<textarea name="deskripsi" placeholder="Jelaskan ciri barang yang hilang" /></label>
        <label>Merek dan tipe (tambahan)<input name="merek" placeholder="Opsional" /><small>Hanya untuk pencocokan, tidak ditampilkan ke publik.</small></label>
        <label>Tanggal kehilangan<input type="date" name="tanggal" /></label>
        <label htmlFor="lost-photo-gallery">Foto Barang (opsional)<span className="upload">{photoPreview ? <><img className="lost-photo-preview" src={photoPreview} alt="Foto barang yang dipilih" /><span>Foto barang ditambahkan</span></> : <><img src={icons + '5590e.svg'} alt="" /><span>Tambah foto (opsional)</span></>}</span></label>
        <input className="file" id="lost-photo-gallery" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => pilihFoto(e.target.files?.[0])} />
        <input className="file" id="lost-photo-camera" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => pilihFoto(e.target.files?.[0])} />
        <div className="photo-actions"><label htmlFor="lost-photo-gallery"><img src={icons + 'f8b6d.svg'} alt="" />Dari Galeri</label><label htmlFor="lost-photo-camera"><img src={icons + '031e4.svg'} alt="" />Ambil Foto</label></div>
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
        <BarangSerupa nama={report.barang} kategori={category} lokasi={locations} asal="uc05" sibuk={saving} onLanjut={() => formRef.current?.requestSubmit()} onPilih={() => setNotice('Pencatatan kecocokan belum tersedia.')} />
      </div>}
      {step === 4 && <div className="content result report-preview">
        <div className="success-ring"><div className="success-icon"><img src={icons + '24f50.svg'} alt="" /></div></div><h2 className="success-title">Laporan Kehilangan Berhasil Dibuat</h2><p className="intro success-title">Laporan kehilanganmu telah tersimpan. Pantau status laporan secara berkala.</p>
        <div className="summary"><strong>Ringkasan Laporan</strong><span className="status">Aktif</span><dl><dt>Nama Barang</dt><dd>{report.barang}</dd><dt>Kategori</dt><dd>{category}</dd><dt>Lokasi</dt><dd>{locations.join(', ')}</dd><dt className="summary-date">Tanggal kehilangan</dt><dd>{report.tanggal ? new Date(report.tanggal + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—'}</dd><dt>Nomor laporan</dt><dd className="report-number">{nomorLaporan}</dd></dl></div>
      </div>}
      <div className={step === 4 ? 'actions success-actions' : 'actions'}>{notice && <p className="notice" role="status">{notice} {notice.startsWith('Silakan masuk') && <Link href="/uc02">Masuk</Link>}</p>}{step === 2 && <p className="hint">Selanjutnya memeriksa barang serupa sebelum laporan disimpan.</p>}{step < 3 ? <button type="submit" disabled={saving}>LANJUT</button> : step === 4 ? <><Link className="success-action-primary" href="/uc05/laporan">Lihat Laporan</Link><Link className="success-action-secondary" href="/">Kembali ke Beranda</Link></> : saving && <p className="hint">Menyimpan laporan...</p>}</div>
    </form>
    <nav aria-label="Navigasi utama">{[['c9713','Beranda'],['d872e','Laporan'],['bf7bc','Temuan'],['5c528','Profil']].map(([icon, label]) => <div key={label} className={label === 'Laporan' ? 'current' : ''}><img src={icons + icon + '.svg'} alt="" /><span>{label}</span></div>)}</nav>
  </main>;
}
