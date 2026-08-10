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
  assertVoidPrivateChain2050MiningModeAnvilArgsV1,
  assertVoidPrivateChain2050ZeroAccountAnvilArgsV1,
  buildVoidPrivateChain2050AnvilArgsV1,
  buildVoidPrivateChain2050StartupPlanV1,
  materializeVoidPrivateChain2050CliStateV1,
  runVoidPrivateChain2050StartupIntegrationV1,
  verifyVoidPrivateChain2050StartedStateV1,
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
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .selected_state_sha256_reverified_before_materialization,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .selected_state_private_content_addressed_copy,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1.stale_baseline_fallback,
    false,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .anvil_generated_accounts_disabled,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .zero_unlocked_accounts_reverified_after_load,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .transaction_automining_default,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .interval_mining_opt_in_only,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1.no_mining_default,
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
  assert.equal(baselinePlan.selected_state_materialization_required, true);
  assert.equal(baselinePlan.anvil_generated_accounts, 0);
  assert.equal(baselinePlan.post_load_zero_unlocked_accounts_required, true);
  assert.equal(baselinePlan.mining_mode, "auto");
  assert.equal(baselinePlan.block_time, null);
  assert.equal(baselinePlan.no_mining, false);
  assert.equal(baselinePlan.state_materialization_performed, false);
  assert.equal(baselinePlan.state_load_performed, false);
  assert.equal(fs.existsSync(derivedRoot), false);

  const baselineMaterializedRoot = path.join(root, "baseline-materialized");
  const baselineMaterialized =
    materializeVoidPrivateChain2050CliStateV1(
      baselinePlan.selection,
      { derived_root: baselineMaterializedRoot },
    );
  assert.equal(baselineMaterialized.derived, true);
  assert.equal(baselineMaterialized.derived_write, "created");
  assert.notEqual(baselineMaterialized.state_file, baselineState);
  assert.equal(
    sha256Buffer(fs.readFileSync(baselineMaterialized.state_file)),
    baselineSha,
  );
  assert.equal(
    fs.statSync(baselineMaterializedRoot).mode & 0o777,
    0o700,
  );
  assert.equal(
    fs.statSync(baselineMaterialized.state_file).mode & 0o777,
    0o600,
  );

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
  assert.equal(checkpointPlan.mining_mode, "auto");
  assert.equal(checkpointPlan.block_time, null);
  assert.equal(checkpointPlan.no_mining, false);
  assert.equal(checkpointPlan.state_materialization_performed, false);
  assert.equal(fs.existsSync(derivedRoot), false);

  const startupArgs = buildVoidPrivateChain2050AnvilArgsV1(
    new URL("http://127.0.0.1:18545/"),
    { state_file: "/private/selected-state.json" },
    checkpointPlan.block_time,
    checkpointPlan.gas_limit,
  );
  assert.equal(
    startupArgs.filter((value) => value === "--accounts").length,
    1,
  );
  const accountsIndex = startupArgs.indexOf("--accounts");
  assert.equal(startupArgs[accountsIndex + 1], "0");
  assert.equal(startupArgs.includes("--block-time"), false);
  assert.equal(startupArgs.includes("--no-mining"), false);
  assert.equal(startupArgs.includes("--no-mine"), false);
  assert.equal(
    assertVoidPrivateChain2050ZeroAccountAnvilArgsV1(startupArgs),
    true,
  );
  assert.equal(
    assertVoidPrivateChain2050MiningModeAnvilArgsV1(
      startupArgs,
      checkpointPlan.mining_mode,
      checkpointPlan.block_time,
    ),
    true,
  );

  assert.throws(
    () => assertVoidPrivateChain2050MiningModeAnvilArgsV1(
      [...startupArgs, "--block-time", "2"],
      "auto",
      null,
    ),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_anvil_transaction_automining_required",
  );
  assert.throws(
    () => assertVoidPrivateChain2050MiningModeAnvilArgsV1(
      [...startupArgs, "--no-mining"],
      "auto",
      null,
    ),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_anvil_no_mining_forbidden",
  );

  const intervalPlan = buildVoidPrivateChain2050StartupPlanV1({
    baseline_state: baselineState,
    baseline_state_sha256: baselineSha,
    baseline_state_format: "anvil_cli_state_json",
    baseline_block_number: BASELINE_BLOCK,
    baseline_block_hash: BASELINE_HASH,
    checkpoint_root: checkpointRoot,
    minimum_block_number: CHECKPOINT_BLOCK,
    derived_root: derivedRoot,
    rpc_url: "http://127.0.0.1:8545/",
    block_time: 2,
  });
  assert.equal(intervalPlan.mining_mode, "interval");
  assert.equal(intervalPlan.block_time, 2);
  assert.equal(intervalPlan.no_mining, false);

  const intervalArgs = buildVoidPrivateChain2050AnvilArgsV1(
    new URL("http://127.0.0.1:18545/"),
    { state_file: "/private/selected-state.json" },
    intervalPlan.block_time,
    intervalPlan.gas_limit,
  );
  assert.equal(
    intervalArgs.filter((value) => value === "--block-time").length,
    1,
  );
  const blockTimeIndex = intervalArgs.indexOf("--block-time");
  assert.equal(intervalArgs[blockTimeIndex + 1], "2");
  assert.equal(intervalArgs.includes("--no-mining"), false);
  assert.equal(intervalArgs.includes("--no-mine"), false);
  assert.equal(
    assertVoidPrivateChain2050MiningModeAnvilArgsV1(
      intervalArgs,
      intervalPlan.mining_mode,
      intervalPlan.block_time,
    ),
    true,
  );

  const alteredAccounts = [...startupArgs];
  alteredAccounts[accountsIndex + 1] = "10";
  assert.throws(
    () => assertVoidPrivateChain2050ZeroAccountAnvilArgsV1(alteredAccounts),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_anvil_zero_accounts_required",
  );
  assert.throws(
    () => assertVoidPrivateChain2050ZeroAccountAnvilArgsV1([
      ...startupArgs,
      "--mnemonic-random",
      "12",
    ]),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_anvil_account_generator_option_forbidden",
  );

  const postLoadCalls = [];
  const postLoadVerification = await verifyVoidPrivateChain2050StartedStateV1(
    new URL("http://127.0.0.1:18545/"),
    checkpointPlan.selection,
    1_000,
    async (_url, method, params) => {
      postLoadCalls.push({ method, params });
      if (method === "eth_chainId") return "0x802";
      if (method === "eth_getBlockByNumber") {
        assert.deepEqual(params, [hex(CHECKPOINT_BLOCK), false]);
        return { number: hex(CHECKPOINT_BLOCK), hash: CHECKPOINT_HASH };
      }
      if (method === "eth_blockNumber") return hex(CHECKPOINT_BLOCK);
      if (method === "eth_accounts") return [];
      throw new Error(`unexpected_postload_method:${method}`);
    },
  );
  assert.equal(postLoadVerification.unlocked_account_count, 0);
  assert.equal(postLoadVerification.zero_unlocked_accounts_verified, true);
  assert.deepEqual(
    postLoadCalls.map((call) => call.method),
    ["eth_chainId", "eth_getBlockByNumber", "eth_blockNumber", "eth_accounts"],
  );

  await assert.rejects(
    () => verifyVoidPrivateChain2050StartedStateV1(
      new URL("http://127.0.0.1:18545/"),
      checkpointPlan.selection,
      1_000,
      async (_url, method) => {
        if (method === "eth_chainId") return "0x802";
        if (method === "eth_getBlockByNumber") {
          return { number: hex(CHECKPOINT_BLOCK), hash: CHECKPOINT_HASH };
        }
        if (method === "eth_blockNumber") return hex(CHECKPOINT_BLOCK);
        if (method === "eth_accounts") {
          return ["0x0000000000000000000000000000000000000001"];
        }
        throw new Error(`unexpected_nonempty_accounts_method:${method}`);
      },
    ),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_loaded_accounts_not_empty",
  );

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

  const baselineTamperDerivedRoot = path.join(
    root,
    "baseline-tamper-derived",
  );
  fs.writeFileSync(
    baselineState,
    Buffer.from('{"baseline":"tampered-after-selection"}\n', "utf8"),
  );
  assert.throws(
    () => materializeVoidPrivateChain2050CliStateV1(
      baselinePlan.selection,
      { derived_root: baselineTamperDerivedRoot },
    ),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_selected_state_sha256_mismatch",
  );
  assert.equal(fs.existsSync(baselineTamperDerivedRoot), false);

  const checkpointTamperDerivedRoot = path.join(
    root,
    "checkpoint-tamper-derived",
  );
  fs.writeFileSync(
    checkpointPlan.selection.selected_state_file,
    "0x00",
    { encoding: "utf8" },
  );
  assert.throws(
    () => materializeVoidPrivateChain2050CliStateV1(
      checkpointPlan.selection,
      { derived_root: checkpointTamperDerivedRoot },
    ),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_selected_state_sha256_mismatch",
  );
  assert.equal(fs.existsSync(checkpointTamperDerivedRoot), false);

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
  console.log("baseline_private_content_addressed_copy=1");
  console.log("selected_state_sha256_reverified_before_materialization=1");
  console.log("post_selection_state_tamper_rejected=1");
  console.log("anvil_accounts_zero_enforced=1");
  console.log("anvil_account_generator_options_forbidden=1");
  console.log("post_load_eth_accounts_empty_required=1");
  console.log("nonempty_post_load_accounts_rejected=1");
  console.log("default_transaction_automining=1");
  console.log("default_interval_mining=0");
  console.log("default_no_mining=0");
  console.log("interval_mining_explicit_opt_in=1");
  console.log("mining_mode_tamper_rejected=1");
  console.log("transaction_replay=0");
  console.log("transaction_broadcast=0");
  console.log("wallet_access=0");
  console.log("money_movement=0");
  console.log("VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_V1_PROOF_GREEN");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
