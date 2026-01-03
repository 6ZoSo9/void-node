import { createHash } from "node:crypto";

/**
 * Node Buffer is generic in newer @types/node (Buffer<TArrayBuffer extends ArrayBufferLike>).
 * Some overloads return Buffer<ArrayBufferLike> (wider), which can clash with Buffer<ArrayBuffer> (narrow).
 * We standardize this file on Buffer<ArrayBufferLike> to avoid TS2322 noise.
 */
type B = Buffer<ArrayBufferLike>;

export function sha256(buf: B): B {
  return createHash("sha256").update(buf).digest() as B;
}

export function merkleRoot(leaves: B[]): B {
  if (leaves.length === 0) return sha256(Buffer.alloc(0) as B);

  // clone/copy leaves (also normalizes generic)
  let level: B[] = leaves.map((x) => Buffer.from(x) as B);

  while (level.length > 1) {
    const next: B[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1] ?? level[i]; // duplicate last
      next.push(sha256(Buffer.concat([a, b]) as B));
    }
    level = next;
  }
  return level[0] as B;
}

export function hex(b: B): string {
  return b.toString("hex");
}
