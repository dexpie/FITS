'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../supabase';

type Hasil = { id: string; barang_kategori: string; lokasi: string; tanggal: string | null };

export default function BarangSerupa({ nama, kategori, lokasi, asal, onLanjut, onPilih, sibuk = false }: {
  nama: string; kategori: string; lokasi: string[]; asal: 'uc05' | 'uc07';
  onLanjut: () => void; onPilih: (id: string) => void;
  sibuk?: boolean;
}) {
  const [hasil, setHasil] = useState<Hasil[]>([]);
  const [pesan, setPesan] = useState('Mencari barang serupa...');
  const [siap, setSiap] = useState(false);
  const lokasiKey = JSON.stringify(lokasi);

  useEffect(() => {
    let aktif = true;
    setSiap(false);
    async function cari() {
      if (!supabase) { setPesan('Koneksi Supabase belum dikonfigurasi.'); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setPesan('Masuk terlebih dahulu untuk memeriksa barang serupa.'); return; }
      const { data, error } = await supabase.rpc('cari_laporan_serupa', {
        p_asal: asal, p_nama: nama, p_kategori: kategori, p_lokasi: JSON.parse(lokasiKey),
      });
      if (!aktif) return;
      if (error) { setPesan('Pencarian belum berhasil. Coba lagi.'); return; }
      const ditemukan: Hasil[] = data || [];
      setHasil(ditemukan);
      setPesan(ditemukan.length ? '' : 'Belum ada barang serupa yang ditemukan.');
      setSiap(true);
    }
    void cari();
    return () => { aktif = false; };
  }, [nama, kategori, lokasiKey, asal]);

  return <div className="similar-results">
    {pesan && <p className="intro" role="status">{pesan} {pesan.startsWith('Masuk terlebih dahulu') && <Link href="/uc02">Masuk</Link>}</p>}
    {hasil.map(item => <article className="similar-card" key={item.id}>
      <div className="similar-photo" aria-label="Foto belum tersedia">▧</div>
      <div className="similar-info"><div><strong>{item.barang_kategori}</strong><p>{item.lokasi}</p><p>{item.tanggal || 'Tanggal tidak tersedia'}</p></div>
        <button type="button" disabled={sibuk} onClick={() => onPilih(item.id)}>Ini Barang yang Sama</button>
      </div>
    </article>)}
    <button className="similar-continue disabled:opacity-50" type="button" disabled={!siap || sibuk} onClick={onLanjut}>{sibuk ? 'MENYIMPAN...' : 'LANJUTKAN PELAPORAN'}</button>
  </div>;
}
