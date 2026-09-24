#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Interface } from "ethers";

import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1,
  createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1,
} from "../src/economic/buy_void_payment_keyed_runtime_dependency_bootstrap_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1,
  handleBuyVoidPaymentKeyedFullRuntimeCommandV1,
  runBuyVoidPaymentKeyedFullRuntimeV1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";

const ATTEMPT_ID = "1".repeat(64);
const SAGA_ID = "voidbvfsg1_" + "2".repeat(64);
const WALLET = String(
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
    .derived_wallet_address,
).toLowerCase();
const CONTRACT = "0x3333333333333333333333333333333333333333";
const TOKEN = "0x4444444444444444444444444444444444444444";
const DELIVERY = "0x5555555555555555555555555555555555555555";
const RUNTIME_FP = "6".repeat(64);
const PREPARATION_FP = "7".repeat(64);
const RECEIPT_FP = "8".repeat(64);
const FULL_FP = "9".repeat(64);
const POLICY_FP = "a".repeat(64);
const REQUEST_ID = "runtime-proof-request";
const INSTRUCTION_ID = "runtime-proof-instruction";
const PAYMENT_ID = "voidpay1:base:0x" + "b".repeat(64) + ":7";
const REQUEST_KEY = "c".repeat(64);
const PAYMENT_KEY = "d".repeat(64);

const FULFILL = new Interface([
  "function fulfill(bytes32 paymentDeliveryId,address recipient,uint256 amountAtoms)",
]);

const tmp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-pk-full-runtime-"),
);

{
  const dependencyRoot = path.join(tmp, "dependency-root");
  const missingCredentialDir = path.join(tmp, "missing-credentials");
  const decision =
    createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1({
      enabled: true,
      credential_binding_evidence_id:
        VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
      credentials_directory: missingCredentialDir,
      fulfillment_wallet_address: WALLET,
      fulfillment_contract_address: CONTRACT,
      max_token_amount_atoms: "10000000000000000000000000",
      submission_guard_root_dir: dependencyRoot,
      rpc_url: "http://127.0.0.1:18545/",
      request_timeout_ms: 5000,
      max_response_bytes: 65536,
    });
  if (decision.ok === false) throw new Error(decision.reason);
  assert.equal(
    decision.marker,
    VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_V1,
  );
  assert.equal(decision.credential_read_performed, false);
  assert.equal(decision.rpc_call_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.submission_guard_write_performed, false);
  assert.equal(
    await decision.dependencies.signer.get_address(),
    WALLET,
  );

  const invalidUnsigned: any = {
    type: 2,
    chainId: 2050n,
    nonce: 1,
    gasLimit: 120000n,
    maxFeePerGas: 2000000000n,
    maxPriorityFeePerGas: 1000000000n,
    to: TOKEN,
    value: 0n,
    data: "0x",
  };
  await assert.rejects(
    () =>
      decision.dependencies.signer.sign_transaction(
        invalidUnsigned,
      ),
    /payment_keyed_runtime_dependency_unsigned_transaction_invalid/,
  );

  const validUnsigned: any = {
    ...invalidUnsigned,
    to: CONTRACT,
    data: FULFILL.encodeFunctionData("fulfill", [
      "0x" + "e".repeat(64),
      DELIVERY,
      2_000_000_000_000_000_000n,
    ]),
  };
  await assert.rejects(
    () =>
      decision.dependencies.signer.sign_transaction(
        validUnsigned,
      ),
    /payment_keyed_runtime_credential_signer_not_ready:credential_missing_or_unreadable/,
  );
}

const serverPolicy: any = {
  preparation_policy: {
    enabled: true,
    chain_id: "2050",
    rpc_url: "http://127.0.0.1:18545/",
    fulfillment_wallet_address: WALLET,
    fulfillment_contract_address: CONTRACT,
    max_void_amount_units: "10000000000000",
    gas_limit_multiplier_bps: "12000",
    max_gas_limit: "300000",
    fee_multiplier_bps: "20000",
    max_fee_per_gas_wei: "5000000000",
    max_priority_fee_per_gas_wei: "1000000000",
    request_timeout_ms: 5000,
    max_response_bytes: 65536,
  },
  fulfillment_contract_address: CONTRACT,
  max_void_amount_units: "10000000000000",
  saga_policy: {
    saga_policy_id: "runtime-proof-policy",
    fingerprints: {
      combined_policy_sha256: POLICY_FP,
    },
    inventory_policy: {
      pool_id: "buy-void-presale-v1",
      max_reservation_void_units: "10000000000000",
    },
    execution_policy: {
      chain_id: 2050,
      max_attempts_per_payment: 1,
      fulfillment_wallet_allowlist: [WALLET],
    },
  },
};

