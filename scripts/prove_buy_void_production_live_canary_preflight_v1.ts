import assert from "node:assert/strict";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
} from "../src/economic/buy_void_native_execution_worker_v1.js";
import {
  VOID_BUY_VOID_NATIVE_EXECUTION_RUNTIME_V1,
  type BuyVoidNativeExecutionRuntimePolicyV1,
} from "../src/economic/buy_void_native_execution_runtime_v1.js";
import {
  buyVoidPreparedTransactionCredentialSignerFingerprintV1,
} from "../src/economic/buy_void_prepared_transaction_credential_signer_v1.js";
import type {
  BuyVoidProductionActivationPlanPolicyV1,
} from "../src/economic/buy_void_production_activation_plan_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
} from "../src/economic/buy_void_production_private_services_activation_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1,
  runBuyVoidProductionLiveCanaryPreflightV1,
} from "../src/economic/buy_void_production_live_canary_preflight_v1.js";

function address(char: string): string {
  return `0x${char.repeat(40)}`;
}

const wallet = new Wallet(`0x${"1".repeat(64)}`).address.toLowerCase();
const otherWallet = address("2");
const signerFingerprint =
  buyVoidPreparedTransactionCredentialSignerFingerprintV1(wallet);
const attemptId = "a".repeat(64);

function productionPolicy(): BuyVoidProductionActivationPlanPolicyV1 {
  return {
    custodian: {
      socket_path: "/run/void/buy-void/custodian.sock",
      custody_store_dir: "/var/lib/void/buy-void/custody",
      credentials_directory: "/run/credentials/void-buy-void",
      expected_wallet_address: wallet,
    },
    broadcaster: {
      socket_path: "/run/void/buy-void/broadcaster.sock",
      custody_store_dir: "/var/lib/void/buy-void/custody",
      state_dir: "/var/lib/void/buy-void/broadcaster",
      expected_signer_fingerprint_sha256: signerFingerprint,
      rpc: {
        rpc_url: "http://127.0.0.1:8545/",
        expected_chain_id: 2050,
      },
    },
  };
}

