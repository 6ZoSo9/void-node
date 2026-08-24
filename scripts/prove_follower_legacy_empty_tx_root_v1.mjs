#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";

import { computeRoots } from "../dist/chain/block.js";
import {
  VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
  validateLegacyCommitDirectV2fsForAppendV1,
} from "../dist/chain/legacy_commit_direct_v2fs_v1.js";

const MARKER = "VOID_FOLLOWER_LEGACY_EMPTY_TX_ROOT_V1_PROOF_GREEN";
const MODERN_EMPTY_TX_ROOT_V1 = "0".repeat(64);

function legacyBlock(number, txs, txRoot) {
  return {
    number,
    ts: 1_787_318_500_715 + number,
    txs,
    _commit: VOID_LEGACY_COMMIT_DIRECT_V2FS_MARKER_V1,
    txRoot,
    header: { txRoot },
  };
}

const realParent = {
  number: 1_900_960,
};

// Exact production shape observed at Mainnet-0 height 1,900,961.
const realEmptyChild = legacyBlock(
  1_900_961,
  [],
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
);

assert.equal(
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
  realEmptyChild.txRoot,
  "compiled legacy empty-root constant drifted from Mainnet-0 truth",
);
assert.deepEqual(
  validateLegacyCommitDirectV2fsForAppendV1(realEmptyChild, realParent),
  { ok: true },
  "real Mainnet-0 empty legacy block was rejected",
);

const modernRoots = computeRoots([], []);
assert.equal(
  modernRoots.txRoot,
  MODERN_EMPTY_TX_ROOT_V1,
  "modern empty-root convention unexpectedly changed",
);
assert.notEqual(
  modernRoots.txRoot,
  VOID_LEGACY_EMPTY_TX_ROOT_V1,
  "legacy compatibility must remain distinct from modern empty-root semantics",
);

const wrongLegacyEmpty = legacyBlock(
  1_900_961,
  [],
  MODERN_EMPTY_TX_ROOT_V1,
);
assert.deepEqual(
  validateLegacyCommitDirectV2fsForAppendV1(wrongLegacyEmpty, realParent),
  { ok: false, reason: "legacy_v2fs_tx_root_mismatch" },
  "legacy validator silently accepted the modern empty-root convention",
);

const tx = { hash: "11".repeat(32), body: { proof: "non-empty-legacy-root" } };
const nonEmptyRoot = computeRoots([tx], []).txRoot;
const nonEmptyParent = legacyBlock(7, [], VOID_LEGACY_EMPTY_TX_ROOT_V1);
const nonEmptyChild = legacyBlock(8, [tx], nonEmptyRoot);
assert.deepEqual(
  validateLegacyCommitDirectV2fsForAppendV1(nonEmptyChild, nonEmptyParent),
  { ok: true },
  "non-empty legacy root validation changed",
);

const wrongNonEmpty = legacyBlock(8, [tx], VOID_LEGACY_EMPTY_TX_ROOT_V1);
assert.deepEqual(
  validateLegacyCommitDirectV2fsForAppendV1(wrongNonEmpty, nonEmptyParent),
  { ok: false, reason: "legacy_v2fs_tx_root_mismatch" },
  "non-empty legacy transaction root lost validation",
);

console.log(MARKER);
console.log(`mainnet0_height=${realEmptyChild.number}`);
console.log(`legacy_empty_tx_root=${VOID_LEGACY_EMPTY_TX_ROOT_V1}`);
console.log(`modern_empty_tx_root=${modernRoots.txRoot}`);
console.log("real_empty_legacy_block_admitted=true");
console.log("modern_empty_root_rejected_in_legacy_lane=true");
console.log("non_empty_legacy_root_validation_unchanged=true");
console.log("modern_validator_mutation=false");
