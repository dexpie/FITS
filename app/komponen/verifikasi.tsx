'use client';

import { useRef, useState } from 'react';
import { isBerkasBuktiValid } from '../../lib/fits/klaim';
import type { LampiranBukti } from '../../lib/fits/repositori';
import { JENIS_BUKTI, type JenisBukti, type PertanyaanPublik } from '../../lib/fits/tipe';

type BuktiDenganPratinjau = LampiranBukti & { urlPratinjau?: string };

type Props = {
  barang: { nama: string; kategori: string; foto: string };
  pertanyaan: PertanyaanPublik[];
  // Melempar galat bila klaim gagal disimpan; pesannya ditampilkan di atas tombol kirim.
  onKirim: (jawaban: Record<string, string>, bukti: LampiranBukti[]) => Promise<void>;
};

// Jenis bukti ditebak dari nama berkas bila Pengguna tidak memilih jenisnya.
function tebakJenis(namaBerkas: string): JenisBukti {
  const nama = namaBerkas.toLowerCase();
  if (nama.includes('nota')) return 'Nota Pembelian';
  if (nama.includes('garansi')) return 'Kartu Garansi';
  if (nama.includes('kemasan')) return 'Foto Kemasan';
  return 'Foto Lama Barang';
}

function IkonGaleri() {
  return <span className="ikon-galeri"><img src="/uc14/galeri.svg" alt="" width="16.6667" height="16.6667" /></span>;
}

