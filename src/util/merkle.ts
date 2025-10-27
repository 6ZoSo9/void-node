// src/util/merkle.ts
import * as crypto from 'node:crypto';

function sha256(buf: Buffer): Buffer {
  return crypto.createHash('sha256').update(buf).digest();
}

function toBuf(x: Buffer | Uint8Array | string): Buffer {
  if (typeof x === 'string') return Buffer.from(x, 'utf8');
  return Buffer.isBuffer(x) ? x : Buffer.from(x);
}

/**
 * Compute a SHA-256 Merkle root from arbitrary leaves.
 * Behavior:
 * - Each leaf is individually hashed with SHA-256 first.
 * - If a level has an odd number of nodes, the last hash is duplicated.
 * - Parent = SHA-256(concat(left, right)).
 * - Returns a 64-character, lowercase hex string.
 */
export function merkleRoot(leaves: Array<Buffer | Uint8Array | string>): string {
  if (!Array.isArray(leaves) || leaves.length === 0) return '0'.repeat(64);

  // First level: hash each leaf (normalize to Buffer)
  let level: Buffer[] = leaves.map((l) => sha256(toBuf(l)));

  // Reduce up the tree
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = i + 1 < level.length ? level[i + 1] : a; // duplicate last if odd
      next.push(sha256(Buffer.concat([a, b])));
    }
    level = next;
  }

  return level[0].toString('hex');
}

/**
 * Compute a SHA-256 Merkle root when leaves are ALREADY 32-byte hashes.
 * Accepts Buffers/Uint8Arrays of length 32, or 64-hex strings (with/without 0x).
 * Any invalid leaf is ignored (so callers can be sloppy without crashing).
 */
export function merkleRootFromHashes(
  leaves: Array<Buffer | Uint8Array | string>
): string {
  if (!Array.isArray(leaves) || leaves.length === 0) return '0'.repeat(64);

  const norm: Buffer[] = [];
  for (const l of leaves) {
    if (typeof l === 'string') {
      const s = l.startsWith('0x') ? l.slice(2) : l;
      if (/^[0-9a-fA-F]{64}$/.test(s)) norm.push(Buffer.from(s, 'hex'));
      continue;
    }
    const b = Buffer.isBuffer(l) ? l : Buffer.from(l);
    if (b.length === 32) norm.push(b);
  }

  if (norm.length === 0) return '0'.repeat(64);

  let level = norm;
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = i + 1 < level.length ? level[i + 1] : a;
      next.push(sha256(Buffer.concat([a, b])));
    }
    level = next;
  }
  return level[0].toString('hex');
}

