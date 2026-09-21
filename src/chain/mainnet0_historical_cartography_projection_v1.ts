// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export const VOID_MAINNET0_ACCEPTED_CARTOGRAPHY_V1 = Object.freeze({
  acceptance_id:
    "voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959",
  manifest_id:
    "voidm0map1_38f4dd05deae1a0dbc8b3d028ffd35bda7f1ba177f37a8b4fc37fb20e2bcc912",
  source_id:
    "voidm0src1_c87dfdfbbe3aa6099bef0f1f9eafab20a09fe0a8d67453e83828c3eb967090da",
  frozen_head: 1_951_058,
  block_count: 1_951_059,
  complete_scan_digest:
    "b4fe72e12e2ad709b4c3d6d4c210f8baa3463df2269d616ec9388badae7ed01c",
  classification_semantics_root:
    "ea40d5f61cc8e8da68445382e76dc000cebce4d3805132bee93269e73d57a5ad",
  class_counts: Object.freeze({
    MINIMAL_V1: 196_019,
    LEGACY_V2FS_V1: 1_754_646,
    LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1: 387,
    MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1: 7,
    MODERN_SIGNED_V1: 0,
  }),
} as const);

export type AcceptedMainnet0HistoricalModeV1 =
  | "genesis-minimal-v1"
  | "legacy-v2fs"
  | "modern";

export type AcceptedMainnet0HistoricalClassificationV1 =
  | "MINIMAL_V1"
  | "LEGACY_V2FS_FAMILY_V1"
  | "MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1";

export type AcceptedMainnet0HistoricalProjectionV1 = Readonly<{
  height: number;
  classification: AcceptedMainnet0HistoricalClassificationV1;
  mode: AcceptedMainnet0HistoricalModeV1;
}>;

const MODERN_EXCEPTION_HEIGHTS_V1 = new Set<number>([
  196_019,
  196_020,
  1_833_994,
  1_834_071,
  1_834_125,
  1_834_145,
  1_834_324,
]);

export const VOID_MAINNET0_ACCEPTED_MODERN_EXCEPTION_HEIGHTS_V1 =
  Object.freeze([...MODERN_EXCEPTION_HEIGHTS_V1].sort((a, b) => a - b));

/**
 * Projects the accepted exhaustive V1.2 cartography into the three persistence
 * modes already understood by the follower/SegStore.
 *
 * This is a constraint only. The acceptance seal explicitly grants no append,
 * validator, runtime, deployment, wallet, transaction or funds authority.
 * Existing live authority checks must still succeed before persistence.
 */
export function acceptedMainnet0HistoricalModeAtHeightV1(
  height: unknown,
): AcceptedMainnet0HistoricalProjectionV1 | null {
  if (
    typeof height !== "number" ||
    !Number.isSafeInteger(height) ||
    height < 0 ||
    height > VOID_MAINNET0_ACCEPTED_CARTOGRAPHY_V1.frozen_head
  ) {
    return null;
  }

  if (height <= 196_018) {
    return Object.freeze({
      height,
      classification: "MINIMAL_V1",
      mode: "genesis-minimal-v1",
    });
  }

  if (MODERN_EXCEPTION_HEIGHTS_V1.has(height)) {
    return Object.freeze({
      height,
      classification: "MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1",
      mode: "modern",
    });
  }

  return Object.freeze({
    height,
    classification: "LEGACY_V2FS_FAMILY_V1",
    mode: "legacy-v2fs",
  });
}
