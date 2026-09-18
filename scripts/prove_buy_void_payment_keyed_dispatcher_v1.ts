#!/usr/bin/env node
// @ts-nocheck
import assert from "node:assert/strict";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_QUALIFIED_REFERENCE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  claimBuyVoidPaymentKeyedDispatchV1,
  publishBuyVoidPaymentKeyedDispatchResultV1,
  renewBuyVoidPaymentKeyedDispatchLeaseV1,
  submitBuyVoidPaymentKeyedDispatchV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";

const A = "1".repeat(64);
const B = "2".repeat(64);
const REQUEST_A = "a".repeat(64);
const REQUEST_B = "b".repeat(64);
const RESULT_A = "c".repeat(64);
const RESULT_B = "d".repeat(64);

function cloneJob(value) {
  return value ? { ...value } : null;
}

function cloneAudit(values) {
  return values.map((value) => ({
    ...value,
    detail: { ...value.detail },
  }));
}

class FakeQualifiedStore {
  authority = {
    transaction_isolation: "SERIALIZABLE",
    per_job_admission:
      "session_advisory_lock_before_serializable_snapshot",
    canonical_audit_order: "per_job_decision_seq",
    retry_sqlstates: ["40001", "40P01"],
  };

  now = 1_000_000n;
  jobs = new Map();
  audits = new Map();
  cursors = new Map();
  fail_event = null;

  async run_serializable_job_decision(attemptId, action) {
    const jobs = new Map(
      [...this.jobs].map(([key, value]) => [key, cloneJob(value)]),
    );
    const audits = new Map(
      [...this.audits].map(([key, values]) => [key, cloneAudit(values)]),
    );
    const cursors = new Map(this.cursors);

    const tx = {
      now_us: async () => this.now,
      read_job_for_update: async (key) => cloneJob(jobs.get(key) || null),
      insert_job: async (record) => {
        if (jobs.has(record.attempt_id)) return false;
        jobs.set(record.attempt_id, cloneJob(record));
        return true;
      },
      update_job: async (key, expectedVersion, next) => {
        const existing = jobs.get(key);
        if (!existing || existing.version !== expectedVersion) return false;
        jobs.set(key, cloneJob(next));
        return true;
      },
      append_decision: async (decision) => {
        if (this.fail_event === decision.event_type) {
          throw new Error("injected_audit_failure:" + decision.event_type);
        }
        const next = (cursors.get(decision.attempt_id) || 0n) + 1n;
        cursors.set(decision.attempt_id, next);
        const row = { ...decision, decision_seq: next };
        const list = audits.get(decision.attempt_id) || [];
        list.push(row);
        audits.set(decision.attempt_id, list);
        return next;
      },
    };

    const result = await action(tx);
    this.jobs = jobs;
    this.audits = audits;
    this.cursors = cursors;
    return result;
  }

  job(id) {
    return cloneJob(this.jobs.get(id) || null);
  }

  audit(id) {
    return cloneAudit(this.audits.get(id) || []);
  }
}

function tokenFactory(...tokens) {
  const queue = [...tokens];
  return () => {
    const token = queue.shift();
    if (!token) throw new Error("token_queue_empty");
    return token;
  };
}

function assertGapFree(store, attemptId) {
  const rows = store.audit(attemptId);
  assert.deepEqual(
    rows.map((row) => row.decision_seq),
    rows.map((_, index) => BigInt(index + 1)),
  );
  assert.equal(store.cursors.get(attemptId) || 0n, BigInt(rows.length));
}

assert.deepEqual(VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_AUTHORITY_V1, {
  source_only_contract: true,
  runtime_route_mount: false,
  canonical_parent_dispatch: false,
  production_store_adapter_present: false,
  transaction_isolation_required: "SERIALIZABLE",
  per_job_admission_required:
    "session_advisory_lock_before_serializable_snapshot",
  retry_sqlstates_required: ["40001", "40P01"],
  canonical_audit_order_required: "per_job_decision_seq",
  audit_id_is_commit_order: false,
  immutable_request_fingerprint_required: true,
  monotonic_lease_generation_required: true,
  random_128_bit_lease_capability_required: true,
  worker_identity_binding_required: true,
  database_time_inside_transaction_required: true,
  state_and_success_audit_atomicity_required: true,
  rejected_decision_audit_commit_required: true,
  transaction_broadcast: false,
  wallet_access: false,
  signing: false,
  money_movement: false,
});

assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_QUALIFIED_REFERENCE_V1,
  {
    source_design_sha256:
      "816ce079d3f8b36c374ec4a24698f01af1b291e7a8e9c2d9aca79bdbad10989f",
    substantive_audit_receipt_sha256:
      "23e38a4dcf01cb1fe4286850b06354e8db66a457dc12b1b12b3451afaa064f00",
    sqlite_reference_sha256:
      "c19c10bebf575932a5e28ee84a3b55fc585a18dd2b6c6ddbc152e48ab127a8b6",
    postgres_reference_v3_sha256:
      "0ebc2ae33838080dc08fe238d950d8b1558d306b2165a42502630d0e887c710b",
    qualification_launcher_sha256:
      "c3fed8e1edd366b5a0de8bb4d21dcda32d99fe4bd6031ae6908adefe52ee00f7",
    baseline_tests: "9/9",
    audit_order_tests: "5/5",
    server_crash_tests: "4/4",
    modelcheck: "24/24 seeds; 2880 steps",
    differential_oracle: "20/20 seeds; 2800 steps; 2862 comparisons",
    linearizability: "70/70 rounds",
  },
);

const store = new FakeQualifiedStore();
const tokens = tokenFactory("11".repeat(16), "22".repeat(16));

const submitted = await submitBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  request_fingerprint_sha256: REQUEST_A,
  client_id: "client-1",
  store,
});
assert.equal(submitted.ok, true);
assert.equal(submitted.status, "submitted");
assert.equal(submitted.job.lease_gen, 0n);
assert.equal(Object.hasOwn(submitted.job, "lease_token"), false);

const replay = await submitBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  request_fingerprint_sha256: REQUEST_A,
  client_id: "client-2",
  store,
});
assert.equal(replay.ok, true);
assert.equal(replay.status, "idempotent");

const conflict = await submitBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  request_fingerprint_sha256: REQUEST_B,
  client_id: "client-3",
  store,
});
assert.equal(conflict.ok, false);
assert.equal(conflict.reason, "request_fingerprint_mismatch");
assert.equal(store.job(A).request_fingerprint_sha256, REQUEST_A);

const claimA = await claimBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  worker_id: "worker-a",
  lease_ttl_us: 100n,
  lease_token_factory: tokens,
  store,
});
assert.equal(claimA.ok, true);
assert.equal(claimA.status, "claimed");
assert.equal(claimA.lease.lease_gen, 1n);
assert.equal(Object.hasOwn(claimA.job, "lease_token"), false);

const blocked = await claimBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  worker_id: "worker-b",
  lease_ttl_us: 100n,
  lease_token_factory: tokens,
  store,
});
assert.equal(blocked.ok, false);
assert.equal(blocked.reason, "active_lease");

const forged = {
  ...claimA.lease,
  worker_id: "worker-b",
  lease_token: "ff".repeat(16),
};
const forgedRenew = await renewBuyVoidPaymentKeyedDispatchLeaseV1({
  lease: forged,
  lease_ttl_us: 100n,
  store,
});
assert.equal(forgedRenew.ok, false);
assert.equal(forgedRenew.reason, "unauthorized_lease");

store.now = claimA.lease.lease_expires_us + 1n;
const claimB = await claimBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  worker_id: "worker-b",
  lease_ttl_us: 200n,
  lease_token_factory: tokens,
  store,
});
assert.equal(claimB.ok, true);
assert.equal(claimB.status, "claimed");
assert.equal(claimB.lease.lease_gen, 2n);

const stalePublish = await publishBuyVoidPaymentKeyedDispatchResultV1({
  lease: claimA.lease,
  result_fingerprint_sha256: RESULT_A,
  store,
});
assert.equal(stalePublish.ok, false);
assert.equal(stalePublish.reason, "stale_generation");

const published = await publishBuyVoidPaymentKeyedDispatchResultV1({
  lease: claimB.lease,
  result_fingerprint_sha256: RESULT_A,
  store,
});
assert.equal(published.ok, true);
assert.equal(published.status, "published");
assert.equal(published.job.published, true);
assert.equal(published.job.published_gen, 2n);
assert.equal(published.job.lease_owner, null);
assert.equal(published.job.lease_expires_us, null);
assert.equal(published.job.result_fingerprint_sha256, RESULT_A);

