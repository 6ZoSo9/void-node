import { createHash } from "node:crypto";

/** sha256 hex with 0x prefix (matches the empty root you logged earlier). */
export function sha256Hex(input: string | Uint8Array | Buffer): string {
  const h = createHash("sha256");
  h.update(input);
  return "0x" + h.digest("hex");
}

/** Deterministic tx root from a list of strings/bytes-ish. */
export function computeTxRoot(list: any[]): string {
  if (!list || list.length === 0) return sha256Hex("");
  const h = createHash("sha256");
  for (const it of list) {
    if (typeof it === "string") h.update(it);
    else if (it instanceof Uint8Array || Buffer.isBuffer(it)) h.update(it);
    else h.update(JSON.stringify(it));
  }
  return "0x" + h.digest("hex");
}

/** Aliases to be future-proof with older call sites. */
export const txRootFromList = computeTxRoot;
export function txRootEmpty(): string { return sha256Hex(""); }
