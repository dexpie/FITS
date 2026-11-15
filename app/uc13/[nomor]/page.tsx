'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatWaktuPengajuan } from '../../../lib/fits/klaim';
import { ambilRepositori, type DetailKlaim } from '../../../lib/fits/repositori';
import { KepalaHalaman, NavBawah, Pemberitahuan } from '../../komponen/umum';

type Muatan = DetailKlaim | null | undefined; // undefined = masih memuat

// UC-13: Halaman Status Klaim. Dibuka otomatis setelah UC-14 dikirim (/uc14/[id] -> /uc13/[nomor]).
// Parameter ?sudah=1 datang dari Detail Barang bila klaim untuk laporan ini sudah diajukan sebelumnya.
export default function HalamanStatusKlaim() {
  const { nomor } = useParams<{ nomor: string }>();
  const [muatan, setMuatan] = useState<Muatan>(undefined);
  const [sudahDiajukan, setSudahDiajukan] = useState(false);

  useEffect(() => {
    setSudahDiajukan(new URLSearchParams(window.location.search).get('sudah') === '1');
    ambilRepositori().ambilDetailKlaim(nomor).then(setMuatan, galat => {
      console.error(galat);
      setMuatan(null);
    });
  }, [nomor]);

  if (muatan === undefined) {
    return (
      <main className="view-phone">
        <KepalaHalaman judul="Status Klaim" kembali="/uc12" labelKembali="Kembali ke Barang Temuan" />
        <section className="view-content" aria-busy="true" />
        <NavBawah aktif="Laporan" />
      </main>
    );
  }

  if (muatan === null) {
    return (
      <main className="view-phone">
        <KepalaHalaman judul="Status Klaim" kembali="/uc12" labelKembali="Kembali ke Barang Temuan" />
        <section className="view-content">
          <div className="hasil-kosong">
            <div>
              <h2>Klaim Tidak Ditemukan</h2>
              <p>Nomor pengajuan klaim ini tidak tersedia.</p>
            </div>
            <Link href="/uc12">Kembali ke Barang Temuan</Link>
          </div>
        </section>
        <NavBawah aktif="Laporan" />
      </main>
    );
  }

  const { klaim, info, posDropOff } = muatan;

  return (
    <main className="view-phone">
      <KepalaHalaman judul="Status Klaim" kembali="/uc12" labelKembali="Kembali ke Barang Temuan" />

      <section className="view-content status-klaim">
        <div className="sukses-ring">
          <div className="sukses-ikon">
            <img src="/uc12/centang.svg" alt="" />
          </div>
        </div>

        <h2 className="sukses-judul">{sudahDiajukan ? 'Klaim Sudah Diajukan' : 'Klaim Berhasil Diajukan'}</h2>
        <p className="sukses-sub">
          {sudahDiajukan
            ? 'Barang ini sudah pernah diklaim dan menunggu verifikasi Petugas.'
            : 'Pengajuan klaim kamu berhasil dikirim dan menunggu verifikasi Petugas.'}
        </p>

        {sudahDiajukan && (
          <Pemberitahuan nada="info">Kamu tidak perlu mengajukan klaim lagi. Pantau status melalui nomor pengajuan di bawah.</Pemberitahuan>
        )}

        {/* Kartu Barang & Status Pengajuan */}
        <article className="status-kartu-barang">
          <div className="status-barang-top">
            <img className="status-barang-foto" src={info.fotoBarang} alt={info.namaBarang} />
            <div className="status-barang-info">
              <h3>{info.namaBarang}</h3>
              <p>{info.kategori}</p>
              <div className="status-klaim-baris">
                <span>Status Klaim</span>
                <span className="lencana-klaim">{klaim.status}</span>
              </div>
            </div>
          </div>

          <div className="pemisah" />

          <div className="status-nomor">
            <span>Nomor Pengajuan Klaim</span>
            <strong>{klaim.nomorPengajuanKlaim}</strong>
          </div>
          <p className="status-waktu">{formatWaktuPengajuan(klaim.waktuPengajuan)}</p>
          <div className="status-laporan-baris">
            <span>Status Laporan</span>
            <strong>{info.statusLaporan}</strong>
          </div>
        </article>

        {/* Kartu Pos Drop-off Tujuan */}
        <article className="status-kartu-pos">
          <h3>Pos Drop-off Tujuan</h3>
          <div className="pos-dropoff-row">
            <span className="pos-ikon">
              <img src="/uc12/pos.svg" alt="" />
            </span>
            <strong>{posDropOff.nama}</strong>
          </div>
        </article>

        <p className="status-pos-note">Simpan nomor klaim untuk verifikasi Petugas.</p>
      </section>

      <div className="actions status-actions-group">
        <Link href="/uc12" className="tombol-utama">Kembali ke Barang Temuan</Link>
        <Link href="/" className="tombol-sekunder">Kembali ke Beranda</Link>
      </div>

      <NavBawah aktif="Laporan" />
    </main>
  );
}
