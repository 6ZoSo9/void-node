#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_MAINNET0_ACCEPTED_CARTOGRAPHY_V1,
  VOID_MAINNET0_ACCEPTED_MODERN_EXCEPTION_HEIGHTS_V1,
  acceptedMainnet0HistoricalModeAtHeightV1,
} from "../src/chain/mainnet0_historical_cartography_projection_v1.js";

const accepted = VOID_MAINNET0_ACCEPTED_CARTOGRAPHY_V1;

assert.equal(
  accepted.acceptance_id,
  "voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959",
);
assert.equal(
  accepted.manifest_id,
  "voidm0map1_38f4dd05deae1a0dbc8b3d028ffd35bda7f1ba177f37a8b4fc37fb20e2bcc912",
);
assert.equal(
  accepted.source_id,
  "voidm0src1_c87dfdfbbe3aa6099bef0f1f9eafab20a09fe0a8d67453e83828c3eb967090da",
);
assert.equal(
  accepted.complete_scan_digest,
  "b4fe72e12e2ad709b4c3d6d4c210f8baa3463df2269d616ec9388badae7ed01c",
);
assert.equal(
  accepted.classification_semantics_root,
  "ea40d5f61cc8e8da68445382e76dc000cebce4d3805132bee93269e73d57a5ad",
);
assert.equal(accepted.frozen_head, 1_951_058);
assert.equal(accepted.block_count, 1_951_059);
assert.deepEqual(accepted.class_counts, {
  MINIMAL_V1: 196_019,
  LEGACY_V2FS_V1: 1_754_646,
  LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1: 387,
  MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1: 7,
  MODERN_SIGNED_V1: 0,
});

assert.deepEqual(
  VOID_MAINNET0_ACCEPTED_MODERN_EXCEPTION_HEIGHTS_V1,
  [196_019, 196_020, 1_833_994, 1_834_071, 1_834_125, 1_834_145, 1_834_324],
);

for (const value of [
  null,
  undefined,
  "196019",
  true,
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.MAX_SAFE_INTEGER + 1,
  accepted.frozen_head + 1,
]) {
  assert.equal(
    acceptedMainnet0HistoricalModeAtHeightV1(value),
    null,
    `unexpected projection for ${String(value)}`,
  );
}

for (const height of [0, 1, 196_018]) {
  assert.equal(
    acceptedMainnet0HistoricalModeAtHeightV1(height)?.mode,
    "genesis-minimal-v1",
  );
}
for (const height of VOID_MAINNET0_ACCEPTED_MODERN_EXCEPTION_HEIGHTS_V1) {
  const projection = acceptedMainnet0HistoricalModeAtHeightV1(height);
  assert.equal(projection?.mode, "modern");
  assert.equal(
    projection?.classification,
    "MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1",
  );
}
for (const height of [
  196_021,
  1_833_993,
  1_833_995,
  1_834_070,
  1_834_072,
  1_834_124,
  1_834_126,
  1_834_144,
  1_834_146,
  1_834_323,
  1_834_325,
  accepted.frozen_head,
]) {
  assert.equal(
    acceptedMainnet0HistoricalModeAtHeightV1(height)?.mode,
    "legacy-v2fs",
  );
}

const counts = {
  "genesis-minimal-v1": 0,
  "legacy-v2fs": 0,
  modern: 0,
};
for (let height = 0; height <= accepted.frozen_head; height += 1) {
  const projection = acceptedMainnet0HistoricalModeAtHeightV1(height);
  assert.ok(projection, `missing accepted projection at ${height}`);
  counts[projection.mode] += 1;
}
assert.equal(counts["genesis-minimal-v1"], 196_019);
assert.equal(counts.modern, 7);
assert.equal(
  counts["legacy-v2fs"],
  accepted.class_counts.LEGACY_V2FS_V1 +
    accepted.class_counts.LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1,
);
assert.equal(
  counts["genesis-minimal-v1"] + counts["legacy-v2fs"] + counts.modern,
  accepted.block_count,
);

const nodeSource = fs.readFileSync("src/node_core.ts", "utf8");
for (const marker of [
  "acceptedMainnet0HistoricalModeAtHeightV1",
  "mainnet0_historical_cartography_mode_mismatch",
  "mainnet0_historical_cartography_authority_required",
  "mainnet0_historical_cartography_outside_accepted_prefix",
  'historicalAuthoritySource: "public-bootstrap-hmac-v1"',
]) {
  assert.ok(nodeSource.includes(marker), `missing follower integration marker: ${marker}`);
}

const compatSource = fs.readFileSync(
  "src/chain/mainnet0_historical_compat_v1.ts",
  "utf8",
);
for (const marker of [
  "MAINNET0_MODERN_TO_LEGACY_BRIDGE_PARENT_NUMBER_V1 = 196020",
  "MAINNET0_MODERN_TO_LEGACY_BRIDGE_CANDIDATE_NUMBER_V1 = 196021",
  "isMainnet0CanonicalModernToLegacyV2fsBridgeV1",
]) {
  assert.ok(compatSource.includes(marker), `missing exact bridge marker: ${marker}`);
}

console.log("VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_PROJECTION_V1_GREEN");
console.log("accepted_prefix_blocks=1951059");
console.log("minimal_mode_count=196019");
console.log("modern_exception_count=7");
console.log("legacy_mode_count=1755033");
console.log("outside_prefix_extrapolated=false");
console.log("cartography_grants_append_authority=false");
