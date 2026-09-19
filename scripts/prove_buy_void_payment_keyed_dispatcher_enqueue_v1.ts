#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  enqueueBuyVoidPaymentKeyedPreparedAttemptV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_enqueue_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
  type BuyVoidPaymentKeyedPreparationCustodyPublicV1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";
import {
  submitBuyVoidPaymentKeyedDispatchV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherAuditDecisionV1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
  type BuyVoidPaymentKeyedDispatcherTransactionV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";

const ATTEMPT_A = "1".repeat(64);
const ATTEMPT_B = "2".repeat(64);
const REQUEST_A = "a".repeat(64);
const REQUEST_B = "b".repeat(64);

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

  async run_serializable_job_decision<T>(
    attemptId: string,
    action: (tx: BuyVoidPaymentKeyedDispatcherTransactionV1) => T | Promise<T>,
  ): Promise<T> {
    const jobs = structuredClone(this.jobs);
    const audits = structuredClone(this.audits);
    const tx: BuyVoidPaymentKeyedDispatcherTransactionV1 = {
      now_us: () => {
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
        rows.push({ ...structuredClone(decision), decision_seq: sequence });
        audits.set(decision.attempt_id, rows);
        return sequence;
      },
    };
    const value = await action(tx);
    this.jobs = jobs;
    this.audits = audits;
    return value;
  }
}

function custody(
  attemptId = ATTEMPT_A,
  requestFingerprint = REQUEST_A,
): BuyVoidPaymentKeyedPreparationCustodyPublicV1 {
  return {
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
    version: 1,
    saga_id: "voidbvfsg1_" + "3".repeat(64),
    attempt_id: attemptId,
    plan_reservation_id: "4".repeat(64),
    request_idempotency_key_sha256: "5".repeat(64),
    request_fingerprint_sha256: requestFingerprint,
    call_fingerprint_sha256: "6".repeat(64),
    transaction_plan_fingerprint_sha256: "7".repeat(64),
    unsigned_transaction_fingerprint_sha256: "8".repeat(64),
    wallet_address: "0x" + "1".repeat(40),
    fulfillment_contract_address: "0x" + "2".repeat(40),
    delivery_address: "0x" + "3".repeat(40),
    void_amount_units: "100",
    signer_address: "0x" + "1".repeat(40),
    signed_transaction_hash: "0x" + "9".repeat(64),
    raw_signed_transaction_sha256: "a".repeat(64),
    custody_fingerprint_sha256: "b".repeat(64),
    deterministic_signing_verified: true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };
}

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_AUTHORITY_V1,
  {
    source_only_contract: true,
    durable_preparation_custody_required: true,
    exact_attempt_binding_required: true,
    request_fingerprint_from_custody_only: true,
    caller_request_fingerprint_authority: false,
    dispatcher_submit_only: true,
    dispatcher_submit_function_fixed: true,
    dispatcher_claim: false,
    dispatcher_renew: false,
    dispatcher_publish: false,
    lease_capability_issue: false,
    worker_execution: false,
    runtime_route_mount: false,
    production_connection_factory: false,
    wallet_access: false,
    credential_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  },
);

const root = "/tmp/void-buy-dispatcher-enqueue-proof";

{
  const store = new MemoryStore();
  const decision = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
    dependencies: { read_custody: () => null },
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "held");
  if (decision.ok !== false || decision.status !== "held") {
    throw new Error("expected_missing_custody_hold");
  }
  assert.equal(decision.reason, "preparation_custody_missing");
  assert.equal(store.jobs.size, 0);
  assert.equal(store.audits.size, 0);
}

{
  const store = new MemoryStore();
  const decision = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
    dependencies: { read_custody: () => custody(ATTEMPT_B) },
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "held");
  if (decision.ok !== false || decision.status !== "held") {
    throw new Error("expected_attempt_mismatch_hold");
  }
  assert.equal(decision.reason, "preparation_custody_invalid");
  assert.equal(store.jobs.size, 0);
}

