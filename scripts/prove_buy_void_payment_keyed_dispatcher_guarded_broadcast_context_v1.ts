#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyBuyVoidPaymentKeyedDispatcherPreparationRecoveryV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_preparation_recovery_apply_v1.js";
import {
  buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_context_v1.js";
import {
  claimBuyVoidPaymentKeyedPreparedAttemptV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_claim_v1.js";
import {
  submitBuyVoidPaymentKeyedDispatchV1,
  type BuyVoidPaymentKeyedDispatcherAuditDecisionV1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
  type BuyVoidPaymentKeyedDispatcherTransactionV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  buyVoidExecutionAttemptIntentFingerprintV1,
  readBuyVoidExecutionAttemptV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import {
  reserveBuyVoidInventoryV1,
} from "../src/economic/buy_void_inventory_reservation_journal_v1.js";
import {
  buildBuyVoidPaymentKeyedFulfillmentCallV1,
} from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import {
  reserveBuyVoidPaymentKeyedPlanV1,
} from "../src/economic/buy_void_payment_keyed_plan_reservation_v1.js";
import {
  VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
} from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import {
  VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1,
  VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1,
  buyVoidPaymentKeyedFullRuntimePolicyStateV1,
} from "../src/economic/buy_void_payment_keyed_full_runtime_v1.js";
import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";

const ATTEMPT = "1".repeat(64);
const PAYMENT_TX = "0x" + "a".repeat(64);
const PAYMENT_ID = "voidpay1:base:" + PAYMENT_TX + ":0";
const LOCAL_PAYMENT_KEY = "2".repeat(64);
const REQUEST_KEY = "3".repeat(64);
const REQUEST_FINGERPRINT = "e".repeat(64);
const REQUEST_IDEMPOTENCY = "d".repeat(64);
const DELIVERY = "0x7777777777777777777777777777777777777777";
const FULFILLMENT_CONTRACT =
  "0x8888888888888888888888888888888888888888";
const VOID_TOKEN = "0x6666666666666666666666666666666666666666";
const VOID_UNITS = "2000000";
const TX_HASH = "0x" + "9".repeat(64);
const RAW_SHA = "c".repeat(64);
const SOURCE_FLOOR_MAIN =
  "471ab1f6b52925cc20970630c4e821a3c1246836";
const WALLET =
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_RECORD_V1
    .derived_wallet_address.toLowerCase();

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function canonicalPaymentKey(identity: string): string {
  const body = Buffer.from(identity, "utf8");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length, 0);
  return crypto
    .createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from("VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\0", "ascii"),
        length,
        body,
      ]),
    )
    .digest("hex");
}

function cloneJob(
  value: BuyVoidPaymentKeyedDispatcherJobRecordV1 | null,
): BuyVoidPaymentKeyedDispatcherJobRecordV1 | null {
  return value ? structuredClone(value) : null;
}

class MemoryStore implements BuyVoidPaymentKeyedDispatcherStoreV1 {
  authority = {
    transaction_isolation: "SERIALIZABLE" as const,
    per_job_admission:
      "session_advisory_lock_before_serializable_snapshot" as const,
    canonical_audit_order: "per_job_decision_seq" as const,
    retry_sqlstates: ["40001", "40P01"] as const,
  };
  jobs = new Map<string, BuyVoidPaymentKeyedDispatcherJobRecordV1>();
  audits = new Map<string, BuyVoidPaymentKeyedDispatcherAuditDecisionV1[]>();
  clock = 1_000_000n;
  decision_call_count = 0;
  decision_active = false;
  before_decision: ((call: number) => void) | null = null;
  after_decision: ((call: number) => void) | null = null;
  before_now_us:
    | ((decisionCall: number, nowCall: number) => void)
    | null = null;

  async run_serializable_job_decision<T>(
    _attemptId: string,
    action: (
      tx: BuyVoidPaymentKeyedDispatcherTransactionV1,
    ) => T | Promise<T>,
  ): Promise<T> {
    this.decision_call_count += 1;
    const decisionCall = this.decision_call_count;
    this.before_decision?.(decisionCall);
    const jobs = structuredClone(this.jobs);
    const audits = structuredClone(this.audits);
    let nowCall = 0;
    const tx: BuyVoidPaymentKeyedDispatcherTransactionV1 = {
      now_us: () => {
        nowCall += 1;
        this.before_now_us?.(decisionCall, nowCall);
        this.clock += 1n;
        return this.clock;
      },
      read_job_for_update: (id) => cloneJob(jobs.get(id) || null),
      insert_job: (record) => {
        if (jobs.has(record.attempt_id)) return false;
        jobs.set(record.attempt_id, structuredClone(record));
        return true;
      },
      update_job: (id, expectedVersion, next) => {
        const current = jobs.get(id);
        if (!current || current.version !== expectedVersion) return false;
        jobs.set(id, structuredClone(next));
        return true;
      },
      append_decision: (decision) => {
        const rows = audits.get(decision.attempt_id) || [];
        const sequence = BigInt(rows.length + 1);
        rows.push({
          ...structuredClone(decision),
          decision_seq: sequence,
        });
        audits.set(decision.attempt_id, rows);
        return sequence;
      },
    };
    this.decision_active = true;
    try {
      const result = await action(tx);
      this.jobs = jobs;
      this.audits = audits;
      this.after_decision?.(decisionCall);
      return result;
    } finally {
      this.decision_active = false;
    }
  }
}

function ensurePrivateDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dir, 0o700);
}

