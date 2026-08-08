import assert from "node:assert/strict";
import { Wallet } from "ethers";

import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_broadcaster_submission_activation_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
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
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
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

const EXPECTED = Object.freeze({
  custodian_socket_path: policy.custodian.socket_path,
  custody_store_dir: policy.custodian.custody_store_dir,
  credentials_directory: policy.custodian.credentials_directory,
  expected_wallet_address: wallet,
  broadcaster_socket_path: policy.broadcaster.socket_path,
  broadcaster_state_dir: policy.broadcaster.state_dir,
  expected_signer_fingerprint_sha256: signerFingerprint,
  rpc_url: policy.broadcaster.rpc.rpc_url,
  expected_chain_id: 2050,
});

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

function assertNoSideEffects(): void {
  assert.equal(readinessCalls, 0);
  assert.equal(custodianStarts, 0);
  assert.equal(broadcasterStarts, 0);
  assert.equal(custodianStops, 0);
  assert.equal(broadcasterStops, 0);
}

function assertBoundPolicy(value: any): void {
  assert.equal(Object.isFrozen(value), true);
  assert.equal(Object.isFrozen(value.custodian), true);
  assert.equal(Object.isFrozen(value.broadcaster), true);
  assert.equal(Object.isFrozen(value.broadcaster.rpc), true);
  assert.equal(value.custodian.socket_path, EXPECTED.custodian_socket_path);
  assert.equal(value.custodian.custody_store_dir, EXPECTED.custody_store_dir);
  assert.equal(
    value.custodian.credentials_directory,
    EXPECTED.credentials_directory,
  );
  assert.equal(
    value.custodian.expected_wallet_address,
    EXPECTED.expected_wallet_address,
  );
  assert.equal(
    value.broadcaster.socket_path,
    EXPECTED.broadcaster_socket_path,
  );
  assert.equal(
    value.broadcaster.custody_store_dir,
    EXPECTED.custody_store_dir,
  );
  assert.equal(
    value.broadcaster.state_dir,
    EXPECTED.broadcaster_state_dir,
  );
  assert.equal(
    value.broadcaster.expected_signer_fingerprint_sha256,
    EXPECTED.expected_signer_fingerprint_sha256,
  );
  assert.equal(value.broadcaster.rpc.rpc_url, EXPECTED.rpc_url);
  assert.equal(
    value.broadcaster.rpc.expected_chain_id,
    EXPECTED.expected_chain_id,
  );
  assert.equal(Object.hasOwn(value.broadcaster.rpc, "request_timeout_ms"), false);
  assert.equal(Object.hasOwn(value.broadcaster.rpc, "max_response_bytes"), false);
}