function runtimePolicy(): BuyVoidNativeExecutionRuntimePolicyV1 {
  return {
    enabled: false,
    root_dir: "/var/lib/void/buy-void/runtime-integration-v1",
    worker_policy: {
      enabled: true,
      asset_mode: "native_void",
      chain_id: "2050",
      pool_id: "void-presale-mainnet0-v1",
      fulfillment_wallet_address: wallet,
      max_void_amount_units: "700",
      max_gas_limit: "21000",
      max_fee_per_gas_wei: "3000000000",
      max_priority_fee_per_gas_wei: "1000000000",
    },
    execution_policy: {
      attempt_journal_enabled: true,
      max_attempts_per_payment: 1,
      chain_id: "2050",
      fulfillment_wallet_allowlist: [wallet],
    },
    planner_policy: {
      rpc_url: "http://127.0.0.1:8545/",
      expected_chain_id: "2050",
      fulfillment_wallet_address: wallet,
      gas_limit: "21000",
      max_gas_limit: "21000",
      max_fee_per_gas_wei: "3000000000",
      max_priority_fee_per_gas_wei: "1000000000",
      fee_multiplier_bps: "12000",
    },
  };
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
        nonce: 9,
        to: otherWallet,
        value_wei: "400000000000000",
        gas_limit: "21000",
        max_fee_per_gas_wei: "2400000000",
        max_priority_fee_per_gas_wei: "1000000000",
      },
    },
    worker: {
      ok: true,
      status: "dry_run",
      preview: {
        nonce: 9,
        delivery_address: otherWallet,
        void_amount_units: "400",
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

assert.equal(
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1,
  "VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1",
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
  "buyVoidInspectProductionLiveCanaryPreflightV1",
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1
    .native_execution_runtime_must_remain_disabled,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1
    .native_execution_apply,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1
    .signer_dependencies_supplied,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1
    .transaction_broadcast_authorized,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_AUTHORITY_V1
    .live_canary_authorized_by_preflight,
  false,
);

let runtimeCalls = 0;
const noCallRuntime = (async () => {
  runtimeCalls += 1;
  throw new Error("native execution must not be called");
}) as any;

const planned = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: runtimePolicy(),
    attempt_id: attemptId,
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(planned.ok, true);
if (planned.ok !== true || planned.status !== "planned") {
  throw new Error("production_live_canary_preflight_plan_expected");
}
assert.equal(runtimeCalls, 0);
assert.match(planned.production_activation_plan_id_sha256, /^[0-9a-f]{64}$/);
assert.match(planned.runtime_policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
assert.match(planned.preflight_plan_id_sha256, /^[0-9a-f]{64}$/);
assert.equal(
  planned.required_confirmation,
  VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
);
assert.equal(
  planned.required_private_services_activation_confirmation,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  planned.required_native_execution_confirmation,
  VOID_BUY_VOID_NATIVE_EXECUTION_CONFIRMATION_V1,
);
assert.equal(planned.native_execution_dry_run_invoked, false);
assert.equal(planned.mutation_performed, false);
assert.equal(planned.signing_performed, false);
assert.equal(planned.transaction_broadcast_performed, false);
assert.equal(planned.money_movement_performed, false);

const repeatedPlan = await runBuyVoidProductionLiveCanaryPreflightV1({
  production_policy: productionPolicy(),
  execution_runtime_policy: runtimePolicy(),
  attempt_id: attemptId,
});
assert.equal(repeatedPlan.ok, true);
if (repeatedPlan.ok !== true || repeatedPlan.status !== "planned") {
  throw new Error("production_live_canary_preflight_repeat_plan_expected");
}
assert.equal(repeatedPlan.preflight_plan_id_sha256, planned.preflight_plan_id_sha256);

const invalidAttempt = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: runtimePolicy(),
    attempt_id: ` ${attemptId}`,
    inspect: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(invalidAttempt.ok, false);
assert.equal(runtimeCalls, 0);

for (const confirmation of [
  "wrong",
  `${VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1} `,
]) {
  const wrongConfirmation = await runBuyVoidProductionLiveCanaryPreflightV1(
    {
      production_policy: productionPolicy(),
      execution_runtime_policy: runtimePolicy(),
      attempt_id: attemptId,
      inspect: true,
      confirmation,
      expected_production_activation_plan_id_sha256:
        planned.production_activation_plan_id_sha256,
      expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
    },
    { run_native_execution_runtime: noCallRuntime },
  );
  assert.equal(wrongConfirmation.ok, false);
  if (wrongConfirmation.ok !== false) throw new Error("confirmation must hold");
  assert.equal(
    wrongConfirmation.reason,
    "production_live_canary_preflight_confirmation_required",
  );
  assert.equal(runtimeCalls, 0);
}

const wrongActivationId = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: runtimePolicy(),
    attempt_id: attemptId,
    inspect: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
    expected_production_activation_plan_id_sha256: "f".repeat(64),
    expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(wrongActivationId.ok, false);
if (wrongActivationId.ok !== false) throw new Error("activation id must hold");
assert.equal(
  wrongActivationId.reason,
  "production_live_canary_preflight_activation_plan_id_confirmation_required",
);
assert.equal(runtimeCalls, 0);

const wrongPreflightId = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: runtimePolicy(),
    attempt_id: attemptId,
    inspect: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
    expected_production_activation_plan_id_sha256:
      planned.production_activation_plan_id_sha256,
    expected_preflight_plan_id_sha256: "e".repeat(64),
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(wrongPreflightId.ok, false);
if (wrongPreflightId.ok !== false) throw new Error("preflight id must hold");
assert.equal(
  wrongPreflightId.reason,
  "production_live_canary_preflight_plan_id_confirmation_required",
);
assert.equal(runtimeCalls, 0);

const enabledRuntime = runtimePolicy();
enabledRuntime.enabled = true;
const enabledHeld = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: enabledRuntime,
    attempt_id: attemptId,
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(enabledHeld.ok, false);
if (enabledHeld.ok !== false) throw new Error("enabled runtime must hold");
assert.equal(
  enabledHeld.reason,
  "production_live_canary_preflight_runtime_must_be_disabled",
);
assert.equal(runtimeCalls, 0);

const walletMismatch = runtimePolicy();
walletMismatch.worker_policy.fulfillment_wallet_address = otherWallet;
const walletHeld = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: walletMismatch,
    attempt_id: attemptId,
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(walletHeld.ok, false);
if (walletHeld.ok !== false) throw new Error("wallet mismatch must hold");
assert.equal(
  walletHeld.reason,
  "production_live_canary_preflight_wallet_binding_mismatch",
);
assert.equal(runtimeCalls, 0);

const rpcMismatch = runtimePolicy();
rpcMismatch.planner_policy.rpc_url = "http://127.0.0.1:9545/";
const rpcHeld = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: rpcMismatch,
    attempt_id: attemptId,
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(rpcHeld.ok, false);
if (rpcHeld.ok !== false) throw new Error("rpc mismatch must hold");
assert.equal(
  rpcHeld.reason,
  "production_live_canary_preflight_rpc_binding_mismatch",
);
assert.equal(runtimeCalls, 0);

const chainMismatch = runtimePolicy();
chainMismatch.planner_policy.expected_chain_id = "1";
const chainHeld = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: chainMismatch,
    attempt_id: attemptId,
  },
  { run_native_execution_runtime: noCallRuntime },
);
assert.equal(chainHeld.ok, false);
if (chainHeld.ok !== false) throw new Error("chain mismatch must hold");
assert.equal(
  chainHeld.reason,
  "production_live_canary_preflight_chain_binding_mismatch",
);
assert.equal(runtimeCalls, 0);

let exactCalls = 0;
let exactInput: any = null;
const exactInspect = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: runtimePolicy(),
    attempt_id: attemptId,
    inspect: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
    expected_production_activation_plan_id_sha256:
      planned.production_activation_plan_id_sha256,
    expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
  },
  {
    run_native_execution_runtime: (async (input: any) => {
      exactCalls += 1;
      exactInput = input;
      return dryRunDecision(input.command.attempt_id);
    }) as any,
  },
);
assert.equal(exactCalls, 1);
assert.equal(exactInspect.ok, true);
if (exactInspect.ok !== true || exactInspect.status !== "inspected") {
  throw new Error("exact inspect expected");
}
assert.equal(exactInput.command.attempt_id, attemptId);
assert.equal(exactInput.command.apply, false);
assert.equal(Object.hasOwn(exactInput, "dependencies"), false);
assert.equal(Object.isFrozen(exactInput.runtime_policy), true);
assert.equal(Object.isFrozen(exactInput.runtime_policy.worker_policy), true);
assert.equal(Object.isFrozen(exactInput.runtime_policy.execution_policy), true);
assert.equal(
  Object.isFrozen(exactInput.runtime_policy.execution_policy.fulfillment_wallet_allowlist),
  true,
);
assert.equal(Object.isFrozen(exactInput.runtime_policy.planner_policy), true);
assert.equal(exactInput.runtime_policy.enabled, false);
assert.equal(exactInspect.mutation_performed, false);
assert.equal(exactInspect.signing_performed, false);
assert.equal(exactInspect.transaction_broadcast_performed, false);
assert.equal(exactInspect.money_movement_performed, false);
assert.match(exactInspect.evidence_id_sha256, /^[0-9a-f]{64}$/);