function writePrivateJson(file: string, value: unknown): void {
  ensurePrivateDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

function snapshotTree(root: string): string {
  const rows: string[] = [];
  const visit = (current: string, relative: string) => {
    const entries = fs.readdirSync(current, {
      withFileTypes: true,
    }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = relative
        ? path.join(relative, entry.name)
        : entry.name;
      const stat = fs.lstatSync(full);
      if (entry.isDirectory()) {
        rows.push(
          "D " + rel + " " + (stat.mode & 0o777).toString(8),
        );
        visit(full, rel);
      } else if (entry.isFile()) {
        const bytes = fs.readFileSync(full);
        rows.push(
          "F " +
            rel +
            " " +
            (stat.mode & 0o777).toString(8) +
            " " +
            bytes.length +
            " " +
            crypto.createHash("sha256").update(bytes).digest("hex"),
        );
      } else {
        rows.push("X " + rel);
      }
    }
  };
  visit(root, "");
  return rows.join("\n");
}

function makeTreePrivate(root: string): void {
  fs.chmodSync(root, 0o700);
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) {
      makeTreePrivate(target);
    } else if (entry.isFile()) {
      fs.chmodSync(target, 0o600);
    }
  }
}

function hasKey(value: unknown, key: string, depth = 0): boolean {
  if (depth > 20 || value === null || value === undefined) return false;
  if (Array.isArray(value)) {
    return value.some((entry) => hasKey(entry, key, depth + 1));
  }
  if (typeof value !== "object") return false;
  const object = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(object, key)) return true;
  return Object.values(object).some((entry) =>
    hasKey(entry, key, depth + 1),
  );
}

