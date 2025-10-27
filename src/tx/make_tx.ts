// src/tx/make_tx.ts
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

const KEY_FILE = process.env.TX_KEY_FILE || ".tx-key.pem";

/* --------------------------- file helpers --------------------------- */
function ensureDirForFile(p: string) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ----------------------------- keys -------------------------------- */
/** Create or reuse an Ed25519 private key used to sign client txs. */
export function loadOrCreateKey(): crypto.KeyObject {
  try {
    if (fs.existsSync(KEY_FILE)) {
      const pem = fs.readFileSync(KEY_FILE);
      return crypto.createPrivateKey(pem);
    }
  } catch {
    // fall through -> (re)create key file
  }
  const { privateKey } = crypto.generateKeyPairSync("ed25519");
  ensureDirForFile(KEY_FILE);
  fs.writeFileSync(KEY_FILE, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
  return privateKey;
}

/* ---------------------------- addresses ---------------------------- */
function is0xHex(s: string, nBytes?: number) {
  if (typeof s !== "string" || !s.startsWith("0x")) return false;
  const h = s.slice(2);
  if (!/^[0-9a-fA-F]+$/.test(h)) return false;
  return nBytes === undefined ? true : h.length === nBytes * 2;
}

/** Normalize to a 0x + 20-byte hex address (lowercase); returns null if invalid. */
function normalizeAddress(addr?: string): string | null {
  if (!addr) return null;
  if (is0xHex(addr, 20)) return "0x" + addr.slice(2).toLowerCase();
  return null;
}

/** Derive a pseudo-address (0x + 20 bytes) from public key. */
function pubToAddress(pub: crypto.KeyObject): string {
  const spki = pub.export({ type: "spki", format: "der" }) as Buffer;
  // Use sha256(spki) and take last 20 bytes → deterministic 40-hex address
  const h = crypto.createHash("sha256").update(spki).digest();
  return "0x" + h.subarray(h.length - 20).toString("hex");
}

/* ------------------------- canonical JSON -------------------------- */
/** Recursively stable-stringify with lexicographically sorted object keys. */
function canonicalJson(obj: unknown): string {
  const seen = new WeakSet<object>();
  const enc = (v: unknown): any => {
    if (v === null || typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(enc);
    if (seen.has(v as object)) return null; // cycle guard (shouldn't happen in txs)
    seen.add(v as object);
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = enc(o[k]);
    return out;
  };
  return JSON.stringify(enc(obj));
}

/* ------------------------------ types ------------------------------ */
export type ClientTx = {
  body: {
    from: string;
    to: string;
    nonce: number;
    data?: unknown;
  };
  hash: string;        // 64-hex, lowercase (sha256 over canonical body)
  signature: string;   // base64 Ed25519 signature over canonical body
  /** Compatibility alias (your validator looks for `sig`). */
  sig: string;
};

/* ------------------------------ build ------------------------------ */
/** Build a signed tx given fields (nonce defaults to 1). */
export function makeTx(params?: {
  to?: string;
  nonce?: number;
  data?: unknown;
  key?: crypto.KeyObject;
}): ClientTx {
  const priv = params?.key ?? loadOrCreateKey();
  const pub = crypto.createPublicKey(priv);
  const from = pubToAddress(pub);

  const toNorm = normalizeAddress(params?.to) ?? ("0x" + "22".repeat(20));
  const nonceRaw = Number.isFinite(params?.nonce) ? Math.floor(Number(params!.nonce)) : 1;
  const nonce = Math.max(0, nonceRaw);

  const body = { from, to: toNorm, nonce, data: params?.data };
  const canon = canonicalJson(body);

  const signature = crypto.sign(null, Buffer.from(canon, "utf8"), priv).toString("base64");
  const hash = crypto.createHash("sha256").update(Buffer.from(canon, "utf8")).digest("hex");

  return { body, hash, signature, sig: signature };
}

/* ----------------------------- CLI mode ---------------------------- */
/*
Usage:
  # default { note: "hi" }
  node dist/tx/make_tx.js

  # custom JSON data
  node dist/tx/make_tx.js '{"note":"hello","value":123}'

Env:
  TX_KEY_FILE=./.tx-key.pem   # where to store/reuse client key
  TX_TO=0x<40-hex>            # optional recipient
  TX_NONCE=2                  # optional nonce
*/
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const dataArg = process.argv[2];
    let data: unknown = { note: "hi" };
    if (dataArg) {
      try { data = JSON.parse(dataArg); } catch { /* keep default */ }
    }

    const to = process.env.TX_TO || undefined;
    const nonce = process.env.TX_NONCE ? Number(process.env.TX_NONCE) : undefined;

    const tx = makeTx({ to, nonce, data });
    // Print the tx JSON to stdout for piping into curl:
    // curl -sS -XPOST localhost:4100/tx -H 'content-type: application/json' -d "$(node dist/tx/make_tx.js)"
    process.stdout.write(JSON.stringify(tx));
  } catch (e: any) {
    console.error("[make_tx] error:", e?.message || e);
    process.exit(1);
  }
}

