import assert from "node:assert/strict";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
} from "../src/economic/buy_void_prepared_transaction_custodian_credential_activation_v1.js";
import {
  buyVoidPreparedTransactionCredentialSignerFingerprintV1,
} from "../src/economic/buy_void_prepared_transaction_credential_signer_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
  runBuyVoidProductionPrivateServicesActivationV1,
  type BuyVoidProductionPrivateServicesActivationDependenciesV1,
} from "../src/economic/buy_void_production_private_services_activation_v1.js";
import {
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1,
} from "../src/economic/buy_void_production_rpc_readiness_v1.js";

const wallet = new Wallet(`0x${"2".repeat(64)}`).address.toLowerCase();
const signerFingerprint =
  buyVoidPreparedTransactionCredentialSignerFingerprintV1(wallet);

const policy = {
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
} as const;

let readinessCalls = 0;
let custodianStarts = 0;
let broadcasterStarts = 0;
let custodianStops = 0;
let broadcasterStops = 0;

function resetCounters(): void {
  readinessCalls = 0;
  custodianStarts = 0;
  broadcasterStarts = 0;
  custodianStops = 0;
  broadcasterStops = 0;
}

const dry = await runBuyVoidProductionPrivateServicesActivationV1({ policy });
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
if (!dry.ok || dry.status !== "dry_run") {
  throw new Error("production_private_services_dry_run_expected");
}
assert.match(dry.plan_id_sha256, /^[0-9a-f]{64}$/);
assert.equal(dry.required_plan_id_sha256, dry.plan_id_sha256);
assert.equal(
  dry.required_confirmation,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(dry.rpc_probe_performed, false);
assert.equal(dry.custodian_service_start_performed, false);
assert.equal(dry.broadcaster_service_start_performed, false);

function makeDependencies(
  options: Readonly<{
    rpc?: "ready" | "held";
    custodian?: "started" | "held";
    broadcaster?: "started" | "held" | "boundary_invalid";
    custodian_stop_fails?: boolean;
    broadcaster_stop_fails?: boolean;
  }> = {},
): BuyVoidProductionPrivateServicesActivationDependenciesV1 {
  return {
    run_rpc_readiness: (async () => {
      readinessCalls += 1;
      if (options.rpc === "held") {
        return {
          ok: false,
          status: "held",
          applied: true,
          marker: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1,
          version: 1,
          reason: "synthetic_rpc_hold",
          plan_id_sha256: dry.plan_id_sha256,
          rpc_probe_performed: true,
          service_started: false,
          credential_read_performed: false,
          signing_performed: false,
          submit_once_performed: false,
          transaction_broadcast_performed: false,
          money_movement_performed: false,
          authority: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
        };
      }
      return {
        ok: true,
        status: "ready",
        applied: true,
        marker: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_V1,
        version: 1,
        plan_id_sha256: dry.plan_id_sha256,
        chain_id: "2050",
        rpc_url: policy.broadcaster.rpc.rpc_url,
        rpc_url_fingerprint_sha256: dry.rpc_url_fingerprint_sha256,
        provider_submission_id: "synthetic-production-readiness",
        rpc_probe_performed: true,
        rpc_mutation_performed: false,
        service_started: false,
        credential_read_performed: false,
        signing_performed: false,
        submit_once_performed: false,
        transaction_broadcast_performed: false,
        money_movement_performed: false,
        authority: VOID_BUY_VOID_PRODUCTION_RPC_READINESS_AUTHORITY_V1,
      };
    }) as any,
    run_custodian_activation: (async () => {
      custodianStarts += 1;
      if (options.custodian === "held") {
        return {
          ok: false,
          status: "held",
          applied: true,
          reason: "synthetic_custodian_hold",
          service_started: false,
          private_prepare_signing_capability_started: false,
          credential_read_performed: false,
          signing_performed: false,
          rpc_call_performed: false,
          transaction_broadcast_performed: false,
          money_movement_performed: false,
          authority:
            VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
        };
      }
      return {
        ok: true,
        status: "started",
        applied: true,
        service_started: true,
        private_prepare_signing_capability_started: true,
        signer_fingerprint_sha256: dry.expected_signer_fingerprint_sha256,
        credential_read_performed: false,
        signing_performed: false,
        rpc_call_performed: false,
        transaction_broadcast_performed: false,
        money_movement_performed: false,
        service: {
          async stop() {
            custodianStops += 1;
            if (options.custodian_stop_fails) {
              throw new Error("synthetic_custodian_stop_failed");
            }
          },
        },
        authority:
          VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
      };
    }) as any,
    run_broadcaster_activation: (async () => {
      broadcasterStarts += 1;
      if (options.broadcaster === "held") {
        return {
          ok: false,
          status: "held",
          applied: true,
          reason: "synthetic_broadcaster_hold",
          service_started: false,
          submission_enabled: true,
          submit_once_allowed: false,
          transaction_broadcast_performed: false,
          money_movement_performed: false,
          authority:
            VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
        };
      }
      return {
        ok: true,
        status: "started",
        applied: true,
        service_started: true,
        chain_id: "2050",
        rpc_url_fingerprint_sha256:
          options.broadcaster === "boundary_invalid"
            ? "f".repeat(64)
            : dry.rpc_url_fingerprint_sha256,
        submission_enabled: true,
        submit_once_allowed: true,
        inspection_submission_supported: true,
        transaction_broadcast_performed: false,
        money_movement_performed: false,
        service: {
          async stop() {
            broadcasterStops += 1;
            if (options.broadcaster_stop_fails) {
              throw new Error("synthetic_broadcaster_stop_failed");
            }
          },
        },
        authority:
          VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
      };
    }) as any,
  };
}

resetCounters();
const wrongConfirmation = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation: "wrong",
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies(),
);
assert.equal(wrongConfirmation.ok, false);
assert.equal(readinessCalls, 0);
assert.equal(custodianStarts, 0);
assert.equal(broadcasterStarts, 0);

