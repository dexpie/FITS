'use client';

// Primitif animasi FITS berbasis motion (Framer Motion).
// Semua animasi menghormati setelan "kurangi gerakan" di perangkat pengguna.
import Link from 'next/link';
import { AnimatePresence, MotionConfig, motion, useAnimate, useReducedMotion, type Variants } from 'motion/react';
import { useEffect, type ComponentProps, type ReactNode } from 'react';

export const PEGAS = { type: 'spring', stiffness: 380, damping: 28 } as const;
const LANDAI = [0.22, 1, 0.36, 1] as const;

export function PenyediaGerak({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.45, ease: LANDAI }}>{children}</MotionConfig>;
}

// Masuk halaman: naik pelan sambil memudar.
export function TransisiHalaman({ children }: { children: ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: LANDAI }}>
    {children}
  </motion.div>;
}

export function Muncul({ children, jeda = 0, className, dari = 12 }: { children: ReactNode; jeda?: number; className?: string; dari?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: dari }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: jeda, ease: LANDAI }}>
    {children}
  </motion.div>;
}

const INDUK: Variants = { awal: {}, tampil: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } } };
const ANAK: Variants = { awal: { opacity: 0, y: 16, scale: 0.98 }, tampil: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: LANDAI } } };

// Daftar yang anaknya muncul bergiliran.
export function Bertahap({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={INDUK} initial="awal" animate="tampil">{children}</motion.div>;
}

export function ItemBertahap({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} variants={ANAK}>{children}</motion.div>;
}

const TautanGerak = motion.create(Link);

// Kartu tautan: ikut muncul bergiliran, terangkat saat disorot, mengecil saat ditekan.
export function KartuTautan({ angkat = 4, ...props }: ComponentProps<typeof TautanGerak> & { angkat?: number }) {
  return <TautanGerak variants={ANAK} whileHover={{ y: -angkat, boxShadow: '0 10px 24px rgba(7,58,117,0.16)' }} whileTap={{ scale: 0.97 }} transition={PEGAS} {...props} />;
}

export function TombolGerak(props: ComponentProps<typeof motion.button>) {
  return <motion.button whileHover={props.disabled ? undefined : { scale: 1.015 }} whileTap={props.disabled ? undefined : { scale: 0.97 }} transition={PEGAS} {...props} />;
}

// Pesan yang muncul/hilang dengan tinggi teranimasi; isi kosong = disembunyikan.
export function PesanGerak({ tampil, children, className, role }: { tampil: boolean; children: ReactNode; className?: string; role?: string }) {
  return <AnimatePresence initial={false}>
    {tampil && <motion.div key="pesan" className="overflow-hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
      <div className={className} role={role}>{children}</div>
    </motion.div>}
  </AnimatePresence>;
}

// Goyangkan isi tiap kali `pemicu` berubah (dipakai saat isian gagal divalidasi).
export function Goyang({ pemicu, children, className }: { pemicu: number; children: ReactNode; className?: string }) {
  const [lingkup, animasikan] = useAnimate<HTMLDivElement>();
  const kurangiGerak = useReducedMotion();
  useEffect(() => {
    if (pemicu && !kurangiGerak) animasikan(lingkup.current, { x: [0, -9, 8, -6, 4, 0] }, { duration: 0.42 });
  }, [pemicu, kurangiGerak, animasikan, lingkup]);
  return <div ref={lingkup} className={className}>{children}</div>;
}

export { AnimatePresence, motion };