{
  const store = new MemoryStore();
  const unsafe = {
    ...custody(),
    transaction_broadcast_authorized: true,
  } as unknown as BuyVoidPaymentKeyedPreparationCustodyPublicV1;
  const decision = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
    dependencies: { read_custody: () => unsafe },
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "held");
  if (decision.ok !== false || decision.status !== "held") {
    throw new Error("expected_unsafe_custody_hold");
  }
  assert.equal(decision.reason, "preparation_custody_invalid");
  assert.equal(store.jobs.size, 0);
}

{
  const store = new MemoryStore();
  const input = {
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
    dependencies: { read_custody: () => custody() },
    request_fingerprint_sha256: REQUEST_B,
  };
  const first = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1(input);
  assert.equal(first.ok, true);
  assert.equal(first.status, "submitted");
  if (first.ok !== true) throw new Error("expected_first_enqueue_success");
  assert.equal(first.request_fingerprint_sha256, REQUEST_A);
  assert.equal(first.dispatcher_job.request_fingerprint_sha256, REQUEST_A);
  assert.equal(first.dispatcher_job.lease_gen, 0n);
  assert.equal(first.dispatcher_claim_performed, false);
  assert.equal(first.dispatcher_publish_performed, false);
  assert.equal(first.transaction_broadcast_performed, false);

  const replay = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1(input);
  assert.equal(replay.ok, true);
  assert.equal(replay.status, "idempotent");
  if (replay.ok !== true) throw new Error("expected_enqueue_replay_success");
  assert.equal(replay.request_fingerprint_sha256, REQUEST_A);
  assert.deepEqual(
    (store.audits.get(ATTEMPT_A) || []).map((row) => row.event_type),
    ["SUBMIT", "SUBMIT_REPLAY"],
  );
}

{
  const store = new MemoryStore();
  const seeded = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: ATTEMPT_A,
    request_fingerprint_sha256: REQUEST_B,
    client_id: "seed",
    store,
  });
  assert.equal(seeded.ok, true);
  if (seeded.ok !== true) throw new Error("expected_seed_submit_success");
  const conflict = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
    dependencies: { read_custody: () => custody() },
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.status, "conflict");
  if (conflict.ok !== false || conflict.status !== "conflict") {
    throw new Error("expected_dispatcher_fingerprint_conflict");
  }
  assert.equal(conflict.reason, "dispatcher_request_fingerprint_mismatch");
  assert.equal(conflict.dispatcher_job.request_fingerprint_sha256, REQUEST_B);
  assert.equal(store.jobs.get(ATTEMPT_A)?.request_fingerprint_sha256, REQUEST_B);
  assert.deepEqual(
    (store.audits.get(ATTEMPT_A) || []).map((row) => row.event_type),
    ["SUBMIT", "PAYLOAD_CONFLICT"],
  );
}

{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(
    path.resolve(
      here,
      "../src/economic/buy_void_payment_keyed_dispatcher_enqueue_v1.ts",
    ),
    "utf8",
  );
  assert.match(source, /submitBuyVoidPaymentKeyedDispatchV1/);
  assert.doesNotMatch(source, /submit_dispatch/);
  assert.doesNotMatch(source, /claimBuyVoidPaymentKeyedDispatchV1/);
  assert.doesNotMatch(source, /renewBuyVoidPaymentKeyedDispatchLeaseV1/);
  assert.doesNotMatch(source, /publishBuyVoidPaymentKeyedDispatchResultV1/);
  assert.doesNotMatch(source, /\b(?:Wallet|signTransaction|broadcastTransaction)\b/);
  assert.doesNotMatch(source, /\bapp\.(?:get|post|put|delete)\b/);
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1_PROOF_GREEN");
console.log("custody_attempt_id_bound=true");
console.log("custody_request_fingerprint_bound=true");
console.log("caller_request_fingerprint_authority=false");
console.log("missing_custody_held_before_dispatch=true");
console.log("unsafe_custody_held_before_dispatch=true");
console.log("first_submit=true");
console.log("dispatcher_submit_function_fixed=true");
console.log("same_custody_replay_idempotent=true");
console.log("dispatcher_conflict_fail_closed=true");
console.log("dispatcher_claim=false");
console.log("dispatcher_renew=false");
console.log("dispatcher_publish=false");
console.log("runtime_route_mount=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
