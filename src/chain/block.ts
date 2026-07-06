// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
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
  if (
    raw === "signed_runtime_truth" ||
    raw === "signed-validator-runtime-truth" ||
    raw === "signed_runtime-truth" ||
    raw === "signed-runtime-truth"
  ) return "signed_runtime_truth";
  if (
    raw === "signed_runtime_truth_epoch_root" ||
    raw === "signed-runtime-truth-epoch-root" ||
    raw === "signed_validator_runtime_truth_epoch_root" ||
    raw === "signed-validator-runtime-truth-epoch-root" ||
    raw === "epoch_root" ||
    raw === "epoch-root"
  ) return "signed_runtime_truth_epoch_root";
  if (
    raw === "signed_runtime_truth_chain_epoch_root" ||
    raw === "signed-runtime-truth-chain-epoch-root" ||
    raw === "chain_epoch_root" ||
    raw === "chain-epoch-root" ||
    raw === "chain_derived_epoch_root" ||
    raw === "chain-derived-epoch-root"
  ) return "signed_runtime_truth_chain_epoch_root";
  if (
    raw === "signed_runtime_truth_canonical_chain_epoch_root" ||
    raw === "signed-runtime-truth-canonical-chain-epoch-root" ||
    raw === "canonical_chain_epoch_root" ||
    raw === "canonical-chain-epoch-root" ||
    raw === "canonical_chain" ||
    raw === "canonical-chain"
  ) return "signed_runtime_truth_canonical_chain_epoch_root";
  if (
    raw === "signed_runtime_truth_live_chain_epoch_root" ||
    raw === "signed-runtime-truth-live-chain-epoch-root" ||
    raw === "live_chain_epoch_root" ||
    raw === "live-chain-epoch-root" ||
    raw === "live_chain" ||
    raw === "live-chain"
  ) return "signed_runtime_truth_live_chain_epoch_root";
  if (
    raw === "signed_runtime_truth_live_chain_api_epoch_root" ||
    raw === "signed-runtime-truth-live-chain-api-epoch-root" ||
    raw === "live_chain_api_epoch_root" ||
    raw === "live-chain-api-epoch-root" ||
    raw === "live_chain_api" ||
    raw === "live-chain-api" ||
    raw === "finality_api" ||
    raw === "finality-api"
  ) return "signed_runtime_truth_live_chain_api_epoch_root";
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


function stableJsonStringify(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map((x) => stableJsonStringify(x)).join(",") + "]";
  const keys = Object.keys(v).filter((k) => typeof v[k] !== "undefined").sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableJsonStringify(v[k])).join(",") + "}";
}

function runtimeTruthBodyWithoutSignature(truth: any): any {
  const body: any = {};
  for (const k of Object.keys(truth || {})) {
    if (k === "signature" || k === "manifestSignature" || k === "manifest_signature") continue;
    body[k] = truth[k];
  }
  return body;
}

export function validatorRuntimeTruthSigningBody(truth: any): Buffer {
  return Buffer.from(stableJsonStringify(runtimeTruthBodyWithoutSignature(truth)));
}


export function validatorRuntimeTruthManifestBodyHash(truth: any): string {
  return crypto.createHash("sha256").update(validatorRuntimeTruthSigningBody(truth)).digest("hex");
}

export function validatorRuntimeTruthEpochRootRequiredFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const source = blockProposerAuthoritySourceFromEnv(env);
  if (source === "signed_runtime_truth_epoch_root") return true;
  const raw = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT_REQUIRED ||
    env.VOID_REQUIRE_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT ||
    ""
  ).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function expectedValidatorRuntimeTruthEpochRootFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT ||
    env.VOID_VALIDATOR_RUNTIME_TRUTH_EPOCH_ROOT ||
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_BODY_HASH ||
    env.VOID_VALIDATOR_RUNTIME_TRUTH_BODY_HASH ||
    ""
  ).trim().replace(/^0x/i, "");
}

