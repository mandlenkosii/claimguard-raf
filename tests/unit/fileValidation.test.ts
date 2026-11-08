import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, validateFile } from '@rules/fileValidation';

const file = (name: string, type: string, size = 100) => ({ name, type, size });

describe('T-BR29-1 file validation', () => {
  it.each([
    ['a.pdf', 'application/pdf'],
    ['a.jpg', 'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.PNG', 'image/png'],
  ])('T-BR29-1 %s passes', (name, type) => {
    expect(validateFile(file(name, type))).toEqual({ ok: true });
  });

  it('T-BR29-1 exactly 10 MB passes and one byte more fails', () => {
    expect(validateFile(file('a.pdf', 'application/pdf', MAX_FILE_BYTES))).toEqual({ ok: true });
    expect(validateFile(file('a.pdf', 'application/pdf', MAX_FILE_BYTES + 1))).toEqual({ ok: false, code: 'too_large' });
  });

  it('T-BR29-1 other types fail and report the extension', () => {
    expect(validateFile(file('setup.exe', 'application/x-msdownload'))).toEqual({ ok: false, code: 'type', extension: 'exe' });
    expect(validateFile(file('a.tiff', 'image/tiff'))).toEqual({ ok: false, code: 'type', extension: 'tiff' });
  });

  it('T-BR29-1 a disguised file fails', () => {
    expect(validateFile(file('virus.pdf', 'application/x-msdownload'))).toEqual({ ok: false, code: 'type', extension: 'pdf' });
    expect(validateFile(file('virus.exe', 'application/pdf'))).toEqual({ ok: false, code: 'type', extension: 'exe' });
  });

  it('T-BR29-1 an empty file fails', () => {
    expect(validateFile(file('a.pdf', 'application/pdf', 0))).toEqual({ ok: false, code: 'empty' });
  });
});
