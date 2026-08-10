#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

import {
  captureVoidPrivateChain2050CheckpointV1,
} from "../tools/void-private-chain2050-checkpoint-v1.mjs";
import {
  VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1,
  VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1,
  VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_MARKER_V1,
  VoidPrivateChain2050StartupIntegrationHoldV1,
  buildVoidPrivateChain2050StartupPlanV1,
  materializeVoidPrivateChain2050CliStateV1,
  runVoidPrivateChain2050StartupIntegrationV1,
} from "../tools/void-private-chain2050-startup-integration-v1.mjs";

const BASELINE_BLOCK = 100;
const CHECKPOINT_BLOCK = 104;
const BASELINE_HASH = `0x${"11".repeat(32)}`;
const CHECKPOINT_HASH = `0x${"22".repeat(32)}`;
const FIXED_TIME = "2026-08-10T10:00:00.000Z";

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hex(value) {
  return `0x${value.toString(16)}`;
}

function checkpointRpc(dumpState) {
  const methods = [];
  return {
    methods,
    rpcCall: async (method, params) => {
      methods.push(method);
      if (method === "eth_chainId") return "0x802";
      if (method === "eth_blockNumber") return hex(CHECKPOINT_BLOCK);
      if (method === "eth_getBlockByNumber") {
        assert.deepEqual(params, [hex(CHECKPOINT_BLOCK), false]);
        return { number: hex(CHECKPOINT_BLOCK), hash: CHECKPOINT_HASH };
      }
      if (method === "eth_accounts") return [];
      if (method === "anvil_dumpState") return dumpState;
      throw new Error(`unexpected_rpc_method:${method}`);
    },
  };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-chain2050-startup-integration-"));
try {
  const baselineState = path.join(root, "baseline.json");
  const baselineBytes = Buffer.from('{"baseline":true}\n', "utf8");
  fs.writeFileSync(baselineState, baselineBytes, { mode: 0o600 });
  fs.chmodSync(baselineState, 0o600);
  const baselineSha = sha256Buffer(baselineBytes);
  const checkpointRoot = path.join(root, "checkpoints");
  fs.mkdirSync(checkpointRoot, { mode: 0o700 });
  fs.chmodSync(checkpointRoot, 0o700);
  const derivedRoot = path.join(root, "derived");

  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_MARKER_V1,
    "VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_V1",
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1.dry_run_filesystem_write,
    false,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1.stale_baseline_fallback,
    false,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1.transaction_replay,
    false,
  );

  const baselinePlan = buildVoidPrivateChain2050StartupPlanV1({
    baseline_state: baselineState,
    baseline_state_sha256: baselineSha,
    baseline_state_format: "anvil_cli_state_json",
    baseline_block_number: BASELINE_BLOCK,
    baseline_block_hash: BASELINE_HASH,
    checkpoint_root: checkpointRoot,
    minimum_block_number: BASELINE_BLOCK,
    derived_root: derivedRoot,
    rpc_url: "http://127.0.0.1:8545/",
  });
  assert.equal(baselinePlan.status, "planned");
  assert.equal(baselinePlan.selection.selected_kind, "baseline");
  assert.equal(baselinePlan.state_materialization_performed, false);
  assert.equal(baselinePlan.state_load_performed, false);
  assert.equal(fs.existsSync(derivedRoot), false);

  assert.throws(
    () => buildVoidPrivateChain2050StartupPlanV1({
      baseline_state: baselineState,
      baseline_state_sha256: baselineSha,
      baseline_state_format: "anvil_cli_state_json",
      baseline_block_number: BASELINE_BLOCK,
      baseline_block_hash: BASELINE_HASH,
      checkpoint_root: checkpointRoot,
      minimum_block_number: CHECKPOINT_BLOCK,
      derived_root: derivedRoot,
      rpc_url: "http://127.0.0.1:8545/",
    }),
    /durable_state_below_required_minimum/,
  );
  assert.equal(fs.existsSync(derivedRoot), false);

  const cliStateObject = {
    chainId: 2050,
    block: CHECKPOINT_BLOCK,
    proof: "startup-integration-v1",
  };
  const compressed = zlib.gzipSync(
    Buffer.from(JSON.stringify(cliStateObject), "utf8"),
  );
  const dumpState = `0x${compressed.toString("hex")}`;
  const fixture = checkpointRpc(dumpState);
  const captured = await captureVoidPrivateChain2050CheckpointV1({
    rpcCall: fixture.rpcCall,
    outputRoot: checkpointRoot,
    minimumBlockNumber: CHECKPOINT_BLOCK,
    capturedAt: FIXED_TIME,
  });
  assert.equal(captured.chain_id, 2050);
  assert.equal(captured.block_number, CHECKPOINT_BLOCK);
  assert.equal(captured.block_hash, CHECKPOINT_HASH);
  assert.equal(captured.complete_write, "created");
  assert.equal(captured.checkpoint_finalized, true);
  assert.equal(captured.checkpoint_directory_fsync_performed, true);

  const checkpointPlan = buildVoidPrivateChain2050StartupPlanV1({
    baseline_state: baselineState,
    baseline_state_sha256: baselineSha,
    baseline_state_format: "anvil_cli_state_json",
    baseline_block_number: BASELINE_BLOCK,
    baseline_block_hash: BASELINE_HASH,
    checkpoint_root: checkpointRoot,
    minimum_block_number: CHECKPOINT_BLOCK,
    derived_root: derivedRoot,
    rpc_url: "http://127.0.0.1:8545/",
  });
  assert.equal(checkpointPlan.selection.selected_kind, "checkpoint");
  assert.equal(checkpointPlan.selection.selected_block_number, CHECKPOINT_BLOCK);
  assert.equal(checkpointPlan.selection.selected_block_hash, CHECKPOINT_HASH);
  assert.equal(checkpointPlan.selected_state_materialization_required, true);
  assert.equal(checkpointPlan.state_materialization_performed, false);
  assert.equal(fs.existsSync(derivedRoot), false);

  await assert.rejects(
    () => runVoidPrivateChain2050StartupIntegrationV1({
      baseline_state: baselineState,
      baseline_state_sha256: baselineSha,
      baseline_state_format: "anvil_cli_state_json",
      baseline_block_number: BASELINE_BLOCK,
      baseline_block_hash: BASELINE_HASH,
      checkpoint_root: checkpointRoot,
      minimum_block_number: CHECKPOINT_BLOCK,
      derived_root: derivedRoot,
      rpc_url: "http://127.0.0.1:8545/",
      apply: true,
      confirmation: "wrong-confirmation",
    }),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_explicit_confirmation_required",
  );
  assert.equal(fs.existsSync(derivedRoot), false);

  const materialized = materializeVoidPrivateChain2050CliStateV1(
    checkpointPlan.selection,
    { derived_root: derivedRoot },
  );
  assert.equal(materialized.derived, true);
  assert.equal(materialized.derived_write, "created");
  assert.equal(fs.statSync(derivedRoot).mode & 0o777, 0o700);
  assert.equal(fs.statSync(materialized.state_file).mode & 0o777, 0o600);
  assert.deepEqual(
    JSON.parse(fs.readFileSync(materialized.state_file, "utf8")),
    cliStateObject,
  );
  const materializedAgain = materializeVoidPrivateChain2050CliStateV1(
    checkpointPlan.selection,
    { derived_root: derivedRoot },
  );
  assert.equal(materializedAgain.state_file, materialized.state_file);
  assert.equal(materializedAgain.derived_write, "existing_exact");

  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1,
    "startPrivateChain2050FromSelectedDurableState",
  );
  console.log("selector_required=1");
  console.log("stale_baseline_fallback=0");
  console.log("dry_run_filesystem_write=0");
  console.log("wrong_confirmation_materialization=0");
  console.log("finalized_checkpoint_selected=1");
  console.log("dump_state_materialization_mode_0600=1");
  console.log("transaction_replay=0");
  console.log("transaction_broadcast=0");
  console.log("wallet_access=0");
  console.log("money_movement=0");
  console.log("VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_V1_PROOF_GREEN");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
