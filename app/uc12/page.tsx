'use client';

import { ambilKlienSupabase } from '../../lib/supabase/klien';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { periksaPengajuanKlaim } from '../../lib/fits/klaim';
import { formatTanggal, rentangTanggalCepat, tanggalHariIni } from '../../lib/fits/laporan-temuan';
import { ambilRepositori } from '../../lib/fits/repositori';
import type { InfoPublik, StatusLaporan } from '../../lib/fits/tipe';
import { LencanaStatus } from '../komponen/umum';

// Data Laporan Temuan dimuat dari Supabase (v_laporan_publik)
type Item = {
  id: string;
  name: string;
  category: string;
  location: string;
  date: string;
  status: StatusLaporan;
  image: string;
  description: string;
};

function keItem(info: InfoPublik): Item {
  return {
    id: info.id,
    name: info.namaBarang,
    category: info.kategori,
    location: info.lokasi,
    date: info.tanggalPenemuan,
    status: info.statusLaporan,
    image: info.fotoBarang,
    description: info.deskripsi,
  };
}

type Filters = { categories: string[]; location: string; from: string; to: string; statuses: string[] };
const emptyFilters: Filters = { categories: [], location: '', from: '', to: '', statuses: [] };

// Pilihan tanggal cepat pada Panel Filter: label dan jumlah hari mundur dari hari ini
const TANGGAL_CEPAT = [['Hari Ini', 0], ['7 Hari', 7], ['30 Hari', 30]] as const;

const nav = [
  ['c9713.svg', 'Beranda', '/'],
  ['5ab5d.svg', 'Laporan', '/uc08'],
  ['985aa.svg', 'Temuan', '/uc12'],
  ['5c528.svg', 'Profil', '/uc02'],
] as const;

const formatDate = (date: string) => formatTanggal(date);

// Barang yang sudah tidak dapat diklaim memakai tombol Detail bergaris (sesuai storyboard)
const isTidakTersedia = (status: StatusLaporan) => status === 'Selesai' || status === 'Diklaim';

