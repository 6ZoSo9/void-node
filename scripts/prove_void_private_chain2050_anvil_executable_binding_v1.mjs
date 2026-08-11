#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1,
  VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1,
  VoidPrivateChain2050StartupIntegrationHoldV1,
  buildVoidPrivateChain2050StartupPlanV1,
  runVoidPrivateChain2050StartupIntegrationV1,
  validateVoidPrivateChain2050AnvilExecutableV1,
} from "../tools/void-private-chain2050-startup-integration-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = path.join(
  ROOT,
  "tools/void-private-chain2050-startup-integration-v1.mjs",
);
const WRAPPER = path.join(
  ROOT,
  "ops/mainnet0/mainnet0-start-8545-selected-durable-state.sh",
);
const BASELINE_HASH = `0x${"11".repeat(32)}`;

function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function expectHold(run, reason) {
  assert.throws(
    run,
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === reason,
    reason,
  );
}

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-chain2050-anvil-binding-"),
);
try {
  const baseline = path.join(temp, "baseline.json");
  fs.writeFileSync(baseline, '{"baseline":true}\n', { mode: 0o600 });
  fs.chmodSync(baseline, 0o600);
  const baselineSha = sha256File(baseline);
  const checkpointRoot = path.join(temp, "checkpoints");
  fs.mkdirSync(checkpointRoot, { mode: 0o700 });
  fs.chmodSync(checkpointRoot, 0o700);
  const derivedRoot = path.join(temp, "derived-not-created");

  const anvil = path.join(temp, "anvil-v1.5.1");
  fs.writeFileSync(anvil, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  fs.chmodSync(anvil, 0o700);
  const anvilSha = sha256File(anvil);

  const exact = validateVoidPrivateChain2050AnvilExecutableV1(anvil, anvilSha);
  assert.equal(exact.path, anvil);
  assert.equal(exact.sha256, anvilSha);
  assert.equal(exact.mode_octal, "0700");

  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1("anvil", anvilSha),
    "startup_anvil_executable_not_absolute",
  );
  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1(`${temp}/./anvil-v1.5.1`, anvilSha),
    "startup_anvil_executable_not_canonical",
  );
  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1(
      path.join(temp, "missing-anvil"),
      anvilSha,
    ),
    "startup_anvil_executable_missing",
  );
  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1(anvil, "f".repeat(64)),
    "startup_anvil_executable_sha256_mismatch",
  );

  const symlink = path.join(temp, "anvil-symlink");
  fs.symlinkSync(anvil, symlink);
  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1(symlink, anvilSha),
    "startup_anvil_executable_symlink_forbidden",
  );

  fs.chmodSync(anvil, 0o600);
  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1(anvil, anvilSha),
    "startup_anvil_executable_not_executable",
  );
  fs.chmodSync(anvil, 0o720);
  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1(anvil, anvilSha),
    "startup_anvil_executable_mode_unsafe",
  );
  fs.chmodSync(anvil, 0o700);

  const baseInput = {
    baseline_state: baseline,
    baseline_state_sha256: baselineSha,
    baseline_state_format: "anvil_cli_state_json",
    baseline_block_number: 100,
    baseline_block_hash: BASELINE_HASH,
    checkpoint_root: checkpointRoot,
    minimum_block_number: 100,
    derived_root: derivedRoot,
    rpc_url: "http://127.0.0.1:18545/",
  };

  expectHold(
    () => buildVoidPrivateChain2050StartupPlanV1({
      ...baseInput,
      anvil_bin: anvil,
    }),
    "startup_anvil_executable_binding_incomplete",
  );

  const plan = buildVoidPrivateChain2050StartupPlanV1({
    ...baseInput,
    anvil_bin: anvil,
    anvil_sha256: anvilSha,
  });
  assert.equal(plan.status, "planned");
  assert.equal(plan.anvil_command, anvil);
  assert.equal(plan.anvil_executable, anvil);
  assert.equal(plan.anvil_executable_sha256, anvilSha);
  assert.equal(plan.anvil_executable_mode_octal, "0700");
  assert.equal(plan.anvil_executable_binding_required_for_apply, true);
  assert.equal(plan.state_materialization_performed, false);
  assert.equal(fs.existsSync(derivedRoot), false);

  await assert.rejects(
    () => runVoidPrivateChain2050StartupIntegrationV1({
      ...baseInput,
      apply: true,
      confirmation: VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_CONFIRMATION_V1,
    }),
    (error) =>
      error instanceof VoidPrivateChain2050StartupIntegrationHoldV1 &&
      error.reason === "startup_anvil_executable_binding_required",
  );
  assert.equal(
    fs.existsSync(derivedRoot),
    false,
    "missing Anvil binding must hold before state materialization",
  );

  fs.appendFileSync(anvil, "# changed after plan\n");
  expectHold(
    () => validateVoidPrivateChain2050AnvilExecutableV1(
      plan.anvil_executable,
      plan.anvil_executable_sha256,
    ),
    "startup_anvil_executable_sha256_mismatch",
  );

  const source = fs.readFileSync(TOOL, "utf8");
  const wrapper = fs.readFileSync(WRAPPER, "utf8");
  assert.equal(source.includes('spawn("anvil"'), false);
  assert.match(source, /spawn\(anvilBinding\.path, anvilArgs/);
  assert.match(source, /validateVoidPrivateChain2050AnvilExecutableV1\(\n\s*plan\.anvil_executable/);
  assert.match(source, /anvil_executable_reverified_before_start: true/);
  assert.match(source, /--anvil-bin/);
  assert.match(source, /--anvil-sha256/);
  assert.match(wrapper, /VOID_MAINNET0_8545_ANVIL_BIN/);
  assert.match(wrapper, /VOID_MAINNET0_8545_ANVIL_SHA256/);
  assert.match(wrapper, /--anvil-bin "\$ANVIL_BIN"/);
  assert.match(wrapper, /--anvil-sha256 "\$ANVIL_SHA256"/);

  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .anvil_executable_binding_required_before_process_start,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .anvil_executable_sha256_reverified_before_process_start,
    true,
  );
  assert.equal(
    VOID_PRIVATE_CHAIN2050_STARTUP_INTEGRATION_AUTHORITY_V1
      .ambient_path_anvil_resolution,
    false,
  );

  console.log("absolute_anvil_executable_required=true");
  console.log("canonical_anvil_path_required=true");
  console.log("anvil_symlink_rejected=true");
  console.log("anvil_owner_executable_safe_mode_required=true");
  console.log("anvil_sha256_bound_in_plan=true");
  console.log("anvil_sha256_reverified_before_spawn=true");
  console.log("post_plan_binary_change_rejected=true");
  console.log("ambient_path_anvil_resolution=false");
  console.log("apply_without_anvil_binding_materialization=0");
  console.log("transaction_broadcast=0");
  console.log("wallet_signer_credential_access=0");
  console.log("money_movement=0");
  console.log("VOID_PRIVATE_CHAIN2050_ANVIL_EXECUTABLE_BINDING_V1_PROOF_GREEN");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
