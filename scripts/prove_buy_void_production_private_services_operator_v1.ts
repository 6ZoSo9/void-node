import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_custodian_credential_activation_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
} from "../src/economic/buy_void_production_private_services_activation_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
} from "../src/economic/buy_void_production_rpc_readiness_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1,
  runBuyVoidProductionPrivateServicesOperatorV1,
} from "../src/economic/buy_void_production_private_services_operator_v1.js";

const PLAN_ID = "1".repeat(64);
const RUNTIME_POLICY_FP = "2".repeat(64);
const RPC_FP = "3".repeat(64);
const PRIVATE_PATH_FP = "4".repeat(64);
const SIGNER_FP = "5".repeat(64);
const PRIVATE_ROOT = "/srv/void/private/data_a/buy_void_v1/runtime-integration-v1";
const CUSTODIAN_SOCKET = "/srv/void/private/run/buy-void/custodian.sock";
const CUSTODY_STORE = "/srv/void/private/state/buy-void/custody";
const BROADCASTER_SOCKET = "/srv/void/private/run/buy-void/broadcaster.sock";
const BROADCASTER_STATE = "/srv/void/private/state/buy-void/broadcaster";
const CREDENTIALS = "/run/credentials/void-buy-void.service";
const WALLET = "0x" + "a".repeat(40);
const RPC_URL = "http://127.0.0.1:8545";

const productionPolicy = Object.freeze({
  custodian: Object.freeze({
    socket_path: CUSTODIAN_SOCKET,
    custody_store_dir: CUSTODY_STORE,
    credentials_directory: CREDENTIALS,
    expected_wallet_address: WALLET,
  }),
  broadcaster: Object.freeze({
    socket_path: BROADCASTER_SOCKET,
    custody_store_dir: CUSTODY_STORE,
    state_dir: BROADCASTER_STATE,
    expected_signer_fingerprint_sha256: SIGNER_FP,
    rpc: Object.freeze({
      rpc_url: RPC_URL,
      expected_chain_id: 2050,
    }),
  }),
});

function readyPolicy(): any {
  return {
    ok: true,
    status: "ready",
    marker: "VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1",
    version: 1,
    production_policy: productionPolicy,
    execution_runtime_policy: {
      enabled: false,
      root_dir: PRIVATE_ROOT,
    },
    production_activation_plan_id_sha256: PLAN_ID,
    runtime_policy_fingerprint_sha256: RUNTIME_POLICY_FP,
    rpc_url_fingerprint_sha256: RPC_FP,
    private_path_fingerprint_sha256: PRIVATE_PATH_FP,
    authority: {},
  };
}

function dryRunActivation(): any {
  return {
    ok: true,
    status: "dry_run",
    applied: false,
    marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
    version: 1,
    plan_id_sha256: PLAN_ID,
    rpc_url_fingerprint_sha256: RPC_FP,
    expected_signer_fingerprint_sha256: SIGNER_FP,
    required_confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    required_plan_id_sha256: PLAN_ID,
    required_rpc_readiness_confirmation:
      VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
    required_custodian_activation_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
    required_broadcaster_activation_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
    rpc_probe_performed: false,
    custodian_service_start_performed: false,
    broadcaster_service_start_performed: false,
    custodian_service_active_after_return: false,
    broadcaster_service_active_after_return: false,
    custodian_rollback_attempted: false,
    custodian_rollback_succeeded: null,
    broadcaster_rollback_attempted: false,
    broadcaster_rollback_succeeded: null,
    credential_read_performed: false,
    signing_performed: false,
    submit_once_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
  };
}

function startedActivation(services: {
  custodian: { stop: () => Promise<void> };
  broadcaster: { stop: () => Promise<void> };
}): any {
  return {
    ok: true,
    status: "started",
    applied: true,
    marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
    version: 1,
    plan_id_sha256: PLAN_ID,
    rpc_url_fingerprint_sha256: RPC_FP,
    expected_signer_fingerprint_sha256: SIGNER_FP,
    provider_submission_id: "synthetic-readiness-provider-id",
    rpc_probe_performed: true,
    custodian_service_start_performed: true,
    broadcaster_service_start_performed: true,
    custodian_service_active_after_return: true,
    broadcaster_service_active_after_return: true,
    custodian_rollback_attempted: false,
    custodian_rollback_succeeded: null,
    broadcaster_rollback_attempted: false,
    broadcaster_rollback_succeeded: null,
    credential_read_performed: false,
    signing_performed: false,
    submit_once_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
    services,
    authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
  };
}

