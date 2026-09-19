#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  enqueueBuyVoidPaymentKeyedPreparedAttemptV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_enqueue_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
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

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function custodyFixture(input: {
  root: string;
  fileAttemptId?: string;
  recordAttemptId?: string;
  requestFingerprint?: string;
  recordBroadcastAuthorized?: boolean;
}) {
  const fileAttemptId = input.fileAttemptId || ATTEMPT_A;
  const recordAttemptId = input.recordAttemptId || fileAttemptId;
  const requestFingerprint = input.requestFingerprint || REQUEST_A;
  const sagaId = "voidbvfsg1_" + "3".repeat(64);
  const planReservationId = "4".repeat(64);
  const idempotencyKey = "5".repeat(64);
  const wallet = "0x" + "1".repeat(40);
  const signedHash = "0x" + "9".repeat(64);
  const rawSha = "a".repeat(64);

  const request = {
    schema: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
    version: 1,
    idempotency_key_sha256: idempotencyKey,
    request_fingerprint_sha256: requestFingerprint,
    saga_id: sagaId,
    attempt_id: recordAttemptId,
    plan_reservation_id: planReservationId,
    chain_id: "2050",
    wallet_address: wallet,
    nonce: 7,
    transaction_to: "0x" + "2".repeat(40),
    transaction_value_wei: "0",
    transaction_calldata: "0x00",
    transaction_calldata_sha256: "6".repeat(64),
    gas_limit: "21000",
    max_fee_per_gas_wei: "100",
    max_priority_fee_per_gas_wei: "1",
    canonical_payment_identity:
      "voidpay1:base:0x" + "c".repeat(64) + ":0",
    canonical_payment_key_sha256: "d".repeat(64),
    delivery_address: "0x" + "3".repeat(40),
    void_amount_units: "100",
    token_amount_atoms: "100000000000000",
    call_fingerprint_sha256: "e".repeat(64),
    transaction_plan_fingerprint_sha256: "f".repeat(64),
    unsigned_transaction_fingerprint_sha256: "0".repeat(64),
    credential_access_authorized: false,
    wallet_access_authorized: false,
    signing_authorized: false,
    transaction_broadcast_authorized: false,
    raw_signed_transaction_persisted: false,
    money_movement_authorized: false,
  };

  const custodyFingerprint = sha256(
    [
      "marker=" + VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
      "version=1",
      "request_fingerprint_sha256=" + requestFingerprint,
      "request_idempotency_key_sha256=" + idempotencyKey,
      "attempt_id=" + recordAttemptId,
      "saga_id=" + sagaId,
      "plan_reservation_id=" + planReservationId,
      "signer_address=" + wallet,
      "signed_transaction_hash=" + signedHash,
      "raw_signed_transaction_sha256=" + rawSha,
    ].join("\n"),
  );

  const record = {
    schema: "void_buy_void_payment_keyed_preparation_custody_record_v1",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
    version: 1,
    recorded_at_ms: 1_700_000_000_000,
    request,
    signer_address: wallet,
    signed_transaction_hash: signedHash,
    raw_signed_transaction_sha256: rawSha,
    custody_fingerprint_sha256: custodyFingerprint,
    deterministic_signing_verified: true,
    raw_signed_transaction_persisted: false,
    raw_signed_transaction_returned: false,
    transaction_broadcast_authorized:
      input.recordBroadcastAuthorized === true,
    money_movement_authorized: false,
  };

  const records = path.join(
    input.root,
    "buy-void-payment-keyed-preparation-custody-v1",
    "records",
  );
  fs.mkdirSync(records, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(records), 0o700);
  fs.chmodSync(records, 0o700);
  const file = path.join(records, fileAttemptId + ".json");
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);

  return {
    custody_fingerprint_sha256: custodyFingerprint,
    request_fingerprint_sha256: requestFingerprint,
  };
}

function testRoot(label: string): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-dispatcher-enqueue-" + label + "-"),
  );
  fs.chmodSync(root, 0o700);
  return root;
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
    custody_reader_fixed: true,
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

const roots: string[] = [];
const rootFor = (label: string) => {
  const root = testRoot(label);
  roots.push(root);
  return root;
};

{
  const store = new MemoryStore();
  const root = rootFor("missing");
  const decision = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
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
  const root = rootFor("attempt-mismatch");
  custodyFixture({
    root,
    fileAttemptId: ATTEMPT_A,
    recordAttemptId: ATTEMPT_B,
  });
  const decision = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
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
  const root = rootFor("unsafe");
  custodyFixture({
    root,
    recordBroadcastAuthorized: true,
  });
  const decision = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
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
  const root = rootFor("submit-replay");
  custodyFixture({ root });
  const input = {
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
    request_fingerprint_sha256: REQUEST_B,
  } as unknown as Parameters<typeof enqueueBuyVoidPaymentKeyedPreparedAttemptV1>[0];
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
  const root = rootFor("conflict");
  custodyFixture({ root });
  const conflict = await enqueueBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT_A,
    client_id: "enqueue-proof",
    store,
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
  assert.match(source, /readBuyVoidPaymentKeyedPreparationCustodyPublicV1/);
  assert.doesNotMatch(source, /read_custody/);
  assert.doesNotMatch(source, /submit_dispatch/);
  assert.doesNotMatch(source, /claimBuyVoidPaymentKeyedDispatchV1/);
  assert.doesNotMatch(source, /renewBuyVoidPaymentKeyedDispatchLeaseV1/);
  assert.doesNotMatch(source, /publishBuyVoidPaymentKeyedDispatchResultV1/);
  assert.doesNotMatch(source, /\b(?:Wallet|signTransaction|broadcastTransaction)\b/);
  assert.doesNotMatch(source, /\bapp\.(?:get|post|put|delete)\b/);
}

for (const root of roots) {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_ENQUEUE_V1_PROOF_GREEN");
console.log("custody_reader_fixed=true");
console.log("durable_custody_file_exercised=true");
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
