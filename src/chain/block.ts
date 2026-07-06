// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
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
  proposerPubkey?: string;   // optional SPKI PEM public key for self-authenticated block verification
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


export function blockHeaderBytes(b: Pick<Block, "number" | "parentHash" | "timestamp" | "txRoot" | "blobRoot" | "proposer">): Buffer {
  const header = {
    number: b.number,
    parentHash: b.parentHash,
    timestamp: b.timestamp,
    txRoot: b.txRoot,
    blobRoot: b.blobRoot,
    proposer: b.proposer,
  };
  return Buffer.from(JSON.stringify(header));
}

export function nodeIdFromPubPEM(pubPEM: string): string {
  return crypto.createHash("sha256").update(String(pubPEM || "")).digest("hex").slice(0, 32);
}

export function verifyBlockSignatureWithPubkey(candidate: any, pubPEM: string): BlockValidationResult {
  const keyPem = String(pubPEM || "");
  if (!keyPem.trim()) return { ok: false, reason: "missing_proposer_pubkey" };

  const proposer = String(candidate?.proposer || "").trim();
  if (!proposer) return { ok: false, reason: "missing_proposer" };

  const sig = String(candidate?.sig || "").trim();
  if (!isHex128(sig)) return { ok: false, reason: "invalid_block_signature_shape" };

  let pub: crypto.KeyObject;
  try {
    pub = crypto.createPublicKey(keyPem);
  } catch {
    return { ok: false, reason: "invalid_proposer_pubkey" };
  }

  // Deliberately derive from the exact PEM string, matching loadKeypair()/node id semantics.
  const derivedNodeId = nodeIdFromPubPEM(keyPem);
  if (derivedNodeId !== proposer) {
    return { ok: false, reason: "proposer_pubkey_mismatch" };
  }

  try {
    const ok = crypto.verify(null, blockHeaderBytes(candidate), pub, Buffer.from(sig, "hex"));
    return ok ? { ok: true } : { ok: false, reason: "block_signature_invalid" };
  } catch {
    return { ok: false, reason: "block_signature_invalid" };
  }
}


export function blockProposerAuthorityRequiredFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = String(
    env.VOID_BLOCK_PROPOSER_AUTHORITY_REQUIRED ||
    env.VOID_REQUIRE_TRUSTED_BLOCK_PROPOSER ||
    ""
  ).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function parseTrustedBlockProposerIds(raw: any): Set<string> {
  return new Set(
    String(raw || "")
      .split(/[,\s]+/)
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

export function trustedBlockProposerIdsFromEnv(env: NodeJS.ProcessEnv = process.env): Set<string> {
  return parseTrustedBlockProposerIds(
    env.VOID_BLOCK_TRUSTED_PROPOSERS ||
    env.VOID_TRUSTED_BLOCK_PROPOSERS ||
    env.VOID_BLOCK_PROPOSER_ALLOWLIST ||
    ""
  );
}


export function blockProposerAuthoritySourceFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const raw = String(env.VOID_BLOCK_PROPOSER_AUTHORITY_SOURCE || "env").trim().toLowerCase();
  if (!raw || raw === "env" || raw === "allowlist" || raw === "operator_env") return "env";
  if (
    raw === "runtime_truth" ||
    raw === "validator_runtime_truth" ||
    raw === "runtime-truth" ||
    raw === "validator-runtime-truth"
  ) return "runtime_truth";
  return raw;
}

export function blockValidatorRuntimeTruthFileFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_FILE ||
    env.VOID_VALIDATOR_RUNTIME_TRUTH_FILE ||
    env.VOID_VALIDATOR_TRUTH_FILE ||
    ""
  ).trim();
}

function runtimeTruthEntryProposer(entry: any): string {
  const raw = entry?.proposer ?? entry?.proposerId ?? entry?.nodeId ?? entry?.id ?? entry?.validatorId ?? entry?.validator ?? "";
  if (raw && typeof raw === "object") {
    return String(raw.nodeId ?? raw.id ?? raw.proposer ?? raw.proposerId ?? "");
  }
  return String(raw || "");
}