let activationCalls = 0;
const invalidInput = await runBuyVoidProductionPrivateServicesOperatorV1(
  { apply: false, wallet: WALLET } as any,
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => {
      activationCalls += 1;
      return dryRunActivation();
    },
  },
);
assert.equal((invalidInput.decision as any).ok, false);
assert.equal((invalidInput.decision as any).stage, "operator_input");
assert.equal(activationCalls, 0);

const policyHeld = await runBuyVoidProductionPrivateServicesOperatorV1(
  {},
  {
    resolve_policy: () => ({
      ok: false,
      status: "held",
      marker: "VOID_BUY_VOID_PRODUCTION_PREFLIGHT_OPERATOR_V1",
      version: 1,
      reason: "production_preflight_operator_native_runtime_must_remain_disabled",
      authority: {},
    }) as any,
    run_activation: async () => {
      activationCalls += 1;
      return dryRunActivation();
    },
  },
);
assert.equal((policyHeld.decision as any).ok, false);
assert.equal((policyHeld.decision as any).stage, "operator_policy");
assert.equal(activationCalls, 0);

let dryInput: any = null;
const planned = await runBuyVoidProductionPrivateServicesOperatorV1(
  {},
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async (input) => {
      activationCalls += 1;
      dryInput = input;
      return dryRunActivation();
    },
  },
);
const plannedDecision = planned.decision as any;
assert.equal(plannedDecision.ok, true);
assert.equal(plannedDecision.status, "planned");
assert.equal(planned.session, null);
assert.equal(dryInput.policy, productionPolicy);
assert.equal(dryInput.apply, false);
assert.equal(dryInput.confirmation, undefined);
assert.equal(dryInput.expected_plan_id_sha256, undefined);
assert.equal(plannedDecision.production_activation_plan_id_sha256, PLAN_ID);
assert.equal(
  plannedDecision.required_confirmation,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  plannedDecision.required_rpc_readiness_confirmation,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
);
assert.equal(
  plannedDecision.required_custodian_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  plannedDecision.required_broadcaster_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(plannedDecision.rpc_probe_performed, false);
assert.equal(plannedDecision.service_state_mutation_performed, false);
assert.equal(plannedDecision.money_movement_performed, false);

const serializedPlan = JSON.stringify(plannedDecision);
for (const privateValue of [
  PRIVATE_ROOT,
  CUSTODIAN_SOCKET,
  CUSTODY_STORE,
  BROADCASTER_SOCKET,
  BROADCASTER_STATE,
  CREDENTIALS,
  WALLET,
  RPC_URL,
]) {
  assert.equal(serializedPlan.includes(privateValue), false, privateValue);
}

const stopOrder: string[] = [];
let appliedInput: any = null;
const started = await runBuyVoidProductionPrivateServicesOperatorV1(
  {
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: PLAN_ID,
    rpc_readiness_confirmation:
      VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
    custodian_activation_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
    broadcaster_activation_confirmation:
      VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
  },
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async (input) => {
      appliedInput = input;
      return startedActivation({
        broadcaster: {
          stop: async () => { stopOrder.push("broadcaster"); },
        },
        custodian: {
          stop: async () => { stopOrder.push("custodian"); },
        },
      });
    },
  },
);
const startedDecision = started.decision as any;
assert.equal(appliedInput.policy, productionPolicy);
assert.equal(appliedInput.apply, true);
assert.equal(
  appliedInput.confirmation,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(appliedInput.expected_plan_id_sha256, PLAN_ID);
assert.equal(
  appliedInput.rpc_readiness_confirmation,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
);
assert.equal(
  appliedInput.custodian_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  appliedInput.broadcaster_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(startedDecision.ok, true);
assert.equal(startedDecision.status, "started");
assert.ok(started.session);
assert.equal(startedDecision.rpc_probe_performed, true);
assert.equal(startedDecision.service_state_mutation_performed, true);
assert.equal(startedDecision.credential_read_performed, false);
assert.equal(startedDecision.signing_performed, false);
assert.equal(startedDecision.submit_once_performed, false);
assert.equal(startedDecision.transaction_broadcast_performed, false);
assert.equal(startedDecision.money_movement_performed, false);
const serializedStarted = JSON.stringify(startedDecision);
assert.equal(serializedStarted.includes("services"), false);
assert.equal(serializedStarted.includes(CUSTODIAN_SOCKET), false);
assert.equal(serializedStarted.includes(BROADCASTER_SOCKET), false);

const stopped = await started.session!.stop("SIGTERM");
assert.equal(stopped.status, "stopped");
assert.deepEqual(stopOrder, ["broadcaster", "custodian"]);
assert.equal(stopped.broadcaster_stop_succeeded, true);
assert.equal(stopped.custodian_stop_succeeded, true);
assert.equal(stopped.duplicate_shutdown, false);
assert.equal(stopped.money_movement_performed, false);

const duplicateStop = await started.session!.stop("SIGINT");
assert.deepEqual(stopOrder, ["broadcaster", "custodian"]);
assert.equal(duplicateStop.duplicate_shutdown, true);
assert.equal(duplicateStop.shutdown_trigger, "SIGTERM");

const failedStopOrder: string[] = [];
const failedStopRun = await runBuyVoidProductionPrivateServicesOperatorV1(
  { apply: true },
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => startedActivation({
      broadcaster: {
        stop: async () => {
          failedStopOrder.push("broadcaster");
          throw new Error("synthetic broadcaster stop failure");
        },
      },
      custodian: {
        stop: async () => { failedStopOrder.push("custodian"); },
      },
    }),
  },
);
assert.ok(failedStopRun.session);
const failedStop = await failedStopRun.session!.stop("operator");
assert.equal(failedStop.status, "cleanup_failed");
assert.deepEqual(failedStopOrder, ["broadcaster", "custodian"]);
assert.equal(failedStop.broadcaster_stop_succeeded, false);
assert.equal(failedStop.custodian_stop_succeeded, true);

const residual = await runBuyVoidProductionPrivateServicesOperatorV1(
  { apply: true },
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => ({
      ok: false,
      status: "held",
      applied: true,
      marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
      version: 1,
      reason: "production_private_services_activation_broadcaster_failed_custodian_rollback_failed",
      plan_id_sha256: PLAN_ID,
      rpc_probe_performed: true,
      custodian_service_start_performed: true,
      broadcaster_service_start_performed: false,
      custodian_service_active_after_return: true,
      broadcaster_service_active_after_return: false,
      credential_read_performed: false,
      signing_performed: false,
      submit_once_performed: false,
      transaction_broadcast_performed: false,
      money_movement_performed: false,
      authority: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
    } as any),
  },
);
const residualDecision = residual.decision as any;
assert.equal(residualDecision.ok, false);
assert.equal(residualDecision.stage, "activation");
assert.equal(residualDecision.residual_service_state, true);
assert.equal(residualDecision.custodian_service_active_after_return, true);
assert.equal(residual.session, null);