const publishReplay = await publishBuyVoidPaymentKeyedDispatchResultV1({
  lease: claimB.lease,
  result_fingerprint_sha256: RESULT_B,
  store,
});
assert.equal(publishReplay.ok, true);
assert.equal(publishReplay.status, "idempotent");
assert.equal(publishReplay.job.result_fingerprint_sha256, RESULT_A);

const postPublishConflict = await submitBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  request_fingerprint_sha256: REQUEST_B,
  client_id: "client-after-publication",
  store,
});
assert.equal(postPublishConflict.ok, false);
assert.equal(postPublishConflict.reason, "request_fingerprint_mismatch");
assert.equal(store.job(A).request_fingerprint_sha256, REQUEST_A);
assert.equal(store.job(A).result_fingerprint_sha256, RESULT_A);

const publishedClaim = await claimBuyVoidPaymentKeyedDispatchV1({
  attempt_id: A,
  worker_id: "worker-c",
  lease_ttl_us: 100n,
  lease_token_factory: () => "33".repeat(16),
  store,
});
assert.equal(publishedClaim.ok, true);
assert.equal(publishedClaim.status, "published");

assertGapFree(store, A);
assert.deepEqual(
  store.audit(A).map((row) => row.event_type),
  [
    "SUBMIT",
    "SUBMIT_REPLAY",
    "PAYLOAD_CONFLICT",
    "CLAIM",
    "CLAIM_REJECT_ACTIVE",
    "RENEW_REJECT_UNAUTHORIZED",
    "LEASE_EXPIRED_RECLAIM",
    "CLAIM",
    "PUBLISH_REJECT_STALE",
    "PUBLISH",
    "PUBLISH_REPLAY",
    "PAYLOAD_CONFLICT",
    "CLAIM_REJECT_PUBLISHED",
  ],
);

// Transaction atomicity: fail the audit write after the job mutation. The fake
// qualified store rolls the whole decision back, proving the source logic never
// accepts a state-only commit boundary.
await submitBuyVoidPaymentKeyedDispatchV1({
  attempt_id: B,
  request_fingerprint_sha256: REQUEST_A,
  client_id: "rollback-client",
  store,
});
const beforeRollbackJob = store.job(B);
const beforeRollbackAudit = store.audit(B);
const beforeRollbackCursor = store.cursors.get(B);
store.fail_event = "CLAIM";
await assert.rejects(
  claimBuyVoidPaymentKeyedDispatchV1({
    attempt_id: B,
    worker_id: "rollback-worker",
    lease_ttl_us: 100n,
    lease_token_factory: () => "44".repeat(16),
    store,
  }),
  /injected_audit_failure:CLAIM/,
);
store.fail_event = null;
assert.deepEqual(store.job(B), beforeRollbackJob);
assert.deepEqual(store.audit(B), beforeRollbackAudit);
assert.equal(store.cursors.get(B), beforeRollbackCursor);
assertGapFree(store, B);

// Weak or mismatched stores are refused before any decision executes.
const invalidStore = {
  ...store,
  authority: {
    ...store.authority,
    transaction_isolation: "READ COMMITTED",
  },
};
await assert.rejects(
  submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: "3".repeat(64),
    request_fingerprint_sha256: REQUEST_A,
    client_id: "client",
    store: invalidStore,
  }),
  /dispatcher_store_authority_invalid/,
);

console.log("VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_PROOF_V1");
console.log("qualified_reference_binding=GREEN");
console.log("source_only_authority=GREEN");
console.log("submit_idempotency=GREEN");
console.log("payload_conflict_before_and_after_publication=GREEN");
console.log("active_lease_exclusion=GREEN");
console.log("worker_capability_authorization=GREEN");
console.log("expiry_reclaim_generation_fence=GREEN");
console.log("stale_publish_rejection=GREEN");
console.log("exactly_one_canonical_result=GREEN");
console.log("publication_replay=GREEN");
console.log("gap_free_decision_seq=GREEN");
console.log("state_audit_atomicity=GREEN");
console.log("weak_store_refusal=GREEN");
console.log("runtime_route_mount=false");
console.log("production_store_adapter_present=false");
console.log("transaction_broadcast=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("money_movement=false");
