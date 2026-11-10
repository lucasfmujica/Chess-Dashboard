import { describe, it, expect } from 'vitest';
import { sha1, uuidv5, conversionItemUuid, NAMESPACE_CONVERSION } from './conversionId';

const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const ascii = (s: string) => new TextEncoder().encode(s);

describe('sha1', () => {
  it('coincide con los vectores de FIPS 180', () => {
    expect(hex(sha1(ascii('abc')))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(hex(sha1(ascii('')))).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
    expect(hex(sha1(ascii('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '84983e441c3bd26ebaae4aa1f95129e5e54670f1'
    );
  });
});

describe('uuidv5', () => {
  it('coincide con el vector del RFC (DNS, www.example.com)', () => {
    expect(uuidv5('www.example.com', DNS_NAMESPACE)).toBe('2ed6657d-e927-568b-95e1-2665a8aea6a2');
  });

  it('es determinístico y tiene versión 5', () => {
    const a = conversionItemUuid('conv-001');
    expect(conversionItemUuid('conv-001')).toBe(a);
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).toBe(uuidv5('conv-001', NAMESPACE_CONVERSION));
  });

  it('no colisiona entre los 154 ids', () => {
    const ids = [
      ...Array.from({ length: 90 }, (_, i) => `conv-${String(i + 1).padStart(3, '0')}`),
      ...Array.from({ length: 64 }, (_, i) => `drill-${String(i + 1).padStart(3, '0')}`),
    ];
    expect(new Set(ids.map(conversionItemUuid)).size).toBe(154);
  });

  it('rechaza un namespace que no es uuid', () => {
    expect(() => uuidv5('x', 'no-es-uuid')).toThrow();
  });
});