const repeatInspect = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: runtimePolicy(),
    attempt_id: attemptId,
    inspect: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
    expected_production_activation_plan_id_sha256:
      planned.production_activation_plan_id_sha256,
    expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
  },
  {
    run_native_execution_runtime: (async (input: any) =>
      dryRunDecision(input.command.attempt_id)) as any,
  },
);
assert.equal(repeatInspect.ok, true);
if (repeatInspect.ok !== true || repeatInspect.status !== "inspected") {
  throw new Error("repeat inspect expected");
}
assert.equal(repeatInspect.evidence_id_sha256, exactInspect.evidence_id_sha256);

const mutableRuntime = runtimePolicy();
const mutablePlan = await runBuyVoidProductionLiveCanaryPreflightV1({
  production_policy: productionPolicy(),
  execution_runtime_policy: mutableRuntime,
  attempt_id: attemptId,
});
assert.equal(mutablePlan.ok, true);
if (mutablePlan.ok !== true || mutablePlan.status !== "planned") {
  throw new Error("mutable plan expected");
}
let startInspect!: () => void;
let releaseInspect!: () => void;
const inspectStarted = new Promise<void>((resolve) => {
  startInspect = resolve;
});
const inspectRelease = new Promise<void>((resolve) => {
  releaseInspect = resolve;
});
let capturedSnapshot: any = null;
const mutationRacePromise = runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: mutableRuntime,
    attempt_id: attemptId,
    inspect: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
    expected_production_activation_plan_id_sha256:
      mutablePlan.production_activation_plan_id_sha256,
    expected_preflight_plan_id_sha256: mutablePlan.preflight_plan_id_sha256,
  },
  {
    run_native_execution_runtime: (async (input: any) => {
      capturedSnapshot = input.runtime_policy;
      startInspect();
      await inspectRelease;
      return dryRunDecision(input.command.attempt_id);
    }) as any,
  },
);
await inspectStarted;
mutableRuntime.worker_policy.fulfillment_wallet_address = otherWallet;
mutableRuntime.execution_policy.fulfillment_wallet_allowlist[0] = otherWallet;
mutableRuntime.planner_policy.fulfillment_wallet_address = otherWallet;
mutableRuntime.planner_policy.rpc_url = "http://127.0.0.1:9999/";
releaseInspect();
const mutationRace = await mutationRacePromise;
assert.equal(mutationRace.ok, true);
assert.equal(capturedSnapshot.worker_policy.fulfillment_wallet_address, wallet);
assert.equal(capturedSnapshot.execution_policy.fulfillment_wallet_allowlist[0], wallet);
assert.equal(capturedSnapshot.planner_policy.fulfillment_wallet_address, wallet);
assert.equal(capturedSnapshot.planner_policy.rpc_url, "http://127.0.0.1:8545/");
assert.equal(Object.isFrozen(capturedSnapshot), true);

