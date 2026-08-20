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
import type {
  BuyVoidPreparedTransactionCustodianDecisionV1,
  BuyVoidPreparedTransactionCustodianPrepareRequestV1,
  BuyVoidPreparedTransactionCustodianV1,
} from "../src/economic/buy_void_prepared_transaction_custody_v1.js";
import {
  VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_CONFIRMATION_V1,
  VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1,
  runBuyVoidSagaPreparedTransactionCoordinatorV1,
} from "../src/economic/buy_void_saga_prepared_transaction_coordinator_v1.js";
import {
  inspectBuyVoidPreparedTransactionSubmissionV1,
  type BuyVoidPreparedTransactionBroadcastRequestV1,
  type BuyVoidPreparedTransactionBroadcasterDecisionV1,
  type BuyVoidPreparedTransactionBroadcasterReadyV1,
  type BuyVoidPreparedTransactionBroadcasterV1,
  type BuyVoidPreparedTransactionBroadcastReceiptV1,
} from "../src/economic/buy_void_prepared_transaction_broadcast_custody_v1.js";
import {
  readBuyVoidSagaBroadcastEvidenceStateV1,
  recordBuyVoidSagaBroadcastEvidenceV1,
} from "../src/economic/buy_void_saga_broadcast_evidence_journal_v1.js";
import {
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_ENVS_V1,
} from "../src/economic/buy_void_saga_broadcast_reconciliation_server_policy_v1.js";
import {
  VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
  runBuyVoidSagaBroadcastReconciliationV1,
  type BuyVoidSagaBroadcastReconciliationFaultStageV1,
} from "../src/economic/buy_void_saga_broadcast_reconciliation_coordinator_v1.js";

const MARKER =
  "VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_V1";
const DELIVERY = "0x3333333333333333333333333333333333333333";
const WALLET = "0x4444444444444444444444444444444444444444";
const USDC = "0x6666666666666666666666666666666666666666";
const PAYER = "0x7777777777777777777777777777777777777777";
const RECEIVE = "0x8888888888888888888888888888888888888888";
const VOID_UNITS = "2500000";
const POOL_ID = "void-presale-mainnet0-v1";
const SOURCE_FLOOR = "c4f742c2c2c33c91fcaa27dc462505cd5c19abdc";

