import assert from "node:assert/strict";

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
  runBuyVoidProductionPrivateServicesOperatorV1,
} from "../src/economic/buy_void_production_private_services_operator_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
} from "../src/economic/buy_void_production_rpc_readiness_v1.js";

const PLAN_ID = "1".repeat(64);
const RUNTIME_POLICY_FP = "2".repeat(64);
const RPC_FP = "3".repeat(64);
const PRIVATE_PATH_FP = "4".repeat(64);
const SIGNER_FP = "5".repeat(64);
const WALLET = "0x" + "a".repeat(40);

const productionPolicy = Object.freeze({
  custodian: Object.freeze({
    socket_path: "/srv/void/private/run/buy-void/custodian.sock",
    custody_store_dir: "/srv/void/private/state/buy-void/custody",
    credentials_directory: "/run/credentials/void-buy-void.service",
    expected_wallet_address: WALLET,
  }),
  broadcaster: Object.freeze({
    socket_path: "/srv/void/private/run/buy-void/broadcaster.sock",
    custody_store_dir: "/srv/void/private/state/buy-void/custody",
    state_dir: "/srv/void/private/state/buy-void/broadcaster",
    expected_signer_fingerprint_sha256: SIGNER_FP,
    rpc: Object.freeze({
      rpc_url: "http://127.0.0.1:8545",
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
      root_dir: "/srv/void/private/data_a/buy_void_v1/runtime-integration-v1",
    },
    production_activation_plan_id_sha256: PLAN_ID,
    runtime_policy_fingerprint_sha256: RUNTIME_POLICY_FP,
    rpc_url_fingerprint_sha256: RPC_FP,
    private_path_fingerprint_sha256: PRIVATE_PATH_FP,
    authority: {},
  };
}

function malformedSuccessfulActivation(services: {
  custodian: { stop: () => Promise<void> };
  broadcaster: { stop: () => Promise<void> };
}): any {
  return {
    ok: true,
    status: "unexpected_status",
    applied: true,
    marker: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1,
    version: 1,
    plan_id_sha256: PLAN_ID,
    rpc_url_fingerprint_sha256: RPC_FP,
    expected_signer_fingerprint_sha256: SIGNER_FP,
    provider_submission_id: "rpc@127.0.0.1:8545/request-1",
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

const applyInput = {
  apply: true,
  confirmation: VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
  expected_plan_id_sha256: PLAN_ID,
  rpc_readiness_confirmation: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
  custodian_activation_confirmation:
    VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
  broadcaster_activation_confirmation:
    VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
} as const;

const cleanStopOrder: string[] = [];
const cleaned = await runBuyVoidProductionPrivateServicesOperatorV1(
  applyInput,
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => malformedSuccessfulActivation({
      broadcaster: {
        stop: async () => {
          cleanStopOrder.push("broadcaster");
        },
      },
      custodian: {
        stop: async () => {
          cleanStopOrder.push("custodian");
        },
      },
    }),
  },
);

assert.deepEqual(cleanStopOrder, ["broadcaster", "custodian"]);
assert.equal(cleaned.session, null);
assert.equal(cleaned.decision.ok, false);
assert.equal(cleaned.decision.status, "held");
assert.equal(cleaned.decision.reason, "production_private_services_operator_started_boundary_invalid");
assert.equal(cleaned.decision.custodian_service_active_after_return, false);
assert.equal(cleaned.decision.broadcaster_service_active_after_return, false);
assert.equal(cleaned.decision.residual_service_state, false);
assert.equal(cleaned.decision.side_effect_state_known, true);
assert.equal(cleaned.decision.transaction_broadcast_performed, false);
assert.equal(cleaned.decision.money_movement_performed, false);

const failedStopOrder: string[] = [];
const residual = await runBuyVoidProductionPrivateServicesOperatorV1(
  applyInput,
  {
    resolve_policy: () => readyPolicy(),
    run_activation: async () => malformedSuccessfulActivation({
      broadcaster: {
        stop: async () => {
          failedStopOrder.push("broadcaster");
          throw new Error("synthetic_broadcaster_stop_failure");
        },
      },
      custodian: {
        stop: async () => {
          failedStopOrder.push("custodian");
        },
      },
    }),
  },
);

assert.deepEqual(failedStopOrder, ["broadcaster", "custodian"]);
assert.equal(residual.session, null);
assert.equal(residual.decision.ok, false);
assert.equal(residual.decision.status, "held");
assert.equal(residual.decision.broadcaster_service_active_after_return, true);
assert.equal(residual.decision.custodian_service_active_after_return, false);
assert.equal(residual.decision.residual_service_state, true);
assert.equal(residual.decision.transaction_broadcast_performed, false);
assert.equal(residual.decision.money_movement_performed, false);

process.stdout.write(`${JSON.stringify({
  marker: "VOID_BUY_VOID_PRIVATE_SERVICES_MALFORMED_SUCCESS_CLEANUP_V1_PROOF_GREEN",
  malformed_success_live_handles_cleaned: true,
  shutdown_order_broadcaster_before_custodian: true,
  cleanup_failure_remains_residual: true,
  transaction_broadcast: false,
  money_movement: false,
}, null, 2)}\n`);
