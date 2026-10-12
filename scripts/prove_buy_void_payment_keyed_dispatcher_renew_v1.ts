#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  renewBuyVoidPaymentKeyedPreparedAttemptLeaseV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_renew_v1.js";
import {
  claimBuyVoidPaymentKeyedPreparedAttemptV1,
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
const REQUEST = "a".repeat(64);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
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

  async run_serializable_job_decision<T>(
    _attemptId: string,
    action: (
      tx: BuyVoidPaymentKeyedDispatcherTransactionV1,
    ) => T | Promise<T>,
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
        rows.push({
          ...structuredClone(decision),
          decision_seq: sequence,
        });
        audits.set(decision.attempt_id, rows);
        return sequence;
      },
    };
    const result = await action(tx);
    this.jobs = jobs;
    this.audits = audits;
    return result;
  }
}

function writeCustody(root: string): void {
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
    request_fingerprint_sha256: REQUEST,
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
    unsigned_transaction_fingerprint_sha256: "2".repeat(64),
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
      "request_fingerprint_sha256=" + REQUEST,
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

function makeRoot(label: string): string {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-dispatcher-renew-" + label + "-"),
  );
  fs.chmodSync(root, 0o700);
  writeCustody(root);
  return root;
}

async function seedClaim(root: string, store: MemoryStore, worker = "worker-a") {
  const submitted = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: ATTEMPT,
    request_fingerprint_sha256: REQUEST,
    client_id: "renew-proof",
    store,
  });
  assert.equal(submitted.ok, true);
  const claimed = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT,
    worker_id: worker,
    store,
  });
  assert.equal(claimed.ok, true);
  assert.equal(claimed.status, "claimed");
  if (claimed.ok !== true || claimed.status !== "claimed") {
    throw new Error("claim_required");
  }
  return claimed.lease;
}

const roots: string[] = [];

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1",
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_AUTHORITY_V1
    .lease_ttl_us,
  "30000000",
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_AUTHORITY_V1
    .caller_lease_ttl_authority,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_AUTHORITY_V1
    .worker_execution,
  false,
);
assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_AUTHORITY_V1
    .dispatcher_publish,
  false,
);

{
  const root = makeRoot("success");
  roots.push(root);
  const store = new MemoryStore();
  const lease = await seedClaim(root, store);

  const renewed = await renewBuyVoidPaymentKeyedPreparedAttemptLeaseV1({
    root_dir: root,
    lease,
    store,
  });
  assert.equal(renewed.ok, true);
  assert.equal(renewed.status, "renewed");
  if (renewed.ok !== true) throw new Error("renew_success_required");
  assert.equal(renewed.attempt_id, ATTEMPT);
  assert.equal(renewed.worker_id, "worker-a");
  assert.equal(renewed.lease_gen, lease.lease_gen);
  assert.equal(renewed.lease.lease_gen, lease.lease_gen);
  assert.equal(renewed.lease.lease_token, lease.lease_token);
  assert.equal(renewed.lease.worker_id, lease.worker_id);
  assert.ok(
    renewed.renewed_lease_expires_us >
      renewed.previous_lease_expires_us,
  );
  assert.equal(renewed.worker_execution_performed, false);
  assert.equal(renewed.dispatcher_publish_performed, false);
  assert.equal(renewed.runtime_preview_performed, false);
  assert.equal(renewed.runtime_apply_performed, false);
  assert.equal(renewed.signing_performed, false);
  assert.equal(renewed.transaction_broadcast_performed, false);
  assert.equal(renewed.money_movement_performed, false);

  const rows = store.audits.get(ATTEMPT) || [];
  assert.equal(rows.at(-1)?.event_type, "LEASE_RENEW");
  assert.equal(rows.at(-1)?.outcome, "SUCCESS");
  assert.equal(rows.at(-1)?.actor_id, "worker-a");
  assert.equal(rows.at(-1)?.lease_gen, lease.lease_gen);
}

