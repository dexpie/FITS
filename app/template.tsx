import type { ReactNode } from 'react';
import { TransisiHalaman } from './komponen/gerak';

// template.tsx dipasang ulang tiap navigasi, jadi tiap halaman mendapat animasi masuk.
export default function Template({ children }: { children: ReactNode }) {
  return <TransisiHalaman>{children}</TransisiHalaman>;
}
