// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import type { BlockValidationResult } from "./block.js";
import { VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1 } from "./legacy_commit_direct_v2fs_v1.js";

export type Mainnet0HistoricalAppendModeV1 =
  | "genesis-minimal-v1"
  | "legacy-v2fs";

export type Mainnet0CanonicalEraV1 =
  | "minimal"
  | "legacy-v2fs"
  | "modern";

const MAINNET0_MINIMAL_KEYS_V1 = ["number", "timestamp"] as const;

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
): BlockValidationResult {
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
  return parentEra === "minimal" || parentEra === "legacy-v2fs"
    ? { ok: true }
    : { ok: false, reason: "mainnet0_historical_v2fs_parent_era_invalid" };
}