{
  const root = makeRoot("forged");
  roots.push(root);
  const store = new MemoryStore();
  const lease = await seedClaim(root, store);
  const forged = {
    ...lease,
    lease_token:
      (lease.lease_token[0] === "0" ? "1" : "0") +
      lease.lease_token.slice(1),
  };
  const decision = await renewBuyVoidPaymentKeyedPreparedAttemptLeaseV1({
    root_dir: root,
    lease: forged,
    store,
  });
  assert.equal(decision.ok, false);
  if (decision.ok !== false) throw new Error("forged_lease_must_hold");
  assert.equal(decision.reason, "lease_context_held");
  assert.equal(decision.dispatcher_renew_attempted, false);
}

{
  const root = makeRoot("expired");
  roots.push(root);
  const store = new MemoryStore();
  const lease = await seedClaim(root, store);
  store.clock = lease.lease_expires_us;
  const decision = await renewBuyVoidPaymentKeyedPreparedAttemptLeaseV1({
    root_dir: root,
    lease,
    store,
  });
  assert.equal(decision.ok, false);
  if (decision.ok !== false) throw new Error("expired_lease_must_hold");
  assert.equal(decision.reason, "lease_context_held");
  assert.equal(decision.dispatcher_renew_attempted, false);
}

{
  const root = makeRoot("stale");
  roots.push(root);
  const store = new MemoryStore();
  const first = await seedClaim(root, store, "worker-a");
  store.clock = first.lease_expires_us + 1n;
  const second = await claimBuyVoidPaymentKeyedPreparedAttemptV1({
    root_dir: root,
    attempt_id: ATTEMPT,
    worker_id: "worker-b",
    store,
  });
  assert.equal(second.ok, true);
  assert.equal(second.status, "claimed");
  const decision = await renewBuyVoidPaymentKeyedPreparedAttemptLeaseV1({
    root_dir: root,
    lease: first,
    store,
  });
  assert.equal(decision.ok, false);
  if (decision.ok !== false) throw new Error("stale_lease_must_hold");
  assert.equal(decision.reason, "lease_context_held");
  assert.equal(decision.dispatcher_renew_attempted, false);
}

{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(
    path.resolve(
      here,
      "../src/economic/buy_void_payment_keyed_dispatcher_renew_v1.ts",
    ),
    "utf8",
  );
  assert.match(
    source,
    /reconstructBuyVoidPaymentKeyedLeaseContextV1/,
  );
  assert.match(
    source,
    /renewBuyVoidPaymentKeyedDispatchLeaseV1/,
  );
  assert.match(
    source,
    /VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_CLAIM_LEASE_TTL_US_V1/,
  );
  assert.doesNotMatch(source, /lease_ttl_us:\s*input/);
  assert.doesNotMatch(source, /publishBuyVoidPaymentKeyedDispatchResultV1/);
  assert.doesNotMatch(source, /runBuyVoidPaymentKeyedFullRuntimeV1/);
  assert.doesNotMatch(source, /\bapp\.(?:get|post|put|delete)\b/);
  assert.doesNotMatch(
    source,
    /\b(?:Wallet|signTransaction|broadcastTransaction)\b/,
  );
}

for (const root of roots) {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_RENEW_V1_PROOF_GREEN",
);
console.log("durable_lease_context_required=true");
console.log("dispatcher_renew_function_fixed=true");
console.log("lease_ttl_us=30000000");
console.log("caller_lease_ttl_authority=false");
console.log("lease_generation_preserved=true");
console.log("lease_capability_preserved=true");
console.log("worker_identity_preserved=true");
console.log("renewal_audit_atomic=true");
console.log("forged_lease_held_before_renew=true");
console.log("expired_lease_held_before_renew=true");
console.log("stale_lease_held_before_renew=true");
console.log("worker_execution=false");
console.log("dispatcher_publish=false");
console.log("runtime_preview=false");
console.log("runtime_apply=false");
console.log("runtime_route_mount=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("money_movement=false");
