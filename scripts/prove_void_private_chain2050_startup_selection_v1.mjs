#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1,
  VOID_PRIVATE_CHAIN2050_CHECKPOINT_VERSION_V1,
  VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
} from "../tools/void-private-chain2050-checkpoint-v1.mjs";
import {
  VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_MARKER_V1,
  VoidPrivateChain2050StartupSelectionHoldV1,
  canonicalVoidPrivateChain2050StartupSelectionV1,
  selectVoidPrivateChain2050StartupStateV1,
} from "../tools/void-private-chain2050-startup-selection-v1.mjs";

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-chain2050-startup-selection-"),
);
const baselinePath = path.join(root, "epoch127.snapshot.json");
const checkpointRoot = path.join(root, "checkpoints");
fs.writeFileSync(baselinePath, '{"baseline":true}\n', { mode: 0o600 });
fs.mkdirSync(checkpointRoot, { mode: 0o700 });
fs.chmodSync(checkpointRoot, 0o700);

const sha256Buffer = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
const sha256Text = (value) => sha256Buffer(Buffer.from(value, "utf8"));
const baselineSha = sha256Buffer(fs.readFileSync(baselinePath));
const baseline = {
  chain_id: 2050,
  block_number: 37367,
  block_hash: `0x${"11".repeat(32)}`,
  state_sha256: baselineSha,
  state_file: baselinePath,
  state_format: "anvil_cli_state_json",
};

function checkpointMaterial(manifest) {
  return {
    marker: manifest.marker,
    version: manifest.version,
    chain_id: manifest.chain_id,
    block_number: manifest.block_number,
    block_hash: manifest.block_hash,
    state_sha256: manifest.state_sha256,
    state_bytes: manifest.state_bytes,
    rpc_methods_used: manifest.rpc_methods_used,
    rpc_unlocked_account_count: manifest.rpc_unlocked_account_count,
    chain_mutation_performed: manifest.chain_mutation_performed,
    transaction_broadcast_performed: manifest.transaction_broadcast_performed,
    wallet_access_performed: manifest.wallet_access_performed,
    credential_access_performed: manifest.credential_access_performed,
    money_movement_performed: manifest.money_movement_performed,
  };
}

function writeCheckpoint({ blockNumber, blockHash, dumpState }) {
  const manifest = {
    marker: VOID_PRIVATE_CHAIN2050_CHECKPOINT_MARKER_V1,
    version: VOID_PRIVATE_CHAIN2050_CHECKPOINT_VERSION_V1,
    chain_id: VOID_PRIVATE_CHAIN2050_EXPECTED_CHAIN_ID_V1,
    block_number: blockNumber,
    block_hash: blockHash,
    state_sha256: sha256Text(dumpState),
    state_bytes: Buffer.byteLength(dumpState, "utf8"),
    rpc_methods_used: [...VOID_PRIVATE_CHAIN2050_CHECKPOINT_RPC_METHODS_V1],
    rpc_unlocked_account_count: 0,
    chain_mutation_performed: false,
    transaction_broadcast_performed: false,
    wallet_access_performed: false,
    credential_access_performed: false,
    money_movement_performed: false,
  };
  const checkpointId = sha256Text(
    canonicalVoidPrivateChain2050StartupSelectionV1(
      checkpointMaterial(manifest),
    ),
  );
  const stem = `chain2050-block-${blockNumber}-${checkpointId}`;
  const stateFile = `${stem}.anvil-dump-state.hex`;
  Object.assign(manifest, {
    captured_at: "2026-08-10T07:00:00.000Z",
    checkpoint_id_sha256: checkpointId,
    state_file: stateFile,
  });
  const statePath = path.join(checkpointRoot, stateFile);
  const manifestPath = path.join(checkpointRoot, `${stem}.manifest.json`);
  const completePath = path.join(checkpointRoot, `${stem}.complete-v1`);
  fs.writeFileSync(statePath, dumpState, { mode: 0o600 });
  fs.chmodSync(statePath, 0o600);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(manifestPath, 0o600);
  fs.writeFileSync(
    completePath,
    `VOID_PRIVATE_CHAIN2050_CHECKPOINT_COMPLETE_V1 ${checkpointId}\n`,
    { mode: 0o600 },
  );
  fs.chmodSync(completePath, 0o600);
  return { statePath, manifestPath, completePath, manifest, stem };
}

function expectHold(label, fn, reason) {
  assert.throws(
    fn,
    (error) => {
      assert(error instanceof VoidPrivateChain2050StartupSelectionHoldV1, label);
      assert.equal(error.reason, reason, label);
      return true;
    },
    label,
  );
}

