'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setMessage('Konfigurasi Supabase belum tersedia.'); return; }
    const data = new FormData(event.currentTarget);
    const email = String(data.get('identitas') || '').trim().toLowerCase();
    const isTestAccount = process.env.NODE_ENV === 'development' && email === 'cekingdot1@gmail.com';
    if (!isTestAccount && !/^[^@\s]+@(its\.ac\.id|mhs\.its\.ac\.id)$/.test(email)) {
      setMessage('Gunakan email ITS (@its.ac.id atau @mhs.its.ac.id).');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: String(data.get('password') || '') });
    if (error) { setMessage('Login gagal. Periksa email dan kata sandi.'); return; }
    router.push('/uc05');
  }
  return <main className="view-phone login-page">
    <header className="view-header"><a href="/" aria-label="Kembali"><img src="/uc02/5ce6a.svg" alt="" /></a><h1>Masuk ke Akun FITS</h1></header>
    <section className="login-content"><div className="login-intro"><div className="fits-logo">FITS</div><h2>Selamat Datang di FITS</h2><p>Masuk untuk menemukan atau melaporkan barang di lingkungan ITS.</p></div>
      <form className="login-card" onSubmit={submit}><label>Email ITS<input required type="email" name="identitas" autoComplete="username" placeholder="Masukkan email ITS" /></label><div><label>Kata Sandi<span className="password-field"><input required name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder="Masukkan kata sandi" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}><img src="/uc02/14f75.svg" alt="" /></button></span></label><button className="forgot" type="button" onClick={() => setMessage('Pemulihan kata sandi belum tersedia pada contoh ini.')}>Lupa Kata Sandi?</button></div>
        {message && <p className="login-message" role="status">{message}</p>}<button className="login-submit" type="submit">MASUK</button><p className="signup">Belum memiliki akun? <button type="button" onClick={() => setMessage('Pendaftaran akun belum tersedia pada contoh ini.')}>Daftar Akun</button></p></form>
    </section>
  </main>;
}
