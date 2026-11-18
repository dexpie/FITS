'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ambilRepositori, type LampiranBukti } from '../../../lib/fits/repositori';
import { type InfoPublik, type PertanyaanPublik } from '../../../lib/fits/tipe';
import { isDapatDiklaim } from '../../../lib/fits/laporan-temuan';
import { ambilKlienSupabase } from '../../../lib/supabase/klien';
import { KepalaHalaman, NavBawah, Pemberitahuan } from '../../komponen/umum';
import { FormVerifikasi } from '../../komponen/verifikasi';

// UC-14: Halaman Verifikasi Kepemilikan (Mengisi Jawaban Verifikasi Rahasia)
export default function HalamanJawabanVerifikasi() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [muatan, setMuatan] = useState<{ laporan: InfoPublik; pertanyaan: PertanyaanPublik[] } | null>(null);
  const [galat, setGalat] = useState('');
  const detail = `/uc12/${id}`;

  useEffect(() => {
    let aktif = true;
    setMuatan(null);
    setGalat('');

    async function muat() {
      const { data: { user } } = await ambilKlienSupabase().auth.getUser();
      if (!aktif) return;
      if (!user) {
        router.replace(`/uc02?next=${encodeURIComponent(detail)}`);
        return;
      }

      const repo = ambilRepositori();
      const [laporan, klaimLama, pertanyaan] = await Promise.all([
        repo.ambilLaporanPublik(id), repo.cariKlaimDiajukan(id), repo.ambilPertanyaan(id),
      ]);
      if (!aktif) return;
      if (klaimLama) {
        router.replace(`/uc13/${encodeURIComponent(klaimLama.nomorPengajuanKlaim)}?sudah=1`);
        return;
      }
      if (!laporan || !isDapatDiklaim(laporan.info.statusLaporan)) {
        setGalat('Barang ini belum dapat diklaim.');
        return;
      }
      if (laporan.milikSendiri) {
        setGalat('Kamu tidak dapat mengklaim barang dari laporanmu sendiri.');
        return;
      }
      if (pertanyaan.length !== 2) {
        setGalat('Pertanyaan verifikasi untuk barang ini belum tersedia.');
        return;
      }
      setMuatan({ laporan: laporan.info, pertanyaan });
    }

    void muat().catch(() => { if (aktif) setGalat('Form verifikasi belum bisa dimuat. Coba lagi dari detail barang.'); });
    return () => { aktif = false; };
  }, [id, detail, router]);

  async function kirimJawaban(jawaban: Record<string, string>, bukti: LampiranBukti[]) {
    const klaim = await ambilRepositori().ajukanKlaim(id, jawaban, bukti);
    router.push(`/uc13/${encodeURIComponent(klaim.nomorPengajuanKlaim)}?diajukan=1`);
  }

  return (
    <main className="view-phone">
      {/* Header dengan tombol kembali (UC-14 Alternate 1) */}
      <KepalaHalaman
        judul="Verifikasi Kepemilikan"
        kembali={detail}
        labelKembali="Kembali ke Detail Barang"
      />

      {muatan ? (
        <FormVerifikasi
          barang={{ nama: muatan.laporan.namaBarang, kategori: muatan.laporan.kategori, foto: muatan.laporan.fotoBarang }}
          pertanyaan={muatan.pertanyaan}
          onKirim={kirimJawaban}
        />
      ) : galat ? <section className="view-content">
        <Pemberitahuan nada="bahaya">{galat}</Pemberitahuan>
        <Link className="tombol-utama" href={detail}>Kembali ke Detail Barang</Link>
      </section> : <section className="view-content" aria-busy="true">Memuat pertanyaan verifikasi...</section>}

      <NavBawah aktif="Temuan" />
    </main>
  );
}
