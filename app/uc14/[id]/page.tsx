'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ambilRepositori, type LampiranBukti } from '../../../lib/fits/repositori';
import { type InfoPublik, type PertanyaanPublik } from '../../../lib/fits/tipe';
import { KepalaHalaman, NavBawah } from '../../komponen/umum';
import { FormVerifikasi } from '../../komponen/verifikasi';

// UC-14: Halaman Verifikasi Kepemilikan (Mengisi Jawaban Verifikasi Rahasia)
export default function HalamanJawabanVerifikasi() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [laporan, setLaporan] = useState<InfoPublik | null>(null);
  const [pertanyaan, setPertanyaan] = useState<PertanyaanPublik[] | null>(null);

  useEffect(() => {
    const repo = ambilRepositori();
    repo.ambilLaporanPublik(id).then(res => {
      if (res) setLaporan(res.info);
    });
    repo.ambilPertanyaan(id).then(setPertanyaan);
  }, [id]);

  async function kirimJawaban(jawaban: Record<string, string>, bukti: LampiranBukti[]) {
    const klaim = await ambilRepositori().ajukanKlaim(id, jawaban, bukti);
    router.push(`/uc13/${klaim.nomorPengajuanKlaim}`);
  }

  return (
    <main className="view-phone">
      {/* Header dengan tombol kembali (UC-14 Alternate 1) */}
      <KepalaHalaman
        judul="Verifikasi Kepemilikan"
        kembali={`/uc12/${id}`}
        labelKembali="Kembali ke Detail Barang"
      />

      {!pertanyaan || !laporan ? (
        <section className="view-content" aria-busy="true" />
      ) : (
        <FormVerifikasi
          barang={{ nama: laporan.namaBarang, kategori: laporan.kategori, foto: laporan.fotoBarang }}
          pertanyaan={pertanyaan}
          onKirim={kirimJawaban}
        />
      )}

      <NavBawah aktif="Temuan" />
    </main>
  );
}
