// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import type { BlockValidationResult } from "./block.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
} from "./legacy_commit_direct_v2fs_v1.js";
import {
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1,
  acceptedMainnet0HistoricalModeAtV1,
  type Mainnet0AcceptedHistoricalModeV1,
} from "./mainnet0_historical_cartography_authority_v1.js";

export type Mainnet0HistoricalAppendModeV1 =
  | "genesis-minimal-v1"
  | "legacy-v2fs";

export type Mainnet0CanonicalEraV1 =
  | "minimal"
  | "legacy-v2fs"
  | "modern";

const MAINNET0_MINIMAL_KEYS_V1 = ["number", "timestamp"] as const;

const MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_KEYS_V1 = [
  "blobRoot",
  "blobs",
  "header",
  "number",
  "parentHash",
  "proposer",
  "sig",
  "timestamp",
  "txRoot",
  "txs",
] as const;
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_CANDIDATE_KEYS_V1 = [
  "_commit",
  "header",
  "number",
  "ts",
  "txRoot",
  "txs",
] as const;
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_HEADER_KEYS_V1 = ["txRoot"] as const;
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_OBSERVED_HEADER_ROOT_KEYS_V1 = [
  "leaves",
  "root",
] as const;
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_NUMBER_V1 = 196020;
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_TIMESTAMP_V1 = 1776366022468;
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_PARENT_HASH_V1 = "65db20b28569ba90f76d0ae54e5a2c4082e8512ba5bc68d325f4ff4304a43e16";
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_PROPOSER_V1 = "9d89483769e469e0473b489dc50dba96";
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_SIG_V1 = "5be9d1fa7206a835f9a4c751037ea7dbf791c5d92800a2de4b80f39addc5911274a14db2351ceb040391fc8594aadf184c1b05ba400f1bc9db406e9002aef204";
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_CANDIDATE_NUMBER_V1 = 196021;
const MAINNET0_MODERN_TO_LEGACY_BRIDGE_CANDIDATE_TS_V1 = 1776473091835;
const MAINNET0_MODERN_EMPTY_ROOT_V1 = "0".repeat(64);

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

function mainnet0HistoricalCandidateNumberV1(candidate: unknown): number | null {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }
  const number = (candidate as Record<string, unknown>).number;
  return (
    typeof number === "number" &&
    Number.isSafeInteger(number) &&
    number >= 0
  )
    ? number
    : null;
}

function validateAcceptedMainnet0HistoricalModeV1(
  candidate: unknown,
  mode: Mainnet0HistoricalAppendModeV1,
): BlockValidationResult {
  const number = mainnet0HistoricalCandidateNumberV1(candidate);
  if (number == null) {
    return {
      ok: false,
      reason: "mainnet0_historical_cartography_candidate_number_required",
    };
  }

  // Phase 2A is deliberately bounded to the accepted frozen prefix. Later
  // heights retain the pre-existing transition rules until an incremental
  // extension rooted in the accepted V1.2 seal is independently reviewed.
  if (number > VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1) {
    return { ok: true };
  }

  const acceptedMode = acceptedMainnet0HistoricalModeAtV1(number);
  if (acceptedMode == null) {
    return {
      ok: false,
      reason: "mainnet0_historical_cartography_accepted_mode_missing",
    };
  }

  const requestedMode: Mainnet0AcceptedHistoricalModeV1 =
    mode === "genesis-minimal-v1" ? "genesis-minimal-v1" : "legacy-v2fs";
  if (acceptedMode !== requestedMode) {
    return {
      ok: false,
      reason: "mainnet0_historical_cartography_mode_mismatch",
    };
  }

  return { ok: true };
}

export function isMainnet0GenesisMinimalV1(candidate: unknown): boolean {
  return exactObjectKeysV1(candidate, MAINNET0_MINIMAL_KEYS_V1);
}

export function classifyMainnet0CanonicalEraV1(
  candidate: unknown,
): Mainnet0CanonicalEraV1 {
  if (isMainnet0GenesisMinimalV1(candidate)) return "minimal";
  if (
    candidate &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    (candidate as Record<string, unknown>)._commit ===
      VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1
  ) {
    return "legacy-v2fs";
  }
  return "modern";
}

function mainnet0Canonical196020HeaderRootAcceptedV1(
  value: unknown,
): boolean {
  if (value === VOID_LEGACY_EMPTY_TX_ROOT_V1) return true;
  if (
    !exactObjectKeysV1(
      value,
      MAINNET0_MODERN_TO_LEGACY_BRIDGE_OBSERVED_HEADER_ROOT_KEYS_V1,
    )
  ) {
    return false;
  }
  return (
    value.root === VOID_LEGACY_EMPTY_TX_ROOT_V1 &&
    Array.isArray(value.leaves) &&
    value.leaves.length === 0
  );
}

/**
 * Mainnet-0 contains one observed, canonical short modern island at
 * #196019..#196020 before returning to legacy-v2fs at #196021.
 *
 * This helper is intentionally exact. It is not a general modern->legacy
 * downgrade rule. The public-bootstrap HMAC authority is enforced separately
 * by the follower immediately before the historical append.
 *
 * `header.txRoot` on the #196020 parent accepts either the canonical string or
 * the already-observed historical follower object form. Consensus continuity
 * for the modern parent is carried by its already-validated top-level fields;
 * this narrow allowance lets existing followers recover without rewriting
 * durable historical data.
 */
