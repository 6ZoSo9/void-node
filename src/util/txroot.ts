// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9
import { createHash } from "node:crypto";

function stableStringify(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const keys = Object.keys(v).sort();
  const body = keys.map(k => `${JSON.stringify(k)}:${stableStringify((v as any)[k])}`).join(",");
  return `{${body}}`;
}

function sha256Hex(buf: Buffer | string): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Merkle root over JSON txs. Odd-node duping (BTC-style pair-with-self). */
export function computeTxRoot(txs: any[]): { root: string; leaves: string[] } {
  const leaves = txs.map(tx => sha256Hex(stableStringify(tx)));
  if (leaves.length === 0) return { root: sha256Hex(""), leaves };
  let level: Buffer[] = leaves.map(h => Buffer.from(h, "hex"));
  while (level.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = level[i + 1] ?? level[i];
      next.push(Buffer.from(sha256Hex(Buffer.concat([left, right])), "hex"));
    }
    level = next;
  }
  return { root: level[0].toString("hex"), leaves };
}