resetCounters();
const paddedConfirmation = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation: `${VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1} `,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies(),
);
assert.equal(paddedConfirmation.ok, false);
assert.equal(readinessCalls, 0);
assert.equal(custodianStarts, 0);
assert.equal(broadcasterStarts, 0);

resetCounters();
const wrongPlan = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: "a".repeat(64),
  },
  makeDependencies(),
);
assert.equal(wrongPlan.ok, false);
assert.equal(readinessCalls, 0);
assert.equal(custodianStarts, 0);
assert.equal(broadcasterStarts, 0);

resetCounters();
const paddedPlan = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: ` ${dry.plan_id_sha256}`,
  },
  makeDependencies(),
);
assert.equal(paddedPlan.ok, false);
assert.equal(readinessCalls, 0);
assert.equal(custodianStarts, 0);
assert.equal(broadcasterStarts, 0);

resetCounters();
const rpcHeld = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies({ rpc: "held" }),
);
assert.equal(rpcHeld.ok, false);
assert.equal(rpcHeld.rpc_probe_performed, true);
assert.equal(readinessCalls, 1);
assert.equal(custodianStarts, 0);
assert.equal(broadcasterStarts, 0);

resetCounters();
const custodianHeld = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies({ custodian: "held" }),
);
assert.equal(custodianHeld.ok, false);
assert.equal(readinessCalls, 1);
assert.equal(custodianStarts, 1);
assert.equal(broadcasterStarts, 0);
assert.equal(custodianStops, 0);