const thrown = await runBuyVoidProductionPrivateServicesOperatorV1(
  { apply: true },
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => {
      throw new Error("synthetic coordinator throw");
    },
  },
);
const thrownDecision = thrown.decision as any;
assert.equal(thrownDecision.ok, false);
assert.equal(
  thrownDecision.reason,
  "production_private_services_operator_activation_threw",
);
assert.equal(thrownDecision.side_effect_state_known, false);
assert.equal(thrownDecision.residual_service_state, true);

const malformed = await runBuyVoidProductionPrivateServicesOperatorV1(
  { apply: true },
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => null as any,
  },
);
assert.equal((malformed.decision as any).side_effect_state_known, false);
assert.equal((malformed.decision as any).residual_service_state, true);

const contradictoryCleanupOrder: string[] = [];
const contradictory = await runBuyVoidProductionPrivateServicesOperatorV1(
  { apply: true },
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => ({
      ...startedActivation({
        broadcaster: {
          stop: async () => { contradictoryCleanupOrder.push("broadcaster"); },
        },
        custodian: {
          stop: async () => { contradictoryCleanupOrder.push("custodian"); },
        },
      }),
      money_movement_performed: true,
    }),
  },
);
const contradictoryDecision = contradictory.decision as any;
assert.equal(contradictoryDecision.ok, false);
assert.equal(
  contradictoryDecision.reason,
  "production_private_services_operator_started_boundary_invalid",
);
assert.equal(contradictoryDecision.money_movement_performed, true);
assert.equal(contradictoryDecision.residual_service_state, false);
assert.equal(contradictory.session, null);
assert.deepEqual(contradictoryCleanupOrder, ["broadcaster", "custodian"]);

