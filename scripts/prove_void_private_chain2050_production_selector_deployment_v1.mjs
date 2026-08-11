#!/usr/bin/env node
// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestFile = path.join(
  repo,
  "ops/mainnet0/void-private-chain2050-production-selector-deployment-v1.json",
);
const unitFile = path.join(
  repo,
  "ops/systemd/user/void-private-chain2050-rpc-selected-durable-v1.service.example",
);
const workflowFile = path.join(
  repo,
  ".github/workflows/void-private-chain2050-production-selector-deployment-v1.yml",
);

const ANCHOR = "1b3429b9e938b4c590ecc1601677394d8d7081cb";
const DEPLOY =
  "/home/zoso/.local/share/void-private-chain2050-rpc-v1/deployments/" +
  "selector-37371-main-1b3429b9-v1";
const RECOVERY =
  "/home/zoso/.local/state/void-private-chain2050-rpc-v1/" +
  "recovery-candidate-checkpoints-v6";
const CHECKPOINT =
  "/home/zoso/.local/state/void-private-chain2050-rpc-v1/checkpoints-v1";
const DERIVED =
  "/home/zoso/.local/state/void-private-chain2050-rpc-v1/startup-derived-v1";
const BUY =
  "/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1";
const DURABILITY = `${BUY}/chain2050-durability-v1`;
const CID =
  "99892d8dda6c759e14c42344971019fa42a9aac93d54ec4a25e4d66af60310b2";
const STEM = `chain2050-block-37371-${CID}`;

function git(args) {
  return execFileSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}
