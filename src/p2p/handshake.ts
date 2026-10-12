// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/p2p/handshake.ts
/**
 * Minimal signed-hello helpers used by our PubSub wire protocol.
 * We use Node's built-in Ed25519 (no deps).
 */
import * as crypto from "node:crypto";

export type Hello = {
  type: "HELLO";
  id: string;
  listen: string[];
  proto: number;
  pubkey: string;     // PEM (spki)
  nonce: string;      // hex
  sig: string;        // hex (sig over bytesToSign)
};

export function bytesToSign(topic: string, data: string, nonce: string): Uint8Array {
  return Buffer.from(JSON.stringify({ topic, data, nonce }));
}

export function signHello(
  priv: crypto.KeyObject,
  self: { id: string; listen: string[]; proto: number; pubPEM: string }
): Hello {
  const nonce = crypto.randomBytes(8).toString("hex");
  const payload = { id: self.id, listen: self.listen, proto: self.proto, pubkey: self.pubPEM };
  const bytes = bytesToSign("HELLO", JSON.stringify(payload), nonce);
  const sig = crypto.sign(null, Buffer.from(bytes), priv).toString("hex");
  return { type: "HELLO", ...payload, nonce, sig };
}

export function verifyHello(h: Hello): boolean {
  if (h.type !== "HELLO") return false;
  try {
    const pub = crypto.createPublicKey(h.pubkey);
    const payload = { id: h.id, listen: h.listen, proto: h.proto, pubkey: h.pubkey };
    const bytes = bytesToSign("HELLO", JSON.stringify(payload), h.nonce);
    return crypto.verify(null, Buffer.from(bytes), pub, Buffer.from(h.sig, "hex"));
  } catch {
    return false;
  }
}

