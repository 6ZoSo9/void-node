// src/util/cid.ts
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

type Bytes =
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | SharedArrayBuffer
  | DataView
  | string; // treated as UTF-8 text

function toBuffer(b: Bytes): Buffer {
  if (typeof b === 'string') return Buffer.from(b, 'utf8');
  if (Buffer.isBuffer(b)) return b;
  if (b instanceof Uint8Array) return Buffer.from(b.buffer, b.byteOffset, b.byteLength);
  if (b instanceof DataView) return Buffer.from(b.buffer, b.byteOffset, b.byteLength);
  if (b instanceof ArrayBuffer || (typeof SharedArrayBuffer !== 'undefined' && b instanceof SharedArrayBuffer)) {
    return Buffer.from(new Uint8Array(b as ArrayBuffer));
  }
  // Fallback: rely on Buffer coercion (will throw for unsupported types)
  return Buffer.from(b as any);
}

/** sha256(bytes) -> lowercase hex (async signature kept for compatibility). */
export async function sha256Hex(bytes: Bytes): Promise<string> {
  const h = crypto.createHash('sha256');
  h.update(toBuffer(bytes));
  return h.digest('hex');
}

/** Minimal CID: sha256 hex of the content. */
export async function cidForBytes(bytes: Bytes): Promise<string> {
  return sha256Hex(bytes);
}

/** Convenience: CID for UTF-8 text. */
export async function cidForText(text: string): Promise<string> {
  return sha256Hex(text);
}

/**
 * CID for a file at `path` using a streaming hash (handles large files).
 * Returns lowercase hex of sha256(file bytes).
 */
export async function cidForFile(path: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const s = fs.createReadStream(path);
    s.on('data', (chunk) => hash.update(chunk as Buffer));
    s.on('error', reject);
    s.on('end', () => resolve(hash.digest('hex')));
  });
}

/** Optional sync helpers (not used by core, but handy in scripts/tests). */
export function sha256HexSync(bytes: Bytes): string {
  return crypto.createHash('sha256').update(toBuffer(bytes)).digest('hex');
}
export function cidForBytesSync(bytes: Bytes): string {
  return sha256HexSync(bytes);
}

