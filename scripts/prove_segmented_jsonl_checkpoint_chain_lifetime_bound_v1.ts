// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { buildSegmentedJsonlV1FromFile } from "../src/storage/segmented_jsonl_v1.js";
import {
  VOID_SEGMENTED_JSONL_MAX_OFFLINE_CHECKPOINT_CHAIN_ENTRIES_V1,
  deriveSegmentedJsonlCheckpointV1,
  deriveSegmentedJsonlSnapshotAuthorityV1,
  verifySegmentedJsonlCheckpointAnchorV1,
  verifySegmentedJsonlCheckpointChainV1,
  verifySegmentedJsonlCheckpointIncrementalV1,
  type SegmentedJsonlCheckpointAnchorV1,
  type SegmentedJsonlCheckpointChainEntryV1,
  type SegmentedJsonlCheckpointV1,
  type SegmentedJsonlSnapshotAuthorityV1,
} from "../src/storage/segmented_jsonl_snapshot_authority_v1.js";

function expectFailure(action: () => unknown, fragment: string): void {
  let seen = "";
  try {
    action();
  } catch (error) {
    seen = error instanceof Error ? error.message : String(error);
  }
  assert.ok(seen.includes(fragment), `expected ${fragment}, got ${seen}`);
}

function trustedAnchor(
  checkpoint: SegmentedJsonlCheckpointV1,
  snapshot: SegmentedJsonlSnapshotAuthorityV1,
): SegmentedJsonlCheckpointAnchorV1 {
  return verifySegmentedJsonlCheckpointAnchorV1({
    checkpoint,
    snapshot,
    trusted_checkpoint_sha256: checkpoint.checkpoint_sha256,
  });
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-segmented-checkpoint-chain-bound-v1-"));
try {
  const source = path.join(tmp, "source.jsonl");
  const store = path.join(tmp, "store");
  fs.writeFileSync(source, "0\n", { mode: 0o600 });
  const manifest = buildSegmentedJsonlV1FromFile(source, store, {
    segmentTargetBytes: 1024,
    maxRecordBytes: 1,
  });
  assert.equal(manifest.generation, 1);

  let authority = deriveSegmentedJsonlSnapshotAuthorityV1(manifest);
  let checkpoint = deriveSegmentedJsonlCheckpointV1(authority);
  verifySegmentedJsonlCheckpointIncrementalV1(checkpoint, authority);
  let anchor = trustedAnchor(checkpoint, authority);
  const trustedGenesis = checkpoint.checkpoint_sha256;

  const offlineEntries: SegmentedJsonlCheckpointChainEntryV1[] = [
    { checkpoint, snapshot: authority },
  ];

  for (
    let generation = 2;
    generation <= VOID_SEGMENTED_JSONL_MAX_OFFLINE_CHECKPOINT_CHAIN_ENTRIES_V1;
    generation += 1
  ) {
    authority = deriveSegmentedJsonlSnapshotAuthorityV1({
      ...manifest,
      generation,
    });
    checkpoint = deriveSegmentedJsonlCheckpointV1(authority, anchor);
    verifySegmentedJsonlCheckpointIncrementalV1(checkpoint, authority, anchor);
    anchor = trustedAnchor(checkpoint, authority);
    offlineEntries.push({ checkpoint, snapshot: authority });
  }

  assert.equal(
    offlineEntries.length,
    VOID_SEGMENTED_JSONL_MAX_OFFLINE_CHECKPOINT_CHAIN_ENTRIES_V1,
  );
  const offlineLast = verifySegmentedJsonlCheckpointChainV1(
    offlineEntries,
    trustedGenesis,
  );
  assert.equal(offlineLast.checkpoint_sha256, checkpoint.checkpoint_sha256);

  // The bound fires before any per-entry validation. A caller cannot turn this
  // diagnostic helper into unbounded authority-grade retained-history work.
  const oneOver = new Array(
    VOID_SEGMENTED_JSONL_MAX_OFFLINE_CHECKPOINT_CHAIN_ENTRIES_V1 + 1,
  ).fill(null) as unknown as SegmentedJsonlCheckpointChainEntryV1[];
  expectFailure(
    () => verifySegmentedJsonlCheckpointChainV1(oneOver, trustedGenesis),
    "CHECKPOINT_CHAIN_TOO_LARGE",
  );

  // Online authority is incremental and O(1) in retained history. Continue far
  // beyond the offline diagnostic ceiling while retaining only one trusted
  // predecessor anchor.
  for (
    let generation = VOID_SEGMENTED_JSONL_MAX_OFFLINE_CHECKPOINT_CHAIN_ENTRIES_V1 + 1;
    generation <= 10_000;
    generation += 1
  ) {
    authority = deriveSegmentedJsonlSnapshotAuthorityV1({
      ...manifest,
      generation,
    });
    checkpoint = deriveSegmentedJsonlCheckpointV1(authority, anchor);
    verifySegmentedJsonlCheckpointIncrementalV1(checkpoint, authority, anchor);
    anchor = trustedAnchor(checkpoint, authority);
  }
  assert.equal(checkpoint.store_generation, 10_000);
  assert.equal(checkpoint.checkpoint_index, 9_999);

  console.log(`offline_checkpoint_chain_entry_bound=${VOID_SEGMENTED_JSONL_MAX_OFFLINE_CHECKPOINT_CHAIN_ENTRIES_V1}`);
  console.log("offline_checkpoint_chain_bound_precedes_entry_validation=true");
  console.log("incremental_checkpoint_authority_o1_history=true");
  console.log("incremental_checkpoint_generation_10000_green=true");
  console.log("VOID_SEGMENTED_JSONL_CHECKPOINT_CHAIN_LIFETIME_BOUND_V1_PROOF_GREEN");
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
