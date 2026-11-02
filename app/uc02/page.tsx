'use client';

import { useState, type FormEvent } from 'react';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('Halaman ini masih contoh. Login belum terhubung ke sistem akun.');
  }
  return <main className="view-phone login-page">
    <header className="view-header"><a href="/" aria-label="Kembali"><img src="/uc02/5ce6a.svg" alt="" /></a><h1>Masuk ke Akun FITS</h1></header>
    <section className="login-content"><div className="login-intro"><div className="fits-logo">FITS</div><h2>Selamat Datang di FITS</h2><p>Masuk untuk menemukan atau melaporkan barang di lingkungan ITS.</p></div>
      <form className="login-card" onSubmit={submit}><label>Email ITS atau NRP<input required name="identitas" autoComplete="username" placeholder="Masukkan email atau NRP" /></label><div><label>Kata Sandi<span className="password-field"><input required name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} placeholder="Masukkan kata sandi" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}><img src="/uc02/14f75.svg" alt="" /></button></span></label><button className="forgot" type="button" onClick={() => setMessage('Pemulihan kata sandi belum tersedia pada contoh ini.')}>Lupa Kata Sandi?</button></div>
        {message && <p className="login-message" role="status">{message}</p>}<button className="login-submit" type="submit">MASUK</button><p className="signup">Belum memiliki akun? <button type="button" onClick={() => setMessage('Pendaftaran akun belum tersedia pada contoh ini.')}>Daftar Akun</button></p></form>
    </section>
  </main>;
}
