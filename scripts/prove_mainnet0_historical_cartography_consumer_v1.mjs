#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_ID_V1,
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_AUTHORITY_ID_V1,
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_BLOCK_COUNT_V1,
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_COMPLETE_SCAN_DIGEST_V1,
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1,
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_MANIFEST_ID_V1,
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_PREFIX_ROOT_V1,
  VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_SEMANTICS_ROOT_V1,
  VOID_MAINNET0_HISTORICAL_MODERN_HEIGHTS_V1,
  acceptedMainnet0HistoricalModeAtV1,
} from "../dist/chain/mainnet0_historical_cartography_authority_v1.js";
import {
  validateMainnet0HistoricalTransitionV1,
} from "../dist/chain/mainnet0_historical_compat_v1.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";

const MARKER = "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_CONSUMER_V1_PROOF_GREEN";

const manifest = JSON.parse(
  fs.readFileSync("public/mainnet0-historical-cartography-v1.json", "utf8"),
);
const acceptance = JSON.parse(
  fs.readFileSync(
    "public/mainnet0-historical-cartography-acceptance-v1.json",
    "utf8",
  ),
);

function proveAcceptanceBinding() {
  assert.equal(
    acceptance.marker,
    "VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_V1_2",
  );
  assert.equal(acceptance.status, "complete");
  assert.equal(acceptance.version, "v1.2");
  assert.equal(acceptance.chain_id, 2050);
  assert.equal(
    acceptance.acceptance_id,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_ID_V1,
  );
  assert.equal(
    acceptance.scan.manifest_id,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_MANIFEST_ID_V1,
  );
  assert.equal(
    acceptance.scan.complete_scan_digest,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_COMPLETE_SCAN_DIGEST_V1,
  );
  assert.equal(
    acceptance.scan.frozen_head,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1,
  );
  assert.equal(
    acceptance.scan.historical_blocks_scanned,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_BLOCK_COUNT_V1,
  );
  assert.equal(
    acceptance.canonical_prefix_authority.source_authority_id,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_AUTHORITY_ID_V1,
  );
  assert.equal(
    acceptance.canonical_prefix_authority.prefix_root,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_PREFIX_ROOT_V1,
  );
  assert.equal(
    acceptance.classification_semantics.root,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_SEMANTICS_ROOT_V1,
  );
  assert.equal(
    acceptance.immutable_snapshot.immutable_rescan_complete_scan_digest,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_COMPLETE_SCAN_DIGEST_V1,
  );
  assert.equal(
    acceptance.acceptance_contract.canonical_prefix_independently_witnessed,
    true,
  );
  assert.equal(
    acceptance.acceptance_contract.classification_semantics_content_bound,
    true,
  );
  assert.equal(
    acceptance.acceptance_contract.immutable_snapshot_rescan_equal,
    true,
  );
  assert.equal(acceptance.acceptance_contract.append_authority, false);
  assert.equal(acceptance.acceptance_contract.validator_authority, false);
  assert.equal(acceptance.acceptance_contract.runtime_authority, false);
  assert.equal(acceptance.acceptance_contract.modern_validator_modified, false);

  assert.equal(manifest.manifest_id, acceptance.scan.manifest_id);
  assert.equal(manifest.complete_scan_digest, acceptance.scan.complete_scan_digest);
  assert.equal(manifest.source.frozen_head, acceptance.scan.frozen_head);
  assert.equal(
    manifest.historical_blocks_scanned,
    acceptance.scan.historical_blocks_scanned,
  );
  assert.deepEqual(manifest.class_counts, acceptance.scan.class_counts);
  assert.equal(manifest.holds.length, 0);
  assert.equal(manifest.unclassified_blocks, 0);
  assert.equal(manifest.ambiguous_classifications, 0);
  assert.equal(manifest.transition_gaps, 0);
  assert.equal(manifest.class_counts.MODERN_SIGNED_V1, 0);
}

