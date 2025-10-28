// src/util/crypto_helpers.ts
import * as crypto from "node:crypto";

export function sha256Hex(data: Buffer | Uint8Array | string): string {
  const buf = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/** Node built-in Ed25519 sign/verify helpers. */
export function signBytes(priv: crypto.KeyObject, bytes: Uint8Array): string {
  return crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
}
export function verifyBytes(pub: crypto.KeyObject, bytes: Uint8Array, sigHex: string): boolean {
  try { return crypto.verify(null, Buffer.from(bytes), pub, Buffer.from(sigHex, "hex")); }
  catch { return false; }
}

export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

export function bytesToSign(topic: string, data: string, nonce: string): Uint8Array {
  return Buffer.from(JSON.stringify({ topic, data, nonce }));
}

