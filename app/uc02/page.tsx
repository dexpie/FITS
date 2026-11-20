'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { kunciLoginBeranda, supabase } from '../supabase';

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [gagal, setGagal] = useState(0);
  const [proses, setProses] = useState(false);
  const tolak = (pesan: string) => { setMessage(pesan); setGagal(n => n + 1); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (proses) return;
    if (!supabase) { tolak('Konfigurasi Supabase belum tersedia.'); return; }
    const data = new FormData(event.currentTarget);
    const email = String(data.get('identitas') || '').trim().toLowerCase();
    const isTestAccount = process.env.NODE_ENV === 'development' && email === 'cekingdot1@gmail.com';
    // Akun baru hanya @student.its.ac.id (UC-01); domain lama tetap boleh masuk untuk akun yang sudah ada.
    if (!isTestAccount && !/^[^@\s]+@(student\.its\.ac\.id|its\.ac\.id|mhs\.its\.ac\.id)$/.test(email)) {
      tolak('Gunakan email ITS (@student.its.ac.id).');
      return;
    }
    setMessage('');
    setProses(true);
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password: String(data.get('password') || '') });
    setProses(false);
    if (error || !user) { tolak('Login gagal. Periksa email dan kata sandi.'); return; }
    const next = new URLSearchParams(window.location.search).get('next');
    const tujuan = next && /^\/(?![/\\])/.test(next) && !/[\\\s]/.test(next) ? next : '/';
    if (tujuan === '/') sessionStorage.setItem(kunciLoginBeranda, user.id);
    router.replace(tujuan);
  }
  return <main className="view-phone login-page">
    <header className="view-header"><a href="/" aria-label="Kembali"><img src="/uc02/5ce6a.svg" alt="" /></a><h1>Masuk ke Akun FITS</h1></header>
    <section className="login-content"><div className="login-intro"><div className="fits-logo">FITS</div><h2>Selamat Datang di FITS</h2><p>Masuk untuk menemukan atau melaporkan barang di lingkungan ITS.</p></div>
      <form className="login-card" onSubmit={submit}><label>Email ITS<input required type="email" name="identitas" autoComplete="username" placeholder="Masukkan email ITS" /></label><div><label>Kata Sandi<span className="password-field"><input required name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder="Masukkan kata sandi" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}><img src="/uc02/14f75.svg" alt="" /></button></span></label><button className="forgot" type="button" onClick={() => setMessage('Pemulihan kata sandi belum tersedia pada contoh ini.')}>Lupa Kata Sandi?</button></div>
        {message && <p className="login-message" role="status">{message}</p>}<button className="login-submit" type="submit">MASUK</button><p className="signup">Belum memiliki akun? <Link className="font-semibold text-[#073a75]" href="/uc01">Daftar Akun</Link></p></form>
    </section>
  </main>;
}