export function verifyValidatorRuntimeTruthEpochRoot(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const expected = expectedValidatorRuntimeTruthEpochRootFromEnv(env);
  if (!expected) return { ok: false, reason: "missing_validator_runtime_truth_epoch_root" };
  if (!isHex64(expected)) return { ok: false, reason: "invalid_validator_runtime_truth_epoch_root" };

  const actual = validatorRuntimeTruthManifestBodyHash(truth);
  if (actual !== expected) {
    return { ok: false, reason: "validator_runtime_truth_epoch_root_mismatch" };
  }

  return { ok: true, root: actual };
}


export function validatorEpochRootCommitmentFileFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return String(
    env.VOID_BLOCK_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE ||
    env.VOID_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE ||
    env.VOID_CHAIN_VALIDATOR_EPOCH_ROOT_COMMITMENT_FILE ||
    env.VOID_VALIDATOR_SET_COMMITMENT_FILE ||
    ""
  ).trim();
}

function epochRootFromCommitmentEntry(entry: any): string {
  const raw = entry?.root ?? entry?.epochRoot ?? entry?.epoch_root ?? entry?.bodyHash ?? entry?.body_hash ?? entry?.validatorRuntimeTruthRoot ?? "";
  return String(raw || "").trim().replace(/^0x/i, "");
}

function commitmentEntries(root: any, epoch: string): Array<{ entry: any; index: number; fallbackEpoch: string }> {
  const out: Array<{ entry: any; index: number; fallbackEpoch: string }> = [];
  const rootEpoch = String(root?.epoch ?? root?.epochNumber ?? epoch);

  const push = (arr: any, fallbackEpoch: string) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((entry, index) => out.push({ entry, index, fallbackEpoch }));
  };

  push(root?.commitments, rootEpoch);
  push(root?.epoch_roots, rootEpoch);
  push(root?.epochRoots, rootEpoch);
  push(root?.roots, rootEpoch);
  push(root?.validatorSetCommitments, rootEpoch);
  push(root?.validator_set_commitments, rootEpoch);

  const epochs = root?.epochs;
  if (epochs && typeof epochs === "object") {
    const e = epochs[epoch] ?? epochs[String(Number(epoch))];
    if (typeof e === "string") {
      out.push({ entry: { epoch, root: e }, index: 0, fallbackEpoch: epoch });
    } else if (e && typeof e === "object") {
      const eEpoch = String(e?.epoch ?? e?.epochNumber ?? epoch);
      out.push({ entry: e, index: 0, fallbackEpoch: eEpoch });
      push(e?.commitments, eEpoch);
      push(e?.epoch_roots, eEpoch);
      push(e?.epochRoots, eEpoch);
      push(e?.roots, eEpoch);
    }
  }

  if (root?.root || root?.epochRoot || root?.epoch_root || root?.bodyHash || root?.body_hash) {
    out.push({ entry: root, index: 0, fallbackEpoch: rootEpoch });
  }

  return out;
}

export function expectedValidatorRuntimeTruthEpochRootFromCommitmentFile(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const file = validatorEpochRootCommitmentFileFromEnv(env);
  if (!file) return { ok: false, reason: "missing_validator_epoch_root_commitment_file" };
  if (!fs.existsSync(file)) return { ok: false, reason: "validator_epoch_root_commitment_file_missing" };

  let commitment: any;
  try {
    commitment = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { ok: false, reason: "invalid_validator_epoch_root_commitment_file" };
  }

  if (!commitment || typeof commitment !== "object") {
    return { ok: false, reason: "invalid_validator_epoch_root_commitment_file" };
  }

  const epoch = String(
    env.VOID_BLOCK_PROPOSER_EPOCH ??
    env.VOID_VALIDATOR_RUNTIME_EPOCH ??
    truth?.epoch ??
    truth?.epochNumber ??
    "0"
  );

  const entries = commitmentEntries(commitment, epoch);
  if (!entries.length) return { ok: false, reason: "validator_epoch_root_commitment_missing" };

  for (const { entry, index, fallbackEpoch } of entries) {
    const entryEpoch = String(entry?.epoch ?? entry?.epochNumber ?? fallbackEpoch);
    const entrySlot = entry?.slot ?? entry?.slotNumber;
    if (typeof entrySlot !== "undefined" && String(entrySlot) !== "0") continue;
    if (entryEpoch !== epoch) continue;

    const root = epochRootFromCommitmentEntry(entry);
    if (!root) continue;
    if (!isHex64(root)) return { ok: false, reason: "invalid_validator_epoch_root_commitment" };
    return { ok: true, root };
  }

  return { ok: false, reason: "validator_epoch_root_commitment_missing" };
}

