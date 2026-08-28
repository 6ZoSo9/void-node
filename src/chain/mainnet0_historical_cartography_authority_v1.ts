// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

export type Mainnet0AcceptedHistoricalModeV1 =
  | "genesis-minimal-v1"
  | "legacy-v2fs"
  | "historical-modern-v1";

/**
 * Reviewed Phase-1 acceptance anchors from
 * public/mainnet0-historical-cartography-acceptance-v1.json.
 *
 * These constants do not grant append, validator, or runtime authority. They
 * pin the exact accepted historical evidence generation that this consumer
 * projection is permitted to interpret.
 */
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_ID_V1 =
  "voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959" as const;
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_MANIFEST_ID_V1 =
  "voidm0map1_38f4dd05deae1a0dbc8b3d028ffd35bda7f1ba177f37a8b4fc37fb20e2bcc912" as const;
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_AUTHORITY_ID_V1 =
  "voidm0auth1_cdec2cadd6615cdf6c3d64765bcdca3823ff0e8c855c6316bda39c707387b8a8" as const;
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_PREFIX_ROOT_V1 =
  "b9c0f187688790dc32e1fea7ea3294a4540bc410131303ec7806d3c811c67dde" as const;
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_SEMANTICS_ROOT_V1 =
  "ea40d5f61cc8e8da68445382e76dc000cebce4d3805132bee93269e73d57a5ad" as const;
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_COMPLETE_SCAN_DIGEST_V1 =
  "b4fe72e12e2ad709b4c3d6d4c210f8baa3463df2269d616ec9388badae7ed01c" as const;
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1 = 1_951_058 as const;
export const VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_BLOCK_COUNT_V1 = 1_951_059 as const;

/**
 * The accepted V1.1 scan contains seven historical-only modern envelopes.
 * They remain isolated from the ordinary modern validator. Phase 2A identifies
 * these heights so historical minimal/legacy append paths fail closed rather
 * than accidentally treating them as one of those modes.
 */
export const VOID_MAINNET0_HISTORICAL_MODERN_HEIGHTS_V1 = Object.freeze([
  196_019,
  196_020,
  1_833_994,
  1_834_071,
  1_834_125,
  1_834_145,
  1_834_324,
] as const);

const VOID_MAINNET0_HISTORICAL_MODERN_HEIGHT_SET_V1 = new Set<number>(
  VOID_MAINNET0_HISTORICAL_MODERN_HEIGHTS_V1,
);

function acceptedHistoricalHeightV1(height: unknown): height is number {
  return (
    typeof height === "number" &&
    Number.isSafeInteger(height) &&
    height >= 0 &&
    height <= VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1
  );
}

/**
 * Project the accepted exhaustive cartography into persistence modes.
 *
 * - MINIMAL_V1 -> genesis-minimal-v1
 * - LEGACY_V2FS_V1 and LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1 -> legacy-v2fs
 * - MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1 -> historical-modern-v1
 *
 * The accepted prefix contains zero MODERN_SIGNED_V1 blocks. Heights outside
 * the accepted frozen prefix return null and therefore receive no historical
 * authority from this projection.
 */
export function acceptedMainnet0HistoricalModeAtV1(
  height: unknown,
): Mainnet0AcceptedHistoricalModeV1 | null {
  if (!acceptedHistoricalHeightV1(height)) return null;
  if (height <= 196_018) return "genesis-minimal-v1";
  if (VOID_MAINNET0_HISTORICAL_MODERN_HEIGHT_SET_V1.has(height)) {
    return "historical-modern-v1";
  }
  return "legacy-v2fs";
}

export function mainnet0HistoricalModeMatchesAcceptedCartographyV1(
  height: unknown,
  mode: Mainnet0AcceptedHistoricalModeV1,
): boolean {
  return acceptedMainnet0HistoricalModeAtV1(height) === mode;
}