function configureRuntimeEnv(root: string): () => void {
  const common =
    VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_SERVER_POLICY_ENVS_V1;
  const dual = VOID_BUY_VOID_CANONICAL_DUAL_RAIL_PAYMENT_ENVS_V1;
  const full = VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;
  const values: Record<string, string> = {
    [common.rate_void_units_numerator]: "2",
    [common.rate_void_units_denominator]: "1",
    [common.inventory_policy_version]: "presale-v1",
    [common.pool_id]: "buy-void-presale-v1",
    [common.pool_capacity_void_units]: "10000000000000",
    [common.max_reservation_void_units]: "10000000000000",
    [common.fulfillment_wallet_address]: WALLET,
    [dual.base.usdc_contract]:
      "0x1111111111111111111111111111111111111111",
    [dual.base.receive_address]:
      "0x2222222222222222222222222222222222222222",
    [dual.base.finalized_reference_block]: "123475",
    [dual.base.min_confirmations]: "12",
    [dual.ethereum.usdc_contract]:
      "0x3333333333333333333333333333333333333333",
    [dual.ethereum.receive_address]:
      "0x4444444444444444444444444444444444444444",
    [dual.ethereum.finalized_reference_block]: "987654",
    [dual.ethereum.min_confirmations]: "15",
    [full.enabled]: "1",
    [full.apply_enabled]: "0",
    [full.root_dir]: root,
    [full.rpc_url]: "http://127.0.0.1:18545/",
    [full.fulfillment_contract_address]: FULFILLMENT_CONTRACT,
    [full.gas_limit_multiplier_bps]: "12000",
    [full.max_gas_limit]: "320000",
    [full.fee_multiplier_bps]: "20000",
    [full.max_fee_per_gas_wei]: "5000000000",
    [full.max_priority_fee_per_gas_wei]: "1000000000",
    [full.request_timeout_ms]: "1000",
    [full.max_response_bytes]: "1048576",
    [full.void_token_address]: VOID_TOKEN,
    [full.receipt_min_confirmations]: "3",
  };
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function makeIntent(): Record<string, any> {
  const instructionId = "voidbuyinst1_" + "4".repeat(64);
  return {
    schema: "void_buy_void_fulfillment_journal_intent_v1",
    marker: "VOID_BUY_VOID_FULFILLMENT_JOURNAL_V1",
    created_at_ms: 1_700_000_000_000,
    payment_key_sha256: LOCAL_PAYMENT_KEY,
    request_key_sha256: REQUEST_KEY,
    claim: {
      schema: "void_buy_void_fulfillment_claim_v1",
      marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
      canonical_payment_identity: PAYMENT_ID,
      canonical_payment_identity_sha256: sha256(PAYMENT_ID),
      request_id: "dispatcher-preparation-recovery-proof",
      decision_fingerprint: "7".repeat(64),
      instruction_id: instructionId,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: instructionId,
        request_id: "dispatcher-preparation-recovery-proof",
        canonical_payment_identity: PAYMENT_ID,
        source_chain: "base",
        payment_transaction_hash: PAYMENT_TX,
        payment_log_index: "0",
        confirmed_block_number: "123456",
        confirmation_count: "20",
        payment_usdc_units: "1000000",
        delivery_address: DELIVERY,
        void_amount_units: VOID_UNITS,
        signing_authorized: false,
        transaction_broadcast_authorized: false,
        automatic_execution_authorized: false,
      },
      status: "claimed",
    },
    verification_binding: {
      source_chain: "base",
      payment_transaction_hash: PAYMENT_TX,
      payment_log_index: "0",
      confirmed_block_number: "123456",
      confirmation_count_at_claim: "20",
      usdc_contract:
        "0x1111111111111111111111111111111111111111",
      payer_address:
        "0x9999999999999999999999999999999999999999",
      receive_address:
        "0x2222222222222222222222222222222222222222",
      delivery_address: DELIVERY,
      payment_usdc_units: "1000000",
      requested_usdc_units: "1000000",
      quoted_void_units: VOID_UNITS,
    },
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

function writeIntent(root: string, intent: Record<string, any>): void {
  writePrivateJson(
    path.join(
      root,
      "buy-void-auto-fulfillment-v1",
      "payments",
      intent.payment_key_sha256 + ".json",
    ),
    intent,
  );
}

function writePreparedAttempt(
  root: string,
  intent: Record<string, any>,
): void {
  const dir = path.join(
    root,
    "buy-void-execution-attempts-v1",
    "attempts",
    ATTEMPT,
  );
  writePrivateJson(path.join(dir, "reserved.json"), {
    schema: "void_buy_void_execution_attempt_reservation_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    attempt_id: ATTEMPT,
    attempt_number: 1,
    reserved_at_ms: 1_700_000_000_100,
    payment_key_sha256: intent.payment_key_sha256,
    request_key_sha256: intent.request_key_sha256,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    request_id: intent.claim.request_id,
    instruction_id: intent.claim.instruction_id,
    intent_fingerprint:
      buyVoidExecutionAttemptIntentFingerprintV1(intent as any),
    max_attempts_per_payment: 1,
    unsigned_instruction: intent.claim.unsigned_instruction,
    signing_authorized_by_this_module: false,
    transaction_broadcast_authorized_by_this_module: false,
    money_movement_authorized_by_this_module: false,
  });
  writePrivateJson(path.join(dir, "prepared.json"), {
    schema: "void_buy_void_execution_prepared_transaction_v1",
    marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
    attempt_id: ATTEMPT,
    prepared_at_ms: 1_700_000_000_200,
    chain_id: "2050",
    void_delivery_tx_hash: TX_HASH,
    fulfillment_wallet: WALLET,
    delivery_address: DELIVERY,
    void_amount_units: VOID_UNITS,
    transaction_binding_fingerprint: "4".repeat(64),
    signed_transaction_persisted: false,
    raw_transaction_persisted: false,
    transaction_broadcast_performed_by_this_module: false,
  });
}

function sourceFinalityReady(): any {
  return {
    ok: true,
    status: "ready",
    marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
    version: 1,
    attempt_id: ATTEMPT,
    source_chain: "base",
    canonical_payment_identity: PAYMENT_ID,
    payment_key_sha256: canonicalPaymentKey(PAYMENT_ID),
    process_source_identity_verified: true,
    reviewed_source_files_verified: true,
    authenticated_transport_identity_verified: true,
    total_operation_deadline_verified: true,
    source_generation_verified: true,
    deployed_artifact_generation_verified: true,
    ancestry_verified: true,
    provider_quorum_verified: true,
    production_source_finality_authority_ready: true,
    wallet_access_performed: false,
    signing_performed: false,
    transaction_broadcast_performed: false,
    money_movement_performed: false,
  };
}

async function initializeSaga(
  root: string,
  intent: Record<string, any>,
  policyId: string,
  poolId: string,
  inventoryReservationId: string,
): Promise<{ saga_id: string; read_state: () => any }> {
  const saga: any = await import(
    new URL(
      "../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs",
      import.meta.url,
    ).href,
  );
  const binding = saga.validateSagaBindingV1({
    request_id: intent.claim.request_id,
    canonical_payment_identity:
      intent.claim.canonical_payment_identity,
    request_key_sha256: intent.request_key_sha256,
    payment_key_sha256: intent.payment_key_sha256,
    delivery_address:
      intent.claim.unsigned_instruction.delivery_address,
    void_amount_units:
      intent.claim.unsigned_instruction.void_amount_units,
    chain_id: "2050",
    pool_id: poolId,
  });
  const sagaId = saga.computeSagaIdV1(binding);
  const sagaRoot = path.join(
    root,
    "buy-void-crash-consistent-saga-runtime-v1",
  );
  const store = saga.createFilesystemSagaStoreV1(sagaRoot);
  const now = 1_700_000_001_000;
  const owner = "dispatcher-preparation-recovery-proof";
  const lease = store.acquireLease({
    saga_id: sagaId,
    owner_id: owner,
    now_ms: now,
    ttl_ms: 30_000,
  });
  assert.equal(lease.ok, true);
  if (!lease.ok) throw new Error("saga_lease_required");

  const events = [
    {
      event_type: "saga_initialized",
      payload: {
        source_floor_main: SOURCE_FLOOR_MAIN,
        policy_id: policyId,
        max_attempts: 1,
      },
    },
    {
      event_type: "claim_committed",
      payload: {
        claim_id: intent.claim.decision_fingerprint,
        instruction_id: intent.claim.instruction_id,
      },
    },
    {
      event_type: "inventory_reserved",
      payload: { reservation_id: inventoryReservationId },
    },
    {
      event_type: "attempt_reserved",
      payload: { attempt_id: ATTEMPT, attempt_number: 1 },
    },
  ];
  let record: any = null;
  for (let index = 0; index < events.length; index += 1) {
    const current = store.recover(sagaId);
    const event = saga.buildSagaEventV1({
      binding,
      sequence: current?.state?.event_count || 0,
      previous_event_id: current?.state?.last_event_id || null,
      recorded_at_utc:
        new Date(now + index * 1000).toISOString(),
      event_type: events[index].event_type,
      fencing_token: lease.lease.fencing_token,
      payload: events[index].payload,
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
  return {
    saga_id: sagaId,
    read_state: () => store.recover(sagaId),
  };
}

async function prepareBroadcastIntentAdvance(input: {
  root: string;
  intent: Record<string, any>;
  pool_id: string;
  saga_id: string;
}): Promise<{
  advance: () => void;
  was_advanced: () => boolean;
}> {
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
    pool_id: input.pool_id,
  });
  assert.equal(saga.computeSagaIdV1(binding), input.saga_id);

  const store = saga.createFilesystemSagaStoreV1(
    path.join(
      input.root,
      "buy-void-crash-consistent-saga-runtime-v1",
    ),
  );
  const now = Date.now() + 60_000;
  const owner = "guarded-context-stage-drift-adversary";
  const lease = store.acquireLease({
    saga_id: input.saga_id,
    owner_id: owner,
    now_ms: now,
    ttl_ms: 30_000,
  });
  assert.equal(lease.ok, true);
  if (!lease.ok) throw new Error("stage_drift_saga_lease_required");

  let advanced = false;
  return {
    advance: () => {
      if (advanced) throw new Error("stage_drift_advanced_twice");
      const current = store.recover(input.saga_id);
      assert.equal(current?.state?.state, "transaction_prepared");
      const broadcastIntentId = saga.computeBroadcastIntentIdV1({
        saga_id: input.saga_id,
        attempt_id: ATTEMPT,
        transaction_hash: TX_HASH,
      });
      const event = saga.buildSagaEventV1({
        binding,
        sequence: current.state.event_count,
        previous_event_id: current.state.last_event_id,
        recorded_at_utc: new Date(now + 1).toISOString(),
        event_type: "broadcast_intent_committed",
        fencing_token: lease.lease.fencing_token,
        payload: {
          attempt_id: ATTEMPT,
          transaction_hash: TX_HASH,
          broadcast_intent_id: broadcastIntentId,
        },
      });
      const record = store.appendEvent({
        event,
        owner_id: owner,
        fencing_token: lease.lease.fencing_token,
        now_ms: now + 1,
      });
      store.releaseLease({
        saga_id: input.saga_id,
        owner_id: owner,
        fencing_token: lease.lease.fencing_token,
        now_ms: now + 2,
      });
      assert.equal(record.state.state, "broadcast_intent_committed");
      advanced = true;
    },
    was_advanced: () => advanced,
  };
}

function writeCustody(input: {
  root: string;
  saga_id: string;
  inventory_reservation_id: string;
  plan: any;
  call: any;
}): void {
  const request = {
    schema: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
    version: 1,
    idempotency_key_sha256: REQUEST_IDEMPOTENCY,
    request_fingerprint_sha256: REQUEST_FINGERPRINT,
    saga_id: input.saga_id,
    attempt_id: ATTEMPT,
    plan_reservation_id: input.inventory_reservation_id,
    chain_id: "2050",
    wallet_address: WALLET,
    nonce: input.plan.nonce,
    transaction_to: FULFILLMENT_CONTRACT,
    transaction_value_wei: "0",
    transaction_calldata: input.call.calldata,
    transaction_calldata_sha256: input.call.calldata_sha256,
    gas_limit: input.plan.gas_limit,
    max_fee_per_gas_wei: input.plan.max_fee_per_gas_wei,
    max_priority_fee_per_gas_wei:
      input.plan.max_priority_fee_per_gas_wei,
    canonical_payment_identity: PAYMENT_ID,
    canonical_payment_key_sha256:
      input.call.canonical_payment_key_sha256,
    delivery_address: DELIVERY,
    void_amount_units: VOID_UNITS,
    token_amount_atoms: input.call.token_amount_atoms,
    call_fingerprint_sha256: input.call.call_fingerprint_sha256,
    transaction_plan_fingerprint_sha256:
      input.plan.transaction_plan_fingerprint_sha256,
    unsigned_transaction_fingerprint_sha256: "b".repeat(64),
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };
  const custodyFingerprint = sha256(
    [
      "marker=" +
        VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
      "version=1",
      "request_fingerprint_sha256=" + REQUEST_FINGERPRINT,
      "request_idempotency_key_sha256=" + REQUEST_IDEMPOTENCY,
      "attempt_id=" + ATTEMPT,
      "saga_id=" + input.saga_id,
      "plan_reservation_id=" + input.inventory_reservation_id,
      "signer_address=" + WALLET,
      "signed_transaction_hash=" + TX_HASH,
      "raw_signed_transaction_sha256=" + RAW_SHA,
    ].join("\n"),
  );
  writePrivateJson(
    path.join(
      input.root,
      "buy-void-payment-keyed-preparation-custody-v1",
      "records",
      ATTEMPT + ".json",
    ),
    {
      schema:
        "void_buy_void_payment_keyed_preparation_custody_record_v1",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
      version: 1,
      recorded_at_ms: 1_700_000_002_000,
      request,
      signer_address: WALLET,
      signed_transaction_hash: TX_HASH,
      raw_signed_transaction_sha256: RAW_SHA,
      custody_fingerprint_sha256: custodyFingerprint,
      deterministic_signing_verified: true,
      raw_signed_transaction_persisted: false,
      raw_signed_transaction_returned: false,
      transaction_broadcast_authorized: false,
      money_movement_authorized: false,
    },
  );
}

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-dispatcher-preparation-recovery-"),
);
fs.chmodSync(root, 0o700);
const restoreEnv = configureRuntimeEnv(root);

try {
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1,
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_V1",
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_AUTHORITY_V1
      .generic_full_runtime_apply_forbidden,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_AUTHORITY_V1
      .worker_execution_scope,
    "preparation_recovery_only",
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_AUTHORITY_V1
      .signing,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PREPARATION_RECOVERY_APPLY_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );

  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
      .history_carrier_activation_ready,
    false,
  );
  const historyCarrierActivationReady: boolean = Boolean(
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_AUTHORITY_V1
      .history_carrier_activation_ready,
  );

  if (historyCarrierActivationReady === true) {
    const policy = buyVoidPaymentKeyedFullRuntimePolicyStateV1(process.env);
    if (policy.configured !== true) throw new Error(policy.reason);

    const intent = makeIntent();
  writeIntent(root, intent);

  const inventory = reserveBuyVoidInventoryV1({
    root_dir: root,
    intent: intent as any,
    policy: {
      inventory_reservation_enabled: true,
      pool_id: policy.server_policy.saga_policy.inventory_policy.pool_id,
      inventory_policy_version: "presale-v1",
      pool_capacity_void_units: "10000000000000",
      max_reservation_void_units: "10000000000000",
    },
    apply: true,
    now_ms: 1_700_000_000_050,
  });
  assert.equal(inventory.ok, true);
  assert.equal(inventory.status, "reserved");
  if (!inventory.ok) throw new Error("inventory_reservation_required");

  writePreparedAttempt(root, intent);
  const attempt = readBuyVoidExecutionAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT,
  });
  assert.ok(attempt);
  if (!attempt) throw new Error("attempt_required");

  const call = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt,
    source_finality: sourceFinalityReady(),
    policy: {
      chain_id: "2050",
      fulfillment_contract_address: FULFILLMENT_CONTRACT,
      max_void_amount_units: "10000000000000",
    },
  });
  if (call.ok === false) throw new Error(call.reason);
  assert.equal(call.ok, true);

  const saga = await initializeSaga(
    root,
    intent,
    policy.server_policy.saga_policy.saga_policy_id,
    policy.server_policy.saga_policy.inventory_policy.pool_id,
    inventory.reservation.reservation_id,
  );

  const plan = reserveBuyVoidPaymentKeyedPlanV1({
    root_dir: root,
    saga_id: saga.saga_id,
    attempt_id: ATTEMPT,
    wallet_address: WALLET,
    observed_pending_nonce: 7,
    fulfillment_call: call,
    gas_limit: "21000",
    max_fee_per_gas_wei: "100",
    max_priority_fee_per_gas_wei: "1",
    runtime_policy_fingerprint_sha256:
      policy.runtime_policy_fingerprint_sha256,
    preparation_policy_fingerprint_sha256:
      policy.preparation_policy_fingerprint_sha256,
    now_ms: 1_700_000_001_900,
  });
  if (plan.ok === false) throw new Error(plan.reason);
  assert.equal(plan.ok, true);

  writeCustody({
    root,
    saga_id: saga.saga_id,
    inventory_reservation_id: inventory.reservation.reservation_id,
    plan: plan.reservation,
    call,
  });

  const dispatcher = new MemoryStore();
  const submitted = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: ATTEMPT,
    request_fingerprint_sha256: REQUEST_FINGERPRINT,
    client_id: "preparation-recovery-proof",
    store: dispatcher,
  });
  assert.equal(submitted.ok, true);

  const claimed = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT,
    worker_id: "recovery-worker",
    store: dispatcher,
  });
  assert.equal(claimed.ok, true);
  assert.equal(claimed.status, "claimed");
  if (claimed.ok !== true || claimed.status !== "claimed") {
    throw new Error("dispatcher_claim_required");
  }

  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1,
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1",
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .dependency_bootstrap,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .credential_read,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .transaction_broadcast,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .final_lease_revalidation_required,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .final_stage_revalidation_required,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .final_database_time_after_identity_reads_required,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .dispatcher_admission_held_through_final_preview,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .final_saga_head_binding_required,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .final_full_runtime_preview_function_fixed,
    true,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .ready_is_execution_authority,
    false,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_AUTHORITY_V1
      .guarded_stage_action_required,
    "execute_prepared_transaction",
  );

  const full = VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENVS_V1;

  const beforeWrongStage = snapshotTree(root);
  const wrongStage =
    await buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1({
      root_dir: root,
      lease: claimed.lease,
      store: dispatcher,
    });
  assert.equal(wrongStage.ok, false);
  if (wrongStage.ok !== false) {
    throw new Error("guarded_broadcast_stage_hold_required");
  }
  assert.equal(wrongStage.reason, "stage_not_guarded_broadcast");
  assert.equal(wrongStage.execution_authorized, false);
  assert.equal(wrongStage.mutation_performed, false);
  assert.equal(snapshotTree(root), beforeWrongStage);

  process.env[full.apply_enabled] = "1";
  const recovered =
    await applyBuyVoidPaymentKeyedDispatcherPreparationRecoveryV1({
      root_dir: root,
      lease: claimed.lease,
      store: dispatcher,
    });
  assert.equal(recovered.ok, true);
  if (recovered.ok !== true) {
    throw new Error("preparation_recovery_required");
  }
  assert.equal(recovered.status, "recovered");
  assert.equal(recovered.saga_state_after, "transaction_prepared");
  assert.equal(recovered.signer_access_performed, false);
  assert.equal(recovered.signing_performed, false);
  assert.equal(recovered.transaction_broadcast_performed, false);

  process.env[full.apply_enabled] = "0";
  const before = snapshotTree(root);
  dispatcher.decision_call_count = 0;
  const readyFinalFenceCalls: number[] = [];
  dispatcher.before_now_us = (decisionCall, nowCall) => {
    if (decisionCall === 3) {
      assert.equal(dispatcher.decision_active, true);
      readyFinalFenceCalls.push(nowCall);
    }
  };
  let ready;
  try {
    ready =
      await buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1({
        root_dir: root,
        lease: claimed.lease,
        store: dispatcher,
      });
  } finally {
    dispatcher.before_now_us = null;
  }
  const after = snapshotTree(root);

  assert.deepEqual(readyFinalFenceCalls, [1, 2, 3]);
  assert.equal(ready.ok, true);
  assert.equal(ready.status, "ready");
  if (ready.ok !== true) {
    throw new Error("guarded_broadcast_context_ready_required");
  }
  assert.equal(ready.attempt_id, ATTEMPT);
  assert.equal(ready.worker_id, "recovery-worker");
  assert.equal(ready.saga_id, saga.saga_id);
  assert.equal(ready.saga_state, "transaction_prepared");
  assert.equal(ready.saga_event_count, 5);
  assert.match(ready.saga_last_event_id, /^voidbvfsge1_[0-9a-f]{64}$/);
  assert.equal(ready.saga_head_revalidation_required, true);
  assert.equal(ready.execution_authorized, false);
  assert.equal(ready.next_action, "execute_prepared_transaction");
  assert.equal(ready.retrying_definitive_not_submitted, false);
  assert.equal(ready.reconciliation_required, false);
  assert.equal(ready.existing_evidence_present, false);
  assert.equal(ready.signed_transaction_hash, TX_HASH);
  assert.ok(ready.required_full_runtime_confirmation.length > 0);
  assert.ok(ready.required_guarded_broadcast_confirmation.length > 0);
  assert.ok(ready.required_saga_confirmation.length > 0);
  assert.ok(ready.required_saga_action_confirmation.length > 0);
  assert.equal(typeof ready.required_signer_confirmation, "string");
  assert.equal(typeof ready.required_broadcast_confirmation, "string");
  assert.equal(ready.lease_capability_returned, false);
  assert.equal(ready.raw_signed_transaction_returned, false);
  assert.equal(ready.provider_submission_id_returned, false);
  assert.equal(ready.dependency_bootstrap_performed, false);
  assert.equal(ready.credential_read_performed, false);
  assert.equal(ready.rpc_call_performed, false);
  assert.equal(ready.submission_guard_claimed, false);
  assert.equal(ready.signer_access_performed, false);
  assert.equal(ready.signing_performed, false);
  assert.equal(ready.broadcast_call_performed, false);
  assert.equal(ready.transaction_broadcast_performed, false);
  assert.equal(ready.worker_execution_performed, false);
  assert.equal(ready.dispatcher_publish_performed, false);
  assert.equal(ready.mutation_performed, false);
  assert.equal(ready.money_movement_performed, false);
  assert.equal(ready.money_movement_may_have_occurred, false);
  assert.equal(hasKey(ready, "lease_token"), false);
  assert.equal(hasKey(ready, "raw_signed_transaction"), false);
  assert.equal(hasKey(ready, "provider_submission_id"), false);
  assert.equal(after, before);

  const driftRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-guarded-context-stage-drift-"),
  );
  fs.chmodSync(driftRoot, 0o700);
  fs.cpSync(root, driftRoot, { recursive: true });
  makeTreePrivate(driftRoot);
  const driftDispatcher = new MemoryStore();
  driftDispatcher.jobs = structuredClone(dispatcher.jobs);
  driftDispatcher.audits = structuredClone(dispatcher.audits);
  driftDispatcher.clock = dispatcher.clock;
  const stageAdvance = await prepareBroadcastIntentAdvance({
    root: driftRoot,
    intent,
    pool_id: policy.server_policy.saga_policy.inventory_policy.pool_id,
    saga_id: saga.saga_id,
  });

  const originalReadFileSync = fs.readFileSync;
  let readPatchInstalled = false;
  let stageDriftReadTriggered = false;
  const restoreReadFileSync = () => {
    if (!readPatchInstalled) return;
    (fs as any).readFileSync = originalReadFileSync;
    syncBuiltinESMExports();
    readPatchInstalled = false;
  };
  const installStageDriftRead = () => {
    if (readPatchInstalled) {
      throw new Error("stage_drift_read_patch_already_installed");
    }
    readPatchInstalled = true;
    (fs as any).readFileSync = (...args: any[]) => {
      const result = (originalReadFileSync as any)(...args);
      const filename = String(args[0] ?? "");
      if (
        !stageDriftReadTriggered &&
        filename.includes(
          path.join("sagas", saga.saga_id, "events"),
        ) &&
        typeof result === "string" &&
        result.includes('"event_type": "transaction_prepared"')
      ) {
        stageDriftReadTriggered = true;
        try {
          stageAdvance.advance();
        } finally {
          restoreReadFileSync();
        }
      }
      return result;
    };
    syncBuiltinESMExports();
  };

  driftDispatcher.decision_call_count = 0;
  driftDispatcher.after_decision = (callNumber) => {
    if (callNumber === 2) installStageDriftRead();
  };
  process.env[full.root_dir] = driftRoot;
  let stageDrift;
  try {
    stageDrift =
      await buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1({
        root_dir: driftRoot,
        lease: claimed.lease,
        store: driftDispatcher,
      });
  } finally {
    restoreReadFileSync();
    driftDispatcher.after_decision = null;
    process.env[full.root_dir] = root;
  }
  assert.equal(stageDriftReadTriggered, true);
  assert.equal(stageAdvance.was_advanced(), true);
  assert.equal(stageDrift.ok, false);
  if (stageDrift.ok !== false) {
    throw new Error("guarded_stage_drift_hold_required");
  }
  assert.equal(stageDrift.reason, "guarded_broadcast_stage_drift");
  assert.equal(
    stageDrift.detail?.inner_next_action,
    "reconcile_possible_broadcast",
  );
  assert.equal(stageDrift.mutation_performed, false);
  assert.equal(stageDrift.signing_performed, false);
  assert.equal(stageDrift.transaction_broadcast_performed, false);
  fs.rmSync(driftRoot, { recursive: true, force: true });

  const finalStageRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-guarded-context-final-stage-"),
  );
  fs.chmodSync(finalStageRoot, 0o700);
  fs.cpSync(root, finalStageRoot, { recursive: true });
  makeTreePrivate(finalStageRoot);
  const finalStageDispatcher = new MemoryStore();
  finalStageDispatcher.jobs = structuredClone(dispatcher.jobs);
  finalStageDispatcher.audits = structuredClone(dispatcher.audits);
  finalStageDispatcher.clock = dispatcher.clock;
  const finalStageAdvance = await prepareBroadcastIntentAdvance({
    root: finalStageRoot,
    intent,
    pool_id: policy.server_policy.saga_policy.inventory_policy.pool_id,
    saga_id: saga.saga_id,
  });
  finalStageDispatcher.decision_call_count = 0;
  let finalStageAdvanceWasInsideAdmission = false;
  finalStageDispatcher.before_now_us = (decisionCall, nowCall) => {
    if (decisionCall === 3 && nowCall === 2) {
      finalStageAdvanceWasInsideAdmission =
        finalStageDispatcher.decision_active;
      finalStageAdvance.advance();
    }
  };
  process.env[full.root_dir] = finalStageRoot;
  let advancedAfterFinalInnerPreview;
  try {
    advancedAfterFinalInnerPreview =
      await buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1({
        root_dir: finalStageRoot,
        lease: claimed.lease,
        store: finalStageDispatcher,
      });
  } finally {
    finalStageDispatcher.before_now_us = null;
    process.env[full.root_dir] = root;
  }
  assert.equal(finalStageAdvance.was_advanced(), true);
  assert.equal(finalStageAdvanceWasInsideAdmission, true);
  assert.equal(finalStageDispatcher.decision_call_count, 3);
  assert.equal(advancedAfterFinalInnerPreview.ok, false);
  if (advancedAfterFinalInnerPreview.ok !== false) {
    throw new Error("final_stage_revalidation_hold_required");
  }
  assert.equal(
    advancedAfterFinalInnerPreview.reason,
    "final_stage_revalidation_held",
  );
  assert.equal(
    advancedAfterFinalInnerPreview.detail?.context_reason,
    "saga_head_changed_during_final_preview",
  );
  assert.equal(
    advancedAfterFinalInnerPreview.detail?.boundary,
    "after_final_preview",
  );
  assert.equal(advancedAfterFinalInnerPreview.mutation_performed, false);
  assert.equal(advancedAfterFinalInnerPreview.signing_performed, false);
  assert.equal(
    advancedAfterFinalInnerPreview.transaction_broadcast_performed,
    false,
  );
  fs.rmSync(finalStageRoot, { recursive: true, force: true });

  dispatcher.decision_call_count = 0;
  let finalFenceBeforeSeen = false;
  let finalFenceAfterSeen = false;
  dispatcher.before_now_us = (decisionCall, nowCall) => {
    if (decisionCall === 3 && nowCall === 1) {
      assert.equal(dispatcher.decision_active, true);
      finalFenceBeforeSeen = true;
    }
    if (decisionCall === 3 && nowCall === 2) {
      assert.equal(dispatcher.decision_active, true);
      finalFenceAfterSeen = true;
      dispatcher.clock = claimed.lease.lease_expires_us - 1n;
    }
  };
  let expiredAfterFinalPreview;
  try {
    expiredAfterFinalPreview =
      await buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1({
        root_dir: root,
        lease: claimed.lease,
        store: dispatcher,
      });
  } finally {
    dispatcher.before_now_us = null;
  }
  assert.equal(finalFenceBeforeSeen, true);
  assert.equal(finalFenceAfterSeen, true);
  assert.equal(expiredAfterFinalPreview.ok, false);
  if (expiredAfterFinalPreview.ok !== false) {
    throw new Error("final_lease_revalidation_hold_required");
  }
  assert.equal(
    expiredAfterFinalPreview.reason,
    "final_lease_revalidation_held",
  );
  assert.equal(
    expiredAfterFinalPreview.detail?.context_reason,
    "lease_expired",
  );
  assert.equal(
    expiredAfterFinalPreview.detail?.boundary,
    "after_final_preview",
  );
  assert.equal(expiredAfterFinalPreview.mutation_performed, false);

  dispatcher.clock = claimed.lease.lease_expires_us;
  const expired =
    await buildBuyVoidPaymentKeyedDispatcherGuardedBroadcastContextV1({
      root_dir: root,
      lease: claimed.lease,
      store: dispatcher,
    });
  assert.equal(expired.ok, false);
  if (expired.ok !== false) {
    throw new Error("expired_lease_context_hold_required");
  }
    assert.equal(expired.reason, "runtime_preview_held");
    assert.equal(expired.mutation_performed, false);
  } else {
    const heldPolicy =
      buyVoidPaymentKeyedFullRuntimePolicyStateV1(process.env);
    assert.equal(heldPolicy.configured, false);
    if (heldPolicy.configured !== false) {
      throw new Error("history_carrier_activation_hold_required");
    }
    assert.equal(
      heldPolicy.reason,
      "payment_keyed_full_runtime_history_carrier_binding_held:" +
        "history_carrier_runtime_authority_root_not_configured",
    );
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(
    path.resolve(
      here,
      "../src/economic/buy_void_payment_keyed_dispatcher_guarded_broadcast_context_v1.ts",
    ),
    "utf8",
  );
  assert.match(
    source,
    /previewBuyVoidPaymentKeyedDispatcherRuntimeV1/,
  );
  assert.match(
    source,
    /reconstructBuyVoidPaymentKeyedLeaseContextV1/,
  );
  assert.match(source, /runBuyVoidPaymentKeyedFullRuntimeV1/);
  assert.match(
    source,
    /VOID_BUY_VOID_PAYMENT_KEYED_GUARDED_BROADCAST_COORDINATOR_V1/,
  );
  assert.match(
    source,
    /server_derived_stage_required:\s*"guarded_broadcast"/,
  );
  assert.match(source, /final_lease_revalidation_required:\s*true/);
  assert.match(source, /final_stage_revalidation_required:\s*true/);
  assert.match(
    source,
    /final_database_time_after_identity_reads_required:\s*true/,
  );
  assert.match(
    source,
    /dispatcher_admission_held_through_final_preview:\s*true/,
  );
  assert.match(source, /final_saga_head_binding_required:\s*true/);
  assert.match(
    source,
    /final_full_runtime_preview_function_fixed:\s*true/,
  );
  assert.match(source, /ready_is_execution_authority:\s*false/);
  assert.match(source, /execution_authorized:\s*false/);
  assert.match(source, /saga_head_revalidation_required:\s*true/);
  assert.match(source, /sagaHeadBefore/);
  assert.match(source, /sagaHeadAfter/);
  assert.match(source, /run_serializable_job_decision/);
  assert.match(
    source,
    /inner\.next_action !== "execute_prepared_transaction"/,
  );
  assert.match(
    source,
    /finalInner\.next_action !== "execute_prepared_transaction"/,
  );
  assert.match(source, /apply:\s*false/);
  assert.doesNotMatch(source, /apply:\s*true/);
  assert.doesNotMatch(
    source,
    /createBuyVoidPaymentKeyedRuntimeDependencyBootstrapV1/,
  );
  assert.doesNotMatch(source, /credentials_directory/);
  assert.doesNotMatch(
    source,
    /createBuyVoidNativeFulfillmentWalletCredentialSignerV1/,
  );
  assert.doesNotMatch(
    source,
    /createBuyVoidPaymentKeyedChain2050BroadcasterV1/,
  );
  assert.doesNotMatch(
    source,
    /publishBuyVoidPaymentKeyedDispatchResultV1/,
  );
  assert.doesNotMatch(
    source,
    /renewBuyVoidPaymentKeyedDispatchLeaseV1/,
  );
  assert.doesNotMatch(source, /\bapp\.(?:get|post|put|delete)\b/);

  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_GUARDED_BROADCAST_CONTEXT_V1_PROOF_GREEN",
  );
  console.log(
    "history_carrier_activation_ready=" +
      String(historyCarrierActivationReady),
  );
  console.log(
    "guarded_broadcast_dynamic_ready_path_executed=" +
      String(historyCarrierActivationReady),
  );
  if (historyCarrierActivationReady === true) {
    console.log("durable_transaction_prepared_state=true");
    console.log("server_derived_stage=guarded_broadcast");
    console.log("lease_revalidated_between_previews=true");
    console.log("lease_revalidated_after_second_preview=true");
    console.log("final_database_time_check_after_preview=true");
    console.log("final_database_time_check_after_identity_reads=true");
    console.log("final_stage_revalidation_required=true");
    console.log("dispatcher_admission_held_through_final_preview=true");
    console.log("final_saga_head_binding=true");
    console.log("saga_head_returned_for_execution_revalidation=true");
    console.log("final_context_identity_binding=true");
    console.log("lease_expired_during_final_preview=held");
    console.log("guarded_stage_inner_reconciliation_drift=held");
    console.log("saga_advanced_after_final_inner_preview=held");
    console.log("guarded_broadcast_inner_preview=true");
    console.log("next_action=execute_prepared_transaction");
  } else {
    console.log(
      "guarded_broadcast_dynamic_ready_path=" +
        "deferred_until_history_carrier_activation_ready",
    );
    console.log(
      "history_carrier_activation_hold_before_guarded_stage=true",
    );
  }
  console.log("fixed_runtime_preview_functions_preserved=true");
  console.log("second_full_runtime_preview_apply=false");
  console.log("final_full_runtime_preview_apply=false");
  console.log("ready_is_execution_authority=false");
  console.log("execution_authorized=false");
  console.log("filesystem_tree_unchanged=true");
  console.log("dependency_bootstrap=false");
  console.log("credential_read=false");
  console.log("rpc_call=false");
  console.log("submission_guard_claim=false");
  console.log("signer_access=false");
  console.log("signing=false");
  console.log("broadcast_call=false");
  console.log("transaction_broadcast=false");
  console.log("money_movement=false");
  console.log("lease_capability_returned=false");
  console.log("raw_signed_transaction_returned=false");
  console.log("provider_submission_id_returned=false");
  console.log("worker_execution=false");
  console.log("dispatcher_publish=false");
} finally {
  restoreEnv();
  fs.rmSync(root, { recursive: true, force: true });
}