export function validatorRuntimeTruthChainEpochRootRequiredFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const source = blockProposerAuthoritySourceFromEnv(env);
  if (source === "signed_runtime_truth_chain_epoch_root") return true;
  const raw = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_CHAIN_EPOCH_ROOT_REQUIRED ||
    env.VOID_REQUIRE_CHAIN_VALIDATOR_EPOCH_ROOT ||
    ""
  ).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function verifyValidatorRuntimeTruthChainEpochRoot(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const expected = expectedValidatorRuntimeTruthEpochRootFromCommitmentFile(truth, env);
  if (!expected.ok) return expected;

  const actual = validatorRuntimeTruthManifestBodyHash(truth);
  if (actual !== expected.root) {
    return { ok: false, reason: "validator_runtime_truth_chain_epoch_root_mismatch" };
  }

  return { ok: true, root: actual };
}


export function validatorCanonicalChainStateFileFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return String(
    env.VOID_BLOCK_VALIDATOR_CANONICAL_CHAIN_STATE_FILE ||
    env.VOID_VALIDATOR_CANONICAL_CHAIN_STATE_FILE ||
    env.VOID_CANONICAL_CHAIN_VALIDATOR_STATE_FILE ||
    env.VOID_CHAIN_STATE_FILE ||
    ""
  ).trim();
}

function canonicalChainEpochRootEntryRoot(entry: any): string {
  const raw =
    entry?.root ??
    entry?.epochRoot ??
    entry?.epoch_root ??
    entry?.bodyHash ??
    entry?.body_hash ??
    entry?.validatorRuntimeTruthRoot ??
    entry?.validator_runtime_truth_root ??
    "";
  return String(raw || "").trim().replace(/^0x/i, "");
}

function canonicalFlag(v: any): boolean {
  if (v === true || v === 1) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "finalized" || s === "canonical";
}

function canonicalChainEpochRootFinalized(root: any, entry: any): boolean {
  return canonicalFlag(entry?.finalized) ||
    canonicalFlag(entry?.final) ||
    canonicalFlag(entry?.canonical) ||
    canonicalFlag(entry?.committed) ||
    canonicalFlag(root?.finalized) ||
    canonicalFlag(root?.final) ||
    canonicalFlag(root?.canonical);
}

function canonicalChainEpochRootEntries(root: any, epoch: string): Array<{ entry: any; index: number; fallbackEpoch: string }> {
  const out: Array<{ entry: any; index: number; fallbackEpoch: string }> = [];
  const rootEpoch = String(root?.epoch ?? root?.epochNumber ?? epoch);

  const push = (arr: any, fallbackEpoch: string) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((entry, index) => out.push({ entry, index, fallbackEpoch }));
  };

  push(root?.validator_epoch_root_commitments, rootEpoch);
  push(root?.validatorEpochRootCommitments, rootEpoch);
  push(root?.canonicalValidatorEpochRootCommitments, rootEpoch);
  push(root?.canonical_validator_epoch_root_commitments, rootEpoch);
  push(root?.commitments, rootEpoch);
  push(root?.epochRoots, rootEpoch);
  push(root?.epoch_roots, rootEpoch);
  push(root?.roots, rootEpoch);

  const state = root?.state ?? root?.chainState ?? root?.canonicalChainState;
  if (state && typeof state === "object") {
    const stateEpoch = String(state?.epoch ?? state?.epochNumber ?? rootEpoch);
    push(state?.validator_epoch_root_commitments, stateEpoch);
    push(state?.validatorEpochRootCommitments, stateEpoch);
    push(state?.commitments, stateEpoch);
    push(state?.epochRoots, stateEpoch);
    push(state?.epoch_roots, stateEpoch);
    push(state?.roots, stateEpoch);
  }

  const epochs = root?.epochs;
  if (epochs && typeof epochs === "object") {
    const e = epochs[epoch] ?? epochs[String(Number(epoch))];
    if (typeof e === "string") {
      out.push({ entry: { epoch, root: e, finalized: root?.finalized ?? true }, index: 0, fallbackEpoch: epoch });
    } else if (e && typeof e === "object") {
      const eEpoch = String(e?.epoch ?? e?.epochNumber ?? epoch);
      out.push({ entry: e, index: 0, fallbackEpoch: eEpoch });
      push(e?.validator_epoch_root_commitments, eEpoch);
      push(e?.validatorEpochRootCommitments, eEpoch);
      push(e?.commitments, eEpoch);
      push(e?.epochRoots, eEpoch);
      push(e?.epoch_roots, eEpoch);
      push(e?.roots, eEpoch);
    }
  }

  if (root?.root || root?.epochRoot || root?.epoch_root || root?.bodyHash || root?.body_hash) {
    out.push({ entry: root, index: 0, fallbackEpoch: rootEpoch });
  }

  return out;
}