function digest(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function requestKey(requestId: string): string {
  return digest(`void-buy-request-v1\n${requestId}`);
}

function paymentKey(identity: string): string {
  return digest(`void-buy-payment-v1\n${identity}`);
}

function makeIntent(label: string): Record<string, any> {
  const requestId = `buyvoid-broadcast-${label}`;
  const paymentTx = `0x${digest(`payment:${label}`).slice(0, 64)}`;
  const paymentIdentity = `voidpay1:ethereum:${paymentTx}:0`;
  const instructionId = `voidbuyinst1_${digest(requestId)}`;
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: Date.parse("2026-08-06T11:10:00.000Z"),
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
      payment_transaction_hash: paymentTx,
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

function makeInventory(
  value: Record<string, any>,
  label: string,
): Record<string, any> {
  return {
    schema: "void_buy_void_inventory_reservation_v1",
    marker: "VOID_BUY_VOID_INVENTORY_RESERVATION_JOURNAL_V1",
    reservation_id: digest(`inventory:${label}`),
    reserved_at_ms: Date.parse("2026-08-06T11:10:01.000Z"),
    pool_id: POOL_ID,
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
    intent_fingerprint: digest(`intent:${label}`),
    reservation_status: "reserved",
    inventory_decrement_performed: false,
    reservation_release_authorized: false,
    execution_authorized_by_this_module: false,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  };
}

function configuredEnv(): Record<string, string> {
  const economic =
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
  const preparation =
    VOID_BUY_VOID_SAGA_PREPARED_TRANSACTION_POLICY_ENVS_V1;
  const broadcast =
    VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_SERVER_POLICY_ENVS_V1;
  return {
    [economic.payment_chain]: "ethereum",
    [economic.payment_usdc_contract]: USDC,
    [economic.payment_receive_address]: RECEIVE,
    [economic.payment_current_block_number]: "123475",
    [economic.payment_min_confirmations]: "12",
    [economic.rate_void_units_numerator]: "2",
    [economic.rate_void_units_denominator]: "1",
    [economic.inventory_policy_version]: "proof-policy-v1",
    [economic.pool_id]: POOL_ID,
    [economic.pool_capacity_void_units]: "10000000",
    [economic.max_reservation_void_units]: "5000000",
    [economic.fulfillment_wallet_address]: WALLET,
    [preparation.rpc_url]: "http://127.0.0.1:18545/",
    [preparation.gas_limit]: "21000",
    [preparation.max_gas_limit]: "30000",
    [preparation.max_fee_per_gas_wei]: "2000000000",
    [preparation.max_priority_fee_per_gas_wei]: "100000000",
    [preparation.fee_multiplier_bps]: "11000",
    [broadcast.receipt_rpc_url]: "http://127.0.0.1:18545/",
    [broadcast.receipt_min_confirmations]: "12",
  };
}

class FakeCustodian implements BuyVoidPreparedTransactionCustodianV1 {
  readonly prepared = new Map<
    string,
    Extract<BuyVoidPreparedTransactionCustodianDecisionV1, { ok: true }>
  >();

  async prepare_once(
    request: Readonly<BuyVoidPreparedTransactionCustodianPrepareRequestV1>,
  ): Promise<BuyVoidPreparedTransactionCustodianDecisionV1> {
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
        `0x${digest(`signed:${request.idempotency_key_sha256}`)}`,
      wallet_address: request.wallet_address,
      signer_fingerprint_sha256:
        digest(`signer:${request.wallet_address}`),
      transaction_plan_fingerprint_sha256:
        request.transaction_plan_fingerprint_sha256,
    };
    this.prepared.set(request.idempotency_key_sha256, prepared);
    return prepared;
  }

  async inspect_prepared(request: Readonly<{
    idempotency_key_sha256: string;
    attempt_id: string;
    custody_handle: string;
  }>): Promise<BuyVoidPreparedTransactionCustodianDecisionV1> {
    const existing = this.prepared.get(request.idempotency_key_sha256);
    if (!existing) return { ok: false, status: "held", reason: "missing" };
    if (
      existing.custody_handle !== request.custody_handle ||
      !existing.custody_handle.includes(request.attempt_id)
    ) {
      return { ok: false, status: "held", reason: "binding_conflict" };
    }
    return { ...existing, status: "duplicate" };
  }
}

class FakeBroadcaster implements BuyVoidPreparedTransactionBroadcasterV1 {
  submitCalls = 0;
  inspectCalls = 0;
  nextSubmitStatus:
    BuyVoidPreparedTransactionBroadcasterReadyV1["status"] = "accepted";
  current: BuyVoidPreparedTransactionBroadcasterReadyV1 | null = null;
  lastRequest: BuyVoidPreparedTransactionBroadcastRequestV1 | null = null;
  receiptTemplate: BuyVoidPreparedTransactionBroadcastReceiptV1 | null = null;

  private outcome(
    request: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
    status: BuyVoidPreparedTransactionBroadcasterReadyV1["status"],
  ): BuyVoidPreparedTransactionBroadcasterReadyV1 {
    const base = {
      ok: true as const,
      transaction_hash: request.signed_transaction_hash,
      provider_submission_id: `provider-${request.attempt_id.slice(0, 12)}`,
    };
    if (status === "not_submitted") {
      return {
        ...base,
        status,
        definitive_not_submitted: true,
        submission_call_performed: false,
        submission_may_have_occurred: false,
        receipt: null,
      };
    }
    if (status === "unknown" || status === "accepted") {
      return {
        ...base,
        status,
        definitive_not_submitted: false,
        submission_call_performed: true,
        submission_may_have_occurred: true,
        receipt: null,
      };
    }
    if (!this.receiptTemplate) throw new Error("receipt_template_missing");
    return {
      ...base,
      status,
      definitive_not_submitted: false,
      submission_call_performed: true,
      submission_may_have_occurred: true,
      receipt: {
        ...this.receiptTemplate,
        transaction_hash: request.signed_transaction_hash,
        transaction_status: status === "confirmed" ? 1 : 0,
      },
    };
  }

  setStatus(
    status: BuyVoidPreparedTransactionBroadcasterReadyV1["status"],
  ): void {
    if (!this.lastRequest) {
      this.nextSubmitStatus = status;
      return;
    }
    this.current = this.outcome(this.lastRequest, status);
  }

  async submit_once(
    request: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
  ): Promise<BuyVoidPreparedTransactionBroadcasterDecisionV1> {
    this.submitCalls += 1;
    this.lastRequest = structuredClone(request);
    assert.equal(
      Object.prototype.hasOwnProperty.call(request, "custody_handle"),
      false,
    );
    assert.equal(
      Object.keys(request).some((key) =>
        key.toLowerCase().includes("signed_payload"),
      ),
      false,
    );
    if (this.current) return structuredClone(this.current);
    const outcome = this.outcome(request, this.nextSubmitStatus);
    if (outcome.status !== "not_submitted") {
      this.current = structuredClone(outcome);
    }
    return outcome;
  }

  async inspect_submission(
    request: Readonly<BuyVoidPreparedTransactionBroadcastRequestV1>,
  ): Promise<BuyVoidPreparedTransactionBroadcasterDecisionV1> {
    this.inspectCalls += 1;
    this.lastRequest = structuredClone(request);
    return structuredClone(
      this.current || this.outcome(request, "not_submitted"),
    );
  }
}

async function initializeSaga(input: {
  root: string;
  intent: Record<string, any>;
  inventory: Record<string, any>;
  attempt_id: string;
  policy_id: string;
}): Promise<{ saga: any; saga_id: string }> {
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
    pool_id: POOL_ID,
  });
  const sagaId = saga.computeSagaIdV1(binding);
  const store = saga.createFilesystemSagaStoreV1(
    path.join(input.root, "buy-void-crash-consistent-saga-runtime-v1"),
  );
  const now = Date.parse("2026-08-06T11:10:02.000Z");
  const owner = `broadcast-proof-${input.attempt_id.slice(0, 12)}`;
  const lease = store.acquireLease({
    saga_id: sagaId,
    owner_id: owner,
    now_ms: now,
    ttl_ms: 30_000,
  });
  assert.equal(lease.ok, true);
  if (!lease.ok) throw new Error("saga_lease_missing");
  const inputs = [
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
  for (let index = 0; index < inputs.length; index += 1) {
    const current = store.recover(sagaId);
    const event = saga.buildSagaEventV1({
      binding,
      sequence: current?.state?.event_count || 0,
      previous_event_id: current?.state?.last_event_id || null,
      recorded_at_utc: new Date(now + index * 1000).toISOString(),
      event_type: inputs[index].event_type,
      fencing_token: lease.lease.fencing_token,
      payload: inputs[index].payload,
    });
    store.appendEvent({
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
  return { saga, saga_id: sagaId };
}

type Setup = {
  root: string;
  intent: Record<string, any>;
  inventory: Record<string, any>;
  attempt_id: string;
  custody: any;
  saga: any;
  saga_id: string;
  broadcaster: FakeBroadcaster;
  dependencies: Record<string, any>;
  clock: { value: number };
  fault: { value: BuyVoidSagaBroadcastReconciliationFaultStageV1 | null };
};

async function setup(label: string): Promise<Setup> {
  const root = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), `void-broadcast-${label}-`)),
    "root",
  );
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const intent = makeIntent(label);
  const inventory = makeInventory(intent, label);
  const economic = readBuyVoidCrashConsistentSagaServerPolicyV1();
  if ("reason" in economic) throw new Error(economic.reason);
  const attemptDecision = reserveBuyVoidExecutionAttemptV1({
    root_dir: root,
    intent: intent as any,
    policy: economic.policy.execution_policy as
      BuyVoidExecutionAttemptPolicyV1,
    now_ms: Date.parse("2026-08-06T11:10:01.000Z"),
  });
  if ("reason" in attemptDecision) {
    throw new Error(attemptDecision.reason);
  }
  const attemptId = attemptDecision.attempt.reservation.attempt_id;
  const initialized = await initializeSaga({
    root,
    intent,
    inventory,
    attempt_id: attemptId,
    policy_id: economic.policy.saga_policy_id,
  });
  const custodian = new FakeCustodian();
  const clock = { value: Date.parse("2026-08-06T11:11:00.000Z") };
  const plannerTransport = async (call: any) => {
    const results: Record<string, string> = {
      eth_chainId: "0x802",
      eth_getTransactionCount: "0x7",
      eth_gasPrice: "0x3b9aca00",
      eth_getBalance: "0x3635c9adc5dea00000",
    };
    return {
      ok: true as const,
      result: results[call.method],
      provider_submission_id: `planner-${call.method}`,
      http_status: 200,
    };
  };
  const preparedDependencies = {
    list_claims: () => [intent],
    list_inventory: () => [inventory],
    planner_transport: plannerTransport,
    custodian,
    run_pipeline_command: (command: Record<string, any>) =>
      runBuyVoidPipelineCommandV1(command as any),
    now_ms: () => (clock.value += 1000),
  };
  const dry = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    root_dir: root,
    attempt_id: attemptId,
    dependencies: preparedDependencies,
  });
  if ("reason" in dry || dry.status !== "dry_run") {
    throw new Error("prepared_transaction_dry_run_failed");
  }
  const prepared = await runBuyVoidSagaPreparedTransactionCoordinatorV1({
    root_dir: root,
    attempt_id: attemptId,
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
    pipeline_confirmation:
      VOID_BUY_VOID_PIPELINE_CONFIRMATIONS_V1.prepare_execution,
    dependencies: preparedDependencies,
  });
  if ("reason" in prepared) throw new Error(prepared.reason);
  assert.equal(prepared.status, "prepared");
  const broadcaster = new FakeBroadcaster();
  broadcaster.receiptTemplate = {
    chain_id: "2050",
    transaction_hash: prepared.custody.signed_transaction_hash,
    transaction_status: 1,
    block_number: "200",
    block_hash: `0x${digest(`block:${label}`)}`,
    current_block_number: "211",
    confirmation_count: "12",
    from_address: WALLET,
    to_address: DELIVERY,
    amount_units: VOID_UNITS,
  };
  const fault = {
    value: null as BuyVoidSagaBroadcastReconciliationFaultStageV1 | null,
  };
  const dependencies = {
    list_claims: () => [intent],
    broadcaster,
    now_ms: () => (clock.value += 1000),
    run_pipeline_command: (command: Record<string, any>) =>
      runBuyVoidPipelineCommandV1(command as any),
    fault_inject: async (
      stage: BuyVoidSagaBroadcastReconciliationFaultStageV1,
    ) => {
      if (fault.value === stage) {
        fault.value = null;
        throw new Error(`injected:${stage}`);
      }
    },
  };
  return {
    root,
    intent,
    inventory,
    attempt_id: attemptId,
    custody: prepared.custody,
    saga: initialized.saga,
    saga_id: initialized.saga_id,
    broadcaster,
    dependencies,
    clock,
    fault,
  };
}