const receiptPolicy: any = {
  enabled: true,
  chain_id: "2050",
  rpc_url: "http://127.0.0.1:18545/",
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  void_token_address: TOKEN,
  min_confirmations: "3",
  request_timeout_ms: 5000,
  max_response_bytes: 65536,
};

const configuredPolicy: any = {
  configured: true,
  root_dir: path.join(tmp, "runtime-root"),
  server_policy: serverPolicy,
  receipt_policy: receiptPolicy,
  full_runtime_policy_fingerprint_sha256: FULL_FP,
  runtime_policy_fingerprint_sha256: RUNTIME_FP,
  preparation_policy_fingerprint_sha256: PREPARATION_FP,
  receipt_policy_fingerprint_sha256: RECEIPT_FP,
  rpc_url_fingerprint_sha256: "f".repeat(64),
  fulfillment_wallet_address: WALLET,
  fulfillment_contract_address: CONTRACT,
  void_token_address: TOKEN,
  max_token_amount_atoms: "10000000000000000000000000",
  history_carrier_authority_root:
    path.join(tmp, "carrier-authority"),
  history_carrier_authority_root_realpath_sha256:
    "1".repeat(64),
  history_carrier_authority_id:
    "2".repeat(64),
  history_carrier_generation: 1,
  history_carrier_root_sha256:
    "3".repeat(64),
  history_carrier_index_root_sha256:
    "4".repeat(64),
  history_carrier_generation_record_id:
    "5".repeat(64),
  history_carrier_activation_ready: true,
  history_carrier_activation_hold_reason: "",
};

const intent: any = {
  claim: {
    request_id: REQUEST_ID,
    canonical_payment_identity: PAYMENT_ID,
    instruction_id: INSTRUCTION_ID,
    unsigned_instruction: {
      delivery_address: DELIVERY,
      void_amount_units: "2000000",
    },
  },
  request_key_sha256: REQUEST_KEY,
  payment_key_sha256: PAYMENT_KEY,
};

function attempt(status: string): any {
  const prepared =
    status === "reserved"
      ? null
      : {
          void_delivery_tx_hash: "0x" + "1".repeat(64),
        };
  return {
    reservation: {
      attempt_id: ATTEMPT_ID,
      request_id: REQUEST_ID,
      canonical_payment_identity: PAYMENT_ID,
      instruction_id: INSTRUCTION_ID,
      request_key_sha256: REQUEST_KEY,
      payment_key_sha256: PAYMENT_KEY,
    },
    prepared,
    broadcast:
      ["broadcast", "confirmed", "failed_retryable"].includes(status)
        ? { void_delivery_tx_hash: "0x" + "1".repeat(64) }
        : null,
    failure: null,
    postbroadcast_failure:
      status === "failed_retryable"
        ? { failure_code: "delivery_transaction_reverted" }
        : null,
    confirmation:
      status === "confirmed"
        ? { void_delivery_tx_hash: "0x" + "1".repeat(64) }
        : null,
    status,
  };
}

type Scenario = {
  attempt_status: string;
  saga_state?: string;
};

