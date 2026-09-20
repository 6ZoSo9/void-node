import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { Wallet } from "ethers";
import {
  VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
  type BuyVoidExecutionAttemptStateV1,
} from "../src/economic/buy_void_execution_attempt_journal_v1.js";
import { VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1 } from "../src/economic/buy_void_source_finality_execution_preflight_v1.js";
import { buildBuyVoidPaymentKeyedFulfillmentCallV1 } from "../src/economic/buy_void_payment_keyed_fulfillment_call_v1.js";
import { buildBuyVoidPaymentKeyedUnsignedTransactionV1 } from "../src/economic/buy_void_payment_keyed_unsigned_transaction_v1.js";
import { buildBuyVoidPaymentKeyedCustodianPrepareRequestV1 } from "../src/economic/buy_void_payment_keyed_custodian_prepare_request_v1.js";
import {
  runBuyVoidPaymentKeyedCustodianSignerV1,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
} from "../src/economic/buy_void_payment_keyed_custodian_signer_v1.js";
import {
  runBuyVoidPaymentKeyedCustodianBroadcastV1 as broadcast,
  VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_BROADCAST_CONFIRMATION_V1 as CONFIRM,
  VOID_BUY_VOID_PAYMENT_KEYED_SUBMISSION_ADMISSION_TIMEOUT_MS_V1 as TIMEOUT_MS,
  type BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1,
} from "../src/economic/buy_void_payment_keyed_custodian_broadcast_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 as DISPATCHER,
  type BuyVoidPaymentKeyedDispatcherLeaseV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1 as SQL,
  type BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
  type BuyVoidPaymentKeyedDispatcherPostgresClientV1,
  type BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.js";