const dry = await runBuyVoidProductionPrivateServicesActivationV1({ policy });
if (dry.ok === false || dry.status !== "dry_run") {
  throw new Error("production_private_services_dry_run_expected");
}
assert.equal(dry.ok, true);
assert.equal(dry.status, "dry_run");
assert.match(dry.plan_id_sha256, /^[0-9a-f]{64}$/);
assert.equal(dry.required_plan_id_sha256, dry.plan_id_sha256);
assert.equal(
  dry.required_confirmation,
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  dry.required_rpc_readiness_confirmation,
  VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
);
assert.equal(
  dry.required_custodian_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(
  dry.required_broadcaster_activation_confirmation,
  VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
);
assert.equal(dry.rpc_probe_performed, false);
assert.equal(dry.custodian_service_start_performed, false);
assert.equal(dry.broadcaster_service_start_performed, false);

const authorizedInput = Object.freeze({
  policy,
  apply: true,
  confirmation:
    VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1,
  expected_plan_id_sha256: dry.plan_id_sha256,
  rpc_readiness_confirmation: dry.required_rpc_readiness_confirmation,
  custodian_activation_confirmation:
    dry.required_custodian_activation_confirmation,
  broadcaster_activation_confirmation:
    dry.required_broadcaster_activation_confirmation,
});

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
    run_rpc_readiness: (async (input: any) => {
      readinessCalls += 1;
      assertBoundPolicy(input.policy);
      assert.equal(
        input.confirmation,
        VOID_BUY_VOID_PRODUCTION_RPC_READINESS_CONFIRMATION_V1,
      );
      assert.equal(input.expected_plan_id_sha256, dry.plan_id_sha256);
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
        rpc_url: EXPECTED.rpc_url,
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
    run_custodian_activation: (async (input: any) => {
      custodianStarts += 1;
      assert.notEqual(input.policy, policy.custodian);
      assert.equal(Object.isFrozen(input.policy), true);
      assert.equal(input.policy.socket_path, EXPECTED.custodian_socket_path);
      assert.equal(input.policy.custody_store_dir, EXPECTED.custody_store_dir);
      assert.equal(
        input.policy.credentials_directory,
        EXPECTED.credentials_directory,
      );
      assert.equal(
        input.policy.expected_wallet_address,
        EXPECTED.expected_wallet_address,
      );
      assert.equal(
        input.confirmation,
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_CREDENTIAL_ACTIVATION_CONFIRMATION_V1,
      );
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
    run_broadcaster_activation: (async (input: any) => {
      broadcasterStarts += 1;
      assert.notEqual(input.policy, policy.broadcaster);
      assert.equal(Object.isFrozen(input.policy), true);
      assert.equal(Object.isFrozen(input.policy.rpc), true);
      assert.equal(input.policy.socket_path, EXPECTED.broadcaster_socket_path);
      assert.equal(input.policy.custody_store_dir, EXPECTED.custody_store_dir);
      assert.equal(input.policy.state_dir, EXPECTED.broadcaster_state_dir);
      assert.equal(
        input.policy.expected_signer_fingerprint_sha256,
        EXPECTED.expected_signer_fingerprint_sha256,
      );
      assert.equal(input.policy.rpc.rpc_url, EXPECTED.rpc_url);
      assert.equal(
        input.policy.rpc.expected_chain_id,
        EXPECTED.expected_chain_id,
      );
      assert.equal(Object.hasOwn(input.policy.rpc, "request_timeout_ms"), false);
      assert.equal(Object.hasOwn(input.policy.rpc, "max_response_bytes"), false);
      assert.equal(
        input.confirmation,
        VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SUBMISSION_ACTIVATION_CONFIRMATION_V1,
      );
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
  { ...authorizedInput, confirmation: "wrong" },
  makeDependencies(),
);
assert.equal(wrongConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const paddedConfirmation = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    ...authorizedInput,
    confirmation: `${VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_CONFIRMATION_V1} `,
  },
  makeDependencies(),
);
assert.equal(paddedConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const wrongPlan = await runBuyVoidProductionPrivateServicesActivationV1(
  { ...authorizedInput, expected_plan_id_sha256: "a".repeat(64) },
  makeDependencies(),
);
assert.equal(wrongPlan.ok, false);
assertNoSideEffects();

resetCounters();
const paddedPlan = await runBuyVoidProductionPrivateServicesActivationV1(
  { ...authorizedInput, expected_plan_id_sha256: ` ${dry.plan_id_sha256}` },
  makeDependencies(),
);
assert.equal(paddedPlan.ok, false);
assertNoSideEffects();

resetCounters();
const wrongRpcConfirmation =
  await runBuyVoidProductionPrivateServicesActivationV1(
    { ...authorizedInput, rpc_readiness_confirmation: "wrong" },
    makeDependencies(),
  );
assert.equal(wrongRpcConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const paddedRpcConfirmation =
  await runBuyVoidProductionPrivateServicesActivationV1(
    {
      ...authorizedInput,
      rpc_readiness_confirmation: `${dry.required_rpc_readiness_confirmation} `,
    },
    makeDependencies(),
  );
assert.equal(paddedRpcConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const wrongCustodianConfirmation =
  await runBuyVoidProductionPrivateServicesActivationV1(
    { ...authorizedInput, custodian_activation_confirmation: "wrong" },
    makeDependencies(),
  );
assert.equal(wrongCustodianConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const paddedCustodianConfirmation =
  await runBuyVoidProductionPrivateServicesActivationV1(
    {
      ...authorizedInput,
      custodian_activation_confirmation:
        `${dry.required_custodian_activation_confirmation} `,
    },
    makeDependencies(),
  );
assert.equal(paddedCustodianConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const wrongBroadcasterConfirmation =
  await runBuyVoidProductionPrivateServicesActivationV1(
    { ...authorizedInput, broadcaster_activation_confirmation: "wrong" },
    makeDependencies(),
  );
assert.equal(wrongBroadcasterConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const paddedBroadcasterConfirmation =
  await runBuyVoidProductionPrivateServicesActivationV1(
    {
      ...authorizedInput,
      broadcaster_activation_confirmation:
        `${dry.required_broadcaster_activation_confirmation} `,
    },
    makeDependencies(),
  );
assert.equal(paddedBroadcasterConfirmation.ok, false);
assertNoSideEffects();

resetCounters();
const mutablePolicy: any = {
  custodian: { ...policy.custodian },
  broadcaster: {
    ...policy.broadcaster,
    rpc: { ...policy.broadcaster.rpc },
  },
};
const mutableDry = await runBuyVoidProductionPrivateServicesActivationV1({
  policy: mutablePolicy,
});
if (mutableDry.ok === false || mutableDry.status !== "dry_run") {
  throw new Error("mutable_policy_dry_run_expected");
}
assert.equal(mutableDry.ok, true);
assert.equal(mutableDry.status, "dry_run");
assert.equal(mutableDry.plan_id_sha256, dry.plan_id_sha256);

const mutationDependencies = makeDependencies();
const baseMutationReadiness = mutationDependencies.run_rpc_readiness;
mutationDependencies.run_rpc_readiness = (async (input: any, deps: any) => {
  mutablePolicy.custodian.socket_path = "/tmp/attacker-custodian.sock";
  mutablePolicy.custodian.custody_store_dir = "/tmp/attacker-custody";
  mutablePolicy.custodian.credentials_directory = "/tmp/attacker-creds";
  mutablePolicy.custodian.expected_wallet_address =
    new Wallet(`0x${"3".repeat(64)}`).address.toLowerCase();
  mutablePolicy.broadcaster.socket_path = "/tmp/attacker-broadcaster.sock";
  mutablePolicy.broadcaster.custody_store_dir = "/tmp/attacker-custody";
  mutablePolicy.broadcaster.state_dir = "/tmp/attacker-state";
  mutablePolicy.broadcaster.expected_signer_fingerprint_sha256 = "f".repeat(64);
  mutablePolicy.broadcaster.rpc.rpc_url = "http://127.0.0.1:9999/";
  mutablePolicy.broadcaster.rpc.expected_chain_id = 1;
  mutablePolicy.broadcaster.rpc.request_timeout_ms = 30_000;
  mutablePolicy.broadcaster.rpc.max_response_bytes = 1_048_576;
  return (baseMutationReadiness as any)(input, deps);
}) as any;

const mutationResult = await runBuyVoidProductionPrivateServicesActivationV1(
  {
    policy: mutablePolicy,
    apply: true,
    confirmation: mutableDry.required_confirmation,
    expected_plan_id_sha256: mutableDry.plan_id_sha256,
    rpc_readiness_confirmation: mutableDry.required_rpc_readiness_confirmation,
    custodian_activation_confirmation:
      mutableDry.required_custodian_activation_confirmation,
    broadcaster_activation_confirmation:
      mutableDry.required_broadcaster_activation_confirmation,
  },
  mutationDependencies,
);
assert.equal(mutationResult.ok, true);
assert.equal(mutationResult.status, "started");
assert.equal(readinessCalls, 1);
assert.equal(custodianStarts, 1);
assert.equal(broadcasterStarts, 1);
assert.equal(custodianStops, 0);
assert.equal(broadcasterStops, 0);

resetCounters();
const rpcHeld = await runBuyVoidProductionPrivateServicesActivationV1(
  authorizedInput,
  makeDependencies({ rpc: "held" }),
);
assert.equal(rpcHeld.ok, false);
assert.equal(rpcHeld.rpc_probe_performed, true);
assert.equal(readinessCalls, 1);
assert.equal(custodianStarts, 0);
assert.equal(broadcasterStarts, 0);

resetCounters();
const custodianHeld = await runBuyVoidProductionPrivateServicesActivationV1(
  authorizedInput,
  makeDependencies({ custodian: "held" }),
);
assert.equal(custodianHeld.ok, false);
assert.equal(readinessCalls, 1);
assert.equal(custodianStarts, 1);
assert.equal(broadcasterStarts, 0);
assert.equal(custodianStops, 0);

resetCounters();
const broadcasterHeld = await runBuyVoidProductionPrivateServicesActivationV1(
  authorizedInput,
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
  authorizedInput,
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
  authorizedInput,
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
  authorizedInput,
  makeDependencies(),
);
if (started.ok === false || started.status !== "started") {
  throw new Error("production_private_services_started_expected");
}
assert.equal(started.ok, true);
assert.equal(started.status, "started");
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
    .coordinator_confirmation_does_not_substitute_component_authority,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .all_component_confirmations_checked_before_side_effects,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .plan_derived_policy_snapshot_required,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .plan_derived_policy_snapshot_revalidated,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .caller_policy_reused_after_plan_derivation,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_ACTIVATION_AUTHORITY_V1
    .unbound_rpc_transport_overrides_applied,
  false,
);
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
console.log("separate_rpc_readiness_confirmation_required=true");
console.log("separate_custodian_activation_confirmation_required=true");
console.log("separate_broadcaster_activation_confirmation_required=true");
console.log("component_confirmation_failures_before_side_effects=true");
console.log("plan_derived_policy_snapshot_required=true");
console.log("plan_derived_policy_snapshot_frozen=true");
console.log("caller_policy_mutation_after_plan_derivation_escaped=false");
console.log("unbound_rpc_transport_overrides_applied=false");
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