function fixture(scenario: Scenario) {
  let sagaState = scenario.saga_state || "";
  const calls = {
    bootstrap: 0,
    preparation: [] as any[],
    guarded: [] as any[],
    broadcast_reconciliation: [] as any[],
    receipt_reconciliation: [] as any[],
    terminal_closeout: [] as any[],
  };

  const saga = {
    ADVANCE_CONFIRMATION:
      "buyVoidAdvanceCrashConsistentFulfillmentSagaV1",
    ACTION_CONFIRMATIONS: {
      prepare_transaction:
        "buyVoidSagaPrepareTransactionV1",
      execute_prepared_transaction:
        "buyVoidSagaExecutePreparedTransactionV1",
      reconcile_possible_broadcast:
        "buyVoidSagaReconcilePossibleBroadcastV1",
      closeout_confirmed_delivery:
        "buyVoidSagaCloseoutConfirmedDeliveryV1",
    },
    validateSagaBindingV1(value: any) {
      return value;
    },
    computeSagaIdV1() {
      return SAGA_ID;
    },
    createFilesystemSagaStoreV1() {
      return {
        recover() {
          return {
            saga_id: SAGA_ID,
            state: {
              state: sagaState,
            },
          };
        },
      };
    },
  };

  const dependencies: any = {
    signer: {
      async get_address() {
        return WALLET;
      },
      async sign_transaction() {
        return "0x";
      },
    },
    submission_guard: {
      async claim_submission_once() {
        return { claimed: true };
      },
      async release_submission_claim() {
        return { released: true };
      },
    },
    broadcaster: {
      async broadcast_signed_transaction() {
        return {
          accepted: true,
          transaction_hash: "0x" + "1".repeat(64),
          provider_submission_id: "runtime-proof-provider",
          submission_may_have_occurred: true,
        };
      },
    },
  };

  const options: any = {
    env: {
      [VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled]:
        "1",
      [VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.credentials_directory]:
        "/run/credentials/void-node",
      [VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1
        .credential_binding_evidence_id]:
        VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
    },
    policy_state: () => configuredPolicy,
    read_attempt: () => attempt(scenario.attempt_status),
    list_intents: () => [intent],
    load_saga_module: async () => saga,
    dependency_bootstrap: () => {
      calls.bootstrap += 1;
      return {
        ok: true,
        status: "ready",
        dependencies,
      };
    },
    run_preparation: async (input: any) => {
      calls.preparation.push(input);
      if (input.apply !== true) {
        return {
          ok: true,
          status: "dry_run",
          required_confirmation:
            "buyVoidAdvancePaymentKeyedPreparationV1",
          required_runtime_policy_fingerprint_sha256:
            RUNTIME_FP,
          required_preparation_policy_fingerprint_sha256:
            PREPARATION_FP,
          required_saga_confirmation:
            saga.ADVANCE_CONFIRMATION,
          required_saga_action_confirmation:
            saga.ACTION_CONFIRMATIONS.prepare_transaction,
          required_custody_confirmation:
            "buyVoidPersistPaymentKeyedPreparationCustodyV1",
          required_pipeline_confirmation:
            "buyVoidPrepareExecution",
          signer_access_performed: false,
          signing_performed: false,
          transaction_broadcast_performed: false,
        };
      }
      assert.equal(
        input.runtime_policy_fingerprint_sha256,
        RUNTIME_FP,
      );
      assert.equal(
        input.preparation_policy_fingerprint_sha256,
        PREPARATION_FP,
      );
      return {
        ok: true,
        status: "prepared",
        applied: true,
        mutation_performed: true,
      };
    },
    run_guarded_broadcast: async (input: any) => {
      calls.guarded.push(input);
      if (input.apply !== true) {
        return {
          ok: true,
          status: "dry_run",
          required_confirmation:
            "buyVoidAdvancePaymentKeyedGuardedBroadcastV1",
          required_runtime_policy_fingerprint_sha256:
            RUNTIME_FP,
          required_preparation_policy_fingerprint_sha256:
            PREPARATION_FP,
          required_saga_confirmation:
            saga.ADVANCE_CONFIRMATION,
          required_saga_action_confirmation:
            saga.ACTION_CONFIRMATIONS.execute_prepared_transaction,
          required_signer_confirmation:
            "buyVoidSignPaymentKeyedCustodianTransactionV1",
          required_broadcast_confirmation:
            "buyVoidBroadcastPaymentKeyedCustodianTransactionV1",
          next_action: "execute_prepared_transaction",
        };
      }
      return {
        ok: true,
        status: "broadcast_accepted",
        applied: true,
        transaction_broadcast_accepted: true,
      };
    },
    run_broadcast_reconciliation: async (input: any) => {
      calls.broadcast_reconciliation.push(input);
      if (input.apply !== true) {
        return {
          ok: true,
          status: "dry_run",
          saga_id: SAGA_ID,
          saga_state: sagaState,
          required_confirmation:
            "buyVoidReconcilePaymentKeyedBroadcastV1",
          required_runtime_policy_fingerprint_sha256:
            RUNTIME_FP,
          required_preparation_policy_fingerprint_sha256:
            PREPARATION_FP,
          required_saga_confirmation:
            saga.ADVANCE_CONFIRMATION,
          required_saga_action_confirmation:
            saga.ACTION_CONFIRMATIONS.reconcile_possible_broadcast,
        };
      }
      return {
        ok: true,
        status: "accepted",
        applied: true,
      };
    },
    run_receipt_reconciliation: async (input: any) => {
      calls.receipt_reconciliation.push(input);
      if (input.apply !== true) {
        return {
          ok: true,
          status: "dry_run",
          saga_id: SAGA_ID,
          saga_state: sagaState,
          required_confirmation:
            "buyVoidReconcilePaymentKeyedReceiptV1",
          required_runtime_policy_fingerprint_sha256:
            RUNTIME_FP,
          required_preparation_policy_fingerprint_sha256:
            PREPARATION_FP,
          required_receipt_policy_fingerprint_sha256:
            RECEIPT_FP,
          required_saga_confirmation:
            saga.ADVANCE_CONFIRMATION,
          required_saga_action_confirmation:
            saga.ACTION_CONFIRMATIONS.reconcile_possible_broadcast,
        };
      }
      return {
        ok: true,
        status: "confirmed",
        applied: true,
        ready_for_terminal_closeout: true,
      };
    },
    run_terminal_closeout: async (input: any) => {
      calls.terminal_closeout.push(input);
      if (input.apply !== true) {
        return {
          ok: true,
          status: "dry_run",
          applied: false,
          required_confirmation:
            "buyVoidClosePaymentKeyedFulfillmentV1",
          required_receipt_policy_fingerprint_sha256:
            RECEIPT_FP,
          required_terminal_plan_fingerprint_sha256:
            "0".repeat(64),
        };
      }
      return {
        ok: true,
        status: "closed",
        applied: true,
        public_request_fulfilled: true,
        inventory_consumption_performed: true,
      };
    },
  };

  return {
    calls,
    options,
    setSagaState(value: string) {
      sagaState = value;
    },
  };
}

