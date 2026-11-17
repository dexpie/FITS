// UC-01 Daftar ke Akun FITS: kontrak data antara halaman (Boundary) dan repository (akses Supabase).

export type IsianDaftar = {
  nama: string;
  nrp: string;
  email: string;
  kataSandi: string;
  ulangan: string;
};

export type NamaIsian = keyof IsianDaftar;

// Pesan galat per isian; isian yang valid tidak punya kunci.
export type GalatIsian = Partial<Record<NamaIsian, string>>;

export type HasilDaftar =
  | { status: 'berhasil'; email: string }
  | { status: 'galat'; pesan: string; galat?: GalatIsian };
