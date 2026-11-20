import { describe, expect, it } from 'vitest';
import { isEmailITS, periksaIsian } from './repository';

describe('isEmailITS (UC-01 daftar)', () => {
  it('menerima email @student.its.ac.id', () => {
    expect(isEmailITS('budi@student.its.ac.id')).toBe(true);
    expect(isEmailITS('  Budi.Santoso@STUDENT.ITS.AC.ID ')).toBe(true);
  });

  it('menolak domain ITS lain dan domain luar', () => {
    expect(isEmailITS('budi@its.ac.id')).toBe(false);
    expect(isEmailITS('budi@mhs.its.ac.id')).toBe(false);
    expect(isEmailITS('budi@student.its.ac.id.com')).toBe(false);
    expect(isEmailITS('budi@palsu-student.its.ac.id')).toBe(false);
    expect(isEmailITS('budi@gmail.com')).toBe(false);
  });

  it('periksaIsian memberi pesan domain student.its.ac.id', () => {
    const galat = periksaIsian({ nama: 'Budi', nrp: '5025211000', email: 'budi@its.ac.id', kataSandi: 'rahasia123', ulangan: 'rahasia123' });
    expect(galat.email).toBe('Gunakan email mahasiswa ITS (@student.its.ac.id).');
  });
});
