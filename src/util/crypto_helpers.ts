// Minimal crypto helpers for Ed25519 + sha256 hashing.
// Keys are loaded from process.env or file paths you provide.
// Nothing is persisted.

import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

export function sha256Utf8(input: string): Buffer {
  return crypto.createHash("sha256").update(input, "utf8").digest();
}

export function loadPemFromFile(filePath?: string): string | undefined {
  if (!filePath) return undefined;
  try {
    const pem = fs.readFileSync(filePath, "utf8");
    // sanity check: looks like a PEM
    if (/-----BEGIN .* KEY-----/.test(pem)) return pem;
  } catch {}
  return undefined;
}

/**
 * Load an Ed25519 PRIVATE key (PEM) from:
 *   1) process.env.NODE_PRIVKEY_PEM (raw PEM string)
 *   2) process.env.NODE_PRIVKEY_PATH (file path to PEM)
 * Returns undefined if not present. Keep in-memory only.
 */
export function loadPrivateKeyPEM(): string | undefined {
  const envPem = process.env.NODE_PRIVKEY_PEM?.trim();
  if (envPem && /-----BEGIN .* PRIVATE KEY-----/.test(envPem)) return envPem;
  const filePem = loadPemFromFile(process.env.NODE_PRIVKEY_PATH);
  return filePem;
}

/**
 * Load an Ed25519 PUBLIC key (PEM) from:
 *   1) process.env.NODE_PUBKEY_PEM (raw PEM)
 *   2) process.env.NODE_PUBKEY_PATH (file path)
 */
export function loadPublicKeyPEM(): string | undefined {
  const envPem = process.env.NODE_PUBKEY_PEM?.trim();
  if (envPem && /-----BEGIN PUBLIC KEY-----/.test(envPem)) return envPem;
  const filePem = loadPemFromFile(process.env.NODE_PUBKEY_PATH);
  return filePem;
}

/** Verify an Ed25519 detached signature (base64) over UTF-8 message. */
export function verifyEd25519({
  message,
  signatureB64,
  publicKeyPem,
}: {
  message: string;
  signatureB64: string;
  publicKeyPem: string;
}): boolean {
  try {
    const key = crypto.createPublicKey(publicKeyPem);
    const sig = Buffer.from(signatureB64, "base64");
    return crypto.verify(null, Buffer.from(message, "utf8"), key, sig);
  } catch {
    return false;
  }
}

/** Sign with Ed25519 private key in PEM. (Handy for tests/tools.) */
export function signEd25519({
  message,
  privateKeyPem,
}: {
  message: string;
  privateKeyPem: string;
}): string {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(message, "utf8"), key);
  return sig.toString("base64");
}