async function dry(setup: Setup): Promise<any> {
  const result = await runBuyVoidSagaBroadcastReconciliationV1({
    root_dir: setup.root,
    saga_id: setup.saga_id,
    dependencies: setup.dependencies,
  });
  if ("reason" in result || result.status !== "dry_run") {
    throw new Error("broadcast_dry_run_failed");
  }
  return result;
}

function applyInput(setup: Setup, preview: any): Record<string, unknown> {
  return {
    root_dir: setup.root,
    saga_id: setup.saga_id,
    apply: true,
    confirmation:
      VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_CONFIRMATION_V1,
    policy_fingerprint_sha256:
      preview.required_policy_fingerprint_sha256,
    saga_confirmation: preview.required_saga_confirmation,
    saga_action_confirmation:
      preview.required_saga_action_confirmation,
    ...(preview.required_broadcast_confirmation
      ? {
          broadcast_confirmation:
            preview.required_broadcast_confirmation,
        }
      : {}),
    dependencies: setup.dependencies,
  };
}

function sagaState(setup: Setup): any {
  return setup.saga
    .createFilesystemSagaStoreV1(
      path.join(
        setup.root,
        "buy-void-crash-consistent-saga-runtime-v1",
      ),
    )
    .recover(setup.saga_id);
}

async function scenarioIntentBeforeSubmit(): Promise<void> {
  const value = await setup("intent-before-submit");
  const firstDry = await dry(value);
  assert.equal(firstDry.next_action, "execute_prepared_transaction");
  const evidenceDir = path.join(
    value.root,
    "buy-void-saga-broadcast-evidence-v1",
  );
  assert.equal(fs.existsSync(evidenceDir), false);
  value.fault.value = "after_broadcast_intent_before_submit";
  const crashed = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, firstDry) as any,
  );
  assert.equal(crashed.ok, false);
  assert.equal(value.broadcaster.submitCalls, 0);
  assert.equal(sagaState(value).state.state, "broadcast_intent_committed");

  const reconcileDry = await dry(value);
  assert.equal(reconcileDry.next_action, "reconcile_possible_broadcast");
  const notSubmitted = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, reconcileDry) as any,
  );
  if ("reason" in notSubmitted) throw new Error(notSubmitted.reason);
  assert.equal(notSubmitted.status, "not_submitted");
  assert.equal(value.broadcaster.submitCalls, 0);
  assert.equal(value.broadcaster.inspectCalls, 1);
  assert.equal(sagaState(value).state.state, "broadcast_not_attempted");

  value.broadcaster.nextSubmitStatus = "accepted";
  const retryDry = await dry(value);
  const accepted = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, retryDry) as any,
  );
  if ("reason" in accepted) throw new Error(accepted.reason);
  assert.equal(accepted.status, "accepted");
  assert.equal(value.broadcaster.submitCalls, 1);
  assert.equal(sagaState(value).state.state, "broadcast_accepted");

  value.broadcaster.setStatus("confirmed");
  const terminalDry = await dry(value);
  const confirmed = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, terminalDry) as any,
  );
  if ("reason" in confirmed) throw new Error(confirmed.reason);
  assert.equal(confirmed.status, "confirmed");
  assert.equal(value.broadcaster.submitCalls, 1);
  assert.equal(sagaState(value).state.state, "receipt_confirmed");
  fs.rmSync(path.dirname(value.root), { recursive: true, force: true });
}

