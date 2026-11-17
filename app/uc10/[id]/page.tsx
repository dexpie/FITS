'use client';

// UC-10 Memperpanjang Laporan: Halaman Perpanjang Laporan (insert page).
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ambilLaporan, bolehDiperpanjang, formatTanggal, perpanjang, pilihanDurasi } from '../repository';
import type { LaporanPerpanjangan } from '../types';

export default function PerpanjangLaporan() {
  const { id } = useParams<{ id: string }>();
  const [laporan, setLaporan] = useState<LaporanPerpanjangan | null | 'belum-masuk' | undefined>(undefined);
  const [durasi, setDurasi] = useState<number | null>(null);
  const [catatan, setCatatan] = useState('');
  const [galat, setGalat] = useState('');
  const [berhasil, setBerhasil] = useState('');
  const [proses, setProses] = useState(false);

  useEffect(() => { ambilLaporan(id).then(setLaporan); }, [id]);

  const detail = `/uc08/${id}?jenis=Kehilangan`;

  async function konfirmasi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!durasi) { setGalat('Pilih durasi perpanjangan.'); return; }
    setProses(true); setGalat('');
    const hasil = await perpanjang(id, durasi, catatan);
    setProses(false);
    if (hasil.status === 'galat') { setGalat(hasil.pesan); return; }
    setBerhasil(hasil.tanggalBaru);
  }

  return <main className="view-phone uc10">
    <header className="view-header"><Link href={detail} aria-label="Kembali ke Detail Laporan"><img src="/uc10/arrow-left.svg" alt="" /></Link><h1>Perpanjang Laporan</h1></header>
    <section className="view-content">
      {laporan === undefined && <p className="m-0 text-xs text-gray-500">Memuat laporan...</p>}
      {laporan === 'belum-masuk' && <p className="m-0 text-xs text-gray-500">Masuk terlebih dahulu. <Link href="/uc02">Masuk</Link></p>}
      {laporan === null && <p className="m-0 text-xs text-gray-500">Laporan tidak ditemukan.</p>}
      {laporan && laporan !== 'belum-masuk' && (berhasil ? <div className="flex flex-col gap-2.5 rounded-xl border border-green-200 bg-green-100 p-3.5 [&_strong]:text-green-800 [&_p]:m-0 [&_p]:text-[13px]" role="status">
        <strong>Perpanjangan laporan berhasil</strong>
        <p>Laporan {laporan.barang_nama} aktif sampai <b>{berhasil}</b>.</p>
        <Link href={detail} className="grid min-h-12 cursor-pointer place-items-center rounded-lg border-0 bg-[#ffcc29] text-sm font-bold text-gray-800 no-underline disabled:bg-[#e1e4e9] disabled:text-gray-500">Kembali ke Detail Laporan</Link>
      </div> : !bolehDiperpanjang(laporan) ? <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 [&_img]:h-5 [&_img]:w-5 [&_div]:flex [&_div]:flex-col [&_div]:gap-1.5 [&_div]:text-xs [&_a]:font-bold [&_a]:text-[#073a75]">
        <img src="/uc10/jam-peringatan.svg" alt="" />
        <div><strong>{laporan.status_laporan === 'Kadaluarsa' || laporan.sisa_hari < 0 ? 'Laporan Sudah Kadaluarsa' : 'Laporan Belum Bisa Diperpanjang'}</strong>
          <span>Perpanjangan hanya untuk laporan Aktif yang masa aktifnya tinggal 3 hari atau kurang.</span>
          <Link href={detail}>Kembali ke Detail Laporan</Link></div>
      </div> : <form className="flex flex-col gap-3.5" onSubmit={konfirmasi}>
        <div className="flex flex-col gap-1 rounded-xl border border-[#dde1e7] bg-white p-3 [&>span]:text-[11px] [&>span]:text-gray-500 [&>strong]:text-[15px]">
          <span>{laporan.nomor_laporan}</span><strong>{laporan.barang_nama}</strong>
          <div className="mt-1.5 flex justify-between border-t border-[#dde1e7] pt-2 text-xs"><span>Tanggal Kadaluarsa Saat Ini</span><b>{formatTanggal(laporan.tanggal_kadaluarsa)}</b></div>
        </div>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 [&_legend]:mb-2 [&_legend]:text-[13px] [&_legend]:font-semibold [&_label]:flex [&_label]:cursor-pointer [&_label]:items-center [&_label]:gap-2.5 [&_label]:rounded-[10px] [&_label]:border [&_label]:border-[#dde1e7] [&_label]:bg-white [&_label]:p-3 [&_input]:!m-0 [&_input]:!h-4 [&_input]:!w-4 [&_input]:accent-[#073a75] [&_span]:flex [&_span]:flex-1 [&_span]:flex-col [&_span]:gap-0.5 [&_span]:text-[13px] [&_small]:text-[11px] [&_small]:text-gray-500 [&_img]:h-[18px] [&_img]:w-[18px]">
          <legend>Pilih Durasi Perpanjangan</legend>
          {pilihanDurasi(laporan).map((p) => <label key={p.hari} className={durasi === p.hari ? '!border-[#073a75] !bg-[#edf3fa]' : ''}>
            <input type="radio" name="durasi" value={p.hari} checked={durasi === p.hari} onChange={() => setDurasi(p.hari)} />
            <span><b>{p.hari} hari</b><small>Aktif sampai {p.tanggalBaru}</small></span>
            {durasi === p.hari && <img src="/uc10/check-pilihan.svg" alt="" />}
          </label>)}
        </fieldset>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold [&_textarea]:!rounded-lg [&_textarea]:border [&_textarea]:border-[#dde1e7] [&_textarea]:!p-2.5 [&_textarea]:!text-[13px] [&_textarea]:font-normal">Catatan Perkembangan (Opsional)
          <textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)}
            placeholder="Tambahkan informasi terbaru mengenai barang yang hilang..." />
        </label>
        {galat && <p className="m-0 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700" role="alert">{galat}</p>}
        <button type="submit" className="grid min-h-12 cursor-pointer place-items-center rounded-lg border-0 bg-[#ffcc29] text-sm font-bold text-gray-800 no-underline disabled:bg-[#e1e4e9] disabled:text-gray-500" disabled={proses}>{proses ? 'Menyimpan...' : 'Konfirmasi Perpanjangan'}</button>
      </form>)}
    </section>
  </main>;
}