const MODE_NONE = 0;
const MODE_MINIMAL = 1;
const MODE_LEGACY = 2;
const MODE_HISTORICAL_MODERN = 3;

function codeForClassification(classification) {
  switch (classification) {
    case "MINIMAL_V1":
      return MODE_MINIMAL;
    case "LEGACY_V2FS_V1":
    case "LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1":
      return MODE_LEGACY;
    case "MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1":
      return MODE_HISTORICAL_MODERN;
    case "MODERN_SIGNED_V1":
      throw new Error(
        "accepted historical projection cannot contain ordinary MODERN_SIGNED_V1",
      );
    default:
      throw new Error(`unknown accepted cartography classification: ${classification}`);
  }
}

function codeForMode(mode) {
  switch (mode) {
    case "genesis-minimal-v1":
      return MODE_MINIMAL;
    case "legacy-v2fs":
      return MODE_LEGACY;
    case "historical-modern-v1":
      return MODE_HISTORICAL_MODERN;
    default:
      return MODE_NONE;
  }
}

function proveExhaustiveProjection() {
  const head = VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1;
  const projected = new Uint8Array(head + 1);

  const assign = (height, classification) => {
    assert(Number.isSafeInteger(height));
    assert(height >= 0 && height <= head);
    assert.equal(projected[height], MODE_NONE, `duplicate map coverage at ${height}`);
    projected[height] = codeForClassification(classification);
  };

  for (const range of manifest.ranges) {
    assert(Number.isSafeInteger(range.from));
    assert(Number.isSafeInteger(range.to));
    assert(range.from >= 0 && range.to >= range.from && range.to <= head);
    const code = codeForClassification(range.classification);
    for (let height = range.from; height <= range.to; height += 1) {
      assert.equal(projected[height], MODE_NONE, `duplicate range coverage at ${height}`);
      projected[height] = code;
    }
  }
  for (const exception of manifest.exceptions) {
    assign(exception.height, exception.classification);
  }

  const counts = {
    minimal: 0,
    legacy: 0,
    historicalModern: 0,
  };
  for (let height = 0; height <= head; height += 1) {
    const expected = projected[height];
    assert.notEqual(expected, MODE_NONE, `missing accepted map coverage at ${height}`);
    const actualMode = acceptedMainnet0HistoricalModeAtV1(height);
    assert.equal(
      codeForMode(actualMode),
      expected,
      `accepted projection mismatch at ${height}`,
    );
    if (expected === MODE_MINIMAL) counts.minimal += 1;
    else if (expected === MODE_LEGACY) counts.legacy += 1;
    else if (expected === MODE_HISTORICAL_MODERN) counts.historicalModern += 1;
  }

  assert.equal(counts.minimal, manifest.class_counts.MINIMAL_V1);
  assert.equal(
    counts.legacy,
    manifest.class_counts.LEGACY_V2FS_V1 +
      manifest.class_counts.LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1,
  );
  assert.equal(
    counts.historicalModern,
    manifest.class_counts.MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1,
  );
  assert.equal(
    counts.minimal + counts.legacy + counts.historicalModern,
    VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_BLOCK_COUNT_V1,
  );

  const projectedModernHeights = [];
  for (let height = 0; height <= head; height += 1) {
    if (projected[height] === MODE_HISTORICAL_MODERN) {
      projectedModernHeights.push(height);
    }
  }
  assert.deepEqual(
    projectedModernHeights,
    [...VOID_MAINNET0_HISTORICAL_MODERN_HEIGHTS_V1],
  );

  assert.equal(acceptedMainnet0HistoricalModeAtV1(-1), null);
  assert.equal(acceptedMainnet0HistoricalModeAtV1(1.5), null);
  assert.equal(
    acceptedMainnet0HistoricalModeAtV1(head + 1),
    null,
    "frozen acceptance must not claim later heights",
  );
}

function makeMinimal(number) {
  return { number, timestamp: 1_776_292_502_707 + number };
}