async function scenarioSubmitBeforeEvidence(): Promise<void> {
  const value = await setup("submit-before-evidence");
  const preview = await dry(value);
  value.fault.value = "after_external_outcome_before_evidence";
  const crashed = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, preview) as any,
  );
  assert.equal(crashed.ok, false);
  assert.equal(value.broadcaster.submitCalls, 1);
  assert.equal(
    readBuyVoidSagaBroadcastEvidenceStateV1({
      root_dir: value.root,
      attempt_id: value.attempt_id,
    }),
    null,
  );
  assert.equal(sagaState(value).state.state, "broadcast_intent_committed");
  const reconcile = await dry(value);
  const recovered = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, reconcile) as any,
  );
  if ("reason" in recovered) throw new Error(recovered.reason);
  assert.equal(recovered.status, "accepted");
  assert.equal(value.broadcaster.submitCalls, 1);
  assert.equal(value.broadcaster.inspectCalls, 1);
  assert.equal(sagaState(value).state.state, "broadcast_accepted");
  fs.rmSync(path.dirname(value.root), { recursive: true, force: true });
}

async function scenarioEvidenceBeforeProjection(): Promise<void> {
  const value = await setup("evidence-before-projection");
  const preview = await dry(value);
  value.fault.value = "after_evidence_before_projection";
  const crashed = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, preview) as any,
  );
  assert.equal(crashed.ok, false);
  const evidence = readBuyVoidSagaBroadcastEvidenceStateV1({
    root_dir: value.root,
    attempt_id: value.attempt_id,
  });
  assert.equal(evidence?.latest.outcome, "accepted");
  assert.equal(sagaState(value).state.state, "broadcast_intent_committed");
  const reconcile = await dry(value);
  const recovered = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, reconcile) as any,
  );
  if ("reason" in recovered) throw new Error(recovered.reason);
  assert.equal(recovered.status, "accepted");
  assert.equal(value.broadcaster.submitCalls, 1);
  assert.equal(sagaState(value).state.state, "broadcast_accepted");
  fs.rmSync(path.dirname(value.root), { recursive: true, force: true });
}

