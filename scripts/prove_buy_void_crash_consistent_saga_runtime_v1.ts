import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1,
  buyVoidCrashConsistentSagaRuntimeStatusV1,
  handleBuyVoidCrashConsistentSagaRuntimeCommandV1,
} from "../src/economic/buy_void_crash_consistent_saga_runtime_v1.js";
import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
  readBuyVoidCrashConsistentSagaServerPolicyV1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  reserveBuyVoidInventoryV1,
  listBuyVoidInventoryReservationsV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  reserveBuyVoidExecutionAttemptV1,
  listBuyVoidExecutionAttemptsV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
} from "../src/economic/buy_void_pipeline_coordinator_v1.js";
import {
  VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1,
} from "../src/economic/buy_void_saga_prepared_transaction_coordinator_v1.js";
import {
  VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
} from "../src/economic/buy_void_prepared_transaction_custody_v1.js";

const MARKER = "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1";
const REQUEST_ID = "buyvoid-saga-runtime-proof-v1";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const USDC = "0x6666666666666666666666666666666666666666";
const PAYER = "0x7777777777777777777777777777777777777777";
const RECEIVE = "0x8888888888888888888888888888888888888888";
const PAYMENT_TX = `0x${"5".repeat(64)}`;
const PAYMENT_ID = `voidpay1:ethereum:${PAYMENT_TX}:0`;
const VOID_UNITS = "2500000";
const POOL_ID = "void-fixed-price-pool-v1";
const RUNTIME_ENABLE_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ENABLED";
const PREPARATION_ENABLE_ENV =
  "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED";
const CUSTODIAN_SOCKET_ENV =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_SOCKET_PATH";
const CUSTODIAN_SIGNER_FINGERPRINT_ENV =
  "VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SIGNER_FINGERPRINT_SHA256";