import {
  createBuyVoidPaymentKeyedDispatcherLeaseSessionV1 as createSession,
  type BuyVoidPaymentKeyedDispatcherLeaseSessionV1,
  type BuyVoidPaymentKeyedDispatcherLeaseSessionOutcomeV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_lease_session_v1.js";

const ATTEMPT = "1".repeat(64);
const IDENTITY = "voidpay1:base:0x" + "a".repeat(64) + ":7";
const CONTRACT = "0x" + "5".repeat(40);
const NOW = 1_700_000_000_000_000n;
const EXPIRY = NOW + 30_000_000n;
const cases: string[] = [];
type Business = Awaited<ReturnType<typeof broadcast>>;

function gate<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const turn = () => new Promise<void>((resolve) => setImmediate(resolve));
const driverError = (code: string) => Object.assign(new Error("synthetic driver fault"), { code });

// The timer is armed after the fixture grants the claim. Use monotonic time and
// a small scheduling tolerance; an immediate/shortened timeout cannot pass.
function requireTimeoutElapsed(elapsedMs: number): void {
  assert.ok(Number.isFinite(elapsedMs) && elapsedMs >= TIMEOUT_MS - 25,
    "admission timeout returned before the measured five-second boundary");
}
function requirePreservedDecision(
  result: BuyVoidPaymentKeyedDispatcherLeaseSessionOutcomeV1<Business>,
  observed: Business,
  snapshot: Business,
): void {
  assert.equal(result.result?.value, observed, "preserve the returned business object identity");
  assert.deepEqual(result.result?.value, snapshot, "preserve every pre-cleanup business field");
}

async function signedFixture() {
  // Fixed public test key, no provider. The builders and signing/broadcast input
  // validators are real; source-finality and SQL/provider observations are not.
  const wallet = new Wallet("0x" + "11".repeat(32));
  const attempt: BuyVoidExecutionAttemptStateV1 = {
    reservation: {
      schema: "void_buy_void_execution_attempt_reservation_v1",
      marker: VOID_BUY_VOID_EXECUTION_ATTEMPT_JOURNAL_V1,
      attempt_id: ATTEMPT, attempt_number: 1, reserved_at_ms: 1,
      payment_key_sha256: "2".repeat(64), request_key_sha256: "7".repeat(64),
      canonical_payment_identity: IDENTITY,
      request_id: "buyvoid-payment-keyed-custodian-broadcast-v1",
      instruction_id: "8".repeat(64), intent_fingerprint: "9".repeat(64),
      max_attempts_per_payment: 1,
      unsigned_instruction: {
        schema: "void_buy_void_unsigned_fulfillment_instruction_v1",
        marker: "VOID_BUY_VOID_AUTO_FULFILLMENT_V1",
        instruction_id: "8".repeat(64),
        request_id: "buyvoid-payment-keyed-custodian-broadcast-v1",
        canonical_payment_identity: IDENTITY, source_chain: "base",
        payment_transaction_hash: "0x" + "a".repeat(64), payment_log_index: "7",
        delivery_address: "0x" + "4".repeat(40), payment_usdc_units: "1000000",
        void_amount_units: "2000000", confirmed_block_number: "123",
        confirmation_count: "12", signing_authorized: false,
        transaction_broadcast_authorized: false, automatic_execution_authorized: false,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    },
    prepared: null, broadcast: null, failure: null, postbroadcast_failure: null,
    confirmation: null, status: "reserved",
  };
  const call = buildBuyVoidPaymentKeyedFulfillmentCallV1({
    attempt,
    source_finality: {
      ok: true, marker: VOID_BUY_VOID_SOURCE_FINALITY_EXECUTION_PREFLIGHT_V1,
      version: 1, status: "ready", attempt_id: ATTEMPT, source_chain: "base",
      canonical_payment_identity: IDENTITY,
      payment_key_sha256: "a06bb682bc6225c6697d0a37a51fc1323dc657eac74a51506ddb5d7daed82c85",
      process_source_identity_verified: true, reviewed_source_files_verified: true,
      authenticated_transport_identity_verified: true, total_operation_deadline_verified: true,
      source_generation_verified: true, deployed_artifact_generation_verified: true,
      ancestry_verified: true, provider_quorum_verified: true,
      production_source_finality_authority_ready: true,
      wallet_access_performed: false, signing_performed: false,
      transaction_broadcast_performed: false, money_movement_performed: false,
    },
    policy: { chain_id: "2050", fulfillment_contract_address: CONTRACT, max_void_amount_units: "10000000000000" },
  });
  if (call.ok === false) throw new Error(call.reason);
  const plan = { chain_id: "2050" as const, nonce: 7, gas_limit: "120000", max_fee_per_gas_wei: "2000000000", max_priority_fee_per_gas_wei: "1000000000" };
  const policy = { chain_id: "2050" as const, fulfillment_wallet_address: wallet.address.toLowerCase(), fulfillment_contract_address: CONTRACT, max_void_amount_units: "10000000000000", max_gas_limit: "300000", max_fee_per_gas_wei: "5000000000", max_priority_fee_per_gas_wei: "1000000000" };
  const unsigned = buildBuyVoidPaymentKeyedUnsignedTransactionV1({ attempt_id: ATTEMPT, fulfillment_call: call, plan, policy });
  if (unsigned.ok === false) throw new Error(unsigned.reason);
  const prepared = buildBuyVoidPaymentKeyedCustodianPrepareRequestV1({
    saga_id: "voidbvfsg1_" + "a".repeat(64), attempt_id: ATTEMPT,
    plan_reservation_id: "b".repeat(64), fulfillment_call: call, plan,
    unsigned_transaction: unsigned, policy,
  });
  if (prepared.ok === false) throw new Error(prepared.reason);
  const signed = await runBuyVoidPaymentKeyedCustodianSignerV1({
    request: prepared.request, apply: true,
    confirmation: VOID_BUY_VOID_PAYMENT_KEYED_CUSTODIAN_SIGNER_CONFIRMATION_V1,
    signer: {
      async get_address() { return wallet.address.toLowerCase(); },
      async sign_transaction(tx) {
        return wallet.signTransaction({ type: tx.type, chainId: tx.chainId, nonce: tx.nonce,
          gasLimit: tx.gasLimit, maxFeePerGas: tx.maxFeePerGas,
          maxPriorityFeePerGas: tx.maxPriorityFeePerGas, to: tx.to, value: tx.value, data: tx.data });
      },
    },
  });
  if (signed.ok === false) throw new Error(signed.reason);
  assert.equal(signed.status, "signed");
  const signedHash = signed.signed_transaction_hash;
  const raw = signed.raw_signed_transaction;
  assert.ok(signedHash);
  assert.ok(raw);
  return { request: prepared.request, signed, signedHash, raw };
}

// No socket/server: exercise the real canonical adapter with a controlled SQL
// transport. Track active queries independently of the code under test.
class SqlFixture implements BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
BuyVoidPaymentKeyedDispatcherPostgresClientV1 {
  calls: string[] = [];
  clock = NOW;
  active = 0;
  releases = 0;
  lock = false;
  transaction = false;
  faults: { sql: string; code: string }[] = [];
  queryGate: ((sql: string) => Promise<void>) | null = null;
  job: Record<string, unknown>;
  readonly lease: BuyVoidPaymentKeyedDispatcherLeaseV1 = {
    marker: DISPATCHER, attempt_id: ATTEMPT, lease_gen: 1n,
    lease_token: "c".repeat(32), worker_id: "admission-fixture", lease_expires_us: EXPIRY,
  };
  constructor(fingerprint: string) {
    this.job = { attempt_id: ATTEMPT, request_fingerprint_sha256: fingerprint,
      submitted_at_us: String(NOW - 1n), result_fingerprint_sha256: null,
      published: false, published_gen: null, lease_gen: "1", lease_token: this.lease.lease_token,
      lease_owner: this.lease.worker_id, lease_expires_us: String(EXPIRY), version: "1" };
  }
  async connect() { return this; }
  async query(sql: string, values: readonly unknown[] = []): Promise<BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1> {
    this.calls.push(sql);
    this.active += 1;
    try {
      if (this.queryGate) await this.queryGate(sql);
      const at = this.faults.findIndex((fault) => fault.sql === sql);
      if (at >= 0) throw driverError(this.faults.splice(at, 1)[0].code);
      if (sql === SQL.set_lock_timeout || sql === SQL.set_statement_timeout) return { rows: [{ value: values[0] }], rowCount: 1 };
      if (sql === SQL.advisory_lock) this.lock = true;
      else if (sql === SQL.begin_serializable) { assert.equal(this.lock, true); this.transaction = true; }
      else if (sql === SQL.read_job_for_update) {
        assert.equal(this.lock && this.transaction, true);
        assert.deepEqual(values, [ATTEMPT]);
        return { rows: [{ ...this.job }], rowCount: 1 };
      } else if (sql === SQL.now_us) {
        assert.equal(this.lock && this.transaction, true);
        return { rows: [{ now_us: String(this.clock) }], rowCount: 1 };
      } else if (sql === SQL.commit || sql === SQL.rollback) {
        assert.equal(this.active, 1, "transaction terminal cannot overlap a lease query");
        this.transaction = false;
      } else if (sql === SQL.advisory_unlock) {
        assert.equal(this.active, 1, "unlock cannot overlap a lease query");
        this.lock = false;
        return { rows: [{ unlocked: true }], rowCount: 1 };
      } else if (sql === SQL.reset_lock_timeout || sql === SQL.reset_statement_timeout) {
        assert.equal(this.active, 1, "timeout reset cannot overlap a lease query");
      } else assert.fail("unexpected SQL");
      return { rows: [], rowCount: 0 };
    } finally { this.active -= 1; }
  }
  release() { assert.equal(this.active, 0); this.releases += 1; }
  count(sql: string) { return this.calls.filter((value) => value === sql).length; }
}

async function main() {
  const input = await signedFixture();
  const dry = await broadcast({ request: input.request, signed: input.signed });
  assert.equal(dry.ok, true);
  const fingerprint = input.request.request_fingerprint_sha256;
  const expectedContext = {
    attempt_id: ATTEMPT, expected_transaction_hash: input.signedHash,
    submission_idempotency_key: dry.submission_idempotency_key,
    request_fingerprint_sha256: fingerprint,
    unsigned_transaction_fingerprint_sha256: input.request.unsigned_transaction_fingerprint_sha256,
    transaction_plan_fingerprint_sha256: input.request.transaction_plan_fingerprint_sha256,
  };

  function harness() {
    const sql = new SqlFixture(fingerprint);
    const runner = createSession({ pool: sql });
    const calls = { claim: 0, release: 0, broadcast: 0, admission: 0 };
    let claimed = false;
    let claimGrantedAt: number | null = null;
    let decisionObservedAt: number | null = null;
    let decisionSnapshot: Business | null = null;
    let afterClaim: (() => void | Promise<void>) | null = null;
    let escaped: BuyVoidPaymentKeyedDispatcherLeaseSessionV1 | null = null;
    const observation = gate<Business>();
    const invoke = () => runner.run_once(sql.lease, fingerprint, async (session) => {
      escaped = session;
      const deps: BuyVoidPaymentKeyedCustodianBroadcastDependenciesV1 = {
        submission_guard: {
          async claim_submission_once() {
            calls.claim += 1;
            if (claimed) return { claimed: false as const, reason: "already_claimed" };
            claimed = true;
            if (afterClaim) await afterClaim();
            claimGrantedAt = performance.now();
            return { claimed: true as const };
          },
          async release_submission_claim() { calls.release += 1; claimed = false; return { released: true as const }; },
        },
        before_external_submission: async (context) => {
          calls.admission += 1;
          assert.equal(Object.isFrozen(context), true);
          assert.deepEqual(context, expectedContext);
          return session.revalidate_lease();
        },
        broadcaster: {
          async broadcast_signed_transaction(raw) {
            calls.broadcast += 1;
            assert.equal(sql.lock && sql.transaction, true);
            assert.equal(sql.active, 0);
            assert.equal(raw, input.raw);
            return { accepted: true, transaction_hash: input.signedHash,
              provider_submission_id: "synthetic-lease-admission", submission_may_have_occurred: true };
          },
        },
      };
      const decision = await broadcast({ request: input.request, signed: input.signed, apply: true, confirmation: CONFIRM, dependencies: deps });
      decisionObservedAt = performance.now();
      decisionSnapshot = structuredClone(decision);
      observation.resolve(decision);
      return decision;
    });
    return { sql, calls, invoke, observation,
      setAfterClaim(value: () => void | Promise<void>) { afterClaim = value; },
      getSession() { assert.ok(escaped); return escaped; },
      setClaimed() { claimed = true; },
      elapsedSinceClaim() {
        assert.notEqual(claimGrantedAt, null);
        assert.notEqual(decisionObservedAt, null);
        return decisionObservedAt! - claimGrantedAt!;
      },
      snapshot() { assert.ok(decisionSnapshot); return decisionSnapshot; },
    };
  }
  function finished(result: BuyVoidPaymentKeyedDispatcherLeaseSessionOutcomeV1<Business>) {
    assert.equal(result.session_closed, true);
    assert.equal(result.pending_lease_checks_settled, true);
    assert.equal(result.lease_checks_started, result.lease_checks_completed);
    assert.equal(result.automatic_retry_allowed, false);
    assert.equal(result.effect_cut_integration_complete, false);
  }
  function alreadyClaimed(decision: Business) {
    assert.equal(decision.ok, false);
    if (decision.ok) throw new Error("unexpected retained-claim success");
    assert.equal(decision.status, "held");
    assert.equal(decision.reason, "payment_keyed_submission_guard_already_claimed");
    assert.equal(decision.submission_guard_claimed, false);
    assert.equal(decision.submission_guard_released, false);
    assert.equal(decision.broadcast_call_performed, false);
    assert.equal(decision.reconciliation_required, true);
    assert.equal(decision.retry_allowed, false);
    assert.equal(decision.automatic_retry_allowed, false);
    assert.equal(decision.provider_submission_id, "");
    assert.equal(decision.detail?.guard_reason, "already_claimed");
    assert.equal(decision.detail?.existing_transaction_hash, "");
    for (const [key, value] of Object.entries(expectedContext)) {
      assert.equal((decision as unknown as Record<string, unknown>)[key], value);
    }
  }
  function noSubmission(decision: Business, reason: string) {
    assert.equal(decision.ok, false);
    if (decision.ok) throw new Error("unexpected success");
    assert.equal(decision.status, "held");
    assert.equal(decision.reason, reason);
    assert.equal(decision.submission_guard_claimed, true);
    assert.equal(decision.submission_guard_released, false);
    assert.equal(decision.broadcast_call_performed, false);
    assert.equal(decision.reconciliation_required, true);
    assert.equal(decision.retry_allowed, false);
    assert.equal(decision.provider_submission_id, "");
  }

  {
    const h = harness(), result = await h.invoke();
    finished(result);
    assert.equal(result.status, "completed");
    assert.equal(result.result?.value.status, "broadcast_accepted");
    assert.deepEqual(h.calls, { claim: 1, release: 0, broadcast: 1, admission: 1 });
    assert.equal(h.sql.count(SQL.begin_serializable), 1);
    assert.equal(h.sql.releases, 1);
    cases.push("valid_real_admission_exact_bytes_inside_owned_session");
  }
  for (const [name, change] of [
    ["expired", (s: SqlFixture) => { s.clock = EXPIRY; }],
    ["generation", (s: SqlFixture) => { s.job.lease_gen = "2"; }],
    ["clock_regressed", (s: SqlFixture) => { s.clock = NOW - 1n; }],
  ] as const) {
    const h = harness(); h.setAfterClaim(() => change(h.sql));
    const result = await h.invoke(); finished(result);
    assert.equal(result.status, "reconciliation_required");
    assert.ok(result.result);
    noSubmission(result.result.value, "payment_keyed_submission_admission_held");
    assert.deepEqual(h.calls, { claim: 1, release: 0, broadcast: 0, admission: 1 });
    cases.push("post_claim_drift_" + name);
  }
  {
    const h = harness(); h.sql.clock = EXPIRY;
    const result = await h.invoke(); finished(result);
    assert.equal(result.status, "held");
    assert.equal(result.action_started, false);
    assert.deepEqual(h.calls, { claim: 0, release: 0, broadcast: 0, admission: 0 });
    cases.push("entry_expired_reaches_neither_claim_nor_admission");
  }
  {
    const h = harness(); h.setClaimed();
    const result = await h.invoke(); finished(result);
    // Orchestration completion is not business acceptance.
    assert.equal(result.status, "completed");
    assert.ok(result.result);
    alreadyClaimed(result.result.value);
    assert.equal(h.sql.count(SQL.read_job_for_update), 1);
    assert.deepEqual(h.calls, { claim: 1, release: 0, broadcast: 0, admission: 0 });
    cases.push("claim_refusal_does_not_run_post_claim_check");
  }

  assert.equal(TIMEOUT_MS, 5_000);
  for (const blockedSql of [SQL.read_job_for_update, SQL.now_us]) {
    for (const rejects of [false, true]) {
      const h = harness(), entered = gate(), resume = gate();
      h.setAfterClaim(() => {
        h.sql.queryGate = async (sql) => {
          if (sql === blockedSql) { entered.resolve(); await resume.promise; }
        };
      });
      let outerSettled = false;
      const running = h.invoke().then((result) => { outerSettled = true; return result; });
      await entered.promise;
      const decision = await h.observation.promise; // Wait for the REAL five-second deadline.
      noSubmission(decision, "payment_keyed_submission_admission_timeout");
      requireTimeoutElapsed(h.elapsedSinceClaim());
      await turn();
      assert.equal(outerSettled, false, "caller timeout cannot complete the database session");
      assert.equal(h.sql.active, 1);
      for (const sql of [SQL.commit, SQL.rollback, SQL.advisory_unlock, SQL.reset_statement_timeout, SQL.reset_lock_timeout]) {
        assert.equal(h.sql.count(sql), 0, "pending lease SQL prevents cleanup: " + sql);
      }
      assert.equal(h.sql.releases, 0);
      assert.equal(h.sql.lock && h.sql.transaction, true);
      const before = h.sql.calls.length;
      assert.equal(await h.getSession().revalidate_lease(), false);
      assert.equal(h.sql.calls.length, before);
      if (rejects) resume.reject(driverError("08006")); else resume.resolve();
      const result = await running; finished(result);
      assert.equal(result.status, "reconciliation_required");
      requirePreservedDecision(result, decision, h.snapshot());
      assert.equal(h.sql.releases, 1);
      assert.equal(h.sql.active, 0);
      assert.equal(h.sql.count(SQL.begin_serializable), 1);
      // If the job read was pending, revocation prohibits the subsequent clock read.
      assert.equal(h.sql.count(SQL.now_us), blockedSql === SQL.read_job_for_update ? 1 : 2);
      await turn();
      assert.deepEqual(h.calls, { claim: 1, release: 0, broadcast: 0, admission: 1 });
      // With the first query settled, a new explicit invocation still sees the retained claim.
      h.sql.queryGate = null;
      const replay = await h.invoke(); finished(replay);
      assert.ok(replay.result);
      alreadyClaimed(replay.result.value);
      assert.deepEqual(h.calls, { claim: 2, release: 0, broadcast: 0, admission: 1 });
      cases.push(`real_timeout_drains_${blockedSql === SQL.now_us ? "clock" : "job"}_${rejects ? "rejection" : "success"}`);
    }
  }
  for (const code of ["40001", "40P01", "08006"]) {
    const h = harness(); h.sql.faults.push({ sql: SQL.commit, code });
    const result = await h.invoke(); finished(result);
    assert.equal(result.status, "reconciliation_required");
    assert.equal(result.result?.value.status, "broadcast_accepted");
    requirePreservedDecision(result, await h.observation.promise, h.snapshot());
    assert.equal(result.store_completion_confirmed, false);
    assert.equal(h.sql.count(SQL.begin_serializable), 1);
    assert.deepEqual(h.calls, { claim: 1, release: 0, broadcast: 1, admission: 1 });
    cases.push("accepted_outcome_survives_commit_fault_" + code);
  }
  {
    const h = harness(); h.sql.faults.push({ sql: SQL.advisory_unlock, code: "08006" });
    const result = await h.invoke(); finished(result);
    assert.equal(result.status, "reconciliation_required");
    assert.equal(result.result?.value.status, "broadcast_accepted");
    requirePreservedDecision(result, await h.observation.promise, h.snapshot());
    assert.equal(h.calls.broadcast, 1);
    assert.equal(h.sql.releases, 1);
    cases.push("accepted_outcome_survives_cleanup_fault");
  }
  {
    const h = harness(), entered = gate(), resume = gate();
    h.setAfterClaim(() => {
      h.sql.queryGate = async (sql) => {
        if (sql === SQL.read_job_for_update) { entered.resolve(); await resume.promise; }
      };
    });
    const running = h.invoke();
    await entered.promise;
    assert.equal(h.calls.broadcast, 0);
    assert.equal(h.sql.releases, 0);
    resume.resolve();
    const result = await running; finished(result);
    assert.equal(result.status, "completed");
    assert.equal(result.result?.value.status, "broadcast_accepted");
    assert.equal(h.calls.broadcast, 1);
    cases.push("pending_admission_settles_before_deadline_then_broadcasts_once");
  }
  assert.equal(new Set(cases).size, cases.length);
  assert.equal(cases.length, 15);
  console.log("VOID_BUY_VOID_PAYMENT_KEYED_LEASE_ADMISSION_COMPOSITION_V1_GREEN");
  console.log("cases=" + cases.length);
  console.log("real_custodian_admission_and_lease_session_composed=true");
  console.log("real_five_second_timeout_schedules=4");
  console.log("monotonic_timeout_lower_bound_measured=true");
  console.log("pre_cleanup_business_identity_and_snapshot_preserved=true");
  console.log("retained_claim_exact_reason_and_flags=true");
  console.log("pending_sql_release_before_settlement=false");
  console.log("late_admission_broadcast=false");
  console.log("accepted_outcome_preserved_across_store_failure=true");
  console.log("production_source_changed=false");
  console.log("saga_and_signing_fence_integration=false");
  console.log("live_postgres=false\nproduction_signing=false\nlive_broadcast=false\nfunds_action=false");
}
const deadline = setTimeout(() => { console.error("LEASE_ADMISSION_COMPOSITION_DEADLINE"); process.exit(1); }, 60_000);
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(deadline));
