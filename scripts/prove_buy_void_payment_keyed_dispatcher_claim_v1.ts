#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  claimBuyVoidPaymentKeyedPreparedAttemptV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_LEASE_TTL_US_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_claim_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_PREPARATION_CUSTODY_V1,
} from "../src/economic/buy_void_payment_keyed_preparation_custody_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
} from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  submitBuyVoidPaymentKeyedDispatchV1,
  type BuyVoidPaymentKeyedDispatcherAuditDecisionV1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
  type BuyVoidPaymentKeyedDispatcherStoreV1,
  type BuyVoidPaymentKeyedDispatcherTransactionV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";

const ATTEMPT = "1".repeat(64);
const REQUEST_A = "a".repeat(64);
const REQUEST_B = "b".repeat(64);
const TOKEN = /^[0-9a-f]{32}$/;

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

function makeCustody(root: string, requestFingerprint = REQUEST_A): void {
  const sagaId = "voidbvfsg1_" + "3".repeat(64);
  const planReservationId = "4".repeat(64);
  const idempotencyKey = "5".repeat(64);
  const wallet = "0x" + "1".repeat(40);
  const signedHash = "0x" + "9".repeat(64);
  const rawSha = "c".repeat(64);

  const request = {
    schema: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_REQUEST_SCHEMA_V1,
    marker: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_PREPARE_REQUEST_V1,
    version: 1,
    idempotency_key_sha256: idempotencyKey,
    request_fingerprint_sha256: requestFingerprint,
    saga_id: sagaId,
    attempt_id: ATTEMPT,
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
      "voidpay1:base:0x" + "d".repeat(64) + ":0",
    canonical_payment_key_sha256: "e".repeat(64),
    delivery_address: "0x" + "3".repeat(40),
    void_amount_units: "100",
    token_amount_atoms: "100000000000000",
    call_fingerprint_sha256: "f".repeat(64),
    transaction_plan_fingerprint_sha256: "0".repeat(64),
    unsigned_transaction_fingerprint_sha256: "1".repeat(64),
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
      "attempt_id=" + ATTEMPT,
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
    transaction_broadcast_authorized: false,
    money_movement_authorized: false,
  };

  const records = path.join(
    root,
    "buy-void-payment-keyed-preparation-custody-v1",
    "records",
  );
  fs.mkdirSync(records, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(records), 0o700);
  fs.chmodSync(records, 0o700);
  const file = path.join(records, ATTEMPT + ".json");
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

function root(label: string): string {
  const value = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-buy-dispatcher-claim-" + label + "-"),
  );
  fs.chmodSync(value, 0o700);
  return value;
}

const roots: string[] = [];

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1",
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_LEASE_TTL_US_V1,
  30_000_000n,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_AUTHORITY_V1
    .custody_reader_fixed,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_AUTHORITY_V1
    .dispatcher_claim_function_fixed,
  true,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_AUTHORITY_V1
    .caller_lease_ttl_authority,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_AUTHORITY_V1
    .lease_token_random_bytes,
  16,
);

{
  const r = root("missing-custody");
  roots.push(r);
  const store = new MemoryStore();
  const decision = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: r,
    attempt_id: ATTEMPT,
    worker_id: "worker-a",
    store,
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "held");
  if (decision.ok !== false || decision.status !== "held") {
    throw new Error("expected_missing_custody_hold");
  }
  assert.equal(decision.reason, "preparation_custody_missing");
  assert.equal(store.audits.size, 0);
}

{
  const r = root("missing-job");
  roots.push(r);
  makeCustody(r);
  const store = new MemoryStore();
  const decision = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: r,
    attempt_id: ATTEMPT,
    worker_id: "worker-a",
    store,
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "held");
  if (decision.ok !== false || decision.status !== "held") {
    throw new Error("expected_missing_job_hold");
  }
  assert.equal(decision.reason, "dispatcher_job_missing");
  assert.equal(store.audits.size, 0);
}

{
  const r = root("identity-mismatch");
  roots.push(r);
  makeCustody(r, REQUEST_A);
  const store = new MemoryStore();
  const seeded = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: ATTEMPT,
    request_fingerprint_sha256: REQUEST_B,
    client_id: "seed",
    store,
  });
  assert.equal(seeded.ok, true);
  const decision = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: r,
    attempt_id: ATTEMPT,
    worker_id: "worker-a",
    store,
  });
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "held");
  if (decision.ok !== false || decision.status !== "held") {
    throw new Error("expected_identity_mismatch_hold");
  }
  assert.equal(decision.reason, "dispatcher_request_fingerprint_mismatch");
  assert.deepEqual(
    (store.audits.get(ATTEMPT) || []).map((row) => row.event_type),
    ["SUBMIT"],
  );
}

