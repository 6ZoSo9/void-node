import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  reserveBuyVoidExecutionAttemptV1,
  type BuyVoidExecutionAttemptPolicyV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1,
  runBuyVoidPipelineCommandV1,
} from "../src/economic/buy_void_pipeline_coordinator_v1.js";
import {
  readBuyVoidCrashConsistentSagaServerPolicyV1,
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  listBuyVoidPreparedTransactionPlanReservationsV1,
  reserveBuyVoidPreparedTransactionPlanV1,
} from "../src/economic/buy_void_prepared_transaction_plan_reservation_v1.js";
import type {
  BuyVoidPreparedTransactionCustodianDecisionV1,
  BuyVoidPreparedTransactionCustodianPrepareRequestV1,
  BuyVoidPreparedTransactionCustodianV1,
} from "../src/economic/buy_void_prepared_transaction_custody_v1.js";
import {
  VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1,
  VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1,
  runBuyVoidSagaPreparedTransactionCoordinatorV1,
  type BuyVoidSagaPreparedTransactionFaultStageV1,
} from "../src/economic/buy_void_saga_prepared_transaction_coordinator_v1.js";

const MARKER = "VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_COORDINATOR_V1";
const REQUEST_ID = "buyvoid-prepared-custody-proof-v1";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const USDC = "0x6666666666666666666666666666666666666666";
const PAYER = "0x7777777777777777777777777777777777777777";
const RECEIVE = "0x8888888888888888888888888888888888888888";
const PAYMENT_TX = `0x${"5".repeat(64)}`;
const PAYMENT_ID = `voidpay1:ethereum:${PAYMENT_TX}:0`;
const VOID_UNITS = "2500000";
const INVENTORY_ID = "a".repeat(64);
const PLAN_POLICY_FINGERPRINT = "b".repeat(64);
const SOURCE_FLOOR = "eea521d298ffb299ca8839d9171a1151f206d7c9";

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function requestKey(requestId = REQUEST_ID): string {
  return digest(`void-buy-request-v1\n${requestId}`);
}

function paymentKey(identity = PAYMENT_ID): string {
  return digest(`void-buy-payment-v1\n${identity}`);
}

