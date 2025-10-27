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
  const head = buf.slice(0, 64).toString("utf8");
  return head.includes("-----BEGIN PRIVATE KEY-----") ||
         head.includes("-----BEGIN ED25519 PRIVATE KEY-----");
}

function isLikelyUtf8(buf: Buffer): boolean {
  // fast check: no NUL bytes in the sample window
  const n = Math.min(buf.length, 64);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
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
 * Build minimal PKCS#8 DER for Ed25519 private key per RFC 8410:
 *
 * PrivateKeyInfo ::= SEQUENCE {
 *   version                   INTEGER { v1(0) } (v1,...),
 *   privateKeyAlgorithm       AlgorithmIdentifier,
 *   privateKey                OCTET STRING
 * }
 *
 * AlgorithmIdentifier for Ed25519:
 *   OID 1.3.101.112  (no params)
 *
 * The OCTET STRING is the raw 32-byte seed.
 */
function pkcs8Ed25519FromSeed(seed32: Buffer): Buffer {
  if (seed32.length !== 32) {
    throw new Error(`ed25519 seed must be 32 bytes, got ${seed32.length}`);
  }

  // DER building helpers
  const derLen = (n: number) => {
    if (n < 0x80) return Buffer.from([n]);
    const bytes: number[] = [];
    let x = n;
    while (x > 0) { bytes.unshift(x & 0xff); x >>= 8; }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
  };
  const derInt0 = Buffer.from([0x02, 0x01, 0x00]); // INTEGER 0
  // AlgorithmIdentifier = SEQUENCE { OID 1.3.101.112 }
  // OID encoding: 1*40+3 = 43 (0x2B), then 101 (0x65), 112 (0x70)
  const oidEd25519 = Buffer.from([0x06, 0x03, 0x2B, 0x65, 0x70]);
  const algId = Buffer.concat([Buffer.from([0x30]), derLen(oidEd25519.length), oidEd25519]);

  // privateKey OCTET STRING (raw 32-byte seed)
  const pkOctet = Buffer.concat([Buffer.from([0x04]), derLen(seed32.length), seed32]);

  const seqBody = Buffer.concat([derInt0, algId, pkOctet]);
  const top = Buffer.concat([Buffer.from([0x30]), derLen(seqBody.length), seqBody]);

  return top;
}

// Try to interpret content as PEM first; if not PEM, try seed formats.
function makePrivateKeyFromFile(p: string): crypto.KeyObject {
  const raw = fs.readFileSync(p); // read as raw bytes
  if (isAsciiPEM(raw)) {
    const pem = raw.toString("utf8");
    return crypto.createPrivateKey(pem);
  }

  // Not PEM: treat as seed
  let seed: Buffer | null = null;

  if (isLikelyUtf8(raw)) {
    const txt = raw.toString("utf8").trim();
    seed = hexToBuf(txt);
    if (!seed) seed = b64ToBuf(txt);
  }
  if (!seed && raw.length === 32) seed = raw; // pure 32-byte file

  if (!seed) {
    throw new Error("Unrecognized key file: not PEM and not a 32-byte seed (hex/base64/binary)");
  }

  const der = pkcs8Ed25519FromSeed(seed);
  // Create PKCS#8 Ed25519 private key from DER
  return crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" });
}

// ---------- main API ----------
export function loadKeypair(pemOrSeedPath: string): Keypair {
  if (!fs.existsSync(pemOrSeedPath)) {
    throw new Error(`key file not found: ${pemOrSeedPath}`);
    // Do NOT auto-create keys here; the caller enforces presence.
  }

  const privateKey = makePrivateKeyFromFile(pemOrSeedPath);
  const publicKey = crypto.createPublicKey(privateKey);

  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = nodeIdFromPublic(publicKey);

  return { privateKey, publicKey, nodeId, pubPEM };
}

