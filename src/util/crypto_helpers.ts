// src/util/crypto_helpers.ts
// Minimal crypto helpers for Ed25519 + sha256 hashing.
// Nothing is persisted; keys can be supplied via env vars or file paths.

import * as fs from "node:fs";
import * as crypto from "node:crypto";

/** ------------------------------- hashing ------------------------------- */

/** sha256 over a UTF-8 string → raw Buffer digest */
export function sha256Utf8(input: string): Buffer {
  const h = crypto.createHash("sha256");
  h.update(input, "utf8");
  return h.digest();
}

/** sha256 over a UTF-8 string → lowercase hex */
export function sha256Hex(input: string): string {
  return sha256Utf8(input).toString("hex");
}

/** ------------------------------- PEM IO -------------------------------- */

function looksLikePem(pem: string, kind?: "PUBLIC" | "PRIVATE"): boolean {
  if (typeof pem !== "string" || pem.length < 32) return false;
  const re = kind
    ? new RegExp(`-----BEGIN ${kind} KEY-----[\\s\\S]+-----END ${kind} KEY-----`)
    : /-----BEGIN [A-Z ]+KEY-----[\s\S]+-----END [A-Z ]+KEY-----/;
  return re.test(pem);
}

/** Best-effort PEM loader from a file path (returns undefined on any issue). */
export function loadPemFromFile(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  try {
    const pem = fs.readFileSync(filePath, "utf8");
    if (looksLikePem(pem)) return pem;
  } catch {
    /* ignore */
  }
  return undefined;
}

/** ------------------------- env-based key loading ------------------------ */
/**
 * Load an Ed25519 PRIVATE key (PEM) from:
 *   1) NODE_PRIVKEY_PEM / VOID_NODE_PRIVKEY_PEM (raw PEM string)
 *   2) NODE_PRIVKEY_PATH / VOID_NODE_KEY_A / KEY_FILE (file path to PEM)
 * Returns undefined if not present/invalid.
 */
export function loadPrivateKeyPEM(): string | undefined {
  const envPem =
    process.env.NODE_PRIVKEY_PEM?.trim() ||
    process.env.VOID_NODE_PRIVKEY_PEM?.trim();
  if (envPem && looksLikePem(envPem, "PRIVATE")) return envPem;

  const pathCandidate =
    process.env.NODE_PRIVKEY_PATH ||
    process.env.VOID_NODE_KEY_A ||
    process.env.KEY_FILE;
  const filePem = loadPemFromFile(pathCandidate);
  if (filePem && looksLikePem(filePem, "PRIVATE")) return filePem;

  return undefined;
}

/**
 * Load an Ed25519 PUBLIC key (PEM) from:
 *   1) NODE_PUBKEY_PEM / VOID_NODE_PUBKEY_PEM (raw PEM string)
 *   2) NODE_PUBKEY_PATH (file path to PEM)
 * Returns undefined if not present/invalid.
 */
export function loadPublicKeyPEM(): string | undefined {
  const envPem =
    process.env.NODE_PUBKEY_PEM?.trim() ||
    process.env.VOID_NODE_PUBKEY_PEM?.trim();
  if (envPem && looksLikePem(envPem, "PUBLIC")) return envPem;

  const filePem = loadPemFromFile(process.env.NODE_PUBKEY_PATH);
  if (filePem && looksLikePem(filePem, "PUBLIC")) return filePem;

  return undefined;
}

/** --------------------------- ed25519 helpers --------------------------- */

/** Verify an Ed25519 detached signature (base64) over a UTF-8 message. */
export function verifyEd25519(args: {
  message: string;
  signatureB64: string;
  publicKeyPem: string;
}: boolean) {
  try {
    const key = crypto.createPublicKey(args.publicKeyPem);
    const sig = Buffer.from(args.signatureB64, "base64");
    return crypto.verify(null, Buffer.from(args.message, "utf8"), key, sig);
  } catch {
    return false;
  }
}

/** Sign a UTF-8 message with an Ed25519 private key (PEM) → base64 signature. */
export function signEd25519(args: { message: string; privateKeyPem: string }): string {
  const key = crypto.createPrivateKey(args.privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(args.message, "utf8"), key);
  return sig.toString("base64");
}

/** Derive a short nodeId from a PUBLIC key PEM (first 16 hex of sha256(SPKI DER)). */
export function nodeIdFromPublicPem(publicKeyPem: string): string {
  const pub = crypto.createPublicKey(publicKeyPem);
  const spkiDer = pub.export({ type: "spki", format: "der" }) as Buffer;
  return crypto.createHash("sha256").update(spkiDer).digest("hex").slice(0, 16);
}

/** Same as nodeIdFromPublicPem but from a KeyObject (PUBLIC). */
export function nodeIdFromPublicKeyObject(pub: crypto.KeyObject): string {
  const spkiDer = pub.export({ type: "spki", format: "der" }) as Buffer;
  return crypto.createHash("sha256").update(spkiDer).digest("hex").slice(0, 16);
}

/** Canonical string helper often used for signing pubsub payloads. */
export function canonicalSignString(topic: string, data: string, nonce: string): string {
  return JSON.stringify({ topic, data, nonce });
}

