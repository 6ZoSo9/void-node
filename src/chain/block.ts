// src/chain/block.ts
import * as crypto from "node:crypto";
import { merkleRoot } from "../util/merkle.js";

export type BlobRef = { cid: string; size: number };

export type Block = {
  number: number;
  parentHash: string;              // 64-hex (lowercase)
  timestamp: number;               // ms since epoch
  txRoot: string;                  // 64-hex
  blobRoot: string;                // 64-hex
  txs: any[];
  blobs: BlobRef[];
  proposer: string;                // node id
  sig: string;                     // proposer signature over header, hex
};

/* ------------------------------ helpers ------------------------------ */

const RX_HEX64 = /^[0-9a-f]{64}$/;

/** Produce the canonical header object (stable field order + normalized casing). */
export function headerForHashlike(b: Pick<Block, "number" | "parentHash" | "timestamp" | "txRoot" | "blobRoot" | "proposer">) {
  return {
    number: Number(b.number),
    parentHash: String(b.parentHash).toLowerCase(),
    timestamp: Number(b.timestamp),
    txRoot: String(b.txRoot).toLowerCase(),
    blobRoot: String(b.blobRoot).toLowerCase(),
    proposer: String(b.proposer),
  };
}

/** Canonical header bytes (JSON over stable headerForHashlike). */
export function headerBytes(b: Pick<Block, "number" | "parentHash" | "timestamp" | "txRoot" | "blobRoot" | "proposer">): Buffer {
  return Buffer.from(JSON.stringify(headerForHashlike(b)));
}

/** Compute the canonical header hash (sha256 over stable header bytes). */
export function blockHash(b: Block): string {
  return crypto.createHash("sha256").update(headerBytes(b)).digest("hex");
}

/** Verify an ed25519 signature over the canonical header bytes (optional utility). */
export function verifyBlockSig(b: Block, pubPEM: string): boolean {
  try {
    const pub = crypto.createPublicKey(pubPEM);
    const sig = Buffer.from(String(b.sig || ""), "hex");
    return crypto.verify(null, headerBytes(b), pub, sig);
  } catch {
    return false;
  }
}

/** Compute Merkle roots for txs and blobs (works for empty arrays). */
export function computeRoots(
  txs: any[] = [],
  blobs: BlobRef[] = [],
): { txRoot: string; blobRoot: string } {
  // For txs, hash the canonical JSON so order + content determine leaves.
  const txLeafBytes = txs.map((t) => Buffer.from(JSON.stringify(t)));
  // For blobs, the CID string (lowercased) is the identity of the content.
  const blobLeafBytes = blobs.map((b) => Buffer.from(String(b.cid).toLowerCase(), "utf8"));
  return {
    txRoot: merkleRoot(txLeafBytes),
    blobRoot: merkleRoot(blobLeafBytes),
  };
}

/* ----------------------------- validation ---------------------------- */

export type BlockValidation =
  | { ok: true }
  | { ok: false; error: string };

export function validateBlockShape(b: any): BlockValidation {
  if (!b || typeof b !== "object") return bad("not an object");
  if (!Number.isInteger(b.number) || b.number < 0) return bad("number must be >= 0");
  if (!Number.isInteger(b.timestamp) || b.timestamp <= 0) return bad("timestamp must be > 0");

  const ph = String(b.parentHash || "").toLowerCase();
  const tr = String(b.txRoot || "").toLowerCase();
  const br = String(b.blobRoot || "").toLowerCase();

  if (!RX_HEX64.test(ph)) return bad("parentHash must be 64-hex");
  if (!RX_HEX64.test(tr)) return bad("txRoot must be 64-hex");
  if (!RX_HEX64.test(br)) return bad("blobRoot must be 64-hex");

  if (typeof b.proposer !== "string" || !b.proposer) return bad("proposer missing");
  if (typeof b.sig !== "string" || b.sig.length === 0) return bad("sig missing");

  if (!Array.isArray(b.txs)) return bad("txs must be array");
  if (!Array.isArray(b.blobs)) return bad("blobs must be array");

  // Minimal blob entry checks
  for (const x of b.blobs) {
    if (!x || typeof x !== "object") return bad("blob entry not object");
    if (typeof x.cid !== "string" || x.cid.length === 0) return bad("blob.cid missing");
    if (!Number.isInteger(x.size) || x.size < 0) return bad("blob.size invalid");
  }

  return ok();
}

export function isBlock(x: any): x is Block {
  return validateBlockShape(x).ok;
}

/* ------------------------------ internals ---------------------------- */

const ok = (): BlockValidation => ({ ok: true });
const bad = (e: string): BlockValidation => ({ ok: false, error: e });