function runtimeTruthEntries(root: any, epoch: string): Array<{ entry: any; index: number; fallbackEpoch: string }> {
  const out: Array<{ entry: any; index: number; fallbackEpoch: string }> = [];
  const rootEpoch = String(root?.epoch ?? root?.epochNumber ?? epoch);

  const push = (arr: any, fallbackEpoch: string) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((entry, index) => out.push({ entry, index, fallbackEpoch }));
  };

  push(root?.schedule, rootEpoch);
  push(root?.scheduleWindow, rootEpoch);
  push(root?.proposers, rootEpoch);

  const epochs = root?.epochs;
  if (epochs && typeof epochs === "object") {
    const e = epochs[epoch] ?? epochs[String(Number(epoch))];
    const eEpoch = String(e?.epoch ?? e?.epochNumber ?? epoch);
    push(e?.schedule, eEpoch);
    push(e?.scheduleWindow, eEpoch);
    push(e?.proposers, eEpoch);
  }

  const runtime = root?.validatorRuntimeTruth ?? root?.runtimeTruth;
  if (runtime && typeof runtime === "object") {
    const rEpoch = String(runtime?.epoch ?? runtime?.epochNumber ?? rootEpoch);
    push(runtime?.schedule, rEpoch);
    push(runtime?.scheduleWindow, rEpoch);
    push(runtime?.proposers, rEpoch);
  }

  return out;
}

export function expectedBlockProposerFromRuntimeTruth(
  candidate: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { proposer?: string } {
  const file = blockValidatorRuntimeTruthFileFromEnv(env);
  if (!file) return { ok: false, reason: "missing_validator_runtime_truth_file" };
  if (!fs.existsSync(file)) return { ok: false, reason: "validator_runtime_truth_file_missing" };

  let truth: any;
  try {
    truth = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { ok: false, reason: "invalid_validator_runtime_truth_file" };
  }

  if (!truth || typeof truth !== "object") {
    return { ok: false, reason: "invalid_validator_runtime_truth_file" };
  }

  const epoch = String(
    env.VOID_BLOCK_PROPOSER_EPOCH ??
    env.VOID_VALIDATOR_RUNTIME_EPOCH ??
    candidate?.epoch ??
    candidate?.proposerEpoch ??
    "0"
  );

  const slot = String(
    env.VOID_BLOCK_PROPOSER_SLOT ??
    env.VOID_VALIDATOR_RUNTIME_SLOT ??
    candidate?.slot ??
    candidate?.proposerSlot ??
    candidate?.number
  );

  const entries = runtimeTruthEntries(truth, epoch);
  if (!entries.length) return { ok: false, reason: "validator_runtime_truth_schedule_missing" };

  for (const { entry, index, fallbackEpoch } of entries) {
    const entryEpoch = String(entry?.epoch ?? entry?.epochNumber ?? fallbackEpoch);
    const entrySlot = String(entry?.slot ?? entry?.slotNumber ?? entry?.proposerSlot ?? entry?.number ?? index);
    const proposer = runtimeTruthEntryProposer(entry).trim();
    if (entryEpoch === epoch && entrySlot === slot && proposer) {
      return { ok: true, proposer };
    }
  }

  return { ok: false, reason: "runtime_truth_proposer_not_found" };
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

  const authorityRequired = blockProposerAuthorityRequiredFromEnv();
  const proposerPubkey = String(candidate.proposerPubkey || "");

  if (authorityRequired && !proposerPubkey.trim()) {
    return { ok: false, reason: "missing_proposer_pubkey" };
  }

  if (proposerPubkey.trim()) {
    // Pass the exact PEM string through. Node ids are derived from the exact exported PEM.
    const signatureValid = verifyBlockSignatureWithPubkey(candidate, proposerPubkey);
    if (!signatureValid.ok) return signatureValid;
  }

  if (authorityRequired) {
    const authoritySource = blockProposerAuthoritySourceFromEnv();

    if (authoritySource === "runtime_truth") {
      const expected = expectedBlockProposerFromRuntimeTruth(candidate);
      if (!expected.ok) return expected;
      if (expected.proposer !== proposer) {
        return { ok: false, reason: "runtime_truth_proposer_mismatch" };
      }
    } else if (authoritySource === "env") {
      const trusted = trustedBlockProposerIdsFromEnv();
      if (!trusted.has(proposer)) {
        return { ok: false, reason: "unauthorized_proposer" };
      }
    } else {
      return { ok: false, reason: "unsupported_proposer_authority_source" };
    }
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
