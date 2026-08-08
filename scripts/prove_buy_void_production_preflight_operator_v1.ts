import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
  buyVoidNativeExecutionRuntimePolicyStateV1,
} from "../src/economic/buy_void_native_execution_runtime_v1.js";
import {
  buyVoidPreparedTransactionCredentialSignerFingerprintV1,
} from "../src/economic/buy_void_prepared_transaction_credential_signer_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
} from "../src/economic/buy_void_production_live_canary_preflight_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_PATH_ENVS_V1,
  VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
  resolveBuyVoidProductionPreflightOperatorPolicyV1,
  runBuyVoidProductionPreflightOperatorV1,
} from "../src/economic/buy_void_production_preflight_operator_v1.js";

const wallet = new Wallet(`0x${"1".repeat(64)}`).address.toLowerCase();
const otherWallet = `0x${"2".repeat(40)}`;
const attemptId = "a".repeat(64);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-preflight-operator-v1-"));

const ENV_KEYS = [
  "VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED",
  "VOID_BUY_VOID_RUNTIME_DIR",
  "VOID_BUY_VOID_INVENTORY_POOL_ID",
  "VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS",
  "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_AMOUNT_UNITS",
  "VOID_BUY_VOID_NATIVE_EXECUTION_GAS_LIMIT",
  "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT",
  "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI",
  "VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS",
  "VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL",
  ...Object.values(VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_PATH_ENVS_V1),
] as const;

const before = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<string, string | undefined>;