const PREPARED_TX = `0x${"a".repeat(64)}`;
const PREPARATION_POLICY_FINGERPRINT = crypto
  .createHash("sha256")
  .update("void-buy-saga-runtime-proof-preparation-policy-v1", "utf8")
  .digest("hex");

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}
function requestKey(): string {
  return digest(`void-buy-request-v1\n${REQUEST_ID}`);
}
function paymentKey(): string {
  return digest(`void-buy-payment-v1\n${PAYMENT_ID}`);
}
function durableJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temp = `${file}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const fd = fs.openSync(temp, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, file);
}
function intent(nowMs: number): Record<string, any> {
  const instructionId = `voidbuyinst1_${digest(REQUEST_ID)}`;
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: nowMs,
    payment_key_sha256: paymentKey(),
    request_key_sha256: requestKey(),
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: PAYMENT_ID,
      canonical_payment_identity_sha256: digest(PAYMENT_ID),
      request_id: REQUEST_ID,
      decision_fingerprint: digest(`${REQUEST_ID}\n${PAYMENT_ID}\n${instructionId}`),
      instruction_id: instructionId,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: instructionId,
        request_id: REQUEST_ID,
        canonical_payment_identity: PAYMENT_ID,
        source_chain: "ethereum",
        payment_transaction_hash: PAYMENT_TX,
        payment_log_index: "0",
        confirmed_block_number: "123456",
        confirmation_count: "20",
        payment_usdc_units: "1250000",
        delivery_address: DELIVERY,
        void_amount_units: VOID_UNITS,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      status: "claimed",
    },
    verification_binding: {
      source_chain: "ethereum",
      payment_transaction_hash: PAYMENT_TX,
      payment_log_index: "0",
      confirmed_block_number: "123456",
      confirmation_count_at_claim: "20",
      usdc_contract: USDC,
      payer_address: PAYER,
      receive_address: RECEIVE,
      delivery_address: DELIVERY,
      payment_usdc_units: "1250000",
      requested_usdc_units: "1250000",
      quoted_void_units: VOID_UNITS,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}
function readJson(file: string): any | null {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
}

type Captured = { code: number; body: Record<string, any> };
async function invoke(input: {
  root: string;
  requestDir: string;
  body: Record<string, unknown>;
  dependencies: Record<string, any>;
  remote?: string;
}): Promise<Captured> {
  let code = 200;
  let body: Record<string, any> = {};
  const response = {
    status(value: number) { code = value; return this; },
    json(value: Record<string, any>) { body = value; return value; },
  };
  await handleBuyVoidCrashConsistentSagaRuntimeCommandV1(
    { socket: { remoteAddress: input.remote || "127.0.0.1" }, body: input.body },
    response,
    {
      root_dir: input.root,
      request_dir: input.requestDir,
      dependencies: input.dependencies,
    },
  );
  return { code, body };
}
function applyFrom(dry: Captured, receipt?: Record<string, unknown>): Record<string, unknown> {
  return {
    action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
    request_id: REQUEST_ID,
    ...(receipt ? { stage_command: { receipt } } : {}),
    apply: true,
    confirmation: dry.body.required_runtime_confirmation,
    saga_confirmation: dry.body.required_saga_confirmation,
    action_confirmation: dry.body.required_action_confirmation,
    policy_fingerprint_sha256:
      dry.body.required_policy_fingerprint_sha256,
    ...(dry.body.required_delegated_confirmation
      ? { delegated_confirmation: dry.body.required_delegated_confirmation }
      : {}),
    ...(dry.body.required_prepared_transaction_confirmation
      ? {
          prepared_transaction_confirmation:
            dry.body.required_prepared_transaction_confirmation,
          preparation_policy_fingerprint_sha256:
            dry.body.required_preparation_policy_fingerprint_sha256,
          custody_confirmation:
            dry.body.required_custody_confirmation,
          execution_journal_preparation_confirmation:
            dry.body.required_execution_journal_preparation_confirmation,
        }
      : {}),
  };
}
function assertNoMoney(body: Record<string, any>): void {
  for (const key of [
    "inventory_decrement_performed",
    "wallet_access_performed",
    "signing_performed",
    "transaction_broadcast_performed",
    "public_fulfilled_closeout_performed",
    "money_movement_performed",
  ]) assert.equal(body[key], false, key);
}
function policyEnvValues(): Record<string, string> {
  return {
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_chain]:
      "ethereum",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_usdc_contract]:
      USDC,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_receive_address]:
      RECEIVE,
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_current_block_number]:
      "123475",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.payment_min_confirmations]:
      "12",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_numerator]:
      "2",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.rate_void_units_denominator]:
      "1",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.inventory_policy_version]:
      "proof-policy-v1",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.pool_capacity_void_units]:
      "10000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.max_reservation_void_units]:
      "5000000",
    [VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1.fulfillment_wallet_address]:
      WALLET,
  };
}

async function main(): Promise<void> {
  const parent = fs.readFileSync("src/economic/buy_void_runtime_integration_v1.ts", "utf8");
  const source = fs.readFileSync(
    "src/economic/buy_void_crash_consistent_saga_runtime_v1.ts",
    "utf8",
  );
  for (const marker of [
    "handleBuyVoidCrashConsistentSagaRuntimeCommandV1",
    "buyVoidCrashConsistentSagaRuntimeStatusV1",
    "crash_consistent_saga_runtime",
  ]) assert.ok(parent.includes(marker), marker);
  for (const marker of [
    "createFilesystemSagaStoreV1",
    "runSagaSupervisorTickV1",
    "restart_reconciliation_before_retry",
    "caller_supplied_policy_forbidden",
    "stable_policy_fingerprint_bound_in_saga",
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED",
    "runBuyVoidSagaPreparedTransactionCoordinatorV1",
    "createBuyVoidPreparedTransactionCustodianIpcV1",
    "next_stage_outside_prepared_transaction_runtime_boundary",
  ]) assert.ok(source.includes(marker), marker);
  for (const forbidden of [
    "execute_prepared_transaction:",
    "reconcile_possible_broadcast:",
    "closeout_confirmed_delivery:",
  ]) assert.equal(source.includes(forbidden), false, forbidden);

  const saved = new Map<string, string | undefined>();
  const envNames = [
    RUNTIME_ENABLE_ENV,
    PREPARATION_ENABLE_ENV,
    CUSTODIAN_SOCKET_ENV,
    CUSTODIAN_SIGNER_FINGERPRINT_ENV,
    ...Object.keys(policyEnvValues()),
  ];
  for (const name of envNames) {
    saved.set(name, process.env[name]);
    delete process.env[name];
  }

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-saga-runtime-"));
  const root = path.join(base, "root");
  const requestDir = path.join(base, "requests");
  const claimFile = path.join(base, "claim.json");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.mkdirSync(requestDir, { recursive: true, mode: 0o700 });
  durableJson(path.join(requestDir, `${REQUEST_ID}.json`), {
    request_id: REQUEST_ID,
    status: "payment_verified",
    source_chain: "ethereum",
    tx_hash: PAYMENT_TX,
    delivery_address: DELIVERY,
    receive_address: RECEIVE,
    usdc_amount: "1.25",
    quoted_void: "2.5",
  });

  let clock = Date.parse("2026-08-06T09:20:00.000Z");
  let claimCalls = 0;
  let inventoryCalls = 0;
  let attemptCalls = 0;
  let preparationCoordinatorDryCalls = 0;
  let preparationCoordinatorApplyCalls = 0;
  let custodianConstructCalls = 0;
  let injectPreparedHoldAfterSigning = false;
  let loadedSaga: any = null;
  let loadedSagaId = "";
  let loadedBinding: any = null;
  let failClaim = true;
  let failInventory = true;
  let failAttempt = true;
  let duplicateClaims = false;
  let conflictingAttempt = false;
  const preview = intent(clock);
  const receipt = { proof: "bounded" };

  const deps = {
    load_saga_module: async () => {
      const saga: any = await import(
        new URL(
          "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
          import.meta.url,
        ).href,
      );
      loadedSaga = saga;
      loadedBinding = saga.validateSagaBindingV1({
        request_id: REQUEST_ID,
        canonical_payment_identity: PAYMENT_ID,
        request_key_sha256: requestKey(),
        payment_key_sha256: paymentKey(),
        delivery_address: DELIVERY,
        void_amount_units: VOID_UNITS,
        chain_id: "2050",
        pool_id: POOL_ID,
      });
      loadedSagaId = saga.computeSagaIdV1(loadedBinding);
      return saga;
    },
    create_prepared_transaction_custodian: (options: any) => {
      custodianConstructCalls += 1;
      assert.equal(
        options.socket_path,
        process.env[CUSTODIAN_SOCKET_ENV],
      );
      assert.equal(
        options.expected_signer_fingerprint_sha256,
        process.env[CUSTODIAN_SIGNER_FINGERPRINT_ENV],
      );
      return {
        prepare_once: async () => {
          throw new Error(
            "fixture_custodian_prepare_should_not_be_called",
          );
        },
        inspect_prepared: async () => {
          throw new Error(
            "fixture_custodian_inspect_should_not_be_called",
          );
        },
      };
    },
    run_prepared_transaction_coordinator: async (input: any) => {
      assert.ok(loadedSaga);
      assert.equal(input.root_dir, root);
      assert.match(input.attempt_id, /^[0-9a-f]{64}$/);
      const policyDecision =
        readBuyVoidCrashConsistentSagaServerPolicyV1();
      if (!policyDecision.ok) {
        throw new Error(
          `proof_server_policy_missing:${policyDecision.reason}`,
        );
      }
      const sagaActionConfirmation =
        loadedSaga.ACTION_CONFIRMATIONS.prepare_transaction;
      assert.ok(sagaActionConfirmation);

      if (input.apply !== true) {
        preparationCoordinatorDryCalls += 1;
        return {
          ok: true,
          status: "dry_run",
          applied: false,
          mutation_performed: false,
          attempt_id: input.attempt_id,
          saga_id: loadedSagaId,
          required_confirmation:
            VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1,
          required_economic_policy_fingerprint_sha256:
            policyDecision.policy.fingerprints.combined_policy_sha256,
          required_preparation_policy_fingerprint_sha256:
            PREPARATION_POLICY_FINGERPRINT,
          required_saga_confirmation:
            loadedSaga.ADVANCE_CONFIRMATION,
          required_saga_action_confirmation:
            sagaActionConfirmation,
          required_custody_confirmation:
            VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
          required_pipeline_confirmation:
            VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
          wallet_access_performed: false,
          external_signing_performed: false,
          transaction_broadcast_performed: false,
          raw_signed_transaction_persisted: false,
          raw_signed_transaction_returned: false,
          money_movement_performed: false,
        };
      }

      preparationCoordinatorApplyCalls += 1;
      if (injectPreparedHoldAfterSigning) {
        return {
          ok: false,
          status: "held",
          applied: true,
          stage: "saga_append",
          reason: "injected_post_sign_hold",
          mutation_performed: true,
          wallet_access_performed: false,
          external_signing_performed: true,
          transaction_broadcast_performed: false,
          raw_signed_transaction_persisted: false,
          raw_signed_transaction_returned: false,
          reconciliation_required: true,
          automatic_retry_allowed: false,
          money_movement_performed: false,
        };
      }
      assert.equal(
        input.confirmation,
        VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1,
      );
      assert.equal(
        input.economic_policy_fingerprint_sha256,
        policyDecision.policy.fingerprints.combined_policy_sha256,
      );
      assert.equal(
        input.preparation_policy_fingerprint_sha256,
        PREPARATION_POLICY_FINGERPRINT,
      );
      assert.equal(
        input.saga_confirmation,
        loadedSaga.ADVANCE_CONFIRMATION,
      );
      assert.equal(
        input.saga_action_confirmation,
        sagaActionConfirmation,
      );
      assert.equal(
        input.custody_confirmation,
        VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODY_CONFIRMATION_V1,
      );
      assert.equal(
        input.pipeline_confirmation,
        VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
      );
      assert.ok(input.dependencies?.custodian);

      const currentIntent = readJson(claimFile);
      assert.ok(currentIntent);
      const pipeline = await runBuyVoidPipelineCommandV1({
        action: "prepare_execution",
        root_dir: root,
        attempt_id: input.attempt_id,
        intent: currentIntent,
        execution_policy: policyDecision.policy.execution_policy,
        transaction: {
          chain_id: "2050",
          transaction_hash: PREPARED_TX,
          from_address: WALLET,
          to_address: DELIVERY,
          amount_units: VOID_UNITS,
        },
        apply: true,
        confirmation:
          VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
        now_ms: (clock += 1000),
      });
      assert.equal(pipeline.ok, true);
      assert.equal(pipeline.status, "applied");

      const store = loadedSaga.createFilesystemSagaStoreV1(
        path.join(
          root,
          "buy-void-crash-consistent-saga-runtime-v1",
        ),
      );
      const sagaResult = await loadedSaga.runSagaSupervisorTickV1({
        store,
        binding: loadedBinding,
        owner_id: `void-buy-prepare-proof-${process.pid}`,
        now_ms: (clock += 1000),
        lease_ttl_ms: 30_000,
        recorded_at_utc: new Date(clock).toISOString(),
        source_floor_main:
          "bd688e7b4a4afc7e025c5535dc663573ead751ba",
        policy_id: policyDecision.policy.saga_policy_id,
        apply: true,
        confirmation: loadedSaga.ADVANCE_CONFIRMATION,
        action_confirmation: sagaActionConfirmation,
        adapters: {
          prepare_transaction: async () => ({
            payload: {
              attempt_id: input.attempt_id,
              transaction_hash: PREPARED_TX,
              nonce: 7,
              fulfillment_wallet_fingerprint_sha256:
                digest(WALLET),
              gas_limit: "21000",
              max_fee_per_gas_wei: "100",
              max_priority_fee_per_gas_wei: "2",
            },
          }),
        },
      });
      assert.equal(sagaResult.ok, true);
      assert.equal(sagaResult.status, "applied");

      return {
        ok: true,
        status: "prepared",
        applied: true,
        mutation_performed: true,
        attempt_id: input.attempt_id,
        saga_id: loadedSagaId,
        plan: { nonce: 7 },
        custody: {
          signed_transaction_hash: PREPARED_TX,
        },
        execution_attempt: {},
        saga_state: sagaResult.state,
        wallet_access_performed: false,
        external_signing_performed: true,
        transaction_broadcast_performed: false,
        raw_signed_transaction_persisted: false,
        raw_signed_transaction_returned: false,
        automatic_retry_allowed: false,
        money_movement_performed: false,
      };
    },
    derive_snapshot: () => ({
      status: "ready",
      snapshot: { request_id: REQUEST_ID, status: "payment_verified" },
      evidence: { source: "real_direct_request_file" },
    }),
    list_claims: () => {
      const current = readJson(claimFile);
      if (!current) return [];
      if (!duplicateClaims) return [current];
      const conflict = structuredClone(current);
      conflict.claim.instruction_id += "-conflict";
      return [current, conflict];
    },
    list_inventory: (input: any) => listBuyVoidInventoryReservationsV1(input),
    list_attempts: () => {
      const values = listBuyVoidExecutionAttemptsV1(root);
      if (!conflictingAttempt || values.length === 0) return values;
      const conflict = structuredClone(values[0]);
      conflict.reservation.payment_key_sha256 = "9".repeat(64);
      return [conflict];
    },
    reserve_inventory: async (input: any) => {
      inventoryCalls += 1;
      assert.deepEqual(input.policy, {
        inventory_reservation_enabled: true,
        pool_id: POOL_ID,
        inventory_policy_version: "proof-policy-v1",
        pool_capacity_void_units: "10000000",
        max_reservation_void_units: "5000000",
      });
      const result = reserveBuyVoidInventoryV1(input);
      assert.equal(result.ok, true);
      if (failInventory) {
        failInventory = false;
        throw new Error("injected_after_inventory_write");
      }
      return result;
    },
    run_pipeline_command: async (command: Record<string, any>) => {
      if (command.action === "verify_and_claim") {
        assert.deepEqual(command.verification_policy, {
          allowed_chains: ["ethereum"],
          usdc_contract_by_chain: { ethereum: USDC },
          receive_address_by_chain: { ethereum: RECEIVE },
          current_block_number_by_chain: { ethereum: 123475 },
        });
        assert.deepEqual(command.fulfillment_policy, {
          automatic_fulfillment_enabled: true,
          allowed_chains: ["ethereum"],
          min_confirmations_by_chain: { ethereum: 12 },
          usdc_contract_by_chain: { ethereum: USDC },
          receive_address_by_chain: { ethereum: RECEIVE },
          rate_void_units_numerator: "2",
          rate_void_units_denominator: "1",
          pool_remaining_void_units: "10000000",
          exact_payment_required: true,
        });
        assert.deepEqual(command.receipt, receipt);
        if (command.apply !== true) {
          return {
            ok: true,
            status: "dry_run",
            preview: { decision: { ok: true, claim: preview.claim } },
          };
        }
        claimCalls += 1;
        durableJson(claimFile, intent(command.now_ms));
        if (failClaim) {
          failClaim = false;
          throw new Error("injected_after_claim_write");
        }
        return { ok: true, status: "applied" };
      }
      if (command.action === "reserve_execution") {
        attemptCalls += 1;
        assert.deepEqual(command.execution_policy, {
          attempt_journal_enabled: true,
          max_attempts_per_payment: 1,
          chain_id: "2050",
          fulfillment_wallet_allowlist: [WALLET],
        });
        const result = reserveBuyVoidExecutionAttemptV1({
          root_dir: root,
          intent: command.intent,
          policy: command.execution_policy,
          now_ms: command.now_ms,
        });
        assert.equal(result.ok, true);
        if (failAttempt) {
          failAttempt = false;
          throw new Error("injected_after_attempt_write");
        }
        return { ok: true, status: "applied" };
      }
      throw new Error(`unexpected_pipeline_action:${command.action}`);
    },
    now_ms: () => (clock += 1000),
  };

  const disabled = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(disabled.code, 503);

  process.env[RUNTIME_ENABLE_ENV] = "1";
  for (const [name, value] of Object.entries(policyEnvValues())) {
    process.env[name] = value;
  }

  const remote = await invoke({
    root,
    requestDir,
    remote: "203.0.113.7",
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(remote.code, 403);

  const substitutions: Array<[string, Record<string, unknown>]> = [
    ["chain", { verification_policy: { allowed_chains: ["base"] } }],
    ["confirmations", { fulfillment_policy: { min_confirmations_by_chain: { ethereum: 1 } } }],
    ["rate", { fulfillment_policy: { rate_void_units_numerator: "999" } }],
    ["receive", { verification_policy: { receive_address_by_chain: { ethereum: DELIVERY } } }],
    ["wallet", { execution_policy: { fulfillment_wallet_allowlist: [DELIVERY] } }],
    ["attempt_cap", { execution_policy: { max_attempts_per_payment: 9 } }],
  ];
  for (const [label, policy] of substitutions) {
    const rejected = await invoke({
      root,
      requestDir,
      body: {
        action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
        request_id: REQUEST_ID,
        stage_command: { receipt, ...policy },
      },
      dependencies: deps,
    });
    assert.equal(rejected.code, 400, label);
    assert.equal(rejected.body.error, "caller_supplied_policy_forbidden", label);
    assert.equal(claimCalls, 0, label);
    assert.equal(inventoryCalls, 0, label);
    assert.equal(attemptCalls, 0, label);
    assert.equal(fs.existsSync(claimFile), false, label);
    assert.equal(
      fs.existsSync(path.join(root, "buy-void-crash-consistent-saga-runtime-v1")),
      false,
      label,
    );
  }

  const dryClaim = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
      stage_command: { receipt },
    },
    dependencies: deps,
  });
  assert.equal(dryClaim.code, 200);
  assert.equal(dryClaim.body.next_action, "claim_payment");
  assert.match(dryClaim.body.required_policy_fingerprint_sha256, /^[0-9a-f]{64}$/);
  assert.equal(
    dryClaim.body.server_policy_public_summary.fulfillment_wallet_address,
    undefined,
  );
  assert.equal(
    fs.existsSync(path.join(root, "buy-void-crash-consistent-saga-runtime-v1")),
    false,
  );

  const missingFingerprint = await invoke({
    root,
    requestDir,
    body: {
      ...applyFrom(dryClaim, receipt),
      policy_fingerprint_sha256: undefined,
    },
    dependencies: deps,
  });
  assert.equal(missingFingerprint.code, 422);
  assert.match(missingFingerprint.body.reason, /exact_server_policy_fingerprint_required/);
  assert.equal(claimCalls, 0);

  const failedClaim = await invoke({
    root,
    requestDir,
    body: applyFrom(dryClaim, receipt),
    dependencies: deps,
  });
  assert.match(failedClaim.body.reason, /injected_after_claim_write/);
  assert.equal(claimCalls, 1);

  const rateEnv =
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1
      .rate_void_units_numerator;
  process.env[rateEnv] = "3";
  const changedPolicyRetry = await invoke({
    root,
    requestDir,
    body: applyFrom(dryClaim, receipt),
    dependencies: deps,
  });
  assert.equal(changedPolicyRetry.code, 409);
  assert.match(changedPolicyRetry.body.reason, /server_rate_policy_conflict|server_policy_fingerprint_conflict/);
  assert.equal(claimCalls, 1);
  process.env[rateEnv] = "2";

  const recoveredClaim = await invoke({
    root,
    requestDir,
    body: applyFrom(dryClaim, receipt),
    dependencies: deps,
  });
  assert.equal(recoveredClaim.code, 200);
  assert.equal(claimCalls, 1);
  assertNoMoney(recoveredClaim.body);

  const dryInventory = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(dryInventory.body.next_action, "reserve_inventory");
  const failedInventory = await invoke({
    root,
    requestDir,
    body: applyFrom(dryInventory),
    dependencies: deps,
  });
  assert.match(failedInventory.body.reason, /injected_after_inventory_write/);
  assert.equal(inventoryCalls, 1);
  const recoveredInventory = await invoke({
    root,
    requestDir,
    body: applyFrom(dryInventory),
    dependencies: deps,
  });
  assert.equal(recoveredInventory.code, 200);
  assert.equal(inventoryCalls, 1);
  assertNoMoney(recoveredInventory.body);

  const dryAttempt = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(dryAttempt.body.next_action, "reserve_execution_attempt");
  const callerAttemptPolicy = await invoke({
    root,
    requestDir,
    body: {
      ...applyFrom(dryAttempt),
      stage_command: {
        execution_policy: { max_attempts_per_payment: 7 },
      },
    },
    dependencies: deps,
  });
  assert.equal(callerAttemptPolicy.code, 400);
  assert.equal(callerAttemptPolicy.body.error, "caller_supplied_policy_forbidden");
  assert.equal(attemptCalls, 0);

  const failedAttempt = await invoke({
    root,
    requestDir,
    body: applyFrom(dryAttempt),
    dependencies: deps,
  });
  assert.match(failedAttempt.body.reason, /injected_after_attempt_write/);
  assert.equal(attemptCalls, 1);
  const recoveredAttempt = await invoke({
    root,
    requestDir,
    body: applyFrom(dryAttempt),
    dependencies: deps,
  });
  assert.equal(recoveredAttempt.code, 200);
  assert.equal(attemptCalls, 1);
  assertNoMoney(recoveredAttempt.body);

  const preparationDisabled = await invoke({
    root,
    requestDir,
    body: {
      action:
        VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(preparationDisabled.code, 503);
  assert.match(
    preparationDisabled.body.reason,
    /transaction_preparation_disabled/,
  );
  assert.equal(preparationCoordinatorDryCalls, 0);
  assert.equal(preparationCoordinatorApplyCalls, 0);
  assert.equal(custodianConstructCalls, 0);

  process.env[PREPARATION_ENABLE_ENV] = "1";

  const callerCustodian = await invoke({
    root,
    requestDir,
    body: {
      action:
        VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
      custodian_socket_path: "/tmp/caller-controlled.sock",
      signer_fingerprint_sha256: "f".repeat(64),
    },
    dependencies: deps,
  });
  assert.equal(callerCustodian.code, 400);
  assert.equal(
    callerCustodian.body.error,
    "caller_supplied_execution_material_forbidden",
  );
  assert.equal(preparationCoordinatorDryCalls, 0);
  assert.equal(custodianConstructCalls, 0);

  const dryPreparation = await invoke({
    root,
    requestDir,
    body: {
      action:
        VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(dryPreparation.code, 200);
  assert.equal(
    dryPreparation.body.next_action,
    "prepare_transaction",
  );
  assert.equal(
    dryPreparation.body.external_custodian_signing_performed,
    false,
  );
  assert.equal(
    dryPreparation.body.application_signing_performed,
    false,
  );
  assert.equal(preparationCoordinatorDryCalls, 1);
  assert.equal(preparationCoordinatorApplyCalls, 0);
  assert.equal(custodianConstructCalls, 0);

  const missingCustodian = await invoke({
    root,
    requestDir,
    body: applyFrom(dryPreparation),
    dependencies: deps,
  });
  assert.equal(missingCustodian.code, 503);
  assert.match(
    missingCustodian.body.reason,
    /prepared_transaction_custodian_not_configured/,
  );
  assert.equal(preparationCoordinatorDryCalls, 2);
  assert.equal(preparationCoordinatorApplyCalls, 0);
  assert.equal(custodianConstructCalls, 0);

  const configuredSocket = path.join(
    base,
    "private-custodian",
    "custodian.sock",
  );
  const configuredFingerprint =
    digest("void-buy-saga-runtime-proof-signer-v1");
  process.env[CUSTODIAN_SOCKET_ENV] = configuredSocket;
  process.env[CUSTODIAN_SIGNER_FINGERPRINT_ENV] =
    configuredFingerprint;

  const configuredStatus =
    buyVoidCrashConsistentSagaRuntimeStatusV1();
  assert.equal(configuredStatus.preparation_enabled, true);
  assert.equal(configuredStatus.custodian_ipc_configured, true);
  const statusText = JSON.stringify(configuredStatus);
  assert.equal(statusText.includes(configuredSocket), false);
  assert.equal(statusText.includes(configuredFingerprint), false);

  const wrongPreparationFingerprint = await invoke({
    root,
    requestDir,
    body: {
      ...applyFrom(dryPreparation),
      preparation_policy_fingerprint_sha256: "0".repeat(64),
    },
    dependencies: deps,
  });
  assert.equal(wrongPreparationFingerprint.code, 428);
  assert.match(
    wrongPreparationFingerprint.body.reason,
    /prepared_transaction_confirmation_required/,
  );
  assert.equal(preparationCoordinatorDryCalls, 3);
  assert.equal(preparationCoordinatorApplyCalls, 0);
  assert.equal(custodianConstructCalls, 0);

  injectPreparedHoldAfterSigning = true;
  const postSignHeld = await invoke({
    root,
    requestDir,
    body: applyFrom(dryPreparation),
    dependencies: deps,
  });
  injectPreparedHoldAfterSigning = false;
  assert.equal(postSignHeld.code, 422);
  assert.match(postSignHeld.body.reason, /injected_post_sign_hold/);
  assert.equal(postSignHeld.body.mutation_performed, true);
  assert.equal(
    postSignHeld.body.external_custodian_signing_performed,
    true,
  );
  assert.equal(postSignHeld.body.reconciliation_required, true);
  assert.equal(postSignHeld.body.automatic_retry, false);
  assert.equal(postSignHeld.body.transaction_broadcast_performed, false);
  assert.equal(postSignHeld.body.money_movement_performed, false);

  const prepared = await invoke({
    root,
    requestDir,
    body: applyFrom(dryPreparation),
    dependencies: deps,
  });
  assert.equal(prepared.code, 200);
  assert.equal(prepared.body.status, "prepared");
  assert.equal(prepared.body.signed_transaction_hash, PREPARED_TX);
  assert.equal(prepared.body.reserved_nonce, "7");
  assert.equal(
    prepared.body.external_custodian_signing_performed,
    true,
  );
  assert.equal(prepared.body.application_signing_performed, false);
  assert.equal("custody_handle" in prepared.body, false);
  assert.equal("raw_signed_transaction" in prepared.body, false);
  assertNoMoney(prepared.body);
  assert.equal(preparationCoordinatorDryCalls, 5);
  assert.equal(preparationCoordinatorApplyCalls, 2);
  assert.equal(custodianConstructCalls, 2);

  const afterPrepared = await invoke({
    root,
    requestDir,
    body: {
      action:
        VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(afterPrepared.code, 422);
  assert.match(
    afterPrepared.body.reason,
    /next_stage_outside_prepared_transaction_runtime_boundary/,
  );
  assert.equal(preparationCoordinatorDryCalls, 5);
  assert.equal(preparationCoordinatorApplyCalls, 2);
  assert.equal(custodianConstructCalls, 2);

  const saga: any = await import(
    new URL("../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs", import.meta.url).href,
  );
  const binding = saga.validateSagaBindingV1({
    request_id: REQUEST_ID,
    canonical_payment_identity: PAYMENT_ID,
    request_key_sha256: requestKey(),
    payment_key_sha256: paymentKey(),
    delivery_address: DELIVERY,
    void_amount_units: VOID_UNITS,
    chain_id: "2050",
    pool_id: POOL_ID,
  });
  const sagaId = saga.computeSagaIdV1(binding);
  const store = saga.createFilesystemSagaStoreV1(
    path.join(root, "buy-void-crash-consistent-saga-runtime-v1"),
  );
  const record = store.recover(sagaId);
  assert.deepEqual(
    record.events.map((event: any) => event.event_type),
    [
      "saga_initialized",
      "claim_committed",
      "inventory_reserved",
      "attempt_reserved",
      "transaction_prepared",
    ],
  );
  assert.equal(
    record.events[0].payload.policy_id,
    `void-buy-void-saga-runtime-policy-v1-${dryClaim.body.required_policy_fingerprint_sha256}`,
  );
  for (let index = 1; index < record.events.length; index += 1) {
    assert.ok(record.events[index].fencing_token > record.events[index - 1].fencing_token);
  }
  const count = record.state.event_count;

  duplicateClaims = true;
  const claimConflict = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(claimConflict.code, 409);
  assert.match(claimConflict.body.reason, /multiple_claim_records/);
  duplicateClaims = false;
  conflictingAttempt = true;
  const attemptConflict = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(attemptConflict.code, 409);
  assert.match(attemptConflict.body.reason, /attempt_binding_conflict/);
  conflictingAttempt = false;
  assert.equal(store.recover(sagaId).state.event_count, count);

  const requestFile = path.join(requestDir, `${REQUEST_ID}.json`);
  const backup = fs.readFileSync(requestFile);
  fs.rmSync(requestFile);
  fs.symlinkSync(path.join(base, "outside.json"), requestFile);
  const symlinked = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.match(symlinked.body.reason, /request_direct_regular_file_required/);
  fs.rmSync(requestFile);
  fs.writeFileSync(requestFile, Buffer.alloc(4 * 1024 * 1024 + 1, 0x20));
  const oversized = await invoke({
    root,
    requestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: deps,
  });
  assert.equal(oversized.code, 422);
  assert.match(oversized.body.reason, /request_size_out_of_range/);
  fs.writeFileSync(requestFile, backup);
  assert.equal(store.recover(sagaId).state.event_count, count);

  const unanchoredRoot = path.join(base, "unanchored-attempt-root");
  const unanchoredRequestDir = path.join(
    base,
    "unanchored-attempt-requests",
  );
  fs.mkdirSync(unanchoredRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(unanchoredRequestDir, { recursive: true, mode: 0o700 });
  durableJson(path.join(unanchoredRequestDir, `${REQUEST_ID}.json`), {
    request_id: REQUEST_ID,
  });
  const unanchoredIntent = intent(clock += 1000);
  const unanchoredInventory = reserveBuyVoidInventoryV1({
    root_dir: unanchoredRoot,
    intent: unanchoredIntent as any,
    policy: {
      inventory_reservation_enabled: true,
      pool_id: POOL_ID,
      inventory_policy_version: "proof-policy-v1",
      pool_capacity_void_units: "10000000",
      max_reservation_void_units: "5000000",
    },
    apply: true,
    now_ms: clock += 1000,
  });
  if ("reason" in unanchoredInventory) {
    throw new Error(String(unanchoredInventory.reason));
  }
  assert.equal(unanchoredInventory.ok, true);
  const unanchoredAttempt = reserveBuyVoidExecutionAttemptV1({
    root_dir: unanchoredRoot,
    intent: unanchoredIntent as any,
    policy: {
      attempt_journal_enabled: true,
      max_attempts_per_payment: 1,
      chain_id: "2049",
      fulfillment_wallet_allowlist: [WALLET],
    },
    now_ms: clock += 1000,
  });
  if ("reason" in unanchoredAttempt) {
    throw new Error(String(unanchoredAttempt.reason));
  }
  assert.equal(unanchoredAttempt.ok, true);
  const unanchoredDependencies: Record<string, any> = {
    derive_snapshot: () => ({
      status: "ready",
      snapshot: { request_id: REQUEST_ID, status: "payment_verified" },
      evidence: { source: "unanchored_attempt_policy_proof" },
    }),
    list_claims: () => [unanchoredIntent],
    list_inventory: (input: any) =>
      listBuyVoidInventoryReservationsV1(input),
    list_attempts: () =>
      listBuyVoidExecutionAttemptsV1(unanchoredRoot),
    reserve_inventory: async () => {
      throw new Error("unanchored_inventory_mutation_forbidden");
    },
    run_pipeline_command: async () => {
      throw new Error("unanchored_pipeline_mutation_forbidden");
    },
    now_ms: () => (clock += 1000),
  };
  const walletEnv =
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1
      .fulfillment_wallet_address;
  const originalWallet = process.env[walletEnv];
  process.env[walletEnv] =
    "0x5555555555555555555555555555555555555555";
  const unanchoredAttemptHeld = await invoke({
    root: unanchoredRoot,
    requestDir: unanchoredRequestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: unanchoredDependencies,
  });
  if (originalWallet === undefined) delete process.env[walletEnv];
  else process.env[walletEnv] = originalWallet;
  assert.equal(unanchoredAttemptHeld.code, 409);
  assert.match(
    unanchoredAttemptHeld.body.reason,
    /execution_attempt_without_saga_policy_anchor/,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        unanchoredRoot,
        "buy-void-crash-consistent-saga-runtime-v1",
      ),
    ),
    false,
  );

  const maxImportRoot = path.join(base, "inventory-max-import-root");
  const maxImportRequestDir = path.join(
    base,
    "inventory-max-import-requests",
  );
  fs.mkdirSync(maxImportRoot, { recursive: true, mode: 0o700 });
  fs.mkdirSync(maxImportRequestDir, { recursive: true, mode: 0o700 });
  durableJson(path.join(maxImportRequestDir, `${REQUEST_ID}.json`), {
    request_id: REQUEST_ID,
  });
  const maxImportIntent = intent(clock += 1000);
  const maxImportInventory = reserveBuyVoidInventoryV1({
    root_dir: maxImportRoot,
    intent: maxImportIntent as any,
    policy: {
      inventory_reservation_enabled: true,
      pool_id: POOL_ID,
      inventory_policy_version: "proof-policy-v1",
      pool_capacity_void_units: "10000000",
      max_reservation_void_units: "5000000",
    },
    apply: true,
    now_ms: clock += 1000,
  });
  if ("reason" in maxImportInventory) {
    throw new Error(String(maxImportInventory.reason));
  }
  assert.equal(maxImportInventory.ok, true);
  const maximumReservationEnv =
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1
      .max_reservation_void_units;
  const originalMaximumReservation =
    process.env[maximumReservationEnv];
  process.env[maximumReservationEnv] = "1000000";
  const maxImportHeld = await invoke({
    root: maxImportRoot,
    requestDir: maxImportRequestDir,
    body: {
      action: VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_ACTION_V1,
      request_id: REQUEST_ID,
    },
    dependencies: {
      derive_snapshot: () => ({
        status: "ready",
        snapshot: { request_id: REQUEST_ID, status: "payment_verified" },
        evidence: { source: "inventory_max_import_policy_proof" },
      }),
      list_claims: () => [maxImportIntent],
      list_inventory: (input: any) =>
        listBuyVoidInventoryReservationsV1(input),
      list_attempts: () => [],
      reserve_inventory: async () => {
        throw new Error("max_import_inventory_mutation_forbidden");
      },
      run_pipeline_command: async () => {
        throw new Error("max_import_pipeline_mutation_forbidden");
      },
      now_ms: () => (clock += 1000),
    },
  });
  if (originalMaximumReservation === undefined) {
    delete process.env[maximumReservationEnv];
  } else {
    process.env[maximumReservationEnv] =
      originalMaximumReservation;
  }
  assert.equal(maxImportHeld.code, 409);
  assert.match(
    maxImportHeld.body.reason,
    /inventory_server_max_reservation_conflict/,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        maxImportRoot,
        "buy-void-crash-consistent-saga-runtime-v1",
      ),
    ),
    false,
  );


  assert.deepEqual(VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_AUTHORITY_V1, {
    operator_loopback_only: true,
    disabled_by_default: true,
    server_controlled_root_dir: true,
    server_controlled_request_dir: true,
    server_derived_request_snapshot: true,
    server_controlled_verification_policy: true,
    server_controlled_fulfillment_policy: true,
    server_controlled_inventory_policy: true,
    server_controlled_execution_policy: true,
    separate_transaction_preparation_enable_gate: true,
    server_controlled_preparation_policy: true,
    server_controlled_custodian_ipc_socket: true,
    server_controlled_signer_fingerprint: true,
    caller_supplied_policy_forbidden: true,
    caller_supplied_binding_forbidden: true,
    caller_supplied_intent_forbidden: true,
    stable_policy_fingerprint_echo_required: true,
    stable_policy_fingerprint_bound_in_saga: true,
    one_request_per_invocation: true,
    one_business_stage_per_invocation: true,
    per_request_lease_required: true,
    monotonically_increasing_fencing_token_required: true,
    restart_reconciliation_before_retry: true,
    non_money_stage_count: 4,
    claim_write_possible: true,
    inventory_reservation_possible: true,
    execution_attempt_reservation_possible: true,
    transaction_preparation_mounted: true,
    read_only_rpc_planning_possible: true,
    external_custodian_signing_possible: true,
    inventory_decrement: false,
    public_fulfilled_closeout: false,
    background_loop: false,
    startup_execution: false,
    rpc_call: true,
    credential_access: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  });

  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  fs.rmSync(base, { recursive: true, force: true });
  console.log(`${MARKER}_PROOF_GREEN`);
  console.log("caller_policy_substitution_write=0");
  console.log("stable_policy_fingerprint_bound=true");
  console.log("claim_restart_duplicate_write=0");
  console.log("inventory_restart_duplicate_write=0");
  console.log("attempt_restart_duplicate_write=0");
  console.log("unanchored_execution_attempt_import=held");
  console.log("changed_wallet_unanchored_attempt_import=held");
  console.log("unanchored_execution_chain_import=held");
  console.log("inventory_maximum_import_conflict=held");
  console.log("anchored_attempt_backfill_exactly_once=true");
  console.log("preparation_enable_gate_separate=true");
  console.log("preparation_dry_constructed_custodian=0");
  console.log("preparation_coordinator_dry_calls=5");
  console.log("preparation_coordinator_apply_calls=2");
  console.log("custodian_ipc_construct_calls=2");
  console.log("external_custodian_signing_truth_separate=true");
  console.log("post_sign_hold_truth_preserved=true");
  console.log("execute_prepared_transaction_runtime_mount=0");
  console.log("wallet_signing_broadcast_money=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