export function expectedValidatorRuntimeTruthEpochRootFromCanonicalChainState(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const file = validatorCanonicalChainStateFileFromEnv(env);
  if (!file) return { ok: false, reason: "missing_validator_canonical_chain_state_file" };
  if (!fs.existsSync(file)) return { ok: false, reason: "validator_canonical_chain_state_file_missing" };

  let state: any;
  try {
    state = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { ok: false, reason: "invalid_validator_canonical_chain_state_file" };
  }

  if (!state || typeof state !== "object") {
    return { ok: false, reason: "invalid_validator_canonical_chain_state_file" };
  }

  const epoch = String(
    env.VOID_BLOCK_PROPOSER_EPOCH ??
    env.VOID_VALIDATOR_RUNTIME_EPOCH ??
    truth?.epoch ??
    truth?.epochNumber ??
    "0"
  );

  const entries = canonicalChainEpochRootEntries(state, epoch);
  if (!entries.length) return { ok: false, reason: "validator_canonical_chain_epoch_root_missing" };

  let sawUnfinalizedMatch = false;

  for (const { entry, fallbackEpoch } of entries) {
    const entryEpoch = String(entry?.epoch ?? entry?.epochNumber ?? fallbackEpoch);
    if (entryEpoch !== epoch) continue;

    const root = canonicalChainEpochRootEntryRoot(entry);
    if (!root) continue;
    if (!isHex64(root)) return { ok: false, reason: "invalid_validator_canonical_chain_epoch_root" };

    if (!canonicalChainEpochRootFinalized(state, entry)) {
      sawUnfinalizedMatch = true;
      continue;
    }

    return { ok: true, root };
  }

  if (sawUnfinalizedMatch) {
    return { ok: false, reason: "validator_canonical_chain_epoch_root_not_finalized" };
  }

  return { ok: false, reason: "validator_canonical_chain_epoch_root_missing" };
}

export function validatorRuntimeTruthCanonicalChainEpochRootRequiredFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const source = blockProposerAuthoritySourceFromEnv(env);
  if (source === "signed_runtime_truth_canonical_chain_epoch_root") return true;
  const raw = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_CANONICAL_CHAIN_EPOCH_ROOT_REQUIRED ||
    env.VOID_REQUIRE_CANONICAL_CHAIN_VALIDATOR_EPOCH_ROOT ||
    ""
  ).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function verifyValidatorRuntimeTruthCanonicalChainEpochRoot(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const expected = expectedValidatorRuntimeTruthEpochRootFromCanonicalChainState(truth, env);
  if (!expected.ok) return expected;

  const actual = validatorRuntimeTruthManifestBodyHash(truth);
  if (actual !== expected.root) {
    return { ok: false, reason: "validator_runtime_truth_canonical_chain_epoch_root_mismatch" };
  }

  return { ok: true, root: actual };
}


export function validatorLiveChainStateDirFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return String(
    env.VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_DIR ||
    env.VOID_VALIDATOR_LIVE_CHAIN_STATE_DIR ||
    env.VOID_LIVE_CHAIN_STATE_DIR ||
    env.DATA_DIR ||
    ""
  ).trim();
}