{
  const r = root("claim-reclaim");
  roots.push(r);
  makeCustody(r, REQUEST_A);
  const store = new MemoryStore();
  const seeded = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: ATTEMPT,
    request_fingerprint_sha256: REQUEST_A,
    client_id: "seed",
    store,
  });
  assert.equal(seeded.ok, true);

  const input = {
    root_dir: r,
    attempt_id: ATTEMPT,
    worker_id: "worker-a",
    store,
    lease_ttl_us: 1n,
  } as unknown as Parameters<
    typeof claimBuyVoidPaymentKeyedPreparedAttemptV1
  >[0];

  const first = await claimBuyVoidPaymentKeyedPreparedAttemptV1(input);
  assert.equal(first.ok, true);
  assert.equal(first.status, "claimed");
  if (first.ok !== true || first.status !== "claimed") {
    throw new Error("expected_first_claim");
  }
  assert.equal(first.lease.worker_id, "worker-a");
  assert.equal(first.lease.lease_gen, 1n);
  assert.match(first.lease.lease_token, TOKEN);
  assert.equal(first.lease_ttl_us, "30000000");
  assert.equal(first.worker_execution_performed, false);
  assert.equal(first.dispatcher_publish_performed, false);

  const claimAudit = (store.audits.get(ATTEMPT) || []).find(
    (row) => row.event_type === "CLAIM",
  );
  assert.ok(claimAudit);
  const stored = store.jobs.get(ATTEMPT);
  assert.ok(stored?.lease_expires_us);
  assert.equal(
    stored.lease_expires_us! - claimAudit.created_at_us,
    30_000_000n,
  );

  const blocked = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: r,
    attempt_id: ATTEMPT,
    worker_id: "worker-b",
    store,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, "rejected");
  if (blocked.ok !== false || blocked.status !== "rejected") {
    throw new Error("expected_active_lease_rejection");
  }
  assert.equal(blocked.reason, "active_lease");

  store.clock = first.lease.lease_expires_us + 1n;
  const reclaimed = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: r,
    attempt_id: ATTEMPT,
    worker_id: "worker-b",
    store,
  });
  assert.equal(reclaimed.ok, true);
  assert.equal(reclaimed.status, "claimed");
  if (reclaimed.ok !== true || reclaimed.status !== "claimed") {
    throw new Error("expected_reclaim");
  }
  assert.equal(reclaimed.lease.lease_gen, 2n);
  assert.equal(reclaimed.lease.worker_id, "worker-b");
  assert.match(reclaimed.lease.lease_token, TOKEN);
  assert.notEqual(reclaimed.lease.lease_token, first.lease.lease_token);
  assert.deepEqual(
    (store.audits.get(ATTEMPT) || []).map((row) => row.event_type),
    [
      "SUBMIT",
      "CLAIM",
      "CLAIM_REJECT_ACTIVE",
      "LEASE_EXPIRED_RECLAIM",
      "CLAIM",
    ],
  );
}

{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(
    path.resolve(
      here,
      "../src/economic/buy_void_payment_keyed_dispatcher_claim_v1.ts",
    ),
    "utf8",
  );
  assert.match(source, /readBuyVoidPaymentKeyedPreparationCustodyPublicV1/);
  assert.match(source, /claimBuyVoidPaymentKeyedDispatchV1/);
  assert.match(source, /crypto\.randomBytes\(16\)\.toString\("hex"\)/);
  assert.match(source, /30_000_000n/);
  assert.doesNotMatch(source, /renewBuyVoidPaymentKeyedDispatchLeaseV1/);
  assert.doesNotMatch(source, /publishBuyVoidPaymentKeyedDispatchResultV1/);
  assert.doesNotMatch(source, /\bapp\.(?:get|post|put|delete)\b/);
  assert.doesNotMatch(
    source,
    /\b(?:Wallet|signTransaction|broadcastTransaction)\b/,
  );
  assert.doesNotMatch(source, /dependencies\??:/);
}

for (const r of roots) {
  fs.rmSync(r, { recursive: true, force: true });
}

console.log("VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_V1_PROOF_GREEN");
console.log("durable_custody_reader_fixed=true");
console.log("dispatcher_job_identity_preflight=true");
console.log("dispatcher_claim_function_fixed=true");
console.log("fixed_lease_ttl_us=30000000");
console.log("caller_lease_ttl_authority=false");
console.log("lease_token_random_bytes=16");
console.log("worker_identity_bound=true");
console.log("active_lease_exclusion=true");
console.log("expired_lease_reclaim_generation_fence=true");
console.log("worker_execution=false");
console.log("dispatcher_renew=false");
console.log("dispatcher_publish=false");
console.log("runtime_route_mount=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