export function isMainnet0CanonicalModernToLegacyV2fsBridgeV1(
  parent: unknown,
  candidate: unknown,
): boolean {
  if (
    !exactObjectKeysV1(
      parent,
      MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_KEYS_V1,
    ) ||
    !exactObjectKeysV1(
      candidate,
      MAINNET0_MODERN_TO_LEGACY_BRIDGE_CANDIDATE_KEYS_V1,
    )
  ) {
    return false;
  }

  if (
    parent.number !== MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_NUMBER_V1 ||
    parent.timestamp !== MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_TIMESTAMP_V1 ||
    parent.txRoot !== MAINNET0_MODERN_EMPTY_ROOT_V1 ||
    parent.blobRoot !== MAINNET0_MODERN_EMPTY_ROOT_V1 ||
    !Array.isArray(parent.txs) ||
    parent.txs.length !== 0 ||
    !Array.isArray(parent.blobs) ||
    parent.blobs.length !== 0 ||
    parent.parentHash !== MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_PARENT_HASH_V1 ||
    parent.proposer !== MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_PROPOSER_V1 ||
    parent.sig !== MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_SIG_V1 ||
    !parent.header ||
    typeof parent.header !== "object" ||
    Array.isArray(parent.header) ||
    !mainnet0Canonical196020HeaderRootAcceptedV1(
      (parent.header as Record<string, unknown>).txRoot,
    )
  ) {
    return false;
  }

  return (
    candidate.number === MAINNET0_MODERN_TO_LEGACY_BRIDGE_CANDIDATE_NUMBER_V1 &&
    candidate.ts === MAINNET0_MODERN_TO_LEGACY_BRIDGE_CANDIDATE_TS_V1 &&
    candidate._commit === VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1 &&
    candidate.txRoot === VOID_LEGACY_EMPTY_TX_ROOT_V1 &&
    Array.isArray(candidate.txs) &&
    candidate.txs.length === 0 &&
    exactObjectKeysV1(
      candidate.header,
      MAINNET0_MODERN_TO_LEGACY_BRIDGE_HEADER_KEYS_V1,
    ) &&
    candidate.header.txRoot === VOID_LEGACY_EMPTY_TX_ROOT_V1
  );
}

export function validateMainnet0GenesisMinimalForAppendV1(
  candidate: unknown,
  parent: unknown,
): BlockValidationResult {
  if (!exactObjectKeysV1(candidate, MAINNET0_MINIMAL_KEYS_V1)) {
    return { ok: false, reason: "mainnet0_minimal_exact_envelope_required" };
  }

  if (
    typeof candidate.number !== "number" ||
    !Number.isSafeInteger(candidate.number) ||
    candidate.number < 0
  ) {
    return { ok: false, reason: "mainnet0_minimal_invalid_block_number" };
  }
  const number = candidate.number;

  if (
    typeof candidate.timestamp !== "number" ||
    !Number.isSafeInteger(candidate.timestamp) ||
    candidate.timestamp <= 0
  ) {
    return { ok: false, reason: "mainnet0_minimal_invalid_timestamp" };
  }

  if (number === 0) {
    if (parent != null) {
      return { ok: false, reason: "mainnet0_minimal_genesis_parent_must_be_null" };
    }
    return { ok: true };
  }

  if (!parent || typeof parent !== "object" || Array.isArray(parent)) {
    return { ok: false, reason: "mainnet0_minimal_missing_parent_block" };
  }
  const parentNumber = (parent as Record<string, unknown>).number;
  if (
    typeof parentNumber !== "number" ||
    !Number.isSafeInteger(parentNumber) ||
    parentNumber < 0
  ) {
    return { ok: false, reason: "mainnet0_minimal_invalid_parent_number" };
  }
  if (parentNumber !== number - 1) {
    return { ok: false, reason: "mainnet0_minimal_parent_number_mismatch" };
  }

  return { ok: true };
}

export function validateMainnet0HistoricalTransitionV1(
  parent: unknown,
  mode: Mainnet0HistoricalAppendModeV1,
  candidate: unknown,
): BlockValidationResult {
  const acceptedMode = validateAcceptedMainnet0HistoricalModeV1(candidate, mode);
  if (acceptedMode.ok === false) return acceptedMode;

  if (mode === "genesis-minimal-v1") {
    if (parent == null) return { ok: true };
    const parentEra = classifyMainnet0CanonicalEraV1(parent);
    return parentEra === "minimal"
      ? { ok: true }
      : { ok: false, reason: "mainnet0_historical_minimal_parent_era_invalid" };
  }

  if (parent == null) {
    return { ok: false, reason: "mainnet0_historical_v2fs_genesis_forbidden" };
  }
  const parentEra = classifyMainnet0CanonicalEraV1(parent);
  if (parentEra === "minimal" || parentEra === "legacy-v2fs") {
    return { ok: true };
  }
  if (
    parentEra === "modern" &&
    isMainnet0CanonicalModernToLegacyV2fsBridgeV1(parent, candidate)
  ) {
    return { ok: true };
  }
  return { ok: false, reason: "mainnet0_historical_v2fs_parent_era_invalid" };
}