try {
  const baselineOnlyRoot = path.join(root, "empty-checkpoints");
  fs.mkdirSync(baselineOnlyRoot, { mode: 0o700 });
  fs.chmodSync(baselineOnlyRoot, 0o700);

  const baselineOnly = selectVoidPrivateChain2050StartupStateV1({
    baseline,
    checkpointRoot: baselineOnlyRoot,
    minimumBlockNumber: 37367,
  });
  assert.equal(
    baselineOnly.marker,
    VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_MARKER_V1,
  );
  assert.equal(baselineOnly.selected_kind, "baseline");
  assert.equal(baselineOnly.selected_block_number, 37367);
  assert.equal(baselineOnly.incomplete_checkpoint_group_count, 0);
  assert.equal(baselineOnly.state_load_performed, false);
  assert.equal(baselineOnly.service_mutation_performed, false);

  expectHold(
    "stale baseline below required minimum",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot: baselineOnlyRoot,
        minimumBlockNumber: 37371,
      }),
    "durable_state_below_required_minimum",
  );

  expectHold(
    "uppercase baseline hash rejected",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline: { ...baseline, block_hash: baseline.block_hash.toUpperCase() },
        checkpointRoot: baselineOnlyRoot,
        minimumBlockNumber: 37367,
      }),
    "baseline_block_hash_invalid",
  );

  const invalidBaselinePath = path.join(root, "invalid-baseline.json");
  fs.writeFileSync(invalidBaselinePath, "not-json", { mode: 0o600 });
  expectHold(
    "baseline format content validated",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline: {
          ...baseline,
          state_file: invalidBaselinePath,
          state_sha256: sha256Buffer(fs.readFileSync(invalidBaselinePath)),
        },
        checkpointRoot: baselineOnlyRoot,
        minimumBlockNumber: 37367,
      }),
    "baseline_state_format_content_invalid",
  );

  fs.chmodSync(baselinePath, 0o660);
  expectHold(
    "baseline writable by group rejected",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot: baselineOnlyRoot,
        minimumBlockNumber: 37367,
      }),
    "baseline_state_file_writable",
  );
  fs.chmodSync(baselinePath, 0o600);

  const first = writeCheckpoint({
    blockNumber: 37371,
    blockHash: `0x${"22".repeat(32)}`,
    dumpState: "0x1234abcd",
  });
  assert.equal(fs.readFileSync(first.statePath, "utf8"), "0x1234abcd");
  const selected = selectVoidPrivateChain2050StartupStateV1({
    baseline,
    checkpointRoot,
    minimumBlockNumber: 37371,
  });
  assert.equal(selected.selected_kind, "checkpoint");
  assert.equal(selected.selected_block_number, 37371);
  assert.equal(selected.selected_block_hash, `0x${"22".repeat(32)}`);
  assert.equal(selected.selected_state_file, first.statePath);
  assert.equal(selected.incomplete_checkpoint_group_count, 0);
  assert.equal(
    selected.selected_checkpoint_id_sha256,
    first.manifest.checkpoint_id_sha256,
  );
  assert.match(selected.selection_id_sha256, /^[0-9a-f]{64}$/);
  for (const key of [
    "state_load_performed",
    "service_mutation_performed",
    "transaction_replay_performed",
    "transaction_broadcast_performed",
    "wallet_access_performed",
    "credential_access_performed",
    "money_movement_performed",
  ]) {
    assert.equal(selected[key], false, key);
  }

  const incompleteStem = `chain2050-block-37372-${"aa".repeat(32)}`;
  const incompleteState = path.join(
    checkpointRoot,
    `${incompleteStem}.anvil-dump-state.hex`,
  );
  const incompleteManifest = path.join(
    checkpointRoot,
    `${incompleteStem}.manifest.json`,
  );
  fs.writeFileSync(incompleteState, "0x1234", { mode: 0o600 });
  fs.writeFileSync(incompleteManifest, "not-authoritative-unmarked", { mode: 0o600 });
  const withIncomplete = selectVoidPrivateChain2050StartupStateV1({
    baseline,
    checkpointRoot,
    minimumBlockNumber: 37371,
  });
  assert.equal(withIncomplete.selected_block_number, 37371);
  assert.equal(withIncomplete.incomplete_checkpoint_group_count, 1);
  expectHold(
    "unmarked crash debris cannot satisfy durable minimum",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37372,
      }),
    "durable_state_below_required_minimum",
  );
  fs.rmSync(incompleteState);
  fs.rmSync(incompleteManifest);

  const brokenStem = `chain2050-block-37372-${"bb".repeat(32)}`;
  const brokenComplete = path.join(checkpointRoot, `${brokenStem}.complete-v1`);
  fs.writeFileSync(
    brokenComplete,
    `VOID_PRIVATE_CHAIN2050_CHECKPOINT_COMPLETE_V1 ${"bb".repeat(32)}\n`,
    { mode: 0o600 },
  );
  expectHold(
    "finalization marker without durable pair holds",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37371,
      }),
    "checkpoint_finalized_pair_incomplete",
  );
  fs.rmSync(brokenComplete);

  expectHold(
    "bounded manifest read",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37371,
        maxManifestBytes: 256,
      }),
    "checkpoint_manifest_too_large",
  );

  const originalState = fs.readFileSync(first.statePath, "utf8");
  fs.writeFileSync(first.statePath, "0x9999", { mode: 0o600 });
  expectHold(
    "checkpoint state tamper",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37371,
      }),
    "checkpoint_state_bytes_mismatch",
  );
  fs.writeFileSync(first.statePath, originalState, { mode: 0o600 });
  fs.chmodSync(first.statePath, 0o600);

  const completeOriginal = fs.readFileSync(first.completePath, "utf8");
  fs.writeFileSync(first.completePath, "wrong-marker\n", { mode: 0o600 });
  expectHold(
    "finalization marker content bound",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37371,
      }),
    "checkpoint_complete_content_invalid",
  );
  fs.writeFileSync(first.completePath, completeOriginal, { mode: 0o600 });
  fs.chmodSync(first.completePath, 0o600);

  const manifestOriginal = JSON.parse(
    fs.readFileSync(first.manifestPath, "utf8"),
  );
  fs.writeFileSync(
    first.manifestPath,
    `${JSON.stringify({ ...manifestOriginal, chain_id: 1 }, null, 2)}\n`,
    { mode: 0o600 },
  );
  expectHold(
    "wrong checkpoint chain",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37371,
      }),
    "checkpoint_manifest_identity_invalid",
  );
  fs.writeFileSync(
    first.manifestPath,
    `${JSON.stringify(manifestOriginal, null, 2)}\n`,
    { mode: 0o600 },
  );
  fs.chmodSync(first.manifestPath, 0o600);

  const unrecognized = path.join(checkpointRoot, "surprise.txt");
  fs.writeFileSync(unrecognized, "x", { mode: 0o600 });
  expectHold(
    "unrecognized root entry",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37371,
      }),
    "checkpoint_root_unrecognized_entry",
  );
  fs.rmSync(unrecognized);

  writeCheckpoint({
    blockNumber: 37371,
    blockHash: `0x${"33".repeat(32)}`,
    dumpState: "0x5678abcd",
  });
  expectHold(
    "same-height conflicting durable states",
    () =>
      selectVoidPrivateChain2050StartupStateV1({
        baseline,
        checkpointRoot,
        minimumBlockNumber: 37371,
      }),
    "ambiguous_highest_durable_state",
  );

  assert.equal(fs.statSync(first.statePath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(first.manifestPath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(first.completePath).mode & 0o777, 0o600);
  assert.equal(fs.statSync(checkpointRoot).mode & 0o777, 0o700);

  console.log("baseline_exact_selection=1");
  console.log("baseline_format_content_validated=1");
  console.log("baseline_writable_rejected=1");
  console.log("stale_baseline_minimum_hold=1");
  console.log("parent_state_byte_format_exact=1");
  console.log("finalization_marker_required=1");
  console.log("unmarked_crash_debris_ignored=1");
  console.log("unmarked_crash_debris_cannot_satisfy_minimum=1");
  console.log("checkpoint_selection=1");
  console.log("checkpoint_tamper_hold=1");
  console.log("wrong_chain_hold=1");
  console.log("same_height_conflict_hold=1");
  console.log("bounded_manifest_read=1");
  console.log("state_load_performed=0");
  console.log("service_mutation_performed=0");
  console.log("transaction_replay_performed=0");
  console.log("transaction_broadcast_performed=0");
  console.log("wallet_access_performed=0");
  console.log("credential_access_performed=0");
  console.log("money_movement_performed=0");
  console.log("VOID_PRIVATE_CHAIN2050_STARTUP_SELECTION_V1_PROOF_GREEN");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