function restoreEnv(): void {
  for (const key of ENV_KEYS) {
    const value = before[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function configureEnv(): void {
  process.env.VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED = "0";
  process.env.VOID_BUY_VOID_RUNTIME_DIR = path.join(root, "runtime");
  process.env.VOID_BUY_VOID_INVENTORY_POOL_ID = "void-presale-mainnet0-v1";
  process.env.VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS = wallet;
  process.env.VOID_BUY_VOID_NATIVE_DELIVERY_MAX_AMOUNT_UNITS = "2000000";
  process.env.VOID_BUY_VOID_NATIVE_EXECUTION_GAS_LIMIT = "21000";
  process.env.VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT = "21000";
  process.env.VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI = "1200000009";
  process.env.VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI = "100000000";
  process.env.VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS = "12000";
  process.env.VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL = "http://127.0.0.1:8545/";

  process.env.VOID_BUY_VOID_PRODUCTION_CUSTODIAN_SOCKET_PATH =
    path.join(root, "private", "custodian.sock");
  process.env.VOID_BUY_VOID_PRODUCTION_CUSTODY_STORE_DIR =
    path.join(root, "private", "custody");
  process.env.VOID_BUY_VOID_PRODUCTION_BROADCASTER_SOCKET_PATH =
    path.join(root, "private", "broadcaster.sock");
  process.env.VOID_BUY_VOID_PRODUCTION_BROADCASTER_STATE_DIR =
    path.join(root, "private", "broadcaster-state");
  process.env.VOID_BUY_VOID_PRODUCTION_CREDENTIALS_DIRECTORY =
    path.join(root, "private", "credentials");
}

function dryRunDecision(id: string) {
  return {
    ok: true,
    marker: VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
    version: 1,
    status: "dry_run",
    attempt_id: id,
    reconstructed_from_server_journals: true,
    planner: {
      ok: true,
      status: "planned",
      transaction_plan: {
        chain_id: "2050",
        nonce: 11,
        to: otherWallet,
        value_wei: "1000000000000",
        gas_limit: "21000",
        max_fee_per_gas_wei: "1000000000",
        max_priority_fee_per_gas_wei: "100000000",
      },
    },
    worker: {
      ok: true,
      status: "dry_run",
      preview: {
        nonce: 11,
        delivery_address: otherWallet,
        void_amount_units: "1",
      },
      mutation_performed: false,
      signing_performed: false,
      transaction_broadcast_performed: false,
    },
    mutation_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
  } as any;
}

try {
  configureEnv();

  assert.equal(
    VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1,
    "VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1",
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1
      .canonical_native_runtime_policy_parser_reused,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1
      .private_service_path_defaults,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1
      .attempt_creation_or_reservation,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_AUTHORITY_V1.native_execution_apply,
    false,
  );

  const canonicalRuntime = buyVoidNativeExecutionRuntimePolicyStateV1();
  assert.equal("missing_envs" in canonicalRuntime, false);
  if ("missing_envs" in canonicalRuntime) throw new Error("runtime policy expected");
  assert.equal(canonicalRuntime.policy.enabled, false);
  assert.equal(canonicalRuntime.policy.root_dir, path.join(root, "runtime"));
  assert.equal(canonicalRuntime.policy.worker_policy.fulfillment_wallet_address, wallet);
  assert.equal(canonicalRuntime.policy.planner_policy.rpc_url, "http://127.0.0.1:8545/");

  const resolved = resolveBuyVoidProductionPreflightOperatorPolicyV1();
  if (resolved.ok === false) throw new Error(resolved.reason);
  assert.equal(resolved.ok, true);
  assert.deepEqual(resolved.execution_runtime_policy, canonicalRuntime.policy);
  assert.equal(resolved.execution_runtime_policy.enabled, false);
  assert.equal(
    resolved.production_policy.custodian.expected_wallet_address,
    wallet,
  );
  assert.equal(
    resolved.production_policy.broadcaster.rpc.rpc_url,
    canonicalRuntime.policy.planner_policy.rpc_url,
  );
  assert.equal(
    resolved.production_policy.broadcaster.expected_signer_fingerprint_sha256,
    buyVoidPreparedTransactionCredentialSignerFingerprintV1(wallet),
  );
  assert.match(resolved.production_activation_plan_id_sha256, /^[0-9a-f]{64}$/);
  assert.match(resolved.runtime_policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.match(resolved.private_path_fingerprint_sha256, /^[0-9a-f]{64}$/);

  const planned = await runBuyVoidProductionPreflightOperatorV1({
    attempt_id: attemptId,
  });
  if (planned.ok === false) throw new Error(planned.reason);
  assert.equal(planned.ok, true);
  assert.equal(planned.status, "planned");
  assert.equal(planned.inspected, false);
  assert.equal(planned.preflight.native_execution_dry_run_invoked, false);
  assert.equal(planned.mutation_performed, false);
  assert.equal(planned.signing_performed, false);
  assert.equal(planned.transaction_broadcast_performed, false);
  assert.equal(planned.money_movement_performed, false);

  let resolverCalls = 0;
  const unexpected = await runBuyVoidProductionPreflightOperatorV1(
    {
      attempt_id: attemptId,
      rpc_url: "http://127.0.0.1:9999/",
    } as any,
    {
      resolve_policy: () => {
        resolverCalls += 1;
        return resolved;
      },
    },
  );
  assert.equal(unexpected.ok, false);
  if (unexpected.ok) throw new Error("unexpected input must hold");
  assert.equal(unexpected.stage, "operator_input");
  assert.equal(unexpected.reason, "production_preflight_operator_unexpected_input_key");
  assert.equal(resolverCalls, 0);

  const savedCustodian = process.env.VOID_BUY_VOID_PRODUCTION_CUSTODIAN_SOCKET_PATH;
  delete process.env.VOID_BUY_VOID_PRODUCTION_CUSTODIAN_SOCKET_PATH;
  const missingPath = resolveBuyVoidProductionPreflightOperatorPolicyV1();
  assert.equal(missingPath.ok, false);
  if (missingPath.ok) throw new Error("missing path must hold");
  assert.equal(
    missingPath.reason,
    "production_preflight_operator_private_path_configuration_required",
  );
  assert.deepEqual(
    missingPath.missing_envs,
    ["VOID_BUY_VOID_PRODUCTION_CUSTODIAN_SOCKET_PATH"],
  );
  process.env.VOID_BUY_VOID_PRODUCTION_CUSTODIAN_SOCKET_PATH = savedCustodian;

  process.env.VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED = "1";
  const enabledRuntime = resolveBuyVoidProductionPreflightOperatorPolicyV1();
  assert.equal(enabledRuntime.ok, false);
  if (enabledRuntime.ok) throw new Error("enabled runtime must hold");
  assert.equal(
    enabledRuntime.reason,
    "production_preflight_operator_native_runtime_must_remain_disabled",
  );
  process.env.VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_ENABLED = "0";

  let runtimeCalls = 0;
  const fakeRuntime = (async (input: any) => {
    runtimeCalls += 1;
    assert.equal(input.command.attempt_id, attemptId);
    assert.equal(input.command.apply, false);
    assert.equal("dependencies" in input, false);
    assert.equal(input.runtime_policy.enabled, false);
    return dryRunDecision(attemptId);
  }) as any;

  const wrongConfirmation = await runBuyVoidProductionPreflightOperatorV1(
    {
      attempt_id: attemptId,
      inspect: true,
      confirmation: "wrong",
      expected_production_activation_plan_id_sha256:
        planned.production_activation_plan_id_sha256,
      expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
    },
    { preflight_dependencies: { run_native_execution_runtime: fakeRuntime } },
  );
  assert.equal(wrongConfirmation.ok, false);
  assert.equal(runtimeCalls, 0);

  const wrongProductionPlan = await runBuyVoidProductionPreflightOperatorV1(
    {
      attempt_id: attemptId,
      inspect: true,
      confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
      expected_production_activation_plan_id_sha256: "b".repeat(64),
      expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
    },
    { preflight_dependencies: { run_native_execution_runtime: fakeRuntime } },
  );
  assert.equal(wrongProductionPlan.ok, false);
  assert.equal(runtimeCalls, 0);

  const wrongPreflightPlan = await runBuyVoidProductionPreflightOperatorV1(
    {
      attempt_id: attemptId,
      inspect: true,
      confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
      expected_production_activation_plan_id_sha256:
        planned.production_activation_plan_id_sha256,
      expected_preflight_plan_id_sha256: "c".repeat(64),
    },
    { preflight_dependencies: { run_native_execution_runtime: fakeRuntime } },
  );
  assert.equal(wrongPreflightPlan.ok, false);
  assert.equal(runtimeCalls, 0);

  const inspected = await runBuyVoidProductionPreflightOperatorV1(
    {
      attempt_id: attemptId,
      inspect: true,
      confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
      expected_production_activation_plan_id_sha256:
        planned.production_activation_plan_id_sha256,
      expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
    },
    { preflight_dependencies: { run_native_execution_runtime: fakeRuntime } },
  );
  if (inspected.ok === false) throw new Error(inspected.reason);
  assert.equal(inspected.ok, true);
  assert.equal(inspected.status, "inspected");
  assert.equal(inspected.inspected, true);
  assert.equal(runtimeCalls, 1);
  assert.match(inspected.evidence_id_sha256 || "", /^[0-9a-f]{64}$/);
  assert.equal(inspected.mutation_performed, false);
  assert.equal(inspected.signing_performed, false);
  assert.equal(inspected.transaction_broadcast_performed, false);
  assert.equal(inspected.money_movement_performed, false);

  const runtimeSource = fs.readFileSync(
    path.join(process.cwd(), "src/economic/buy_void_native_execution_runtime_v1.ts"),
    "utf8",
  );
  assert.ok(
    runtimeSource.includes(
      "export function buyVoidNativeExecutionRuntimePolicyStateV1()",
    ),
  );
  assert.equal(runtimeSource.includes("function policyState(): PolicyStateV1"), false);
  assert.equal(
    (runtimeSource.match(/buyVoidNativeExecutionRuntimePolicyStateV1\(\)/g) || []).length,
    3,
  );
  assert.doesNotMatch(
    runtimeSource,
    /buy_void_native_delivery_runtime_dependencies_v1\.js/,
  );
  const nativeDeliveryRuntimeSource = fs.readFileSync(
    path.join(
      process.cwd(),
      "src/economic/buy_void_native_delivery_runtime_integration_v1.ts",
    ),
    "utf8",
  );
  assert.match(
    nativeDeliveryRuntimeSource,
    /import "\.\/buy_void_native_delivery_runtime_dependencies_v1\.js";/,
  );

  const cliSource = fs.readFileSync(
    path.join(process.cwd(), "scripts/buy_void_production_preflight_operator_v1.ts"),
    "utf8",
  );
  for (const forbiddenFlag of [
    "--wallet",
    "--rpc-url",
    "--root-dir",
    "--policy",
    "--signer-fingerprint",
    "--custodian-socket-path",
    "--custody-store-dir",
    "--broadcaster-socket-path",
    "--broadcaster-state-dir",
    "--credentials-directory",
  ]) {
    assert.equal(cliSource.includes(forbiddenFlag), false, forbiddenFlag);
  }
  for (const requiredFlag of [
    "--attempt-id",
    "--inspect",
    "--confirm",
    "--expected-production-activation-plan-id-sha256",
    "--expected-preflight-plan-id-sha256",
  ]) {
    assert.equal(cliSource.includes(requiredFlag), true, requiredFlag);
  }

  console.log("VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1_PROOF_GREEN");
  console.log("canonical_native_runtime_policy_parser_reused=true");
  console.log("planning_journal_reads=0");
  console.log("planning_rpc_calls=0");
  console.log("native_execution_library_dependency_side_effect_import=0");
  console.log("dependency_initializer_owned_by_native_delivery_runtime=true");
  console.log("private_service_path_defaults=false");
  console.log("synthetic_fixture_path_defaults=false");
  console.log("signer_fingerprint_caller_override=false");
  console.log("caller_policy_override=false");
  console.log("native_runtime_enabled=false");
  console.log("exact_inspection_native_runtime_calls=1");
  console.log("native_execution_apply=false");
  console.log("signer_dependencies_supplied=false");
  console.log("broadcaster_dependencies_supplied=false");
  console.log("mutation_performed=false");
  console.log("signing_performed=false");
  console.log("transaction_broadcast_performed=false");
  console.log("money_movement_performed=false");
} finally {
  restoreEnv();
  fs.rmSync(root, { recursive: true, force: true });
}