async function scenarioProjectionBeforeSaga(): Promise<void> {
  const value = await setup("projection-before-saga");
  value.broadcaster.nextSubmitStatus = "confirmed";
  const preview = await dry(value);
  value.fault.value = "after_projection_before_saga";
  const crashed = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, preview) as any,
  );
  assert.equal(crashed.ok, false);
  assert.equal(value.broadcaster.submitCalls, 1);
  assert.equal(sagaState(value).state.state, "broadcast_intent_committed");
  const evidence = readBuyVoidSagaBroadcastEvidenceStateV1({
    root_dir: value.root,
    attempt_id: value.attempt_id,
  });
  assert.equal(evidence?.latest.outcome, "confirmed");
  const reconcile = await dry(value);
  const recovered = await runBuyVoidSagaBroadcastReconciliationV1({
    ...(applyInput(value, reconcile) as any),
    dependencies: {
      ...value.dependencies,
      broadcaster: undefined,
    },
  });
  if ("reason" in recovered) throw new Error(recovered.reason);
  assert.equal(recovered.status, "confirmed");
  assert.equal(value.broadcaster.submitCalls, 1);
  assert.equal(value.broadcaster.inspectCalls, 0);
  assert.equal(sagaState(value).state.state, "receipt_confirmed");
  fs.rmSync(path.dirname(value.root), { recursive: true, force: true });
}

