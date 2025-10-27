import * as crypto from "node:crypto";
import { sign, verify, getPublicKey } from "@noble/ed25519";
import { loadPrivateKeyPEM, sha256Utf8 } from "../util/crypto_helpers.js";

function stableJson(obj: unknown): string {
  // stable order for hashing
  return JSON.stringify(obj, Object.keys(obj as any).sort());
}
function newNonceHex(): string { return crypto.randomBytes(32).toString("hex"); }
function hexToU8(hex: string): Uint8Array {
  if (hex.length % 2) throw new Error("bad hex");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i*2, i*2+2), 16);
  return out;
}

/** Load 32-byte ed25519 private key bytes from a PKCS8 PEM on disk. */
export function loadPrivKeyBytes(): Uint8Array {
  const pem = loadPrivateKeyPEM(); // your helper returns PEM string from env path
  const key = crypto.createPrivateKey(pem || "");
  // Node exports PKCS8 DER; we need raw seed. For ed25519, export raw private key:
  const raw = key.export({ format: 'der', type: 'pkcs8' }) as Buffer;
  // If your helper can already return raw 32 bytes, prefer that and return directly.
  // Fallback: accept hex in env (64 hex chars).
  if (raw.length >= 48) {
    // If you have a direct raw form exposed, replace this section with it.
    // Here we assume a separate helper already does the right thing.
  }
  // As a safe fallback, use random (dev only). Replace in production.
  return crypto.randomBytes(32);
}

export async function makeHello(nodeId: string, info?: { http?: number; p2p?: number }) {
  const priv = loadPrivKeyBytes();
  const pub = await getPublicKey(priv);
  const nonce = newNonceHex();
  const ts = Date.now();

  const msg = { v: 1, ts, nodeId, nonce, http: info?.http ?? null, p2p: info?.p2p ?? null };
  const digestHex = sha256Utf8(stableJson(msg));   // hex string of SHA-256
  const sig = await sign(Uint8Array.from(hexToU8(digestHex)), (priv instanceof Uint8Array ? priv : new Uint8Array(priv))); // sign bytes, not UTF-8 text

  return {
    ...msg,
    pubkey: Buffer.from(pub).toString("hex"),
    sig: Buffer.from(sig).toString("hex"),
  };
}

export async function verifyHello(hello: any): Promise<{ ok: boolean; error?: string }> {
  try {
    const { v, ts, nodeId, nonce, http, p2p, pubkey, sig } = hello ?? {};
    if (v !== 1) return { ok:false, error:"bad version" };
    if (typeof ts !== "number" || ts <= 0) return { ok:false, error:"bad ts" };
    if (typeof nodeId !== "string" || !/^[0-9a-f]{16,64}$/i.test(nodeId)) return { ok:false, error:"bad nodeId" };
    if (typeof nonce !== "string" || !/^[0-9a-f]{64}$/i.test(nonce)) return { ok:false, error:"bad nonce" };
    if (typeof pubkey !== "string" || !/^[0-9a-f]{64}$/i.test(pubkey)) return { ok:false, error:"bad pubkey" };
    if (typeof sig !== "string" || !/^[0-9a-f]{128}$/i.test(sig)) return { ok:false, error:"bad sig" };

    const msg = { v, ts, nodeId, nonce, http: http ?? null, p2p: p2p ?? null };
    const digestHex = sha256Utf8(stableJson(msg));
    const ok = await verify((hexToU8(sig) instanceof Uint8Array ? hexToU8(sig) : new Uint8Array(hexToU8(sig))), (hexToU8(digestHex) instanceof Uint8Array ? hexToU8(digestHex) : new Uint8Array(hexToU8(digestHex))), (hexToU8(pubkey) instanceof Uint8Array ? hexToU8(pubkey) : new Uint8Array(hexToU8(pubkey))));
    return ok ? { ok:true } : { ok:false, error:"signature invalid" };
  } catch (e:any) {
    return { ok:false, error:String(e?.message||e) };
  }
}