async function runScenario(
  scenario: Scenario,
  apply: boolean,
  confirmation:
    | string
    | undefined = apply
      ? VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1
      : undefined,
) {
  const f = fixture(scenario);
  const result =
    await runBuyVoidPaymentKeyedFullRuntimeV1(
      {
        attempt_id: ATTEMPT_ID,
        apply,
        confirmation,
      },
      f.options,
    );
  return { f, result };
}

{
  const { f, result } = await runScenario(
    { attempt_status: "reserved" },
    false,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "preparation");
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.preparation.length, 1);
  assert.equal(f.calls.preparation[0].apply, false);
}

{
  const f = fixture({ attempt_status: "reserved" });
  const result =
    await runBuyVoidPaymentKeyedFullRuntimeV1(
      {
        attempt_id: ATTEMPT_ID,
        apply: true,
        confirmation: "wrong",
      },
      f.options,
    );
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "payment_keyed_full_runtime_explicit_confirmation_required",
  );
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.preparation.length, 0);
}

{
  const f = fixture({ attempt_status: "reserved" });
  f.options.env = {
    ...f.options.env,
    [VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled]:
      "0",
  };
  const result =
    await runBuyVoidPaymentKeyedFullRuntimeV1(
      {
        attempt_id: ATTEMPT_ID,
        apply: true,
        confirmation:
          VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_CONFIRMATION_V1,
      },
      f.options,
    );
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "payment_keyed_full_runtime_apply_disabled",
  );
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.preparation.length, 0);
}

{
  const { f, result } = await runScenario(
    { attempt_status: "reserved" },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "preparation");
  assert.equal(f.calls.bootstrap, 1);
  assert.equal(f.calls.preparation.length, 2);
  assert.equal(f.calls.preparation[1].apply, true);
  assert.ok(f.calls.preparation[1].dependencies?.signer);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "prepared",
      saga_state: "attempt_reserved",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "preparation_recovery");
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.preparation.length, 1);
  assert.equal(f.calls.preparation[0].apply, true);
  assert.equal(f.calls.preparation[0].dependencies, undefined);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "prepared",
      saga_state: "transaction_prepared",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "guarded_broadcast");
  assert.equal(f.calls.bootstrap, 1);
  assert.equal(f.calls.guarded.length, 2);
  assert.equal(f.calls.guarded[1].apply, true);
  assert.ok(f.calls.guarded[1].dependencies?.submission_guard);
  assert.ok(f.calls.guarded[1].dependencies?.broadcaster);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "prepared",
      saga_state: "broadcast_intent_committed",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "broadcast_reconciliation");
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.broadcast_reconciliation.length, 2);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "prepared",
      saga_state: "broadcast_accepted",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "broadcast_reconciliation");
  assert.equal(f.calls.bootstrap, 0);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "broadcast",
      saga_state: "broadcast_accepted",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "receipt_reconciliation");
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.receipt_reconciliation.length, 2);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "confirmed",
      saga_state: "receipt_confirmed",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "terminal_closeout");
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.terminal_closeout.length, 2);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "failed_retryable",
      saga_state: "receipt_reverted",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "terminal_reverted");
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.receipt_reconciliation.length, 0);
  assert.equal(f.calls.terminal_closeout.length, 0);
}

