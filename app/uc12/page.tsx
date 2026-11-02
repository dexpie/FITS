'use client';

import { useState } from 'react';

const items = [
  {name:'Dompet kulit coklat',category:'Dompet/KTP',location:'DSI Lantai 2',date:'2026-09-21',status:'Tersedia',image:'4e0f2.png'},
  {name:'Kunci motor',category:'Kunci',location:'Parkiran DSI',date:'2026-09-18',status:'Menunggu Verifikasi',image:'f88cc.png'},
  {name:'Laptop abu-abu',category:'Elektronik',location:'Perpustakaan',date:'2026-09-17',status:'Selesai',image:'7eb19.png'},
  {name:'Dompet hitam',category:'Dompet/KTP',location:'DSI Lantai 2',date:'2026-09-21',status:'Menunggu Penyerahan',image:'94200.png'},
];
type Item = typeof items[number];
type Filters = {categories:string[], location:string, from:string, to:string, statuses:string[]};
const empty: Filters = {categories:[],location:'',from:'',to:'',statuses:[]};
const nav = [['c9713.svg','Beranda'],['5ab5d.svg','Laporan'],['985aa.svg','Temuan'],['5c528.svg','Profil']];
function formatDate(date:string) { const [y,m,d]=date.split('-'); return `${d} ${m === '09' ? 'Sep' : m} ${y}`; }

export default function BarangTemuan() {
  const [query,setQuery] = useState('');
  const [filterOpen,setFilterOpen] = useState(false);
  const [draft,setDraft] = useState<Filters>(empty);
  const [filters,setFilters] = useState<Filters>(empty);
  const [selected,setSelected] = useState<Item | null>(null);
  const [message,setMessage] = useState('');
  const [newest,setNewest] = useState(true);
  const visible = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()) && (!filters.categories.length || filters.categories.includes(i.category)) && (!filters.location || i.location === filters.location) && (!filters.statuses.length || filters.statuses.includes(i.status)) && (!filters.from || i.date >= filters.from) && (!filters.to || i.date <= filters.to)).sort((a,b) => newest ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  function toggle(field:'categories'|'statuses', value:string) { setDraft(old => ({...old,[field]:old[field].includes(value) ? old[field].filter(x=>x!==value) : [...old[field],value]})); }
  return <main className="view-phone temuan-page">
    <header className="view-header">{selected ? <button className="back" onClick={()=>{setSelected(null);setMessage('');}} aria-label="Kembali ke daftar"><img src="/uc12/5ce6a.svg" alt="" /></button> : <a href="/" aria-label="Kembali"><img src="/uc12/5ce6a.svg" alt="" /></a>}<h1>{selected ? 'Detail Barang' : 'Barang Temuan'}</h1></header>
    {!selected ? <section className="temuan-content"><div className="search-row"><div className="search-box"><img src="/uc12/b93aa.svg" alt="" /><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari barang..." aria-label="Cari barang" /></div><button className="filter-toggle" aria-label="Buka filter" onClick={()=>{setDraft(filters);setFilterOpen(true);}}><img src="/uc12/92e2c.svg" alt="" /></button></div>
      <div className="temuan-count"><span>MENAMPILKAN {visible.length} HASIL</span><button onClick={()=>setNewest(!newest)}>{newest ? 'Terbaru' : 'Terlama'} <img src="/uc12/2636d.svg" alt="" /></button></div>
      <div className="temuan-list">{visible.map(item=><article className="found-card" key={item.name}><img className="found-photo" src={'/uc12/'+item.image} alt={item.name} /><div className="found-body"><div><h2>{item.name}</h2><p>{item.category}</p><strong>{item.location}</strong><p>{formatDate(item.date)}</p></div><div className="found-actions"><span className={'found-status '+(item.status==='Tersedia'?'available':item.status==='Selesai'?'finished':'pending')}>{item.status}</span><button onClick={()=>setSelected(item)}>Detail</button></div></div></article>)}{!visible.length && <p className="no-results">Tidak ada barang yang sesuai. Coba ubah pencarian atau filter.</p>}</div>
    </section> : <><section className="view-content found-detail"><img className="found-hero" src={'/uc12/'+selected.image} alt={selected.name} /><div><h2>{selected.name}</h2><span className={'found-status '+(selected.status==='Tersedia'?'available':selected.status==='Selesai'?'finished':'pending')}>{selected.status}</span></div><div className="found-info"><div><span>Kategori</span><strong>{selected.category}</strong></div><div className="found-info-row"><div><span>Lokasi penemuan</span><strong>{selected.location}</strong></div><div><span>Tanggal penemuan</span><strong>{formatDate(selected.date)}</strong></div></div><div><span>Status Laporan</span><strong>{selected.status}</strong></div></div><div className="found-description"><strong>Deskripsi</strong><p>{selected.name} ditemukan di area {selected.location}.</p></div><p className="found-description">{selected.status === 'Tersedia' ? 'Barang tersedia untuk diklaim.' : 'Barang belum tersedia untuk diklaim.'}</p>{message && <p className="notice" role="status">{message}</p>}</section><div className="actions"><button disabled={selected.status !== 'Tersedia'} onClick={()=>setMessage('Pengajuan klaim belum terhubung pada versi contoh ini.')}>Ajukan Klaim</button></div></>}
    <nav className="view-nav" aria-label="Navigasi">{nav.map(([icon,label])=><div key={label} className={label==='Temuan'?'active':''}><img src={'/uc12/'+icon} alt="" /><span>{label}</span></div>)}</nav>
    {filterOpen && <div className="filter-overlay"><section className="filter-sheet" role="dialog" aria-modal="true" aria-labelledby="filter-title"><div className="filter-handle" /><div className="filter-heading"><h2 id="filter-title">Filter</h2><button onClick={()=>setFilterOpen(false)} aria-label="Tutup filter">×</button></div>
      <div className="filter-fields"><div><h3>Kategori</h3><div className="pills">{['Elektronik','Dompet/KTP','Kunci','Lainnya'].map(x=><button key={x} className={draft.categories.includes(x)?'chosen':''} onClick={()=>toggle('categories',x)}>{x}</button>)}</div></div><div><h3>Lokasi</h3><select value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}><option value="">Pilih gedung / area</option>{['DSI Lantai 2','Parkiran DSI','Perpustakaan'].map(x=><option key={x}>{x}</option>)}</select></div><div><h3>Tanggal</h3><div className="date-row"><label>Dari<input type="date" value={draft.from} onChange={e=>setDraft({...draft,from:e.target.value})}/></label><label>Sampai<input type="date" value={draft.to} onChange={e=>setDraft({...draft,to:e.target.value})}/></label></div></div><div><h3>Status</h3><div className="pills">{['Tersedia','Menunggu Penyerahan','Menunggu Verifikasi','Diklaim','Selesai'].map(x=><button key={x} className={draft.statuses.includes(x)?'chosen':''} onClick={()=>toggle('statuses',x)}>{x}</button>)}</div></div></div>
      <div className="filter-actions"><button onClick={()=>{setDraft(empty);setFilters(empty);setFilterOpen(false);}}>Reset</button><button onClick={()=>{setFilters(draft);setFilterOpen(false);}}>Terapkan Filter</button></div></section></div>}
  </main>;
}