function makeLegacy(number) {
  return {
    number,
    ts: 1_786_754_384_925 + number,
    txs: [],
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1,
    header: { txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1 },
  };
}

function makeCanonical196020Parent() {
  return {
    number: 196020,
    parentHash: "65db20b28569ba90f76d0ae54e5a2c4082e8512ba5bc68d325f4ff4304a43e16",
    timestamp: 1776366022468,
    txRoot: "0".repeat(64),
    blobRoot: "0".repeat(64),
    txs: [],
    blobs: [],
    proposer: "9d89483769e469e0473b489dc50dba96",
    sig: "5be9d1fa7206a835f9a4c751037ea7dbf791c5d92800a2de4b80f39addc5911274a14db2351ceb040391fc8594aadf184c1b05ba400f1bc9db406e9002aef204",
    header: { txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1 },
  };
}

function makeCanonical196021Legacy() {
  return {
    number: 196021,
    ts: 1776473091835,
    txs: [],
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1,
    header: { txRoot: VOID_LEGACY_EMPTY_TX_ROOT_V1 },
  };
}

function proveTransitionGate() {
  assert.deepEqual(
    validateMainnet0HistoricalTransitionV1(null, "genesis-minimal-v1", makeMinimal(0)),
    { ok: true },
  );
  assert.deepEqual(
    validateMainnet0HistoricalTransitionV1(
      makeMinimal(196017),
      "genesis-minimal-v1",
      makeMinimal(196018),
    ),
    { ok: true },
  );

  assert.equal(
    validateMainnet0HistoricalTransitionV1(
      makeMinimal(196018),
      "genesis-minimal-v1",
      makeMinimal(196019),
    ).reason,
    "mainnet0_historical_cartography_mode_mismatch",
  );
  assert.equal(
    validateMainnet0HistoricalTransitionV1(
      makeMinimal(196018),
      "legacy-v2fs",
      makeLegacy(196019),
    ).reason,
    "mainnet0_historical_cartography_mode_mismatch",
  );

  assert.deepEqual(
    validateMainnet0HistoricalTransitionV1(
      makeCanonical196020Parent(),
      "legacy-v2fs",
      makeCanonical196021Legacy(),
    ),
    { ok: true },
  );

  assert.equal(
    validateMainnet0HistoricalTransitionV1(
      makeLegacy(1_833_993),
      "legacy-v2fs",
      makeLegacy(1_833_994),
    ).reason,
    "mainnet0_historical_cartography_mode_mismatch",
  );

  assert.deepEqual(
    validateMainnet0HistoricalTransitionV1(
      makeLegacy(VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1 - 1),
      "legacy-v2fs",
      makeLegacy(VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1),
    ),
    { ok: true },
  );

  // Phase 2A does not assert that the frozen map governs later heights. The
  // existing transition rule remains in force beyond the accepted prefix until
  // an incremental extension rooted in the V1.2 acceptance seal is reviewed.
  assert.deepEqual(
    validateMainnet0HistoricalTransitionV1(
      makeLegacy(VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1),
      "legacy-v2fs",
      makeLegacy(VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1 + 1),
    ),
    { ok: true },
  );

  assert.equal(
    validateMainnet0HistoricalTransitionV1(
      makeLegacy(10),
      "legacy-v2fs",
      { ts: 1, _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1 },
    ).reason,
    "mainnet0_historical_cartography_candidate_number_required",
  );
}

proveAcceptanceBinding();
proveExhaustiveProjection();
proveTransitionGate();

console.log(MARKER);
console.log(`acceptance_id=${VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_ACCEPTANCE_ID_V1}`);
console.log(`manifest_id=${VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_MANIFEST_ID_V1}`);
console.log(`classification_semantics_root=${VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_SEMANTICS_ROOT_V1}`);
console.log(`frozen_head=${VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_FROZEN_HEAD_V1}`);
console.log("modern_validator_modified=false");
console.log("runtime_activation=false");
console.log("post_frozen_authority_claimed=false");
