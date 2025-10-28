// src/crypto/keypair.ts
import * as fs from "node:fs";
import * as crypto from "node:crypto";

/** Load an Ed25519 private key (PEM) and derive node identity. */
export function loadKeypair(pemPath: string): {
  privateKey: crypto.KeyObject;
  publicKey: crypto.KeyObject;
  nodeId: string;
  pubPEM: string;
} {
  const pem = fs.readFileSync(pemPath, "utf8");
  const privateKey = crypto.createPrivateKey(pem);
  const publicKey = crypto.createPublicKey(privateKey);
  const pubPEM = publicKey.export({ type: "spki", format: "pem" }).toString();
  const nodeId = crypto.createHash("sha256").update(pubPEM).digest("hex").slice(0, 32);
  return { privateKey, publicKey, nodeId, pubPEM };
}