export function validatorLiveChainStateCandidateFilesFromEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  const dir = validatorLiveChainStateDirFromEnv(env);
  if (!dir) return [];
  return [
    path.join(dir, "validator-epoch-root-commitments.json"),
    path.join(dir, "chain", "validator-epoch-root-commitments.json"),
    path.join(dir, "canonical-chain-state.json"),
    path.join(dir, "chain", "canonical-chain-state.json"),
  ];
}

export function liveValidatorChainStateFileFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const candidates = validatorLiveChainStateCandidateFilesFromEnv(env);
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return "";
}

export function expectedValidatorRuntimeTruthEpochRootFromLiveChainState(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const dir = validatorLiveChainStateDirFromEnv(env);
  if (!dir) return { ok: false, reason: "missing_live_validator_chain_state_dir" };

  const file = liveValidatorChainStateFileFromEnv(env);
  if (!file) return { ok: false, reason: "live_validator_chain_state_file_missing" };

  let state: any;
  try {
    state = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { ok: false, reason: "invalid_live_validator_chain_state_file" };
  }

  if (!state || typeof state !== "object") {
    return { ok: false, reason: "invalid_live_validator_chain_state_file" };
  }

  const epoch = String(
    env.VOID_BLOCK_PROPOSER_EPOCH ??
    env.VOID_VALIDATOR_RUNTIME_EPOCH ??
    truth?.epoch ??
    truth?.epochNumber ??
    "0"
  );

  const entries = canonicalChainEpochRootEntries(state, epoch);
  if (!entries.length) return { ok: false, reason: "live_validator_chain_epoch_root_missing" };

  let sawUnfinalizedMatch = false;

  for (const { entry, fallbackEpoch } of entries) {
    const entryEpoch = String(entry?.epoch ?? entry?.epochNumber ?? fallbackEpoch);
    if (entryEpoch !== epoch) continue;

    const root = canonicalChainEpochRootEntryRoot(entry);
    if (!root) continue;
    if (!isHex64(root)) return { ok: false, reason: "invalid_live_validator_chain_epoch_root" };

    if (!canonicalChainEpochRootFinalized(state, entry)) {
      sawUnfinalizedMatch = true;
      continue;
    }

    return { ok: true, root };
  }

  if (sawUnfinalizedMatch) {
    return { ok: false, reason: "live_validator_chain_epoch_root_not_finalized" };
  }

  return { ok: false, reason: "live_validator_chain_epoch_root_missing" };
}

export function validatorRuntimeTruthLiveChainEpochRootRequiredFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const source = blockProposerAuthoritySourceFromEnv(env);
  if (source === "signed_runtime_truth_live_chain_epoch_root") return true;
  const raw = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_LIVE_CHAIN_EPOCH_ROOT_REQUIRED ||
    env.VOID_REQUIRE_LIVE_CHAIN_VALIDATOR_EPOCH_ROOT ||
    ""
  ).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function verifyValidatorRuntimeTruthLiveChainEpochRoot(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const expected = expectedValidatorRuntimeTruthEpochRootFromLiveChainState(truth, env);
  if (!expected.ok) return expected;

  const actual = validatorRuntimeTruthManifestBodyHash(truth);
  if (actual !== expected.root) {
    return { ok: false, reason: "validator_runtime_truth_live_chain_epoch_root_mismatch" };
  }

  return { ok: true, root: actual };
}


export function validatorLiveChainStateApiResponseFileFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return String(
    env.VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FILE ||
    env.VOID_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FILE ||
    env.VOID_LIVE_CHAIN_STATE_API_RESPONSE_FILE ||
    env.VOID_CHAIN_FINALITY_API_RESPONSE_FILE ||
    ""
  ).trim();
}

