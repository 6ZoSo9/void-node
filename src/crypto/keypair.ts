// src/crypto/keypair.ts
import * as fs from "node:fs";
import * as crypto from "node:crypto";

export type Keypair = {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;   // first 16 hex of sha256(spki-der)
  pubPEM: string;
};

// ---------- helpers ----------
function nodeIdFromPublic(pub: crypto.KeyObject): string {
  const der = pub.export({ type: "spki", format: "der" }) as Buffer;
  return crypto.createHash("sha256").update(der).digest("hex").slice(0, 16);
}

function isAsciiPEM(buf: Buffer): boolean {
  const text = buf.toString("utf8");
  return text.includes("-----BEGIN PRIVATE KEY-----")
      || text.includes("-----BEGIN ED25519 PRIVATE KEY-----");
}

// Printable ASCII guard
function isPrintableAscii(buf: Buffer): boolean {
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 9 || b === 10 || b === 13) continue; // \t \n \r
    if (b < 32 || b > 126) return false;
  }
  return true;
}

function hexToBuf(s: string): Buffer | null {
  const t = s.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(t) || (t.length % 2 !== 0)) return null;
  return Buffer.from(t, "hex");
}

function b64ToBuf(s: string): Buffer | null {
  try {
    const t = s.trim().replace(/\s+/g, "");
    const b = Buffer.from(t, "base64");
    return b.length ? b : null;
  } catch { return null; }
}

/**
 * PKCS#8 (RFC 8410) for Ed25519:
 * PrivateKeyInfo ::= SEQUENCE {
 *   version                   INTEGER 0,
 *   privateKeyAlgorithm       AlgorithmIdentifier (OID 1.3.101.112),
 *   privateKey                OCTET STRING  -- contains DER-encoded Ed25519 private key
 * }
 *
 * OpenSSL expects the privateKey OCTET STRING to contain an inner OCTET STRING of the 32-byte seed.
 */
function pkcs8Ed25519FromSeed(seed32: Buffer): Buffer {
  if (seed32.length !== 32) {
    throw new Error(`ed25519 seed must be 32 bytes, got ${seed32.length}`);
  }

  const derLen = (n: number) => {
    if (n < 0x80) return Buffer.from([n]);
    const bytes: number[] = [];
    let x = n;
    while (x > 0) { bytes.unshift(x & 0xff); x >>= 8; }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
  };

  const derInt0 = Buffer.from([0x02, 0x01, 0x00]); // INTEGER 0

  // AlgorithmIdentifier = SEQUENCE { OID 1.3.101.112 } (no params)
  const oidEd25519 = Buffer.from([0x06, 0x03, 0x2B, 0x65, 0x70]);
  const algId = Buffer.concat([Buffer.from([0x30]), derLen(oidEd25519.length), oidEd25519]);

  // Inner OCTET STRING = 0x04 || len(32) || seed
  const innerOctet = Buffer.concat([Buffer.from([0x04]), derLen(seed32.length), seed32]);

  // privateKey OCTET STRING wraps the inner OCTET STRING
  const privateKey = Buffer.concat([Buffer.from([0x04]), derLen(innerOctet.length), innerOctet]);

  const seqBody = Buffer.concat([derInt0, algId, privateKey]);
  return Buffer.concat([Buffer.from([0x30]), derLen(seqBody.length), seqBody]);
}

// Canonical loader: prefer exact 32-byte binary seed, then PEM, then textual hex/base64
function makePrivateKeyFromFile(p: string): crypto.KeyObject {
  const raw = fs.readFileSync(p);

  // 1) Exact 32-byte binary seed
  if (raw.length === 32) {
    const der = pkcs8Ed25519FromSeed(raw);
    return crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  }

  // 2) PEM
  if (isAsciiPEM(raw)) {
    const pem = raw.toString("utf8");
    return crypto.createPrivateKey(pem);
  }

  // 3) Text seed (hex/base64) if printable
  let seed: Buffer | null = null;
  if (isPrintableAscii(raw)) {
    const txt = raw.toString("utf8").trim();
    seed = hexToBuf(txt) || b64ToBuf(txt);
  }
  if (!seed || seed.length !== 32) {
    throw new Error("Unrecognized key file: expected PEM or a 32-byte seed (binary/hex/base64)");
  }

  const der = pkcs8Ed25519FromSeed(seed);
  return crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

function softModeWarning(pathToKey: string) {
  try {
    const st = fs.statSync(pathToKey);
    // World/group readable? Warn (don’t fail) — cross-platform friendly.
    // 0o077 are group/other bits; if any are set, warn.
    // Only on POSIX-y platforms where mode is meaningful.
    if ((st.mode & 0o077) !== 0) {
      console.warn(`[keypair] warning: ${pathToKey} is too permissive (mode ${(
        st.mode & 0o777
      ).toString(8)}). Consider chmod 600.`);
    }
  } catch { /* ignore */ }
}

function ensureEd25519(k: crypto.KeyObject) {
  const t = k.asymmetricKeyType;
  if (t && t !== "ed25519") {
    throw new Error(`key is ${t}, expected ed25519`);
  }
}

// ---------- main API ----------
export function loadKeypair(pathToKey: string): Keypair {
  if (!fs.existsSync(pathToKey)) {
    throw new Error(`key file not found: ${pathToKey}`);
  }

  softModeWarning(pathToKey);

  const privateKey = makePrivateKeyFromFile(pathToKey);
  ensureEd25519(privateKey);

  const publicKey = crypto.createPublicKey(privateKey);
  ensureEd25519(publicKey);

  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = nodeIdFromPublic(publicKey);

  return { privateKey, publicKey, nodeId, pubPEM };
}

/** Optional: short printable fingerprint (SHA256 over SPKI, base64url, 8 chars). */
export function publicKeyFingerprint(pub: crypto.KeyObject): string {
  const der = pub.export({ type: "spki", format: "der" }) as Buffer;
  const raw = crypto.createHash("sha256").update(der).digest();
  // base64url, first 8 chars (good for logs/prompts)
  return raw.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "").slice(0, 8);
}

