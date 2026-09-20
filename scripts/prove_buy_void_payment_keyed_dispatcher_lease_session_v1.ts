import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1 as MARKER,
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

const ATTEMPT = "a".repeat(64);
const FINGERPRINT = "b".repeat(64);
const NOW = 1_700_000_000_000_000n;
const EXPIRY = NOW + 30_000_000n;
const EFFECT_VALUE = Object.freeze({ status: "synthetic_outcome", value: 7 });
const cases: string[] = [];
function lease(): BuyVoidPaymentKeyedDispatcherLeaseV1 {
  return {
    marker: MARKER, attempt_id: ATTEMPT, lease_gen: 1n,
    lease_token: "c".repeat(32), worker_id: "fixture-worker", lease_expires_us: EXPIRY,
  };
}
function gate() {
  let resolve!: () => void;
  const promise = new Promise<void>((yes) => { resolve = yes; });
  return { promise, resolve };
}
function driverError(code: string) {
  return Object.assign(new Error("private-fixture-driver-message"), { code });
}

// The real canonical store and non-replayable runner execute over this injected
// SQL transport. There is no PostgreSQL server, real signing or network transfer.
class Fixture implements BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
BuyVoidPaymentKeyedDispatcherPostgresClientV1 {
  clock = NOW;
  calls: string[] = [];
  connects = 0;
  releases = 0;
  activeQueries = 0;
  effects = 0;
  lockHeld = false;
  transactionOpen = false;
  connectGate: Promise<void> | null = null;
  queryGate: ((sql: string) => Promise<void>) | null = null;
  faults: { sql: string; code: string }[] = [];
  connectFails = false;
  releaseFails = false;
  absent = false;
  job: Record<string, unknown> = {
    attempt_id: ATTEMPT, request_fingerprint_sha256: FINGERPRINT,
    submitted_at_us: String(NOW - 1n), result_fingerprint_sha256: null,
    published: false, published_gen: null, lease_gen: "1",
    lease_token: "c".repeat(32), lease_owner: "fixture-worker",
    lease_expires_us: String(EXPIRY), version: "1",
  };
  async connect() {
    this.connects += 1;
    if (this.connectGate) await this.connectGate;
    if (this.connectFails) throw driverError("08006");
    return this;
  }
  async query(sql: string, values: readonly unknown[] = []): Promise<BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1> {
    this.calls.push(sql);
    this.activeQueries += 1;
    try {
      if (this.queryGate) await this.queryGate(sql);
      const at = this.faults.findIndex((fault) => fault.sql === sql);
      if (at !== -1) throw driverError(this.faults.splice(at, 1)[0].code);
      if (sql === SQL.set_lock_timeout || sql === SQL.set_statement_timeout) {
        return { rows: [{ value: values[0] }], rowCount: 1 };
      }
      if (sql === SQL.advisory_lock) this.lockHeld = true;
      else if (sql === SQL.begin_serializable) {
        assert.equal(this.lockHeld, true);
        this.transactionOpen = true;
      } else if (sql === SQL.commit || sql === SQL.rollback) {
        assert.equal(this.activeQueries, 1, "no concurrent lease read at transaction terminal");
        this.transactionOpen = false;
      } else if (sql === SQL.advisory_unlock) {
        assert.equal(this.activeQueries, 1, "no concurrent lease read at unlock");
        this.lockHeld = false;
        return { rows: [{ unlocked: true }], rowCount: 1 };
      } else if (sql === SQL.read_job_for_update) {
        assert.equal(this.lockHeld, true);
        assert.equal(this.transactionOpen, true);
        assert.deepEqual(values, [ATTEMPT]);
        return { rows: this.absent ? [] : [{ ...this.job }], rowCount: this.absent ? 0 : 1 };
      } else if (sql === SQL.now_us) {
        assert.equal(this.lockHeld, true);
        assert.equal(this.transactionOpen, true);
        return { rows: [{ now_us: String(this.clock) }], rowCount: 1 };
      } else if (sql !== SQL.reset_lock_timeout && sql !== SQL.reset_statement_timeout) {
        assert.fail("unexpected SQL");
      }
      return { rows: [], rowCount: 0 };
    } finally {
      this.activeQueries -= 1;
    }
  }
  release() {
    assert.equal(this.activeQueries, 0, "connection release must follow all lease reads");
    this.releases += 1;
    if (this.releaseFails) throw driverError("08006");
  }
  count(sql: string) { return this.calls.filter((value) => value === sql).length; }
  run<T>(action: (session: BuyVoidPaymentKeyedDispatcherLeaseSessionV1) => T | Promise<T>, selected = lease()) {
    return createSession({ pool: this }).run_once(selected, FINGERPRINT, action);
  }
  effect() {
    assert.equal(this.lockHeld, true);
    assert.equal(this.transactionOpen, true);
    this.effects += 1;
    return EFFECT_VALUE;
  }
}
function boundary<T>(result: BuyVoidPaymentKeyedDispatcherLeaseSessionOutcomeV1<T>) {
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.session_closed, true);
  assert.equal(result.pending_lease_checks_settled, true);
  assert.equal(result.lease_checks_started, result.lease_checks_completed);
  assert.equal(result.session_exposes_lease_token, false);
  assert.equal(result.session_exposes_transaction_interface, false);
  assert.equal(result.automatic_retry_allowed, false);
  assert.equal(result.saga_validation_performed, false);
  assert.equal(result.effect_cut_integration_complete, false);
  assert.equal(result.durable_outcome_receipt, false);
  assert.equal(result.cross_invocation_deduplication, false);
  assert.equal(Object.hasOwn(result, "detail"), false);
}
async function main() {
  {
    const f = new Fixture();
    let escaped!: BuyVoidPaymentKeyedDispatcherLeaseSessionV1;
    const result = await f.run(async (session) => {
      escaped = session;
      assert.equal(Object.isFrozen(session), true);
      assert.deepEqual(Object.keys(session).sort(), ["attempt_id", "revalidate_lease"]);
      assert.equal(await session.revalidate_lease(), true);
      f.clock += 1n;
      assert.equal(await session.revalidate_lease(), true);
      return f.effect();
    });
    boundary(result);
    assert.equal(result.status, "completed");
    assert.equal(result.result?.value, EFFECT_VALUE);
    assert.equal(result.lease_checks_started, 3);
    assert.equal(result.last_database_time_us, NOW + 1n);
    assert.equal(f.count(SQL.begin_serializable), 1);
    assert.equal(f.releases, 1);
    const before = f.calls.length;
    assert.equal(await escaped.revalidate_lease(), false);
    assert.equal(f.calls.length, before);
    assert.equal(result.status, "completed");
    const reads = f.calls.filter((sql) => sql === SQL.read_job_for_update || sql === SQL.now_us);
    assert.deepEqual(reads, Array.from({ length: 3 }, () => [SQL.read_job_for_update, SQL.now_us]).flat());
    cases.push("valid_sequential_reads_and_revoked_escaped_session");
  }
  for (const [name, mutation] of [
    ["missing", (f: Fixture) => { f.absent = true; }],
    ["request", (f: Fixture) => { f.job.request_fingerprint_sha256 = "d".repeat(64); }],
    ["generation", (f: Fixture) => { f.job.lease_gen = "2"; }],
    ["token", (f: Fixture) => { f.job.lease_token = "e".repeat(32); }],
    ["worker", (f: Fixture) => { f.job.lease_owner = "other-worker"; }],
    ["expiry_identity", (f: Fixture) => { f.job.lease_expires_us = String(EXPIRY + 1n); }],
    ["published", (f: Fixture) => { Object.assign(f.job, { published: true, published_gen: "1", result_fingerprint_sha256: "f".repeat(64), lease_token: null, lease_owner: null, lease_expires_us: null }); }],
    ["malformed", (f: Fixture) => { f.job.version = "-1"; }],
    ["expired_equal", (f: Fixture) => { f.clock = EXPIRY; }],
    ["expired_past", (f: Fixture) => { f.clock = EXPIRY + 1n; }],
    ["invalid_clock", (f: Fixture) => { f.clock = 0n; }],
  ] as const) {
    const f = new Fixture(); mutation(f);
    const result = await f.run(() => f.effect());
    boundary(result);
    assert.equal(result.status, "held", name);
    assert.equal(result.action_started, false);
    assert.equal(f.effects, 0);
    cases.push("initial_lease_rejection_" + name);
  }
  {
    const f = new Fixture();
    f.queryGate = async (sql) => { if (sql === SQL.read_job_for_update) f.clock = EXPIRY; };
    const result = await f.run(() => f.effect());
    assert.equal(result.reason, "lease_expired");
    assert.equal(f.effects, 0);
    assert.ok(f.calls.indexOf(SQL.now_us) > f.calls.indexOf(SQL.read_job_for_update));
    cases.push("expiry_during_row_read_uses_later_database_time");
  }
  for (const [name, mutate] of [
    ["expiry", (f: Fixture) => { f.clock = EXPIRY; }],
    ["version", (f: Fixture) => { f.job.version = "2"; }],
    ["clock_regression", (f: Fixture) => { f.clock = NOW - 1n; }],
    ["generation", (f: Fixture) => { f.job.lease_gen = "2"; }],
  ] as const) {
    const f = new Fixture();
    const result = await f.run(async (session) => {
      mutate(f);
      if (await session.revalidate_lease()) f.effect();
      // Even restoring valid state cannot reset a failed session.
      f.clock = NOW; f.job.version = "1"; f.job.lease_gen = "1";
      const reads = f.calls.length;
      assert.equal(await session.revalidate_lease(), false);
      assert.equal(f.calls.length, reads);
      return EFFECT_VALUE;
    });
    boundary(result);
    assert.equal(result.status, "reconciliation_required");
    assert.equal(result.result?.value, EFFECT_VALUE);
    assert.equal(f.effects, 0);
    cases.push("latched_recheck_failure_" + name);
  }
  for (const throwing of [false, true]) {
    for (const blockedSql of [SQL.read_job_for_update, SQL.now_us]) {
      const f = new Fixture();
      const entered = gate(), resume = gate();
      let pending!: Promise<boolean>;
      let escaped!: BuyVoidPaymentKeyedDispatcherLeaseSessionV1;
      let resolved = false;
      const running = f.run(async (session) => {
        escaped = session;
        f.queryGate = async (sql) => {
          if (sql === blockedSql) { entered.resolve(); await resume.promise; }
        };
        pending = session.revalidate_lease();
        await entered.promise;
        if (throwing) throw new Error("synthetic action failure while check is pending");
        return EFFECT_VALUE;
      }).then((result) => { resolved = true; return result; });
      await entered.promise;
      await new Promise<void>((resolve) => setImmediate(resolve));
      assert.equal(resolved, false);
      assert.equal(f.count(SQL.commit), 0);
      assert.equal(f.count(SQL.rollback), 0);
      assert.equal(f.count(SQL.advisory_unlock), 0);
      assert.equal(f.releases, 0);
      const before = f.calls.length;
      assert.equal(await escaped.revalidate_lease(), false);
      assert.equal(f.calls.length, before);
      resume.resolve();
      const result = await running;
      boundary(result);
      assert.equal(await pending, false);
      assert.equal(result.status, "reconciliation_required");
      assert.equal(result.action_returned, !throwing);
      assert.equal(result.result?.value, throwing ? undefined : EFFECT_VALUE);
      assert.equal(f.releases, 1);
      assert.equal(f.activeQueries, 0);
      cases.push(`pending_read_drained_${throwing}_${blockedSql === SQL.now_us ? "clock" : "job"}`);
    }
  }
  {
    const f = new Fixture(); const entered = gate(), resume = gate();
    const result = await f.run(async (session) => {
      f.queryGate = async (sql) => { if (sql === SQL.read_job_for_update) { entered.resolve(); await resume.promise; } };
      const first = session.revalidate_lease();
      await entered.promise;
      const before = f.calls.length;
      assert.equal(await session.revalidate_lease(), false);
      assert.equal(f.calls.length, before, "overlap starts no second query");
      resume.resolve();
      assert.equal(await first, false);
      return EFFECT_VALUE;
    });
    boundary(result);
    assert.equal(result.reason, "overlapping_recheck");
    assert.equal(result.status, "reconciliation_required");
    cases.push("overlap_fails_closed_without_query_queue_growth");
  }
  for (const sql of [SQL.read_job_for_update, SQL.now_us]) {
    const f = new Fixture();
    const result = await f.run(async (session) => {
      f.faults.push({ sql, code: "40001" });
      assert.equal(await session.revalidate_lease(), false);
      return EFFECT_VALUE;
    });
    boundary(result);
    assert.equal(result.reason, "lease_read_failed");
    assert.equal(result.status, "reconciliation_required");
    assert.equal(f.count(SQL.begin_serializable), 1);
    cases.push("recheck_driver_error_" + (sql === SQL.now_us ? "clock" : "job"));
  }
  for (const [sql, code] of [[SQL.commit, "40001"], [SQL.commit, "40P01"], [SQL.commit, "08006"], [SQL.advisory_unlock, "08006"], [SQL.reset_statement_timeout, "08006"], [SQL.reset_lock_timeout, "08006"]]) {
    const f = new Fixture(); f.faults.push({ sql, code });
    const result = await f.run(() => f.effect());
    boundary(result);
    assert.equal(result.status, "reconciliation_required");
    assert.equal(result.store_completion_confirmed, false);
    assert.equal(result.result?.value, EFFECT_VALUE);
    assert.equal(f.effects, 1);
    assert.equal(f.count(SQL.begin_serializable), 1);
    assert.equal(f.releases, 1);
    cases.push("store_failure_preserves_value_" + cases.length);
  }
  {
    const f = new Fixture(); f.releaseFails = true;
    const result = await f.run(() => f.effect());
    boundary(result);
    assert.equal(result.status, "reconciliation_required");
    assert.equal(result.result?.value, EFFECT_VALUE);
    assert.equal(f.effects, 1);
    cases.push("release_failure_preserves_value");
  }
  {
    const f = new Fixture(); let gets = 0;
    const opaque = new Proxy({}, { get() { gets += 1; throw new Error("must not inspect"); } });
    const result = await f.run(() => { f.effect(); throw opaque; });
    boundary(result);
    assert.equal(result.reason, "action_failed");
    assert.equal(result.status, "reconciliation_required");
    assert.equal(result.result, null);
    assert.equal(gets, 0);
    assert.equal(f.effects, 1);
    cases.push("opaque_action_failure_not_passed_to_sqlstate_parser");
  }
  for (const value of [undefined, null, false, 0]) {
    const f = new Fixture();
    const result = await f.run(() => value);
    boundary(result);
    assert.equal(result.status, "completed");
    assert.equal(result.action_returned, true);
    assert.notEqual(result.result, null);
    assert.equal(result.result?.value, value);
    cases.push("exact_return_" + cases.length);
  }
  {
    const f = new Fixture(); const held = gate(); f.connectGate = held.promise;
    const selected = lease();
    const running = f.run(() => f.effect(), selected);
    selected.worker_id = "changed"; selected.lease_token = "f".repeat(32);
    selected.lease_expires_us = 1n; selected.lease_gen = 99n;
    held.resolve();
    const result = await running;
    assert.equal(result.status, "completed");
    assert.equal(f.effects, 1);
    cases.push("lease_capture_precedes_async_pool_acquisition");
  }
  {
    const f = new Fixture(); let reads = 0;
    const selected = lease();
    Object.defineProperty(selected, "lease_token", { enumerable: true, get() { reads += 1; return "c".repeat(32); } });
    const result = await f.run(() => f.effect(), selected);
    assert.equal(result.reason, "input_invalid");
    assert.equal(reads, 0);
    assert.equal(f.connects, 0);
    cases.push("ordinary_lease_accessor_rejected_without_execution");
  }
  {
    const f = new Fixture(); const runner = createSession({ pool: f });
    for (const invalid of [null, { ...lease(), lease_gen: "1" }, { ...lease(), lease_expires_us: 0n }, { ...lease(), extra: true }, { ...lease(), [Symbol("extra")]: true }]) {
      const result = await runner.run_once(invalid as never, FINGERPRINT, () => f.effect());
      assert.equal(result.reason, "input_invalid");
    }
    assert.equal((await runner.run_once(lease(), FINGERPRINT.toUpperCase(), () => f.effect())).reason, "input_invalid");
    assert.equal((await runner.run_once(lease(), FINGERPRINT, null as never)).reason, "input_invalid");
    assert.equal(f.connects, 0);
    cases.push("closed_canonical_inputs_before_connections");
  }
  {
    const f = new Fixture(); f.connectFails = true;
    const result = await f.run(() => f.effect());
    boundary(result);
    assert.equal(result.status, "held");
    assert.equal(result.action_started, false);
    assert.equal(f.effects, 0);
    cases.push("failed_pool_acquisition_never_enters_action");
  }
  {
    const f = new Fixture(); const runner = createSession({ pool: f });
    await runner.run_once(lease(), FINGERPRINT, () => f.effect());
    await runner.run_once(lease(), FINGERPRINT, () => f.effect());
    assert.equal(f.effects, 2);
    cases.push("explicit_second_invocation_is_not_durable_deduplication");
  }
  {
    const f = new Fixture(); const runner = createSession({ pool: f });
    let old!: BuyVoidPaymentKeyedDispatcherLeaseSessionV1;
    await runner.run_once(lease(), FINGERPRINT, (session) => { old = session; });
    const result = await runner.run_once(lease(), FINGERPRINT, async (session) => {
      const before = f.calls.length;
      assert.equal(await old.revalidate_lease(), false);
      assert.equal(f.calls.length, before);
      assert.equal(await session.revalidate_lease(), true);
      return f.effect();
    });
    boundary(result);
    assert.equal(result.status, "completed");
    assert.equal(f.effects, 1);
    cases.push("retired_session_cannot_query_or_poison_successor");
  }
  assert.equal(new Set(cases).size, cases.length);
  assert.equal(cases.length, 42);
  console.log("VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_LEASE_SESSION_V1_PROOF_GREEN");
  console.log("cases=" + cases.length);
  console.log("initial_lease_before_action=true");
  console.log("database_time_after_row_read=true");
  console.log("pending_rechecks_drained_before_store_terminal=true");
  console.log("escaped_session_rechecks=false");
  console.log("returned_outcome_preserved=true");
  console.log("automatic_callback_replay=false");
  console.log("saga_validation_performed=false");
  console.log("effect_cut_integration_complete=false");
  console.log("live_postgres=false");
  console.log("signing=false\ntransaction_broadcast=false\nfunds_action=false");
}
const deadline = setTimeout(() => { console.error("LEASE_SESSION_PROOF_DEADLINE"); process.exit(1); }, 30_000);
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(deadline));
