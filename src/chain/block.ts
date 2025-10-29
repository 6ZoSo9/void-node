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
  sig: string;              // 64-hex ed25519 signature over header bytes
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