const unsafeMutation = await runBuyVoidProductionLiveCanaryPreflightV1(
  {
    production_policy: productionPolicy(),
    execution_runtime_policy: runtimePolicy(),
    attempt_id: attemptId,
    inspect: true,
    confirmation: VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_CONFIRMATION_V1,
    expected_production_activation_plan_id_sha256:
      planned.production_activation_plan_id_sha256,
    expected_preflight_plan_id_sha256: planned.preflight_plan_id_sha256,
  },
  {
    run_native_execution_runtime: (async (input: any) => ({
      ...dryRunDecision(input.command.attempt_id),
      mutation_performed: true,
    })) as any,
  },
);
assert.equal(unsafeMutation.ok, false);
if (unsafeMutation.ok !== false) throw new Error("unsafe mutation must hold");
assert.equal(
  unsafeMutation.reason,
  "production_live_canary_preflight_native_execution_dry_run_boundary_invalid",
);
assert.equal(unsafeMutation.native_execution_dry_run_invoked, true);
assert.equal(unsafeMutation.mutation_performed, true);
assert.equal(unsafeMutation.money_movement_performed, true);

console.log("VOID_BUY_VOID_PRODUCTION_LIVE_CANARY_PREFLIGHT_V1_PROOF_GREEN");
console.log("default_plan_runtime_calls=0");
console.log("exact_attempt_id_required=true");
console.log("exact_preflight_confirmation_required=true");
console.log("exact_production_activation_plan_id_echo_required=true");
console.log("exact_preflight_plan_id_echo_required=true");
console.log("native_execution_runtime_disabled_required=true");
console.log("production_wallet_binding_required=true");
console.log("production_chain_2050_binding_required=true");
console.log("production_rpc_binding_required=true");
console.log("native_execution_apply=false");
console.log("native_execution_dependencies_supplied=false");
console.log("runtime_policy_snapshot_frozen=true");
console.log("caller_mutation_after_snapshot_cannot_retarget=true");
console.log("successful_inspection_mutation=0");
console.log("successful_inspection_signing=0");
console.log("successful_inspection_broadcast=0");
console.log("live_canary_authorized=false");