async function scenarioUnknownAndReverted(): Promise<void> {
  const unknown = await setup("unknown");
  unknown.broadcaster.nextSubmitStatus = "unknown";
  const executeDry = await dry(unknown);
  const executed = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(unknown, executeDry) as any,
  );
  if ("reason" in executed) throw new Error(executed.reason);
  assert.equal(executed.status, "unknown");
  assert.equal(sagaState(unknown).state.state, "broadcast_unknown");
  const pendingDry = await dry(unknown);
  const pending = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(unknown, pendingDry) as any,
  );
  assert.equal(pending.ok, false);
  assert.equal(unknown.broadcaster.submitCalls, 1);
  assert.equal(unknown.broadcaster.inspectCalls, 1);
  unknown.broadcaster.setStatus("accepted");
  const acceptedDry = await dry(unknown);
  const accepted = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(unknown, acceptedDry) as any,
  );
  if ("reason" in accepted) throw new Error(accepted.reason);
  assert.equal(accepted.status, "accepted");
  assert.equal(unknown.broadcaster.submitCalls, 1);
  fs.rmSync(path.dirname(unknown.root), { recursive: true, force: true });

  const reverted = await setup("reverted");
  const firstDry = await dry(reverted);
  const first = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(reverted, firstDry) as any,
  );
  if ("reason" in first) throw new Error(first.reason);
  reverted.broadcaster.setStatus("reverted");
  const revertDry = await dry(reverted);
  const final = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(reverted, revertDry) as any,
  );
  if ("reason" in final) throw new Error(final.reason);
  assert.equal(final.status, "reverted");
  assert.equal(final.saga_state.state, "receipt_reverted");
  assert.equal(final.saga_state.terminal, true);
  assert.equal(reverted.broadcaster.submitCalls, 1);
  fs.rmSync(path.dirname(reverted.root), { recursive: true, force: true });
}


