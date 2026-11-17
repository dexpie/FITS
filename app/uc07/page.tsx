'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import BarangSerupa from '../uc06/BarangSerupa';
import { supabase } from '../supabase';

const categories = ['Elektronik', 'Dompet/KTP', 'Kunci', 'Lainnya'];
const nav = [['c9713', 'Beranda', '/'], ['d872e', 'Laporan', '/uc08'], ['bf7bc', 'Temuan', '/uc12'], ['5c528', 'Profil', '/uc02']];

export default function LaporTemuan() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('Dompet/KTP');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [date, setDate] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [questions, setQuestions] = useState(['', '']);
  const [answers, setAnswers] = useState(['', '']);
  const [notice, setNotice] = useState('');
  const [lokasiOptions, setLokasiOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{nomor_laporan: string; pos_nama: string; batas_penyerahan: string} | null>(null);

  useEffect(() => {
    async function load() {
      if (!supabase) return;
      const { data, error } = await supabase.from('lokasi').select('nama').order('nama');
      if (!error && data) setLokasiOptions(data.map(item => item.nama));
    }
    void load();
  }, []);

  async function simpan() {
    if (saving || !supabase || !photo) return;
    setSaving(true); setNotice('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setSaving(false); setNotice('Masuk dahulu untuk menyimpan laporan.'); return; }
    if (!['image/jpeg','image/png','image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024) {
      setSaving(false); setNotice('Foto harus JPG, PNG, atau WebP dan maksimal 5 MB.'); return;
    }
    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const upload = await supabase.storage.from('foto-temuan').upload(path, photo, { contentType: photo.type });
    if (upload.error) { setSaving(false); setNotice('Foto belum berhasil diunggah. Periksa Storage dan coba lagi.'); return; }
    const { data, error } = await supabase.rpc('buat_laporan_temuan_uc07', {
      p_barang_nama: name, p_barang_kategori: category, p_deskripsi: description,
      p_barang_merek: brand, p_lokasi: location, p_tanggal_penemuan: date || null,
      p_foto_path: path, p_pertanyaan: questions, p_jawaban: answers,
    }).single();
    if (error || !data) {
      const { error: cleanupError } = await supabase.storage.from('foto-temuan').remove([path]);
      setSaving(false);
      setNotice(cleanupError ? 'Laporan gagal disimpan dan foto belum dapat dibersihkan. Hubungi pengelola.' : 'Laporan gagal disimpan. Pastikan data lengkap dan tidak ada laporan yang masih menunggu penyerahan.');
      return;
    }
    setSaved(data as {nomor_laporan: string; pos_nama: string; batas_penyerahan: string});
    setSaving(false); setStep(5);
  }

  function lanjut(event: FormEvent) {
    event.preventDefault();
    if (step === 1 && (!name.trim() || !category || !photo || !date)) { setNotice('Lengkapi nama barang, kategori, foto, dan tanggal penemuan.'); return; }
    if (step === 2 && !location.trim()) { setNotice('Pilih lokasi penemuan.'); return; }
    if (step === 3 && [...questions, ...answers].some(value => !value.trim())) { setNotice('Lengkapi dua pertanyaan dan jawabannya.'); return; }
    setNotice(''); setStep(step + 1);
  }
  function ubah(values: string[], set: (next: string[]) => void, index: number, value: string) {
    const next = [...values]; next[index] = value; set(next);
  }
  return <main className="phone">
    <header><button className="back" type="button" aria-label="Kembali" onClick={() => { if (step === 5) return; setStep(Math.max(1, step - 1)); setNotice(''); }}><img src="/icons/5ce6a.svg" alt="" /></button><h1>{step === 4 ? 'Barang Serupa' : step === 5 ? 'Laporan Berhasil' : 'Lapor Temuan'}</h1></header>
    <form onSubmit={lanjut}>
      {step < 4 && <div className="content">
        <div className="progress"><div className="steps">{[1,2,3].map(n => <span key={n} className={step === n ? 'active' : ''}>{n}</span>)}</div><strong>LANGKAH {step} DARI 3 - {step === 1 ? 'DATA BARANG' : step === 2 ? 'LOKASI PENEMUAN' : 'PERTANYAAN VERIFIKASI'}</strong></div>
        {step === 1 && <>
          <label>Nama Barang <i>*</i><input value={name} onChange={e => setName(e.target.value)} placeholder="Nama barang" /></label>
          <fieldset><legend>Kategori <i>*</i></legend><div className="categories">{categories.map(item => <button type="button" key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></fieldset>
          <label>Deskripsi Barang<textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Deskripsi barang" /></label>
          <label>Merek dan Tipe (tambahan)<input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Opsional" /><small>Hanya untuk pencocokan, tidak ditampilkan ke publik.</small></label>
          <label>Foto Barang <i>*</i><span className="upload">{photo ? photo.name : 'Tambah foto barang'}</span><input className="file" id="found-photo" type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} /></label>
          <div className="photo-actions"><label htmlFor="found-photo">Dari Galeri</label><label htmlFor="found-photo">Ambil Foto</label></div>
          <label>Tanggal penemuan<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
        </>}
        {step === 2 && <><p className="intro">Pilih satu lokasi tempat barang ditemukan di lingkungan kampus ITS.</p><img className="map" src="/uc07/ef45d.png" alt="Peta lokasi" /><label>Gedung / Area <i>*</i><select value={location} onChange={e => setLocation(e.target.value)}><option value="">Pilih lokasi</option>{lokasiOptions.map(x => <option key={x} value={x}>{x}</option>)}</select></label><p className="hint">Pastikan lokasi sesuai dengan tempat kamu menemukan barang, bukan lokasi penyerahan.</p></>}
        {step === 3 && <><h2 className="text-sm font-bold text-[#073a75]">PERTANYAAN VERIFIKASI</h2><p className="intro">Buat dua pertanyaan dan jawaban untuk membantu petugas memverifikasi kepemilikan barang.</p>{[0,1].map(i => <div key={i} className="summary"><strong>Pertanyaan {i + 1}</strong><label>Pertanyaan <i>*</i><input value={questions[i]} onChange={e => ubah(questions, setQuestions, i, e.target.value)} /></label><label>Jawaban <i>*</i><input value={answers[i]} onChange={e => ubah(answers, setAnswers, i, e.target.value)} /></label></div>)}<p className="hint">Dua pertanyaan dan jawaban wajib diisi. Jawaban bersifat privat.</p></>}
      </div>}
      {step === 4 && <div className="content"><BarangSerupa nama={name} kategori={category} lokasi={[location]} asal="uc07" onLanjut={() => { void simpan(); }} onPilih={() => setNotice('Pencatatan kecocokan belum tersedia.')} /></div>}
      {step === 5 && saved && <div className="content result report-preview"><div className="success-ring"><div className="success-icon"><img src="/icons/24f50.svg" alt="" /></div></div><h2 className="success-title">Laporan Temuan Berhasil Dibuat</h2><div className="summary"><strong>Ringkasan Laporan</strong><span className="status">Menunggu Penyerahan</span><dl><dt>Nama barang</dt><dd>{name}</dd><dt>Nomor laporan</dt><dd>{saved.nomor_laporan}</dd><dt>Pertanyaan verifikasi</dt><dd>Draf</dd><dt>Pos Drop-off</dt><dd>{saved.pos_nama}</dd><dt>Batas penyerahan</dt><dd>{new Date(saved.batas_penyerahan).toLocaleString('id-ID', {timeZone:'Asia/Jakarta'})} WIB</dd></dl></div><Link href="/">Kembali ke Beranda</Link></div>}
      <div className="actions">{notice && <p className="notice" role="status">{notice}</p>}{step < 4 && <button type="submit">LANJUT</button>}</div>
    </form>
    <nav aria-label="Navigasi utama">{nav.map(([icon, label, href]) => <div key={label} className={label === 'Laporan' ? 'current' : ''}><Link href={href}><img src={'/icons/' + icon + '.svg'} alt="" /><span>{label}</span></Link></div>)}</nav>
  </main>;
}
