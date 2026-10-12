#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { computeRoots } from "../dist/chain/block.js";
import { SegStore } from "../dist/chain/seg_store.js";
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

// Canonical JSON value types are part of the persisted legacy block contract.
// Reject coercible values before root calculation or saveAuthorizedLegacy...
// can persist the original wrong-typed object.
const canonicalB0 = legacyBlock(0, [], VOID_LEGACY_EMPTY_TX_ROOT_V1);
const canonicalB1 = legacyBlock(1, [], VOID_LEGACY_EMPTY_TX_ROOT_V1);
const canonicalNonEmptyB1 = legacyBlock(1, [tx], nonEmptyRoot);

const coercibleCandidates = [
  {
    label: "string block number",
    block: { ...canonicalB1, number: "1" },
    reason: "legacy_v2fs_invalid_block_number",
  },
  {
    label: "string timestamp",
    block: { ...canonicalB1, ts: String(canonicalB1.ts) },
    reason: "legacy_v2fs_invalid_timestamp",
  },
  {
    label: "singleton-array transaction hash",
    block: {
      ...canonicalNonEmptyB1,
      txs: [{ ...tx, hash: [tx.hash] }],
    },
    reason: "legacy_v2fs_invalid_transaction_hash",
  },
  {
    label: "singleton-array tx root",
    block: { ...canonicalB1, txRoot: [VOID_LEGACY_EMPTY_TX_ROOT_V1] },
    reason: "legacy_v2fs_invalid_tx_root",
  },
  {
    label: "singleton-array header tx root",
    block: {
      ...canonicalB1,
      header: { txRoot: [VOID_LEGACY_EMPTY_TX_ROOT_V1] },
    },
    reason: "legacy_v2fs_invalid_header_tx_root",
  },
];

for (const { label, block, reason } of coercibleCandidates) {
  assert.deepEqual(
    validateLegacyCommitDirectV2fsForAppendV1(block, canonicalB0),
    { ok: false, reason },
    `${label} crossed legacy validator`,
  );
}

assert.deepEqual(
  validateLegacyCommitDirectV2fsForAppendV1(canonicalB1, { number: "0" }),
  { ok: false, reason: "legacy_v2fs_invalid_parent_number" },
  "coercible parent number crossed adjacency validation",
);

const storeRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-follower-legacy-types-"),
);
try {
  const store = new SegStore(storeRoot, { sparseEvery: 1 });
  store.saveAuthorizedLegacyCommitDirectV2fs(canonicalB0);
  assert.equal(store.loadHeadNumber(), 0);

  for (const { label, block } of coercibleCandidates) {
    assert.throws(
      () => store.saveAuthorizedLegacyCommitDirectV2fs(block),
      undefined,
      `${label} unexpectedly persisted`,
    );
    assert.equal(
      store.loadHeadNumber(),
      0,
      `${label} advanced canonical head`,
    );
    assert.equal(
      store.loadBlock(1),
      null,
      `${label} created canonical block 1`,
    );
  }
} finally {
  fs.rmSync(storeRoot, { recursive: true, force: true });
}

console.log(MARKER);
console.log(`mainnet0_height=${realEmptyChild.number}`);
console.log(`legacy_empty_tx_root=${VOID_LEGACY_EMPTY_TX_ROOT_V1}`);
console.log(`modern_empty_tx_root=${modernRoots.txRoot}`);
console.log("real_empty_legacy_block_admitted=true");
console.log("modern_empty_root_rejected_in_legacy_lane=true");
console.log("non_empty_legacy_root_validation_unchanged=true");
console.log("coercible_legacy_value_types_rejected=true");
console.log("coercible_legacy_candidates_canonical_append=0");
console.log("modern_validator_mutation=false");
