'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { formatWaktuPengajuan } from '../../../lib/fits/klaim';
import { ambilRepositori, type DetailKlaim } from '../../../lib/fits/repositori';
import { KepalaHalaman, NavBawah, Pemberitahuan } from '../../komponen/umum';

type Muatan = DetailKlaim | null | undefined; // undefined = masih memuat

function StatusKlaim() {
  const { nomor } = useParams<{ nomor: string }>();
  const params = useSearchParams();
  const [muatan, setMuatan] = useState<Muatan>(undefined);

  useEffect(() => {
    let aktif = true;
    setMuatan(undefined);
    async function muat() {
      const detail = await ambilRepositori().ambilDetailKlaim(nomor);
      if (aktif) setMuatan(detail);
    }
    void muat().catch(() => { if (aktif) setMuatan(null); });
    return () => { aktif = false; };
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
  const sudahDiajukan = params.get('sudah') === '1';
  const konfirmasi = params.get('diajukan') === '1' && klaim.status === 'Diajukan';
  const detail = `/uc12/${info.id}`;
  const statusUrl = `/uc13/${encodeURIComponent(klaim.nomorPengajuanKlaim)}`;

  return (
    <main className="view-phone">
      <KepalaHalaman judul="Status Klaim" kembali={detail} labelKembali="Kembali ke Detail Barang" />

      <section className={`view-content ${konfirmasi ? 'status-klaim' : 'status-detail-klaim'}`}>
        {konfirmasi && <>
          <div className="sukses-ring">
            <div className="sukses-ikon">
              <img src="/uc12/centang.svg" alt="" />
            </div>
          </div>
          <h2 className="sukses-judul">Klaim Berhasil Diajukan</h2>
          <p className="sukses-sub">
            Pengajuan klaim kamu berhasil dikirim dan menunggu verifikasi Petugas.
          </p>
        </>}

        <article className="status-kartu-barang">
          <div className="status-barang-top">
            <img className="status-barang-foto" src={info.fotoBarang} alt={info.namaBarang} />
            <div className="status-barang-info">
              <h3>{info.namaBarang}</h3>
              <p>{info.kategori}</p>
              <div className="status-klaim-baris">
                {konfirmasi && <span>Status Klaim</span>}
                <span className="lencana-klaim">{klaim.status}</span>
              </div>
            </div>
          </div>

          {konfirmasi && <>
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
          </>}
        </article>

        {!konfirmasi && <>
          <article className="status-kartu-barang">
            <div className="status-nomor">
              <span>Nomor Pengajuan Klaim</span>
              <strong>{klaim.nomorPengajuanKlaim}</strong>
            </div>
            <p className="status-waktu">{formatWaktuPengajuan(klaim.waktuPengajuan)}</p>
          </article>
          <article className="status-kartu-pos">
            <h3>Informasi Klaim</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="status-nomor"><span>Status Klaim</span><strong>{klaim.status}</strong></div>
              <div className="status-nomor"><span>Status Laporan</span><strong>{info.statusLaporan}</strong></div>
            </div>
          </article>
          {sudahDiajukan && (
            <Pemberitahuan judul="Klaim Sudah Diajukan">Kamu bisa memantau statusnya dengan nomor pengajuan di atas.</Pemberitahuan>
          )}
          {klaim.status === 'Diajukan' && <Pemberitahuan>Klaim menunggu pemeriksaan Petugas.</Pemberitahuan>}
        </>}

        {posDropOff.nama && <article className="status-kartu-pos">
          <h3>Pos Drop-off Tujuan</h3>
          <div className="pos-dropoff-row">
            <span className="pos-ikon">
              <img src="/uc12/pos.svg" alt="" />
            </span>
            <strong>{posDropOff.nama}</strong>
          </div>
        </article>}

        {konfirmasi && <p className="status-pos-note">Simpan nomor klaim untuk verifikasi Petugas.</p>}
        {!konfirmasi && posDropOff.nama && klaim.status === 'Diajukan' && (
          <Pemberitahuan>Ikuti prosedur verifikasi kepemilikan di Pos Drop-off sebelum penyerahan barang.</Pemberitahuan>
        )}
      </section>

      <div className="actions status-actions-group">
        {konfirmasi ? <>
          <Link href={statusUrl} className="tombol-utama">Lihat Status Klaim</Link>
          <Link href="/" className="tombol-sekunder">Kembali ke Beranda</Link>
        </> : <Link href={detail} className="tombol-utama">Kembali ke Detail Barang</Link>}
      </div>

      <NavBawah aktif="Laporan" />
    </main>
  );
}

export default function HalamanStatusKlaim() {
  return <Suspense fallback={null}><StatusKlaim /></Suspense>;
}