resetCounters();
const broadcasterHeld = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies({ broadcaster: "held" }),
);
assert.equal(broadcasterHeld.ok, false);
assert.equal(readinessCalls, 1);
assert.equal(custodianStarts, 1);
assert.equal(broadcasterStarts, 1);
assert.equal(custodianStops, 1);
assert.equal(broadcasterStops, 0);
assert.equal(broadcasterHeld.custodian_service_start_performed, true);
assert.equal(broadcasterHeld.broadcaster_service_start_performed, false);
assert.equal(broadcasterHeld.custodian_rollback_attempted, true);
assert.equal(broadcasterHeld.custodian_rollback_succeeded, true);
assert.equal(broadcasterHeld.custodian_service_active_after_return, false);
assert.equal(broadcasterHeld.broadcaster_service_active_after_return, false);

resetCounters();
const rollbackFailed = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies({
    broadcaster: "held",
    custodian_stop_fails: true,
  }),
);
assert.equal(rollbackFailed.ok, false);
assert.equal(custodianStops, 1);
assert.equal(rollbackFailed.custodian_rollback_attempted, true);
assert.equal(rollbackFailed.custodian_rollback_succeeded, false);
assert.equal(rollbackFailed.custodian_service_active_after_return, true);
assert.match(rollbackFailed.reason, /custodian_rollback_failed$/);

resetCounters();
const boundaryInvalid = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies({ broadcaster: "boundary_invalid" }),
);
assert.equal(boundaryInvalid.ok, false);
assert.equal(custodianStops, 1);
assert.equal(broadcasterStops, 1);
assert.equal(boundaryInvalid.custodian_rollback_succeeded, true);
assert.equal(boundaryInvalid.broadcaster_rollback_succeeded, true);
assert.equal(boundaryInvalid.custodian_service_active_after_return, false);
assert.equal(boundaryInvalid.broadcaster_service_active_after_return, false);

resetCounters();
const started = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy,
    apply: true,
    confirmation:
      VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
    expected_plan_id_sha256: dry.plan_id_sha256,
  },
  makeDependencies(),
);
assert.equal(started.ok, true);
assert.equal(started.status, "started");
if (!started.ok || started.status !== "started") {
  throw new Error("production_private_services_started_expected");
}
assert.equal(readinessCalls, 1);
assert.equal(custodianStarts, 1);
assert.equal(broadcasterStarts, 1);
assert.equal(custodianStops, 0);
assert.equal(broadcasterStops, 0);
assert.equal(started.plan_id_sha256, dry.plan_id_sha256);
assert.equal(started.rpc_probe_performed, true);
assert.equal(started.custodian_service_start_performed, true);
assert.equal(started.broadcaster_service_start_performed, true);
assert.equal(started.custodian_service_active_after_return, true);
assert.equal(started.broadcaster_service_active_after_return, true);
assert.equal(started.credential_read_performed, false);
assert.equal(started.signing_performed, false);
assert.equal(started.submit_once_performed, false);
assert.equal(started.transaction_broadcast_performed, false);
assert.equal(started.money_movement_performed, false);

assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .read_only_rpc_probe_before_service_start,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .custodian_rollback_on_broadcaster_failure,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .credential_read_during_activation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .signing_during_activation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .transaction_broadcast_during_activation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .money_movement_during_activation,
  false,
);

console.log("VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_V1_PROOF_GREEN");
console.log("dry_run_rpc_probe_calls=0");
console.log("dry_run_service_starts=0");
console.log("wrong_confirmation_service_starts=0");
console.log("padded_confirmation_service_starts=0");
console.log("wrong_plan_id_service_starts=0");
console.log("padded_plan_id_service_starts=0");
console.log("rpc_readiness_required_before_service_start=true");
console.log("custodian_started_before_broadcaster=true");
console.log("broadcaster_failure_custodian_rollback_attempted=true");
console.log("rollback_failure_reported_explicitly=true");
console.log("broadcaster_boundary_invalid_rolls_back_both=true");
console.log("success_readiness_calls=1");
console.log("success_custodian_starts=1");
console.log("success_broadcaster_starts=1");
console.log("credential_read_performed=false");
console.log("signing_performed=false");
console.log("submit_once_performed=false");
console.log("transaction_broadcast_performed=false");
console.log("money_movement_performed=false");