async function scenarioInspectionAuthorityAndTerminalEvidence(): Promise<void> {
  const value = await setup("terminal-evidence-immutable");
  value.broadcaster.nextSubmitStatus = "confirmed";
  const preview = await dry(value);
  value.fault.value = "after_projection_before_saga";
  const crashed = await runBuyVoidSagaBroadcastReconciliationV1(
    applyInput(value, preview) as any,
  );
  assert.equal(crashed.ok, false);
  assert.equal(sagaState(value).state.state, "broadcast_intent_committed");

  const before = readBuyVoidSagaBroadcastEvidenceStateV1({
    root_dir: value.root,
    attempt_id: value.attempt_id,
  });
  assert.ok(before);
  assert.equal(before.latest.outcome, "confirmed");
  const terminalReceipt = before.latest.receipt;
  assert.ok(terminalReceipt);
  const eventCount = before.events.length;
  const terminalEventId = before.latest.event_id;

  const exactOutcome = {
    ok: true as const,
    status: "confirmed" as const,
    transaction_hash: before.transaction_hash,
    provider_submission_id: before.latest.provider_submission_id,
    definitive_not_submitted: false as const,
    submission_call_performed: true as const,
    submission_may_have_occurred: true as const,
    receipt: structuredClone(terminalReceipt),
  };
  const duplicate = recordBuyVoidSagaBroadcastEvidenceV1({
    root_dir: value.root,
    saga_id: value.saga_id,
    attempt_id: value.attempt_id,
    broadcast_intent_id: before.broadcast_intent_id,
    transaction_hash: before.transaction_hash,
    outcome: exactOutcome,
    now_ms: (value.clock.value += 1000),
  });
  if (duplicate.status === "held") {
    throw new Error(duplicate.reason);
  }
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.mutation_performed, false);

  const conflict = recordBuyVoidSagaBroadcastEvidenceV1({
    root_dir: value.root,
    saga_id: value.saga_id,
    attempt_id: value.attempt_id,
    broadcast_intent_id: before.broadcast_intent_id,
    transaction_hash: before.transaction_hash,
    outcome: {
      ...exactOutcome,
      receipt: {
        ...exactOutcome.receipt,
        block_number: "201",
        block_hash: `0x${digest("conflicting-terminal-block")}`,
        current_block_number: "212",
        confirmation_count: "12",
      },
    },
    now_ms: (value.clock.value += 1000),
  });
  if (conflict.status !== "held") {
    throw new Error("conflicting_terminal_receipt_must_hold");
  }
  assert.equal(
    conflict.reason,
    "broadcast_evidence_terminal_evidence_conflict",
  );

  const afterConflict = readBuyVoidSagaBroadcastEvidenceStateV1({
    root_dir: value.root,
    attempt_id: value.attempt_id,
  });
  assert.ok(afterConflict);
  assert.equal(afterConflict.events.length, eventCount);
  assert.equal(afterConflict.latest.event_id, terminalEventId);

  const currentSaga = sagaState(value);
  const inspected = await inspectBuyVoidPreparedTransactionSubmissionV1({
    saga_id: value.saga_id,
    broadcast_intent_id: currentSaga.state.broadcast_intent_id,
    custody: value.custody,
    broadcaster: value.broadcaster,
  });
  if (inspected.status === "held") {
    throw new Error(inspected.reason);
  }
  assert.equal(inspected.status, "confirmed");
  assert.equal(inspected.broadcaster_called, true);
  assert.equal(inspected.mutation_performed, false);
  assert.equal(inspected.submission_call_performed, false);
  assert.equal(inspected.transaction_broadcast_performed, false);
  assert.equal(inspected.money_movement_performed, false);

  const reconcile = await dry(value);
  const recovered = await runBuyVoidSagaBroadcastReconciliationV1({
    ...(applyInput(value, reconcile) as any),
    dependencies: {
      ...value.dependencies,
      broadcaster: undefined,
    },
  });
  if (!recovered.ok) throw new Error(recovered.reason);
  assert.equal(recovered.status, "confirmed");
  assert.equal(sagaState(value).state.state, "receipt_confirmed");
  fs.rmSync(path.dirname(value.root), { recursive: true, force: true });
}

async function main(): Promise<void> {
  const saved = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(configuredEnv())) {
    saved.set(name, process.env[name]);
    process.env[name] = value;
  }
  try {
    await scenarioIntentBeforeSubmit();
    await scenarioSubmitBeforeEvidence();
    await scenarioEvidenceBeforeProjection();
    await scenarioProjectionBeforeSaga();
    await scenarioInspectionAuthorityAndTerminalEvidence();
    await scenarioUnknownAndReverted();
  } finally {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
  process.stdout.write([
    `${MARKER}_PROOF_GREEN`,
    "write_ahead_intent_before_submit=true",
    "reconciliation_resubmit_count=0",
    "submit_before_evidence_recovered=true",
    "evidence_before_projection_recovered=true",
    "projection_before_saga_recovered=true",
    "terminal_receipt_block_hash_recoverable=true",
    "terminal_evidence_duplicate_idempotent=true",
    "semantic_duplicate_projection_runtime_exact=true",
    "adversarial_proof_closed_status_discriminants=true",
    "terminal_receipt_conflict_rejected=true",
    "inspection_current_call_broadcast=false",
    "unknown_requires_inspection=true",
    "reverted_terminal=true",
    "custody_handle_application_visibility=false",
    "signed_payload_bytes_application_visibility=false",
    "automatic_retry=false",
    "real_rpc_wallet_signer_broadcast=false",
  ].join("\n") + "\n");
}

main().catch((error) => {
  process.stderr.write(
    `${String((error as Error)?.stack || error)}\n`,
  );
  process.exitCode = 1;
});
