// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as fs from "node:fs";
import * as crypto from "node:crypto";

type LoadedFormat = "pem" | "raw-ed25519-seed";

function recordCryptoKeypairBestEffortFailure(scope: string, err: unknown, meta: Record<string, unknown> = {}): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_CRYPTO_KEYPAIR_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE", {
    scope,
    message,
    ...meta,
  });
}

function normalizeRawSeed(text: string): Buffer | null {
  const s = text.trim();

  if (s.includes("-----BEGIN")) return null;

  const hex = s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s;

  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;

  return Buffer.from(hex, "hex");
}

function pemToKeypair(pem: string) {
  const privateKey = crypto.createPrivateKey(pem);
  const publicKey = crypto.createPublicKey(privateKey);
  return { privateKey, publicKey, format: "pem" as LoadedFormat };
}

function rawSeedToKeypair(seed: Buffer) {
  const PKCS8_ED25519_PREFIX = Buffer.from(
    "302e020100300506032b657004220420",
    "hex"
  );

  const der = Buffer.concat([PKCS8_ED25519_PREFIX, seed]);
  const privateKey = crypto.createPrivateKey({
    key: der,
    format: "der",
    type: "pkcs8",
  });
  const publicKey = crypto.createPublicKey(privateKey);
  return { privateKey, publicKey, format: "raw-ed25519-seed" as LoadedFormat };
}

/** Load an Ed25519 private key and derive node identity.
 *
 * Accepted file formats:
 *  - PEM / PKCS8 private key
 *  - raw 32-byte Ed25519 seed as 64 hex chars (optional 0x prefix)
 */
export function loadKeypair(keyPath: string): {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
  format: LoadedFormat;
} {
  const rawText = fs.readFileSync(keyPath, "utf8").trim();

  let loaded:
    | {
        privateKey: crypto.KeyObject;
        publicKey: crypto.KeyObject;
        format: LoadedFormat;
      }
    | null = null;

  try {
    loaded = pemToKeypair(rawText);
  } catch (err) {
    recordCryptoKeypairBestEffortFailure("pem-parse-fallback-to-raw-seed", err, { keyPath });
    loaded = null;
  }

  if (!loaded) {
    const seed = normalizeRawSeed(rawText);
    if (seed) {
      loaded = rawSeedToKeypair(seed);
    }
  }

  if (!loaded) {
    throw new Error(
      [
        `Unsupported key format at ${keyPath}`,
        `Accepted formats:`,
        `  1) PEM/PKCS8 Ed25519 private key`,
        `  2) raw Ed25519 seed as 64 hex chars (optional 0x prefix)`,
      ].join("\n")
    );
  }

  const { privateKey, publicKey, format } = loaded;
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = crypto
    .createHash("sha256")
    .update(pubPEM)
    .digest("hex")
    .slice(0, 32);

  return { privateKey, publicKey, nodeId, pubPEM, format };
}