// UC-14: Halaman Verifikasi Kepemilikan (isi + tombol Kirim Jawaban)
export function FormVerifikasi({ barang, pertanyaan, onKirim }: Props) {
  const [jawaban, setJawaban] = useState<Record<string, string>>(() => Object.fromEntries(pertanyaan.map(p => [p.id, ''])));
  const [kosong, setKosong] = useState<Set<string>>(new Set());
  const [pilihBukti, setPilihBukti] = useState(false);
  const [jenisDipilih, setJenisDipilih] = useState<JenisBukti | null>(null);
  const [bukti, setBukti] = useState<BuktiDenganPratinjau | null>(null);
  const [galatBukti, setGalatBukti] = useState('');
  const [sedangKirim, setSedangKirim] = useState(false);
  const [galatKirim, setGalatKirim] = useState('');
  const inputBuktiRef = useRef<HTMLInputElement>(null);

  function ubahJawaban(idPertanyaan: string, nilai: string) {
    setJawaban(prev => ({ ...prev, [idPertanyaan]: nilai }));
    if (nilai.trim()) {
      setKosong(prev => {
        const baru = new Set(prev);
        baru.delete(idPertanyaan);
        return baru;
      });
    }
  }

  function bukaPilihanBukti() {
    setJenisDipilih(bukti?.jenis ?? null);
    setGalatBukti('');
    setPilihBukti(true);
  }

  // UC-14 Alternate 2: Pengguna melampirkan Bukti Pendukung
  function tambahBukti(berkas: FileList | null) {
    const f = berkas?.[0];
    if (!f) return;
    if (!isBerkasBuktiValid(f.type)) {
      setGalatBukti('Bukti Pendukung harus berupa gambar atau PDF.');
      return;
    }
    if (bukti?.urlPratinjau) URL.revokeObjectURL(bukti.urlPratinjau);
    const urlPratinjau = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
    setBukti({ jenis: jenisDipilih ?? tebakJenis(f.name), namaBerkas: f.name, tipeBerkas: f.type, berkas: f, urlPratinjau });
    setGalatBukti('');
    setPilihBukti(false);
  }

  function hapusBukti() {
    if (bukti?.urlPratinjau) URL.revokeObjectURL(bukti.urlPratinjau);
    setBukti(null);
  }

  async function kirimJawaban() {
    // UC-14 Alternate 3: Isian yang kosong ditolak dan ditandai
    const belumDiisi = new Set(pertanyaan.filter(p => !jawaban[p.id]?.trim()).map(p => p.id));
    setKosong(belumDiisi);
    if (belumDiisi.size > 0) return;

    setSedangKirim(true);
    setGalatKirim('');
    try {
      await onKirim(jawaban, bukti ? [{ jenis: bukti.jenis, namaBerkas: bukti.namaBerkas, tipeBerkas: bukti.tipeBerkas, berkas: bukti.berkas }] : []);
    } catch (e) {
      setGalatKirim(e instanceof Error ? e.message : 'Klaim gagal dikirim.');
      setSedangKirim(false);
    }
  }

  return (
    <>
      <section className={`view-content verifikasi-form${pilihBukti ? ' ringkas' : ''}`}>
        {/* Ringkasan barang yang diklaim */}
        <div className="ringkasan-barang">
          <img src={barang.foto} alt={`Foto ${barang.nama}`} />
          <div>
            <h3>{barang.nama}</h3>
            <span>{barang.kategori}</span>
          </div>
        </div>

        <div className="verifikasi-info" role="note">
          <img src="/uc12/info-biru.svg" alt="" />
          <p>Jawab pertanyaan berikut untuk membantu Petugas memeriksa kepemilikan barang.</p>
        </div>

        {/* Daftar Pertanyaan Verifikasi (dari v_pertanyaan_publik) */}
        {pertanyaan.map((p, i) => (
          <div className={`verifikasi-kartu${kosong.has(p.id) ? ' ada-galat' : ''}`} key={p.id}>
            <span className="verifikasi-heading">Pertanyaan {i + 1}</span>
            <h4>{p.teks}</h4>
            <div className="isian-jawaban">
              <label htmlFor={`jawaban-${p.id}`}>
                Jawaban {i + 1}<i> *</i>
              </label>
              <input
                id={`jawaban-${p.id}`}
                type="text"
                value={jawaban[p.id] ?? ''}
                onChange={e => ubahJawaban(p.id, e.target.value)}
                aria-invalid={kosong.has(p.id) || undefined}
                aria-describedby={kosong.has(p.id) ? `galat-${p.id}` : undefined}
              />
              {kosong.has(p.id) && <small className="galat-teks" id={`galat-${p.id}`}>Jawaban wajib diisi.</small>}
            </div>
          </div>
        ))}

        <p className="verifikasi-catatan-rahasia">
          Jawaban bersifat rahasia dan hanya digunakan untuk pemeriksaan kepemilikan oleh Petugas.
        </p>

        {/* Bukti Pendukung (UC-14 Alternate 2) */}
        <div className={`verifikasi-bukti${bukti || pilihBukti ? ' terisi' : ''}`}>
          <strong>Bukti Pendukung (Opsional)</strong>

          {pilihBukti ? (
            <div className="pilihan-bukti">
              <strong>Tambahkan Bukti Pendukung</strong>
              <p>Lampirkan bukti tambahan yang dapat membantu pemeriksaan kepemilikan.</p>
              <div className="jenis-bukti">
                {JENIS_BUKTI.map(jenis => (
                  <button
                    type="button"
                    key={jenis}
                    className={jenisDipilih === jenis ? 'dipilih' : ''}
                    aria-pressed={jenisDipilih === jenis}
                    onClick={() => setJenisDipilih(jenisDipilih === jenis ? null : jenis)}
                  >
                    {jenis}
                  </button>
                ))}
              </div>
              <button type="button" className="unggah-bukti" onClick={() => inputBuktiRef.current?.click()}>
                <IkonGaleri />
                Unggah Bukti
              </button>
              <small>Gambar atau PDF</small>
              {galatBukti && <small className="galat-teks" role="alert">{galatBukti}</small>}
            </div>
          ) : bukti ? (
            <>
              <div className="bukti-terlampir">
                <div className="bukti-thumb">
                  {bukti.urlPratinjau ? <img src={bukti.urlPratinjau} alt="" /> : <IkonGaleri />}
                </div>
                <div className="bukti-info">
                  <strong>{bukti.namaBerkas}</strong>
                  <div>
                    <span>{bukti.jenis}</span>
                    <button type="button" className="bukti-aksi-ganti" onClick={bukaPilihanBukti}>Ganti</button>
                    <button type="button" className="bukti-aksi-hapus" onClick={hapusBukti}>Hapus</button>
                  </div>
                </div>
              </div>
              <span className="bukti-sukses-pesan" role="status">Bukti pendukung berhasil ditambahkan.</span>
            </>
          ) : (
            <button type="button" className="upload-bukti-btn" onClick={bukaPilihanBukti}>
              <IkonGaleri />
              Tambahkan Bukti Pendukung
            </button>
          )}

          <input
            ref={inputBuktiRef}
            type="file"
            className="file"
            accept="image/*,application/pdf"
            onChange={e => {
              tambahBukti(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <div className="actions">
        {galatKirim && <small className="galat-teks galat-kirim" role="alert">{galatKirim}</small>}
        <button type="button" onClick={kirimJawaban} disabled={sedangKirim}>
          {sedangKirim ? 'Mengirim...' : 'Kirim Jawaban'}
        </button>
      </div>
    </>
  );
}