{
  const { f, result } = await runScenario(
    {
      attempt_status: "confirmed",
      saga_state: "closed",
    },
    true,
  );
  assert.equal(result.ok, true);
  assert.equal(result.stage, "complete");
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.terminal_closeout.length, 0);
}

{
  const f = fixture({ attempt_status: "reserved" });
  f.options.policy_state = () => ({
    ...configuredPolicy,
    history_carrier_activation_ready: false,
    history_carrier_activation_hold_reason:
      "history_carrier_activation_not_ready_fixture",
  });
  const result =
    await runBuyVoidPaymentKeyedFullRuntimeV1(
      {
        attempt_id: ATTEMPT_ID,
        apply: false,
      },
      f.options,
    );
  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "payment_keyed_full_runtime_history_carrier_not_activation_ready",
  );
  assert.equal(result.mutation_performed, false);
  assert.equal(result.signing_performed, false);
  assert.equal(result.transaction_broadcast_performed, false);
  assert.equal(result.inventory_mutation_performed, false);
  assert.equal(result.public_fulfilled_closeout_performed, false);
  assert.equal(result.automatic_retry_allowed, false);
  assert.equal(result.money_movement_performed, false);
  assert.equal(f.calls.bootstrap, 0);
  assert.equal(f.calls.preparation.length, 0);
  assert.equal(f.calls.guarded.length, 0);
  assert.equal(f.calls.broadcast_reconciliation.length, 0);
  assert.equal(f.calls.receipt_reconciliation.length, 0);
  assert.equal(f.calls.terminal_closeout.length, 0);
}

function responseBox() {
  const box: any = {
    code: 0,
    body: null,
    headersSent: false,
  };
  return {
    box,
    res: {
      status(code: number) {
        box.code = code;
        return this;
      },
      json(value: any) {
        box.body = value;
        return value;
      },
      setHeader() {},
      get headersSent() {
        return box.headersSent;
      },
    },
  };
}

{
  const f = fixture({ attempt_status: "reserved" });
  f.options.env = {
    ...f.options.env,
    [VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled]:
      "0",
  };
  const { box, res } = responseBox();
  await handleBuyVoidPaymentKeyedFullRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body: { attempt_id: ATTEMPT_ID },
    },
    res,
    f.options,
  );
  assert.equal(box.code, 503);
  assert.equal(
    box.body.error,
    "payment_keyed_full_runtime_disabled",
  );
  assert.equal(f.calls.preparation.length, 0);
}

{
  const f = fixture({ attempt_status: "reserved" });
  f.options.env = {
    ...f.options.env,
    [VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.enabled]:
      "1",
  };
  const { box, res } = responseBox();
  await handleBuyVoidPaymentKeyedFullRuntimeCommandV1(
    {
      socket: { remoteAddress: "127.0.0.1" },
      body: {
        action:
          VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1,
        attempt_id: ATTEMPT_ID,
        stage: "guarded_broadcast",
      },
    },
    res,
    f.options,
  );
  assert.equal(box.code, 400);
  assert.equal(
    box.body.error,
    "caller_supplied_runtime_material_forbidden",
  );
  assert.equal(box.body.forbidden_key, "stage");
  assert.equal(f.calls.preparation.length, 0);
}

