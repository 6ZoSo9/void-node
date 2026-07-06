// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import { merkleRootHex, hashToLeafHex } from "../util/merkle.js";

export type Tx = { hash: string; body: Record<string, any> };
export type BlobRef = { cid: string; size: number };

export type Block = {
  number: number;
  parentHash: string;       // 64-hex
  timestamp: number;        // ms
  txRoot: string;           // 64-hex
  blobRoot: string;         // 64-hex
  txs: Tx[];
  blobs: BlobRef[];
  proposer: string;         // nodeId
  sig: string;              // 128-hex Ed25519 signature over header bytes
};

export function computeRoots(txs: Tx[], blobs: BlobRef[]) {
  const txLeaves = (txs || []).map((t) => (t?.hash || "").toLowerCase()).filter((h) => /^[0-9a-f]{64}$/.test(h));
  const blobLeaves = (blobs || []).map((b) => (b?.cid || "").toLowerCase()).filter((h) => /^[0-9a-f]{64}$/.test(h));
  const txRoot = txLeaves.length ? merkleRootHex(txLeaves.map(hashToLeafHex)) : "".padStart(64, "0");
  const blobRoot = blobLeaves.length ? merkleRootHex(blobLeaves.map(hashToLeafHex)) : "".padStart(64, "0");
  return { txRoot, blobRoot };
}

export function blockHash(b: Block): string {
  // Hash a minimal header (stable key order)
  const header = {
    number: b.number,
    parentHash: b.parentHash,
    timestamp: b.timestamp,
    txRoot: b.txRoot,
    blobRoot: b.blobRoot,
    proposer: b.proposer,
  };
  const json = JSON.stringify(header);
  return crypto.createHash("sha256").update(Buffer.from(json)).digest("hex");
}



export type BlockValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

export const ZERO_HASH_64 = "".padStart(64, "0");

function isHex64(v: any): boolean {
  return typeof v === "string" && /^[0-9a-fA-F]{64}$/.test(v);
}

function isHex128(v: any): boolean {
  return typeof v === "string" && /^[0-9a-fA-F]{128}$/.test(v);
}

function isTxShape(t: any): boolean {
  return !!t &&
    typeof t === "object" &&
    isHex64(String(t.hash || "")) &&
    !!t.body &&
    typeof t.body === "object" &&
    !Array.isArray(t.body);
}

function isBlobRefShape(b: any): boolean {
  return !!b &&
    typeof b === "object" &&
    isHex64(String(b.cid || "")) &&
    Number.isFinite(Number(b.size)) &&
    Number(b.size) >= 0;
}

/**
 * Validates a block immediately before append/import persistence.
 *
 * This deliberately checks only rules available at the local storage/import boundary:
 * - block shape
 * - contiguous parent linkage
 * - parentHash correctness
 * - tx/blob root correctness
 *
 * Proposer authority / signature validation needs an authenticated proposer-key map and
 * should be layered on top when that runtime truth is wired.
 */
export function validateBlockForAppend(candidate: any, parent: Block | null): BlockValidationResult {
  if (!candidate || typeof candidate !== "object") return { ok: false, reason: "block_must_be_object" };

  const number = Number(candidate.number);
  if (!Number.isInteger(number) || number < 0) return { ok: false, reason: "invalid_block_number" };

  if (!Number.isFinite(Number(candidate.timestamp)) || Number(candidate.timestamp) <= 0) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  const proposer = String(candidate.proposer || "").trim();
  if (!proposer) return { ok: false, reason: "missing_proposer" };
  if (!isHex128(String(candidate.sig || "").trim())) {
    return { ok: false, reason: "invalid_block_signature_shape" };
  }

  if (!isHex64(String(candidate.parentHash || ""))) return { ok: false, reason: "invalid_parent_hash" };
  if (!isHex64(String(candidate.txRoot || ""))) return { ok: false, reason: "invalid_tx_root" };
  if (!isHex64(String(candidate.blobRoot || ""))) return { ok: false, reason: "invalid_blob_root" };

  if (!Array.isArray(candidate.txs)) return { ok: false, reason: "txs_must_be_array" };
  if (!Array.isArray(candidate.blobs)) return { ok: false, reason: "blobs_must_be_array" };

  for (const tx of candidate.txs) {
    if (!isTxShape(tx)) return { ok: false, reason: "invalid_tx_shape" };
  }

  for (const blob of candidate.blobs) {
    if (!isBlobRefShape(blob)) return { ok: false, reason: "invalid_blob_ref_shape" };
  }

  const roots = computeRoots(candidate.txs, candidate.blobs);
  if (String(candidate.txRoot).toLowerCase() !== roots.txRoot) return { ok: false, reason: "tx_root_mismatch" };
  if (String(candidate.blobRoot).toLowerCase() !== roots.blobRoot) return { ok: false, reason: "blob_root_mismatch" };

  const parentHash = String(candidate.parentHash).toLowerCase();

  if (number === 0) {
    if (parentHash !== ZERO_HASH_64) return { ok: false, reason: "genesis_parent_hash_must_be_zero" };
    return { ok: true };
  }

  if (!parent) return { ok: false, reason: "missing_parent_block" };

  const expectedParentHash = blockHash(parent).toLowerCase();
  if (parentHash !== expectedParentHash) {
    return { ok: false, reason: "parent_hash_mismatch" };
  }

  return { ok: true };
}
