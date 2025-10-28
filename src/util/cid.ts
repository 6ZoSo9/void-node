// src/util/cid.ts
import * as crypto from "node:crypto";

/** SHA-256 over raw bytes -> 64-hex "cid". */
export async function cidForBytes(buf: Buffer | Uint8Array): Promise<string> {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** UTF-8 text -> cid. */
export async function cidForText(text: string): Promise<string> {
  return cidForBytes(Buffer.from(text, "utf8"));
}

/** Stable-JSON stringify, then hash. */
export async function cidForJson(obj: any): Promise<string> {
  const s = stableStringify(obj);
  return cidForBytes(Buffer.from(s, "utf8"));
}

/** Deterministic, order-insensitive JSON stringify (keys sorted). */
export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