function intent(input: {
  request_id?: string;
  payment_identity?: string;
  payment_tx?: string;
  delivery?: string;
} = {}): Record<string, any> {
  const requestId = input.request_id || REQUEST_ID;
  const paymentIdentity = input.payment_identity || PAYMENT_ID;
  const paymentTx = input.payment_tx || PAYMENT_TX;
  const delivery = input.delivery || DELIVERY;
  const instructionId = `voidbuyinst1_${digest(requestId)}`;
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: Date.parse("2026-08-06T10:10:00.000Z"),
    payment_key_sha256: paymentKey(paymentIdentity),
    request_key_sha256: requestKey(requestId),
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: paymentIdentity,
      canonical_payment_identity_sha256: digest(paymentIdentity),
      request_id: requestId,
      decision_fingerprint:
        digest(`${requestId}\n${paymentIdentity}\n${instructionId}`),
      instruction_id: instructionId,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: instructionId,
        request_id: requestId,
        canonical_payment_identity: paymentIdentity,
        source_chain: "ethereum",
        payment_transaction_hash: paymentTx,
        payment_log_index: "0",
        confirmed_block_number: "123456",
        confirmation_count: "20",
        payment_usdc_units: "1250000",
        delivery_address: delivery,
        void_amount_units: VOID_UNITS,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      status: "claimed",
    },
    verification_binding: {
      source_chain: "ethereum",
      payment_transaction_hash: paymentTx,
      payment_log_index: "0",
      confirmed_block_number: "123456",
      confirmation_count_at_claim: "20",
      usdc_contract: USDC,
      payer_address: PAYER,
      receive_address: RECEIVE,
      delivery_address: delivery,
      payment_usdc_units: "1250000",
      requested_usdc_units: "1250000",
      quoted_void_units: VOID_UNITS,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function inventory(value: Record<string, any>): Record<string, any> {
  return {
    schema: "void_buy_void_inventory_reservation_v1",
    marker: "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
    reservation_id: INVENTORY_ID,
    reserved_at_ms: Date.parse("2026-08-06T10:10:01.000Z"),
    pool_id: "void-fixed-price-pool-v1",
    inventory_policy_version: "proof-policy-v1",
    pool_capacity_void_units: "10000000",
    committed_before_void_units: "0",
    reserved_void_units: VOID_UNITS,
    committed_after_void_units: VOID_UNITS,
    available_after_void_units: "7500000",
    payment_key_sha256: value.payment_key_sha256,
    request_key_sha256: value.request_key_sha256,
    canonical_payment_identity: value.claim.canonical_payment_identity,
    request_id: value.claim.request_id,
    instruction_id: value.claim.instruction_id,
    delivery_address: value.claim.unsigned_instruction.delivery_address,
    intent_fingerprint: "c".repeat(64),
    reservation_status: "reserved",
    inventory_decrement_performed: false,
    reservation_release_authorized: false,
    execution_authorized_by_this_module: false,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };
}

function economicEnv(): Record<string, string> {
  const envs = VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
  return {
    [envs.payment_chain]: "ethereum",
    [envs.payment_usdc_contract]: USDC,
    [envs.payment_receive_address]: RECEIVE,
    [envs.payment_current_block_number]: "123475",
    [envs.payment_min_confirmations]: "12",
    [envs.rate_void_units_numerator]: "2",
    [envs.rate_void_units_denominator]: "1",
    [envs.inventory_policy_version]: "proof-policy-v1",
    [envs.pool_capacity_void_units]: "10000000",
    [envs.max_reservation_void_units]: "5000000",
    [envs.fulfillment_wallet_address]: WALLET,
  };
}

function preparationEnv(): Record<string, string> {
  const envs = VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1;
  return {
    [envs.rpc_url]: "http://127.0.0.1:18545/",
    [envs.gas_limit]: "21000",
    [envs.max_gas_limit]: "30000",
    [envs.max_fee_per_gas_wei]: "2000000000",
    [envs.max_priority_fee_per_gas_wei]: "100000000",
    [envs.fee_multiplier_bps]: "11000",
  };
}

class FakeCustodian implements BuyVoidPreparedTransactionCustodianV1 {
  readonly prepared = new Map<
    string,
    Extract<BuyVoidPreparedTransactionCustodianDecisionV1, { ok: true }>
  >();
  prepareCalls = 0;
  inspectCalls = 0;
  throwAfterFirstExternalPrepare = true;

  async prepare_once(
    request: Readonly<BuyVoidPreparedTransactionCustodianPrepareRequestV1>,
  ): Promise<BuyVoidPreparedTransactionCustodianDecisionV1> {
    this.prepareCalls += 1;
    const existing = this.prepared.get(request.idempotency_key_sha256);
    if (existing) return { ...existing, status: "duplicate" };
    const prepared: Extract<
      BuyVoidPreparedTransactionCustodianDecisionV1,
      { ok: true }
    > = {
      ok: true,
      status: "prepared",
      custody_handle:
        `custody:void-buy:${request.attempt_id}:${request.nonce}`,
      signed_transaction_hash:
        `0x${digest(`signed\n${request.idempotency_key_sha256}`)}`,
      wallet_address: request.wallet_address,
      signer_fingerprint_sha256:
        digest(`signer\n${request.wallet_address}`),
      transaction_plan_fingerprint_sha256:
        request.transaction_plan_fingerprint_sha256,
    };
    this.prepared.set(request.idempotency_key_sha256, prepared);
    if (this.throwAfterFirstExternalPrepare) {
      this.throwAfterFirstExternalPrepare = false;
      throw new Error("injected_after_external_custody_prepare");
    }
    return prepared;
  }

  async inspect_prepared(request: Readonly<{
    idempotency_key_sha256: string;
    attempt_id: string;
    custody_handle: string;
  }>): Promise<BuyVoidPreparedTransactionCustodianDecisionV1> {
    this.inspectCalls += 1;
    const existing = this.prepared.get(request.idempotency_key_sha256);
    if (!existing) return { ok: false, status: "held", reason: "missing" };
    if (
      existing.custody_handle !== request.custody_handle ||
      !existing.custody_handle.includes(request.attempt_id)
    ) {
      return { ok: false, status: "held", reason: "handle_conflict" };
    }
    return { ...existing, status: "duplicate" };
  }
}

async function initializeSaga(input: {
  root: string;
  intent: Record<string, any>;
  inventory: Record<string, any>;
  attempt_id: string;
  policy_id: string;
}): Promise<{ saga: any; saga_id: string; binding: Record<string, unknown> }> {
  const saga: any = await import(
    new URL(
      "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  );
  const binding = saga.validateSagaBindingV1({
    request_id: input.intent.claim.request_id,
    canonical_payment_identity:
      input.intent.claim.canonical_payment_identity,
    request_key_sha256: input.intent.request_key_sha256,
    payment_key_sha256: input.intent.payment_key_sha256,
    delivery_address:
      input.intent.claim.unsigned_instruction.delivery_address,
    void_amount_units:
      input.intent.claim.unsigned_instruction.void_amount_units,
    chain_id: "2050",
    pool_id: "void-fixed-price-pool-v1",
  });
  const sagaId = saga.computeSagaIdV1(binding);
  const sagaRoot = path.join(
    input.root,
    "buy-void-crash-consistent-saga-runtime-v1",
  );
  const store = saga.createFilesystemSagaStoreV1(sagaRoot);
  const now = Date.parse("2026-08-06T10:10:02.000Z");
  const owner = "prepared-proof-owner-v1";
  const lease = store.acquireLease({
    saga_id: sagaId,
    owner_id: owner,
    now_ms: now,
    ttl_ms: 30_000,
  });
  assert.equal(lease.ok, true);
  if (!lease.ok) throw new Error("saga lease missing");

  const eventInputs = [
    {
      event_type: "saga_initialized",
      payload: {
        source_floor_main: SOURCE_FLOOR,
        policy_id: input.policy_id,
        max_attempts: 1,
      },
    },
    {
      event_type: "claim_committed",
      payload: {
        claim_id: input.intent.claim.decision_fingerprint,
        instruction_id: input.intent.claim.instruction_id,
      },
    },
    {
      event_type: "inventory_reserved",
      payload: { reservation_id: input.inventory.reservation_id },
    },
    {
      event_type: "attempt_reserved",
      payload: { attempt_id: input.attempt_id, attempt_number: 1 },
    },
  ];
  let record: any = null;
  for (let index = 0; index < eventInputs.length; index += 1) {
    const current = store.recover(sagaId);
    const event = saga.buildSagaEventV1({
      binding,
      sequence: current?.state?.event_count || 0,
      previous_event_id: current?.state?.last_event_id || null,
      recorded_at_utc: new Date(now + index * 1000).toISOString(),
      event_type: eventInputs[index].event_type,
      fencing_token: lease.lease.fencing_token,
      payload: eventInputs[index].payload,
    });
    record = store.appendEvent({
      event,
      owner_id: owner,
      fencing_token: lease.lease.fencing_token,
      now_ms: now + index * 1000,
    });
  }
  store.releaseLease({
    saga_id: sagaId,
    owner_id: owner,
    fencing_token: lease.lease.fencing_token,
    now_ms: now + 5000,
  });
  assert.equal(record.state.state, "attempt_reserved");
  return { saga, saga_id: sagaId, binding };
}

function applyFrom(dry: any): Record<string, unknown> {
  return {
    root_dir: dry.root_dir,
    attempt_id: dry.attempt_id,
    apply: true,
    confirmation:
      VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1,
    economic_policy_fingerprint_sha256:
      dry.required_economic_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      dry.required_preparation_policy_fingerprint_sha256,
    saga_confirmation: dry.required_saga_confirmation,
    saga_action_confirmation: dry.required_saga_action_confirmation,
    custody_confirmation: dry.required_custody_confirmation,
    pipeline_confirmation: dry.required_pipeline_confirmation,
  };
}

function recursiveFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const output: string[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...recursiveFiles(full));
    else if (entry.isFile()) output.push(full);
  }
  return output;
}

async function main(): Promise<void> {
  const saved = new Map<string, string | undefined>();
  const configured = { ...economicEnv(), ...preparationEnv() };
  for (const [name, value] of Object.entries(configured)) {
    saved.set(name, process.env[name]);
    process.env[name] = value;
  }

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "void-prepared-custody-"));
  const root = path.join(base, "root");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const claimed = intent();
  const reservedInventory = inventory(claimed);
  const economic = readBuyVoidCrashConsistentSagaServerPolicyV1();
  if (!economic.ok) throw new Error(economic.reason);
  const executionPolicy = economic.policy.execution_policy as
    BuyVoidExecutionAttemptPolicyV1;
  const attemptDecision = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: claimed as any,
    policy: executionPolicy,
    now_ms: Date.parse("2026-08-06T10:10:01.000Z"),
  });
  assert.equal(attemptDecision.ok, true);
  if (!attemptDecision.ok) throw new Error(attemptDecision.reason);
  const attemptId = attemptDecision.attempt.reservation.attempt_id;
  const initialized = await initializeSaga({
    root,
    intent: claimed,
    inventory: reservedInventory,
    attempt_id: attemptId,
    policy_id: economic.policy.saga_policy_id,
  });

  const custodian = new FakeCustodian();
  let clock = Date.parse("2026-08-06T10:11:00.000Z");
  let plannerCalls = 0;
  let pipelinePrepareCalls = 0;
  let fault: BuyVoidSagaPreparedTransactionFaultStageV1 | null = null;
  const transport = async (call: any) => {
    plannerCalls += 1;
    const resultByMethod: Record<string, string> = {
      eth_chainId: "0x802",
      eth_getTransactionCount: "0x7",
      eth_gasPrice: "0x3b9aca00",
      eth_getBalance: "0x3635c9adc5dea00000",
    };
    return {
      ok: true as const,
      result: resultByMethod[call.method],
      provider_submission_id: `proof-${call.method}`,
      http_status: 200,
    };
  };
  const dependencies = {
    list_claims: () => [claimed],
    list_inventory: () => [reservedInventory],
    planner_transport: transport,
    custodian,
    run_pipeline_command: async (command: Record<string, any>) => {
      if (command.action === "prepare_execution") {
        pipelinePrepareCalls += 1;
        assert.equal(
          command.confirmation,
          VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
        );
      }
      return runBuyVoidPipelineCommandV1(command as any);
    },
    now_ms: () => (clock += 1000),
    fault_inject: async (stage: BuyVoidSagaPreparedTransactionFaultStageV1) => {
      if (fault === stage) {
        fault = null;
        throw new Error(`fault:${stage}`);
      }
    },
  };

  const dry = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    root_dir: root,
    attempt_id: attemptId,
    dependencies,
  });
  assert.equal(dry.ok, true);
  if (!dry.ok || dry.status !== "dry_run") {
    throw new Error("dry run failed");
  }
  const dryInput = { ...dry, root_dir: root };
  assert.equal(dry.existing_plan, null);
  assert.equal(dry.existing_custody, null);
  assert.equal(dry.planner.pending_nonce, 7);
  assert.equal(plannerCalls, 4);

  fault = "after_plan_reservation";
  const afterPlan = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    ...applyFrom(dryInput),
    dependencies,
  } as any);
  assert.equal(afterPlan.ok, false);
  if (afterPlan.ok) throw new Error("plan fault did not hold");
  assert.equal(afterPlan.reason, "injected_after_plan_reservation");
  assert.equal(custodian.prepareCalls, 0);
  let plans = listBuyVoidPreparedTransactionPlanReservationsV1({
    root_dir: root,
    wallet_address: WALLET,
  });
  assert.equal(plans.length, 1);
  assert.equal(plans[0].nonce, 7);

  const walletKey = digest(`void-buy-wallet-v1\n2050\n${WALLET}`);
  const attemptIndex = path.join(
    root,
    "buy-void-prepared-transaction-plan-reservation-v1",
    "wallets",
    walletKey,
    "attempts",
    `${attemptId}.json`,
  );
  fs.rmSync(attemptIndex);
  assert.equal(fs.existsSync(attemptIndex), false);

  const afterExternalCustody = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    ...applyFrom(dryInput),
    dependencies,
  } as any);
  assert.equal(afterExternalCustody.ok, false);
  if (afterExternalCustody.ok) throw new Error("external custody fault did not hold");
  assert.equal(afterExternalCustody.stage, "custody");
  assert.equal(custodian.prepareCalls, 1);
  assert.equal(custodian.prepared.size, 1);
  assert.equal(fs.existsSync(attemptIndex), true);
  assert.equal(plannerCalls, 4);

  fault = "after_custody_record";
  const afterCustodyRecord = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    ...applyFrom(dryInput),
    dependencies,
  } as any);
  assert.equal(afterCustodyRecord.ok, false);
  if (afterCustodyRecord.ok) throw new Error("custody record fault did not hold");
  assert.equal(afterCustodyRecord.reason, "injected_after_custody_record");
  assert.equal(custodian.prepareCalls, 2);
  assert.equal(custodian.prepared.size, 1);
  assert.equal(pipelinePrepareCalls, 0);

  fault = "after_execution_attempt_preparation";
  const afterExecutionPrepare = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    ...applyFrom(dryInput),
    dependencies,
  } as any);
  assert.equal(afterExecutionPrepare.ok, false);
  if (afterExecutionPrepare.ok) throw new Error("execution prepare fault did not hold");
  assert.equal(
    afterExecutionPrepare.reason,
    "injected_after_execution_attempt_preparation",
  );
  assert.equal(pipelinePrepareCalls, 1);
  assert.ok(custodian.inspectCalls >= 1);
  assert.equal(
    initialized.saga
      .createFilesystemSagaStoreV1(
        path.join(root, "buy-void-crash-consistent-saga-runtime-v1"),
      )
      .recover(initialized.saga_id)
      .state.state,
    "attempt_reserved",
  );

  const completed = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    ...applyFrom(dryInput),
    dependencies,
  } as any);
  assert.equal(completed.ok, true);
  if (!completed.ok) throw new Error(completed.reason);
  assert.equal(completed.status, "prepared");
  assert.equal(completed.plan.nonce, 7);
  assert.equal(completed.execution_attempt.status, "prepared");
  assert.equal(completed.transaction_broadcast_performed, false);
  assert.equal(completed.wallet_access_performed, false);
  assert.equal(completed.raw_signed_transaction_persisted, false);
  assert.equal(completed.raw_signed_transaction_returned, false);
  assert.equal(completed.money_movement_performed, false);
  assert.equal(pipelinePrepareCalls, 1);
  assert.equal(custodian.prepared.size, 1);
  assert.equal(plannerCalls, 4);
  assert.equal(
    JSON.stringify(completed).includes('"custody_handle":"'),
    false,
  );

  const sagaRecord = initialized.saga
    .createFilesystemSagaStoreV1(
      path.join(root, "buy-void-crash-consistent-saga-runtime-v1"),
    )
    .recover(initialized.saga_id);
  assert.deepEqual(
    sagaRecord.events.map((event: any) => event.event_type),
    [
      "saga_initialized",
      "claim_committed",
      "inventory_reserved",
      "attempt_reserved",
      "transaction_prepared",
    ],
  );
  assert.equal(
    sagaRecord.state.transaction_hash,
    completed.custody.signed_transaction_hash,
  );
  assert.equal(sagaRecord.state.nonce, 7);

  const duplicate = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    ...applyFrom(dryInput),
    dependencies,
  } as any);
  assert.equal(duplicate.ok, true);
  if (!duplicate.ok) throw new Error(duplicate.reason);
  assert.equal(duplicate.status, "duplicate");
  assert.equal(pipelinePrepareCalls, 1);
  assert.equal(custodian.prepared.size, 1);

  const secondAttempt = "d".repeat(64);
  const secondPlan = reserveBuyVoidPreparedTransactionPlanV1({
    root_dir: root,
    saga_id: `voidbvfsg1_${"e".repeat(64)}`,
    attempt_id: secondAttempt,
    chain_id: "2050",
    wallet_address: WALLET,
    observed_pending_nonce: 7,
    delivery_address: "0x9999999999999999999999999999999999999999",
    native_value_wei: "2500000000000000000",
    gas_limit: "21000",
    max_fee_per_gas_wei: "1100000000",
    max_priority_fee_per_gas_wei: "100000000",
    economic_policy_fingerprint_sha256:
      economic.policy.fingerprints.combined_policy_sha256,
    preparation_policy_fingerprint_sha256:
      completed.plan.preparation_policy_fingerprint_sha256,
    now_ms: clock + 1000,
  });
  assert.equal(secondPlan.ok, true);
  if (!secondPlan.ok) throw new Error(secondPlan.reason);
  assert.equal(secondPlan.reservation.nonce, 8);

  const changedSameAttempt = reserveBuyVoidPreparedTransactionPlanV1({
    root_dir: root,
    saga_id: initialized.saga_id,
    attempt_id: attemptId,
    chain_id: "2050",
    wallet_address: WALLET,
    observed_pending_nonce: 7,
    delivery_address: DELIVERY,
    native_value_wei: "2500000000000000000",
    gas_limit: "22000",
    max_fee_per_gas_wei: "1100000000",
    max_priority_fee_per_gas_wei: "100000000",
    economic_policy_fingerprint_sha256:
      economic.policy.fingerprints.combined_policy_sha256,
    preparation_policy_fingerprint_sha256:
      completed.plan.preparation_policy_fingerprint_sha256,
  });
  assert.equal(changedSameAttempt.ok, false);
  plans = listBuyVoidPreparedTransactionPlanReservationsV1({
    root_dir: root,
    wallet_address: WALLET,
  });
  assert.deepEqual(plans.map((plan) => plan.nonce).sort((a, b) => a - b), [7, 8]);

  const custodyRoot = path.join(
    root,
    "buy-void-prepared-transaction-custody-v1",
  );
  const custodyFiles = recursiveFiles(custodyRoot);
  assert.equal(custodyFiles.length, 1);
  const custodyStat = fs.lstatSync(custodyFiles[0]);
  assert.equal(custodyStat.mode & 0o077, 0);
  const custodyText = fs.readFileSync(custodyFiles[0], "utf8");
  assert.equal(custodyText.includes("raw_signed_transaction\":"), false);
  assert.equal(custodyText.includes("private_key"), false);
  assert.equal(custodyText.includes("mnemonic"), false);

  for (const [name, value] of saved) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  fs.rmSync(base, { recursive: true, force: true });

  console.log(`${MARKER}_PROOF_GREEN`);
  console.log("nonce_7_unique=true");
  console.log("same_pending_nonce_second_attempt_nonce=8");
  console.log("external_custody_prepare_unique=1");
  console.log("execution_prepare_write_unique=1");
  console.log("raw_signed_transaction_application_visibility=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
