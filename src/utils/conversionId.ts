/**
 * UUIDv5 determinístico para los ítems estáticos de la cola de conversión.
 *
 * `training_attempts.item_id` es un UUID sin FK, y los ítems de conversión y
 * guías no tienen fila propia en la base (`item_kind = 'external'`). El id
 * estático (`conv-001`, `drill-001`) se mapea a un UUID estable con v5, así el
 * mismo ítem da siempre el mismo `item_id` en cualquier dispositivo.
 *
 * Implementación propia y síncrona de SHA-1 (RFC 3174): `crypto.subtle` es
 * asíncrono y el mapeo id→uuid se necesita al armar la lista, sin dependencias
 * nuevas. SHA-1 acá es solo un generador de nombres (RFC 4122), no seguridad.
 */

/** Namespace fijo de la cola de conversión. No cambiarlo: rompería el historial. */
export const NAMESPACE_CONVERSION = '3b5c1f0e-8d42-4a7b-9c61-5e2f7a0d4b19';

const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;

export const sha1 = (message: Uint8Array): Uint8Array => {
  const bitLength = message.length * 8;
  // Relleno: 0x80, ceros hasta 56 mod 64 y la longitud en bits (64 bits big-endian).
  const paddedLength = (((message.length + 8) >> 6) + 1) << 6;
  const data = new Uint8Array(paddedLength);
  data.set(message);
  data[message.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + (f >>> 0) + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => outView.setUint32(i * 4, h));
  return out;
};

const uuidToBytes = (uuid: string): Uint8Array => {
  const hex = uuid.replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) throw new Error(`UUID inválido: ${uuid}`);
  return Uint8Array.from(hex.match(/../g) ?? [], byte => parseInt(byte, 16));
};

const bytesToUuid = (bytes: Uint8Array): string => {
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};

/** UUIDv5 (RFC 4122 §4.3) de `name` dentro de `namespace`. */
export const uuidv5 = (name: string, namespace: string): string => {
  const nameBytes = new TextEncoder().encode(name);
  const nsBytes = uuidToBytes(namespace);
  const input = new Uint8Array(nsBytes.length + nameBytes.length);
  input.set(nsBytes);
  input.set(nameBytes, nsBytes.length);
  const hash = sha1(input).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50; // versión 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variante RFC 4122
  return bytesToUuid(hash);
};

/** `item_id` de `training_attempts` para un ítem estático (`conv-001`, `drill-001`). */
export const conversionItemUuid = (id: string): string => uuidv5(id, NAMESPACE_CONVERSION);
