import { createHash } from "node:crypto";

export function sha256(buf: Buffer): Buffer {
  return createHash("sha256").update(buf).digest();
}

export function merkleRoot(leaves: Buffer[]): Buffer {
  if (leaves.length === 0) return sha256(Buffer.alloc(0));
  let level = leaves.map((x) => Buffer.from(x));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1] ?? level[i]; // duplicate last
      next.push(sha256(Buffer.concat([a, b])));
    }
    level = next;
  }
  return level[0];
}

export function hex(b: Buffer): string {
  return b.toString("hex");
}