export function expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const file = validatorLiveChainStateApiResponseFileFromEnv(env);
  if (!file) return { ok: false, reason: "missing_live_validator_chain_state_api_response_file" };
  if (!fs.existsSync(file)) return { ok: false, reason: "live_validator_chain_state_api_response_file_missing" };

  let response: any;
  try {
    response = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { ok: false, reason: "invalid_live_validator_chain_state_api_response" };
  }

  if (!response || typeof response !== "object") {
    return { ok: false, reason: "invalid_live_validator_chain_state_api_response" };
  }

  if (response.ok === false) {
    return { ok: false, reason: "live_validator_chain_state_api_response_not_ok" };
  }

  const epoch = String(
    env.VOID_BLOCK_PROPOSER_EPOCH ??
    env.VOID_VALIDATOR_RUNTIME_EPOCH ??
    truth?.epoch ??
    truth?.epochNumber ??
    "0"
  );

  const entries = canonicalChainEpochRootEntries(response, epoch);
  if (!entries.length) return { ok: false, reason: "live_validator_chain_state_api_epoch_root_missing" };

  let sawUnfinalizedMatch = false;
  let sawDifferentEpoch = false;

  for (const { entry, fallbackEpoch } of entries) {
    const entryEpoch = String(entry?.epoch ?? entry?.epochNumber ?? fallbackEpoch);
    if (entryEpoch !== epoch) {
      sawDifferentEpoch = true;
      continue;
    }

    const root = canonicalChainEpochRootEntryRoot(entry);
    if (!root) continue;
    if (!isHex64(root)) return { ok: false, reason: "invalid_live_validator_chain_state_api_epoch_root" };

    if (!canonicalChainEpochRootFinalized(response, entry)) {
      sawUnfinalizedMatch = true;
      continue;
    }

    return { ok: true, root };
  }

  if (sawUnfinalizedMatch) {
    return { ok: false, reason: "live_validator_chain_state_api_epoch_root_not_finalized" };
  }

  if (sawDifferentEpoch) {
    return { ok: false, reason: "live_validator_chain_state_api_epoch_mismatch" };
  }

  return { ok: false, reason: "live_validator_chain_state_api_epoch_root_missing" };
}

export function validatorRuntimeTruthLiveChainApiEpochRootRequiredFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const source = blockProposerAuthoritySourceFromEnv(env);
  if (source === "signed_runtime_truth_live_chain_api_epoch_root") return true;
  const raw = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_LIVE_CHAIN_API_EPOCH_ROOT_REQUIRED ||
    env.VOID_REQUIRE_LIVE_CHAIN_API_VALIDATOR_EPOCH_ROOT ||
    ""
  ).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function verifyValidatorRuntimeTruthLiveChainApiEpochRoot(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult & { root?: string } {
  const expected = expectedValidatorRuntimeTruthEpochRootFromLiveChainApiResponse(truth, env);
  if (!expected.ok) return expected;

  const actual = validatorRuntimeTruthManifestBodyHash(truth);
  if (actual !== expected.root) {
    return { ok: false, reason: "validator_runtime_truth_live_chain_api_epoch_root_mismatch" };
  }

  return { ok: true, root: actual };
}

export function validatorRuntimeTruthSignatureRequiredFromEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  const source = blockProposerAuthoritySourceFromEnv(env);
  if (
    source === "signed_runtime_truth" ||
    source === "signed_runtime_truth_epoch_root" ||
    source === "signed_runtime_truth_chain_epoch_root" ||
    source === "signed_runtime_truth_canonical_chain_epoch_root" ||
    source === "signed_runtime_truth_live_chain_epoch_root" ||
    source === "signed_runtime_truth_live_chain_api_epoch_root"
  ) return true;
  const raw = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNATURE_REQUIRED ||
    env.VOID_REQUIRE_SIGNED_VALIDATOR_RUNTIME_TRUTH ||
    ""
  ).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function trustedValidatorRuntimeTruthSignerPubkeyFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const file = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE ||
    env.VOID_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY_FILE ||
    env.VOID_SIGNED_VALIDATOR_RUNTIME_TRUTH_PUBKEY_FILE ||
    ""
  ).trim();

  if (file) {
    try {
      return fs.readFileSync(file, "utf8");
    } catch {
      return "";
    }
  }

  const raw = String(
    env.VOID_BLOCK_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY ||
    env.VOID_VALIDATOR_RUNTIME_TRUTH_SIGNER_PUBKEY ||
    env.VOID_SIGNED_VALIDATOR_RUNTIME_TRUTH_PUBKEY ||
    ""
  );

  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function runtimeTruthSignatureBlock(truth: any): any {
  return truth?.signature ?? truth?.manifestSignature ?? truth?.manifest_signature ?? null;
}