const cleanupFailureOrder: string[] = [];
const cleanupFailure = await runBuyVoidProductionPrivateServicesOperatorV1(
  { apply: true },
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => ({
      ...startedActivation({
        broadcaster: {
          stop: async () => {
            cleanupFailureOrder.push("broadcaster");
            throw new Error("synthetic cleanup failure");
          },
        },
        custodian: {
          stop: async () => { cleanupFailureOrder.push("custodian"); },
        },
      }),
      provider_submission_id: "invalid provider id with spaces",
    }),
  },
);
const cleanupFailureDecision = cleanupFailure.decision as any;
assert.equal(cleanupFailureDecision.ok, false);
assert.equal(cleanupFailureDecision.residual_service_state, true);
assert.equal(cleanupFailureDecision.broadcaster_service_active_after_return, true);
assert.equal(cleanupFailureDecision.custodian_service_active_after_return, false);
assert.deepEqual(cleanupFailureOrder, ["broadcaster", "custodian"]);

assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1.daemonize,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1.automatic_restart,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1.service_handles_serialized,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1.transaction_submission_confirmation_accepted,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1.unexpected_started_result_cleanup,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1.unknown_side_effect_state_is_residual,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_AUTHORITY_V1.money_movement_during_startup_or_shutdown,
  false,
);

const operatorSource = fs.readFileSync(
  new URL("../src/economic/buy_void_production_private_services_operator_v1.ts", import.meta.url),
  "utf8",
);
const cliSource = fs.readFileSync(
  new URL("./buy_void_production_private_services_operator_v1.ts", import.meta.url),
  "utf8",
);
assert.match(operatorSource, /resolveBuyVoidProductionPreflightOperatorPolicyV1/);
assert.match(operatorSource, /runBuyVoidProductionPrivateServicesActivationV1/);
assert.doesNotMatch(operatorSource, /process\.env/);
assert.doesNotMatch(
  operatorSource,
  /buyVoidSubmitPreparedTransactionFromOpaqueCustodyV1/,
);
assert.doesNotMatch(operatorSource, /catch\s*\{\s*\}/);
for (const forbiddenFlag of [
  "--runtime-root",
  "--wallet",
  "--rpc-url",
  "--signer-fingerprint",
  "--credentials-directory",
  "--custodian-socket",
  "--broadcaster-socket",
  "--submit",
]) {
  assert.equal(cliSource.includes(forbiddenFlag), false, forbiddenFlag);
}
assert.match(cliSource, /process\.once\("SIGINT"/);
assert.match(cliSource, /process\.once\("SIGTERM"/);
const latchCall = cliSource.indexOf(
  "const signalLatch = args.apply ? createShutdownSignalLatch() : null",
);
const activationCall = cliSource.indexOf(
  "await runBuyVoidProductionPrivateServicesOperatorV1",
);
assert.ok(latchCall >= 0 && activationCall > latchCall);

process.stdout.write(`${JSON.stringify({
  marker: "VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1_PROOF_GREEN",
  canonical_production_policy_reused: true,
  dry_run_io_free_boundary_preserved: true,
  exact_activation_authorities_forwarded: true,
  service_handles_serialized: false,
  foreground_signal_latched_before_activation: true,
  shutdown_order: ["broadcaster", "custodian"],
  duplicate_shutdown_idempotent: true,
  unexpected_started_result_cleanup: true,
  cleanup_failure_explicit: true,
  unknown_side_effect_state_is_residual: true,
  residual_service_state_explicit: true,
  credential_read: false,
  signing: false,
  submit_once: false,
  transaction_broadcast: false,
  money_movement: false,
}, null, 2)}\n`);
