// src/util/make_tx.ts
/**
 * Canonical tx creator:
 *   - Canonicalize body JSON
 *   - hash = sha256(body_bytes)
 *   - returns {hash, body}
 */
import * as crypto from "node:crypto";

export type TxBody = Record<string, any>;
export type MemTx = { hash: string; body: TxBody };

function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

export function makeTx(body: TxBody): MemTx {
  const canon = stableStringify(body ?? {});
  const hash = crypto.createHash("sha256").update(Buffer.from(canon)).digest("hex");
  return { hash, body };
}