export function verifyValidatorRuntimeTruthManifestSignature(
  truth: any,
  env: NodeJS.ProcessEnv = process.env
): BlockValidationResult {
  const sigBlock = runtimeTruthSignatureBlock(truth);
  if (!sigBlock || typeof sigBlock !== "object") {
    return { ok: false, reason: "validator_runtime_truth_signature_missing" };
  }

  const alg = String(sigBlock.alg || sigBlock.algorithm || "").trim().toLowerCase();
  if (alg !== "ed25519") return { ok: false, reason: "validator_runtime_truth_signature_alg_unsupported" };

  const sig = String(sigBlock.sig || sigBlock.signature || "").trim();
  if (!isHex128(sig)) return { ok: false, reason: "validator_runtime_truth_signature_shape_invalid" };

  const signerPubkey = String(sigBlock.signer_pubkey || sigBlock.pubkey || sigBlock.publicKey || "");
  if (!signerPubkey.trim()) {
    return { ok: false, reason: "validator_runtime_truth_signer_pubkey_missing" };
  }

  const trustedPubkey = trustedValidatorRuntimeTruthSignerPubkeyFromEnv(env);
  if (!trustedPubkey.trim()) {
    return { ok: false, reason: "missing_validator_runtime_truth_trusted_signer" };
  }

  if (signerPubkey !== trustedPubkey) {
    return { ok: false, reason: "validator_runtime_truth_signer_mismatch" };
  }

  let pub: crypto.KeyObject;
  try {
    pub = crypto.createPublicKey(trustedPubkey);
  } catch {
    return { ok: false, reason: "invalid_validator_runtime_truth_trusted_signer" };
  }

  try {
    const ok = crypto.verify(null, validatorRuntimeTruthSigningBody(truth), pub, Buffer.from(sig, "hex"));
    return ok ? { ok: true } : { ok: false, reason: "validator_runtime_truth_signature_invalid" };
  } catch {
    return { ok: false, reason: "validator_runtime_truth_signature_invalid" };
  }
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

  if (validatorRuntimeTruthSignatureRequiredFromEnv(env)) {
    const signatureValid = verifyValidatorRuntimeTruthManifestSignature(truth, env);
    if (!signatureValid.ok) return signatureValid;
  }

  if (validatorRuntimeTruthLiveChainApiEpochRootRequiredFromEnv(env)) {
    const rootValid = verifyValidatorRuntimeTruthLiveChainApiEpochRoot(truth, env);
    if (!rootValid.ok) return rootValid;
  } else if (validatorRuntimeTruthLiveChainEpochRootRequiredFromEnv(env)) {
    const rootValid = verifyValidatorRuntimeTruthLiveChainEpochRoot(truth, env);
    if (!rootValid.ok) return rootValid;
  } else if (validatorRuntimeTruthCanonicalChainEpochRootRequiredFromEnv(env)) {
    const rootValid = verifyValidatorRuntimeTruthCanonicalChainEpochRoot(truth, env);
    if (!rootValid.ok) return rootValid;
  } else if (validatorRuntimeTruthChainEpochRootRequiredFromEnv(env)) {
    const rootValid = verifyValidatorRuntimeTruthChainEpochRoot(truth, env);
    if (!rootValid.ok) return rootValid;
  } else if (validatorRuntimeTruthEpochRootRequiredFromEnv(env)) {
    const rootValid = verifyValidatorRuntimeTruthEpochRoot(truth, env);
    if (!rootValid.ok) return rootValid;
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

    if (
      authoritySource === "runtime_truth" ||
      authoritySource === "signed_runtime_truth" ||
      authoritySource === "signed_runtime_truth_epoch_root" ||
      authoritySource === "signed_runtime_truth_chain_epoch_root" ||
      authoritySource === "signed_runtime_truth_canonical_chain_epoch_root" ||
      authoritySource === "signed_runtime_truth_live_chain_epoch_root" ||
      authoritySource === "signed_runtime_truth_live_chain_api_epoch_root"
    ) {
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
