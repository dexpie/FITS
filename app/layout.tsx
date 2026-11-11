import './tailwind.css';
import './style.css';
import './views.css';
import './uc08/detail.css';
import './uc02/login.css';
import './uc12/temuan.css';
import './uc16/result.css';
import './uc06/similar.css';
import type { ReactNode } from 'react';

export const metadata = { title: 'Lapor Hilang | FITS' };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
