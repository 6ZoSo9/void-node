// src/util/merkle.ts
import * as crypto from "node:crypto";

function h(b: Buffer | string): Buffer {
  const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, "hex");
  return crypto.createHash("sha256").update(buf).digest();
}

/** Given an array of 32-byte hex strings, compute SHA-256 pairwise Merkle root (hex). */
export function merkleRootHex(leavesHex: string[]): string {
  if (leavesHex.length === 0) return "".padStart(64, "0");
  let level: Buffer[] = leavesHex.map((x) => Buffer.from(x, "hex"));

  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = i + 1 < level.length ? level[i + 1] : level[i]; // duplicate last
      next.push(h(Buffer.concat([a, b])));
    }
    level = next;
  }
  return level[0].toString("hex");
}

/** Convenience: hash arbitrary strings (e.g., tx hashes or blob cids) to 32-byte leaves. */
export function hashToLeafHex(s: string): string {
  return crypto.createHash("sha256").update(Buffer.from(s, "hex")).digest("hex");
}

