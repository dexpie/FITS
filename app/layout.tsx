import './tailwind.css';
import './style.css';
import './views.css';
import './uc08/detail.css';
import './uc02/login.css';
import './uc12/temuan.css';
import './uc12/klaim.css';
import './uc16/result.css';
import './uc06/similar.css';
import type { ReactNode } from 'react';
import { PenyediaGerak } from './komponen/gerak';

export const metadata = { title: 'Lapor Hilang | FITS' };

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="id"><body><PenyediaGerak>{children}</PenyediaGerak></body></html>;
}
