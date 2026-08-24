// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import { computeRoots } from "./block.js";
import type { BlockValidationResult } from "./block.js";

export const VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1 =
  "proposer.commit-direct.v2fs" as const;

// Mainnet-0's legacy commit-direct producer used SHA-256 of the empty byte
// string for an empty transaction set. This is intentionally distinct from
// the modern block root convention, which uses 64 zeroes for an empty set.
export const VOID_LEGACY_EMPTY_TX_ROOT_V1 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" as const;

const LEGACY_TOP_LEVEL_KEYS_V1 = [
  "_commit",
  "header",
  "number",
  "ts",
  "txRoot",
  "txs",
] as const;

const LEGACY_HEADER_KEYS_V1 = ["txRoot"] as const;

function exactObjectKeysV1(
  value: unknown,
  expected: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
}

export function isLegacyCommitDirectV2fsMarkerV1(candidate: unknown): boolean {
  return (
    !!candidate &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    (candidate as Record<string, unknown>)._commit ===
      VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1
  );
}

export function validateLegacyCommitDirectV2fsForAppendV1(
  candidate: unknown,
  parent: unknown,
): BlockValidationResult {
  if (!exactObjectKeysV1(candidate, LEGACY_TOP_LEVEL_KEYS_V1)) {
    return { ok: false, reason: "legacy_v2fs_exact_envelope_required" };
  }

  if (candidate._commit !== VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1) {
    return { ok: false, reason: "legacy_v2fs_marker_mismatch" };
  }

  if (
    typeof candidate.number !== "number" ||
    !Number.isSafeInteger(candidate.number) ||
    candidate.number < 0
  ) {
    return { ok: false, reason: "legacy_v2fs_invalid_block_number" };
  }
  const number = candidate.number;

  if (
    typeof candidate.ts !== "number" ||
    !Number.isSafeInteger(candidate.ts) ||
    candidate.ts <= 0
  ) {
    return { ok: false, reason: "legacy_v2fs_invalid_timestamp" };
  }

  if (!Array.isArray(candidate.txs)) {
    return { ok: false, reason: "legacy_v2fs_txs_must_be_array" };
  }

  for (const tx of candidate.txs) {
    if (!tx || typeof tx !== "object" || Array.isArray(tx)) {
      return { ok: false, reason: "legacy_v2fs_invalid_transaction" };
    }
    const rawHash = (tx as Record<string, unknown>).hash;
    if (typeof rawHash !== "string") {
      return { ok: false, reason: "legacy_v2fs_invalid_transaction_hash" };
    }
    const hash = rawHash.toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) {
      return { ok: false, reason: "legacy_v2fs_invalid_transaction_hash" };
    }
  }

  if (typeof candidate.txRoot !== "string") {
    return { ok: false, reason: "legacy_v2fs_invalid_tx_root" };
  }
  const txRoot = candidate.txRoot;
  if (!/^[0-9a-f]{64}$/.test(txRoot)) {
    return { ok: false, reason: "legacy_v2fs_invalid_tx_root" };
  }

  if (!exactObjectKeysV1(candidate.header, LEGACY_HEADER_KEYS_V1)) {
    return { ok: false, reason: "legacy_v2fs_exact_header_required" };
  }

  if (typeof candidate.header.txRoot !== "string") {
    return { ok: false, reason: "legacy_v2fs_invalid_header_tx_root" };
  }
  const headerTxRoot = candidate.header.txRoot;
  if (!/^[0-9a-f]{64}$/.test(headerTxRoot)) {
    return { ok: false, reason: "legacy_v2fs_invalid_header_tx_root" };
  }
  if (headerTxRoot !== txRoot) {
    return { ok: false, reason: "legacy_v2fs_header_tx_root_mismatch" };
  }

  const expectedTxRoot = candidate.txs.length === 0
    ? VOID_LEGACY_EMPTY_TX_ROOT_V1
    : computeRoots(candidate.txs as any[], []).txRoot;
  if (expectedTxRoot !== txRoot) {
    return { ok: false, reason: "legacy_v2fs_tx_root_mismatch" };
  }

  if (number === 0) {
    if (parent != null) {
      return { ok: false, reason: "legacy_v2fs_genesis_parent_must_be_null" };
    }
    return { ok: true };
  }

  if (!parent || typeof parent !== "object" || Array.isArray(parent)) {
    return { ok: false, reason: "legacy_v2fs_missing_parent_block" };
  }
  const parentNumber = (parent as Record<string, unknown>).number;
  if (
    typeof parentNumber !== "number" ||
    !Number.isSafeInteger(parentNumber) ||
    parentNumber < 0
  ) {
    return { ok: false, reason: "legacy_v2fs_invalid_parent_number" };
  }
  if (parentNumber !== number - 1) {
    return { ok: false, reason: "legacy_v2fs_parent_number_mismatch" };
  }

  return { ok: true };
}