export default function BarangTemuan() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [kategori, setKategori] = useState<string[]>([]);
  const [lokasi, setLokasi] = useState<string[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galatMuat, setGalatMuat] = useState('');
  const [query, setQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [newest, setNewest] = useState(true);

  // null = list, terisi = Detail Barang. Verifikasi (UC-14) dan Status Klaim (UC-13) punya halaman sendiri.
  const [selected, setSelected] = useState<Item | null>(null);

  // UC-13 Alternate 1: pembuat laporan tidak dapat mengklaim
  const [ditolakMilikSendiri, setDitolakMilikSendiri] = useState(false);

  useEffect(() => {
    const repo = ambilRepositori();
    Promise.all([repo.ambilDaftarPublik(), repo.ambilKategori(), repo.ambilLokasi()])
      .then(([daftar, daftarKategori, daftarLokasi]) => {
        setItems(daftar.map(keItem));
        setKategori(daftarKategori);
        setLokasi(daftarLokasi);
      })
      .catch((e: Error) => setGalatMuat(e.message))
      .finally(() => setMemuat(false));
  }, []);

  // Penyaringan daftar (UC-12)
  const visible = items
    .filter(i => {
      const matchQuery = i.name.toLowerCase().includes(query.trim().toLowerCase());
      const matchCat = !filters.categories.length || filters.categories.includes(i.category);
      const matchLoc = !filters.location || i.location === filters.location;
      const matchStat = !filters.statuses.length || filters.statuses.includes(i.status);
      const matchFrom = !filters.from || i.date >= filters.from;
      const matchTo = !filters.to || i.date <= filters.to;
      return matchQuery && matchCat && matchLoc && matchStat && matchFrom && matchTo;
    })
    .sort((a, b) => (newest ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  function toggleDraft(field: 'categories' | 'statuses', value: string) {
    setDraft(old => ({
      ...old,
      [field]: old[field].includes(value) ? old[field].filter(x => x !== value) : [...old[field], value],
    }));
  }

  function toggleTanggalCepat(hariMundur: number) {
    const { tanggalDari, tanggalSampai } = rentangTanggalCepat(hariMundur, tanggalHariIni());
    const sudahDipilih = draft.from === tanggalDari && draft.to === tanggalSampai;
    setDraft({ ...draft, from: sudahDipilih ? '' : tanggalDari, to: sudahDipilih ? '' : tanggalSampai });
  }

  // Chip kriteria aktif
  const activeChips: { label: string; onRemove: () => void }[] = [];
  filters.categories.forEach(cat => {
    activeChips.push({ label: cat, onRemove: () => setFilters(f => ({ ...f, categories: f.categories.filter(x => x !== cat) })) });
  });
  if (filters.location) {
    activeChips.push({ label: filters.location, onRemove: () => setFilters(f => ({ ...f, location: '' })) });
  }
  if (filters.from || filters.to) {
    const rentang = filters.from && filters.to ? `${formatDate(filters.from)} - ${formatDate(filters.to)}` : filters.from ? `Sejak ${formatDate(filters.from)}` : `Sampai ${formatDate(filters.to)}`;
    activeChips.push({ label: rentang, onRemove: () => setFilters(f => ({ ...f, from: '', to: '' })) });
  }
  filters.statuses.forEach(st => {
    activeChips.push({ label: st, onRemove: () => setFilters(f => ({ ...f, statuses: f.statuses.filter(x => x !== st) })) });
  });

  // Alur UC-13: Menekan tombol "Ajukan Klaim". Setiap tahap pindah halaman lewat URL.
  async function handleAjukanKlaim() {
    if (!selected) return;
    const { data: { user } } = await ambilKlienSupabase().auth.getUser();
    if (!user) { router.push(`/uc02?next=${encodeURIComponent(`/uc12/${selected.id}`)}`); return; }
    const repo = ambilRepositori();
    const [laporan, klaimLama] = await Promise.all([repo.ambilLaporanPublik(selected.id), repo.cariKlaimDiajukan(selected.id)]);
    if (!laporan) return;
    const periksa = periksaPengajuanKlaim({ statusLaporan: laporan.info.statusLaporan, milikSendiri: laporan.milikSendiri, klaimLama });

    // Alternate 1: Pembuat laporan tidak dapat mengklaim
    if (periksa.hasil === 'milik-sendiri') {
      setDitolakMilikSendiri(true);
      return;
    }

    // Alternate 2: Sudah memiliki klaim Diajukan atas laporan ini
    if (periksa.hasil === 'sudah-diajukan') {
      router.push(`/uc13/${periksa.klaim.nomorPengajuanKlaim}?sudah=1`);
      return;
    }
    if (periksa.hasil !== 'lanjut') return;

    // Basic Flow: Masuk ke UC-14 (Mengisi Jawaban Verifikasi)
    router.push(`/uc14/${selected.id}`);
  }

  // Reset pilihan & kembali ke daftar
  function resetKeDaftar() {
    setSelected(null);
    setDitolakMilikSendiri(false);
  }

  return (
    <main className="view-phone temuan-page">
      {/* ========================================================
          1. HEADER
          ======================================================== */}
      <header className="view-header">
        {selected ? (
          <button
            type="button"
            className="back"
            onClick={resetKeDaftar}
            aria-label="Kembali"
          >
            <img src="/uc12/5ce6a.svg" alt="" />
          </button>
        ) : (
          <Link href="/" aria-label="Kembali ke Beranda">
            <img src="/uc12/5ce6a.svg" alt="" />
          </Link>
        )}
        <h1>{selected ? 'Detail Barang' : 'Barang Temuan'}</h1>
      </header>

      {/* ========================================================
          2. KONTEN HALAMAN
          ======================================================== */}
      {!selected ? (
        /* --------------------------------------------------------
           TAMPILAN: Halaman Barang Temuan (UC-12)
           -------------------------------------------------------- */
        <section className="temuan-content">
          <div className="area-filter">
            <div className="search-row">
              <div className="search-box">
                <img src="/uc12/b93aa.svg" alt="" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Cari barang..."
                  aria-label="Cari barang"
                />
                {query && (
                  <button type="button" className="hapus-cari" onClick={() => setQuery('')} aria-label="Hapus pencarian">
                    ×
                  </button>
                )}
              </div>
              <button
                type="button"
                className={'filter-toggle' + (activeChips.length ? ' aktif' : '')}
                aria-label={activeChips.length ? 'Buka filter (ada filter aktif)' : 'Buka filter'}
                onClick={() => {
                  setDraft(filters);
                  setFilterOpen(true);
                }}
              >
                <img src={activeChips.length ? '/uc12/filter-aktif.svg' : '/uc12/92e2c.svg'} alt="" />
              </button>
            </div>

            {/* Chip Kriteria Aktif (UC-12 Alternate 2) */}
            {activeChips.length > 0 && (
              <div className="chip-aktif" aria-label="Kriteria aktif">
                {activeChips.map((c, i) => (
                  <button type="button" key={i} onClick={c.onRemove} aria-label={`Hapus ${c.label}`}>
                    {c.label} <span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="temuan-count">
            <span>MENAMPILKAN {visible.length} HASIL</span>
            <button type="button" onClick={() => setNewest(!newest)}>
              {newest ? 'Terbaru' : 'Terlama'}{' '}
              <img src="/uc12/2636d.svg" alt="" className={newest ? '' : 'terbalik'} />
            </button>
          </div>

          {/* Daftar Barang atau Keadaan Kosong (UC-12 Alternate 3) */}
          {memuat ? (
            <div className="temuan-list" aria-busy="true" />
          ) : galatMuat ? (
            <div className="hasil-kosong" role="alert">
              <div className="hasil-kosong-pesan">
                <h2>Data Gagal Dimuat</h2>
                <p>{galatMuat}</p>
              </div>
            </div>
          ) : visible.length === 0 ? (
            <div className="hasil-kosong">
              <div className="hasil-kosong-ikon">
                <img src="/uc12/paket-cari.svg" alt="" />
              </div>
              <div className="hasil-kosong-pesan">
                <h2>Barang Tidak Ditemukan</h2>
                <p>Belum ada barang temuan yang sesuai dengan pencarian atau filter kamu.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setFilters(emptyFilters);
                }}
              >
                Atur Ulang Filter
              </button>
            </div>
          ) : (
            <div className="temuan-list">
              {visible.map(item => (
                <article className="found-card" key={item.id}>
                  <img className="found-photo" src={item.image} alt={item.name} />
                  <div className="found-body">
                    <div>
                      <h2>{item.name}</h2>
                      <p className="found-kategori">{item.category}</p>
                      <strong>{item.location}</strong>
                      <p>{formatDate(item.date)}</p>
                    </div>
                    <div className="found-actions">
                      <LencanaStatus status={item.status} />
                      <button
                        type="button"
                        className={'tombol-detail' + (isTidakTersedia(item.status) ? ' garis' : '')}
                        onClick={() => {
                          setSelected(item);
                          setDitolakMilikSendiri(false);
                        }}
                      >
                        Detail
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* --------------------------------------------------------
           TAMPILAN: Halaman Detail Barang (UC-12 & Awal UC-13)
           -------------------------------------------------------- */
        <>
          <section className="view-content found-detail">
            <img className="found-hero" src={selected.image} alt={selected.name} />
            <div>
              <h2>{selected.name}</h2>
              <LencanaStatus status={selected.status} />
            </div>
            <div className="found-info">
              <div>
                <span>Kategori</span>
                <strong>{selected.category}</strong>
              </div>
              <div className="found-info-row">
                <div>
                  <span>Lokasi penemuan</span>
                  <strong>{selected.location}</strong>
                </div>
                <div>
                  <span>Tanggal penemuan</span>
                  <strong>{formatDate(selected.date)}</strong>
                </div>
              </div>
              <div>
                <span>Status Laporan</span>
                <strong>{selected.status}</strong>
              </div>
            </div>

            {/* UC-13 Alternate 1: Pengguna adalah pembuat laporan */}
            {ditolakMilikSendiri ? (
              <div className="pemberitahuan nada-bahaya" role="alert">
                <img src="/uc12/info-merah.svg" alt="" />
                <div>
                  <strong>Tidak Dapat Mengajukan Klaim</strong>
                  <p>Kamu tidak dapat mengklaim barang dari laporan temuan yang kamu buat sendiri.</p>
                </div>
              </div>
            ) : selected.status === 'Menunggu Penyerahan' ? (
              /* UC-13 Alternate 3: Barang masih Menunggu Penyerahan */
              <div className="pemberitahuan nada-peringatan" role="alert">
                <img src="/uc12/info-jingga.svg" alt="" />
                <div>
                  <strong>Barang Belum Tersedia</strong>
                  <p>Barang masih menunggu penyerahan ke Pos Drop-off dan belum dapat diklaim.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="found-description">
                  <strong>Deskripsi</strong>
                  <p>{selected.description}</p>
                </div>
                <p className="found-description">
                  {selected.status === 'Tersedia' || selected.status === 'Menunggu Verifikasi'
                    ? 'Barang tersedia untuk diklaim. Ajukan klaim untuk melanjutkan ke proses klaim.'
                    : 'Barang ini sudah tidak tersedia untuk diklaim.'}
                </p>
              </>
            )}
          </section>

          <div className="actions">
            {ditolakMilikSendiri ? (
              <button type="button" onClick={() => setDitolakMilikSendiri(false)}>
                Kembali ke Detail Barang
              </button>
            ) : (
              <button
                type="button"
                disabled={selected.status === 'Menunggu Penyerahan' || isTidakTersedia(selected.status)}
                onClick={handleAjukanKlaim}
              >
                Ajukan Klaim
              </button>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          3. NAVIGASI BAWAH
          ======================================================== */}
      <nav className="view-nav" aria-label="Navigasi">
        {nav.map(([icon, label, href]) => (
          <Link
            key={label}
            href={href}
            className={label === 'Temuan' ? 'active' : ''}
            aria-current={label === 'Temuan' ? 'page' : undefined}
            onClick={e => {
              if (label === 'Temuan') {
                e.preventDefault();
                resetKeDaftar();
              }
            }}
          >
            <img src={'/uc12/' + icon} alt="" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* ========================================================
          4. PANEL FILTER (MODAL BOTTOM SHEET UC-12)
          ======================================================== */}
      {filterOpen && (
        <div
          className="filter-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) setFilterOpen(false);
          }}
        >
          <section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title">
            <div className="filter-handle"><span /></div>
            <div className="filter-heading">
              <h2 id="filter-title">Filter</h2>
              <button type="button" onClick={() => setFilterOpen(false)} aria-label="Tutup filter">
                ×
              </button>
            </div>

            <div className="filter-fields">
              <div>
                <h3>Kategori</h3>
                <div className="pills">
                  {kategori.map(x => (
                    <button
                      type="button"
                      key={x}
                      className={draft.categories.includes(x) ? 'chosen' : ''}
                      aria-pressed={draft.categories.includes(x)}
                      onClick={() => toggleDraft('categories', x)}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3>Lokasi</h3>
                {/* Dropdown hanya untuk memilih; lokasi terpilih tampil sebagai chip di bawahnya */}
                <select
                  value=""
                  onChange={e => setDraft({ ...draft, location: e.target.value })}
                  aria-label="Pilih lokasi"
                >
                  <option value="">Pilih gedung / area</option>
                  {lokasi.map(x => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <div className="pills">
                  {lokasi.map(x => (
                    <button
                      type="button"
                      key={x}
                      className={draft.location === x ? 'chosen' : ''}
                      aria-pressed={draft.location === x}
                      onClick={() => setDraft({ ...draft, location: draft.location === x ? '' : x })}
                    >
                      {x}
                      {draft.location === x && <span aria-hidden="true">×</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3>Tanggal</h3>
                <div className="date-row">
                  {([['from', 'Dari'], ['to', 'Sampai']] as const).map(([field, label]) => (
                    <label className="input-tanggal" key={field}>
                      <span className={draft[field] ? 'terisi' : ''}>{draft[field] ? formatDate(draft[field]) : label}</span>
                      <img src="/uc12/kalender.svg" alt="" />
                      <input
                        type="date"
                        aria-label={`Tanggal ${label.toLowerCase()}`}
                        value={draft[field]}
                        onChange={e => setDraft({ ...draft, [field]: e.target.value })}
                        onClick={e => {
                          try {
                            e.currentTarget.showPicker();
                          } catch {
                            // Peramban tanpa showPicker tetap membuka pemilih lewat klik biasa
                          }
                        }}
                      />
                    </label>
                  ))}
                </div>
                <div className="pills">
                  {TANGGAL_CEPAT.map(([label, hariMundur]) => {
                    const { tanggalDari, tanggalSampai } = rentangTanggalCepat(hariMundur, tanggalHariIni());
                    const dipilih = draft.from === tanggalDari && draft.to === tanggalSampai;
                    return (
                      <button
                        type="button"
                        key={label}
                        className={dipilih ? 'chosen' : ''}
                        aria-pressed={dipilih}
                        onClick={() => toggleTanggalCepat(hariMundur)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3>Status</h3>
                <div className="pills">
                  {['Tersedia', 'Menunggu Penyerahan', 'Menunggu Verifikasi', 'Diklaim', 'Selesai'].map(x => (
                    <button
                      type="button"
                      key={x}
                      className={draft.statuses.includes(x) ? 'chosen' : ''}
                      aria-pressed={draft.statuses.includes(x)}
                      onClick={() => toggleDraft('statuses', x)}
                    >
                      {x}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-actions">
              <button
                type="button"
                onClick={() => {
                  setDraft(emptyFilters);
                  setFilters(emptyFilters);
                  setFilterOpen(false);
                }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters(draft);
                  setFilterOpen(false);
                }}
              >
                Terapkan Filter
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