function esc(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function exactKeys(value, keys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), label);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} keys`);
}

const manifestText = fs.readFileSync(manifestFile, "utf8");
const manifest = JSON.parse(manifestText);
const unit = fs.readFileSync(unitFile, "utf8");
const workflow = fs.readFileSync(workflowFile, "utf8");

exactKeys(
  manifest,
  [
    "marker", "version", "source_only", "installation_performed",
    "service_mutation_performed", "checkpoint_promotion_performed",
    "production_state_load_performed", "wallet_signer_credential_access",
    "transaction_submission_performed", "money_movement_performed",
    "reviewed_source_anchor",
    "anvil_binding_repair_source_blobs_require_merged_commit_at_operator_seal",
    "deployment_root", "service_name",
    "unit_template_path", "source_files", "runtime_seal_requirements",
    "baseline", "checkpoint_promotion_plan", "startup", "roots",
    "future_unit_environment", "authority",
  ],
  "manifest",
);
assert.equal(manifest.marker,
  "VOID_PRIVATE_CHAIN2050_PRODUCTION_SELECTOR_DEPLOYMENT_V1");
assert.equal(manifest.version, 1);
assert.equal(manifest.source_only, true);
for (const key of [
  "installation_performed",
  "service_mutation_performed",
  "checkpoint_promotion_performed",
  "production_state_load_performed",
  "wallet_signer_credential_access",
  "transaction_submission_performed",
  "money_movement_performed",
]) assert.equal(manifest[key], false, key);

assert.equal(manifest.reviewed_source_anchor, ANCHOR);
assert.equal(
  manifest.anvil_binding_repair_source_blobs_require_merged_commit_at_operator_seal,
  true,
);
assert.equal(manifest.deployment_root, DEPLOY);
assert.equal(manifest.service_name, "void-private-chain2050-rpc-v1.service");

const expectedSources = new Map([
  ["ops/mainnet0/mainnet0-start-8545-selected-durable-state.sh",
   ["28109ec33fd1467a52624909f53be2276d054591", "0755", false]],
  ["tools/void-private-chain2050-startup-integration-v1.mjs",
   ["061a136a1c103f5e7006665be9abe200a18a9ebf", "0600", false]],
  ["tools/void-private-chain2050-startup-selection-v1.mjs",
   ["074e4429d9b3f534f38e9a0535a123a062b9e37d", "0600", true]],
  ["tools/void-private-chain2050-checkpoint-v1.mjs",
   ["8086330b508c5786ce004dfb2a9ffce73e8f8c77", "0600", true]],
]);
assert.equal(manifest.source_files.length, expectedSources.size);
for (const item of manifest.source_files) {
  exactKeys(item, ["path", "git_blob_sha", "deployment_relative_path", "mode"],
    `source:${item.path}`);
  const expected = expectedSources.get(item.path);
  assert.ok(expected, `unexpected source ${item.path}`);
  assert.equal(item.git_blob_sha, expected[0]);
  assert.equal(item.mode, expected[1]);
  assert.equal(item.deployment_relative_path, item.path);
  if (expected[2]) {
    assert.equal(git(["rev-parse", `${ANCHOR}:${item.path}`]), item.git_blob_sha);
  } else {
    assert.notEqual(git(["rev-parse", `${ANCHOR}:${item.path}`]), item.git_blob_sha);
  }
  assert.equal(git(["hash-object", item.path]), item.git_blob_sha);
}

const seal = manifest.runtime_seal_requirements;
assert.equal(seal.node_binary_absolute_path_required, true);
assert.equal(seal.node_binary_sha256_required, true);
assert.equal(seal.node_binary_unit_sentinel, "__SEALED_NODE_BIN__");
assert.equal(seal.anvil_binary_absolute_path_required, true);
assert.equal(seal.anvil_binary_normalized_path_required, true);
assert.equal(seal.anvil_binary_path_component_symlinks_forbidden, true);
assert.equal(seal.anvil_binary_owner_safe_mode_executable_required, true);
assert.equal(
  seal.anvil_binary_sha256_required_at_plan_and_immediately_before_spawn,
  true,
);
assert.equal(seal.anvil_binary_ambient_path_resolution_allowed, false);
assert.equal(seal.pinned_anvil_sha256,
  "b47362d2159aa0f2f575320e5e529bb5a91093cb62dc6bd30c0022018aa9f738");
assert.equal(seal.pinned_anvil_mode, "0700");
assert.equal(seal.pinned_anvil_unit_path, `${DEPLOY}/bin/anvil`);

const baseline = manifest.baseline;
assert.equal(baseline.source_wrapper_sha256,
  "bb58dee389c8129ad68369f413a1469521a95c5eaf224488011ca140834a69c9");
assert.equal(baseline.source_wrapper_format,
  "json_string_anvil_dumpState_hex_gzip");
assert.equal(baseline.normalization,
  "json_string_value_to_raw_anvil_dump_state_hex_without_gzip_inflate");
assert.equal(baseline.normalized_sha256,
  "02afeb49a6eced1c1f3889d62f308f07df099c0c75699226e89d60fdb434ede7");
assert.equal(baseline.normalized_mode, "0600");
assert.equal(baseline.normalized_format, "anvil_dump_state_hex");
assert.equal(baseline.block_number, 37367);
assert.equal(baseline.block_hash,
  "0x97b6cc60e4f909d2ecfbe62c506cb8e921368a35abcac987be97ad067fed48f3");

const promotion = manifest.checkpoint_promotion_plan;
assert.equal(promotion.copy_required, true);
assert.equal(promotion.source_root, RECOVERY);
assert.equal(promotion.destination_root, CHECKPOINT);
assert.equal(promotion.checkpoint_id_sha256, CID);
assert.equal(promotion.state_sha256,
  "88937f269bfadb150821794cae874ea312b6b5525b8b81b40bb0b7102b3aa248");
assert.equal(promotion.block_number, 37371);
assert.equal(promotion.delivery_block_number, 37370);
assert.equal(promotion.delivery_transaction_hash,
  "0x4557801a27c6c47e032d0a4b599c2d01a76b407638fd87e6f129f8aef13f6ac6");
assert.equal(promotion.state_filename, `${STEM}.anvil-dump-state.hex`);
assert.equal(promotion.manifest_filename, `${STEM}.manifest.json`);
assert.equal(promotion.complete_filename, `${STEM}.complete-v1`);
assert.equal(promotion.complete_exact_text,
  `VOID_PRIVATE_CHAIN2050_CHECKPOINT_COMPLETE_V1 ${CID}\n`);
assert.equal(promotion.manifest_sha256_required_at_operator_seal, true);
assert.equal(promotion.copy_semantics,
  "create_only_content_preserving_then_fsync_before_final_marker");
assert.equal(promotion.copy_performed_by_source_lane, false);

const startup = manifest.startup;
assert.equal(startup.rpc_url, "http://127.0.0.1:8545/");
assert.equal(startup.required_minimum_block_number, 37371);
assert.equal(startup.start_mode, "apply");
assert.equal(startup.confirmation,
  "startPrivateChain2050FromSelectedDurableState");
assert.equal(startup.accounts, 0);
assert.equal(startup.interval_mining, false);
assert.equal(startup.no_mining, false);
assert.equal(startup.stale_baseline_fallback_allowed, false);
assert.equal(startup.automatic_rollback_to_37367_allowed, false);
assert.equal(startup.failure_policy,
  "HOLD_WITH_PRODUCTION_ECONOMIC_LANE_DISABLED");

assert.deepEqual(manifest.roots, {
  recovery_candidate_root: RECOVERY,
  production_checkpoint_root: CHECKPOINT,
  startup_derived_root: DERIVED,
  buy_void_runtime_root: BUY,
  durability_root: DURABILITY,
});
const roots = Object.values(manifest.roots).map((value) => path.resolve(value));
assert.equal(new Set(roots).size, roots.length, "roots must remain distinct");

const env = manifest.future_unit_environment;
assert.equal(env.VOID_REPO, DEPLOY);
assert.equal(env.VOID_NODE_BIN, "__SEALED_NODE_BIN__");
assert.equal(env.VOID_MAINNET0_8545_ANVIL_EXECUTABLE,
  `${DEPLOY}/bin/anvil`);
assert.equal(env.VOID_MAINNET0_8545_ANVIL_EXECUTABLE_SHA256,
  seal.pinned_anvil_sha256);
assert.equal(env.VOID_MAINNET0_8545_BASELINE_STATE,
  `${DEPLOY}/state/epoch127.baseline.anvil-dump-state.hex`);
assert.equal(env.VOID_MAINNET0_8545_BASELINE_STATE_SHA256,
  baseline.normalized_sha256);
assert.equal(env.VOID_MAINNET0_8545_BASELINE_STATE_FORMAT,
  "anvil_dump_state_hex");
assert.equal(env.VOID_MAINNET0_8545_BASELINE_BLOCK_NUMBER, "37367");
assert.equal(env.VOID_MAINNET0_8545_CHECKPOINT_ROOT, CHECKPOINT);
assert.equal(env.VOID_MAINNET0_8545_MINIMUM_BLOCK_NUMBER, "37371");
assert.equal(env.VOID_MAINNET0_8545_DERIVED_ROOT, DERIVED);
assert.equal(env.VOID_MAINNET0_8545_RPC_URL, "http://127.0.0.1:8545/");
assert.equal(env.VOID_MAINNET0_8545_START_MODE, "apply");
assert.equal(env.VOID_MAINNET0_8545_CONFIRMATION,
  "startPrivateChain2050FromSelectedDurableState");

for (const key of [
  "operator_seal_preparation_separate_gate",
  "checkpoint_promotion_separate_gate",
  "unit_installation_separate_gate",
  "service_restart_separate_gate",
  "production_state_load_separate_gate",
  "economic_reentry_separate_gate",
]) assert.equal(manifest.authority[key], true, key);
for (const key of [
  "wallet_signer_credential_access", "transaction_broadcast",
  "buy_void_fulfillment", "work_credit_mutation", "validator_mutation",
  "treasury_mutation", "fund_movement",
]) assert.equal(manifest.authority[key], false, key);

assert.match(unit, /SOURCE-ONLY TEMPLATE\. DO NOT INSTALL DIRECTLY\./);
assert.equal((unit.match(/^ExecStart=/gm) || []).length, 1);
assert.match(unit, new RegExp(
  `^ExecStart=${esc(DEPLOY)}/ops/mainnet0/` +
  "mainnet0-start-8545-selected-durable-state\\.sh$", "m"));
assert.match(unit, /^Environment=VOID_NODE_BIN=__SEALED_NODE_BIN__$/m);
assert.ok(unit.includes(`ConditionPathExists=${DEPLOY}/bin/anvil`));
for (const [key, value] of Object.entries(env)) {
  assert.match(unit, new RegExp(`^Environment=${key}=${esc(value)}$`, "m"));
}
for (const suffix of [
  `${STEM}.anvil-dump-state.hex`,
  `${STEM}.manifest.json`,
  `${STEM}.complete-v1`,
]) {
  assert.ok(unit.includes(`ConditionPathExists=${CHECKPOINT}/${suffix}`));
}
for (const forbidden of [
  "LoadCredential=", "EnvironmentFile=", "fuser", "pkill", "kill ",
  "--load-state", "systemctl", "eth_sendRawTransaction", "private_key",
  "mnemonic", "wallet", "signer",
  "VOID_BUY_VOID_NATIVE_DELIVERY_DEPENDENCY_INJECTOR_ENABLED=1",
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED=1",
]) assert.equal(unit.includes(forbidden), false, `forbidden:${forbidden}`);
assert.match(unit, /^Restart=on-failure$/m);
assert.match(unit, /^UMask=0077$/m);
assert.match(unit, /^NoNewPrivileges=true$/m);

for (const required of [
  "prove_void_private_chain2050_production_selector_deployment_v1.mjs",
  "prove_mainnet0_8545_selector_restore_retirement_v1.mjs",
  "prove_void_private_chain2050_startup_integration_v1.mjs",
  "prove_void_private_chain2050_startup_selection_v1.mjs",
  "prove_void_private_chain2050_checkpoint_v1.mjs",
  "node-version: [22, 24, 26]",
  "fetch-depth: 0",
]) assert.ok(workflow.includes(required), `workflow missing ${required}`);

console.log(`manifest_sha256=${sha256(manifestText)}`);
console.log("source_anchor_and_git_blobs_green=true");
console.log("baseline_normalization_contract_green=true");
console.log("checkpoint_copy_shape_green=true");
console.log("root_separation_green=true");
console.log("selector_service_template_green=true");
console.log("runtime_specific_node_pin_deferred_to_operator_seal=true");
console.log("anvil_exact_absolute_path_and_sha256_bound=true");
console.log("anvil_ambient_path_resolution_allowed=false");
console.log("stale_fallback_and_automatic_rollback_disabled=true");
console.log("economic_reentry_remains_separate=true");
console.log("source_lane_authority_all_false_green=true");
console.log("VOID_PRIVATE_CHAIN2050_PRODUCTION_SELECTOR_DEPLOYMENT_V1_PROOF_GREEN");