for (const [key, expected] of Object.entries({
  composition_time_credential_read: false,
  composition_time_rpc_call: false,
  composition_time_signing: false,
  composition_time_transaction_broadcast: false,
  credential_read_deferred_until_sign_transaction: true,
  exact_unsigned_fulfillment_revalidated_before_credential_read: true,
  exact_signed_fulfillment_revalidated_after_signing: true,
  durable_submission_guard_reused: true,
  payment_keyed_chain2050_broadcaster_reused: true,
  automatic_retry: false,
  runtime_route_mount: false,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_RUNTIME_DEPENDENCY_BOOTSTRAP_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

for (const [key, expected] of Object.entries({
  operator_loopback_only: true,
  disabled_by_default: true,
  apply_disabled_by_default: true,
  exact_outer_confirmation_required_for_apply: true,
  exactly_one_stage_per_explicit_command: true,
  stage_is_server_derived_from_durable_state: true,
  caller_stage_forbidden: true,
  caller_policy_forbidden: true,
  history_carrier_runtime_binding_required: true,
  history_carrier_durable_authority_required: true,
  history_carrier_successor_publication_mounted: true,
  history_carrier_activation_ready: false,
  canonical_parent_dispatch: true,
  command_scoped_dependency_bootstrap: true,
  dry_command_never_bootstraps_signing_dependencies: true,
  reconciliation_never_requires_signing_dependencies: true,
  receipt_reconciliation_never_requires_signing_dependencies: true,
  terminal_closeout_never_requires_signing_dependencies: true,
  automatic_retry: false,
  background_loop: false,
  startup_execution: false,
  runtime_route_mount: true,
})) {
  assert.equal(
    (VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1 as any)[key],
    expected,
    key,
  );
}

const parentSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "src/economic/buy_void_runtime_integration_v1.ts",
  ),
  "utf8",
);
assert.match(
  parentSource,
  /from "\.\/buy_void_payment_keyed_full_runtime_v1\.js";/,
);
assert.match(
  parentSource,
  /VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_PARENT_ACTION_V1/,
);
assert.match(
  parentSource,
  /handleBuyVoidPaymentKeyedFullRuntimeCommandV1/,
);
assert.match(
  parentSource,
  /payment_keyed_full_runtime_parent_mounted: true/,
);
assert.match(
  parentSource,
  /payment_keyed_full_runtime_default_off: true/,
);
assert.match(
  parentSource,
  /payment_keyed_full_runtime_apply_default_off: true/,
);
assert.doesNotMatch(
  parentSource,
  /from "\.\/buy_void_payment_keyed_runtime_adapter_v1\.js";/,
);

{
  const missingSagaRoot = fs.mkdtempSync(
    path.join(tmp, "missing-saga-runtime-"),
  );
  const beforeEntries = fs.readdirSync(missingSagaRoot).sort();
  assert.deepEqual(beforeEntries, []);

  const missingSagaPolicy = {
    ...configuredPolicy,
    root_dir: missingSagaRoot,
  };

  const result =
    await runBuyVoidPaymentKeyedFullRuntimeV1(
      {
        attempt_id: ATTEMPT_ID,
        apply: false,
      },
      {
        env: {
          [VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1.apply_enabled]:
            "0",
        },
        policy_state: () => missingSagaPolicy,
        read_attempt: () => attempt("confirmed"),
        list_intents: () => [intent],
      },
    );

  assert.equal(result.ok, false);
  assert.equal(
    result.reason,
    "payment_keyed_full_runtime_saga_missing",
  );
  assert.equal(result.mutation_performed, false);
  assert.deepEqual(
    fs.readdirSync(missingSagaRoot).sort(),
    beforeEntries,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        missingSagaRoot,
        "buy-void-crash-consistent-saga-runtime-v1",
      ),
    ),
    false,
  );
}

fs.rmSync(tmp, { recursive: true, force: true });

console.log("VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_V1_PROOF_GREEN");
console.log("parent_dispatch_mounted=true");
console.log("child_runtime_default_off=true");
console.log("child_apply_default_off=true");
console.log("unauthorized_apply_stage_preview=false");
console.log("caller_stage_forbidden=true");
console.log("stage_server_derived=true");
console.log("exactly_one_stage_per_explicit_command=true");
console.log("reserved_selects_preparation=true");
console.log("prepared_attempt_reserved_selects_preparation_recovery=true");
console.log("transaction_prepared_selects_guarded_broadcast=true");
console.log("broadcast_intent_selects_reconciliation=true");
console.log("broadcast_accepted_selects_receipt=true");
console.log("receipt_confirmed_selects_terminal_closeout=true");
console.log("receipt_reverted_selects_terminal_reverted=true");
console.log("closed_selects_complete=true");
console.log("dry_run_dependency_bootstrap=false");
console.log("missing_saga_dry_run_directory_creation=false");
console.log("reconciliation_dependency_bootstrap=false");
console.log("receipt_dependency_bootstrap=false");
console.log("terminal_dependency_bootstrap=false");
console.log("credential_read_deferred_until_signing=true");
console.log("payment_keyed_unsigned_shape_checked_before_credential_read=true");
console.log("history_carrier_runtime_binding_required=true");
console.log("history_carrier_activation_ready=true_source_boundary=true");
console.log("history_carrier_activation_hold_before_stage_selection=true");
console.log("automatic_retry=false");
