import assert from "node:assert/strict";
import {
  createBuyVoidPaymentKeyedDispatcherPostgresStoreV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1 as SQL,
  type BuyVoidPaymentKeyedDispatcherPostgresClientV1,
  type BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
  type BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.js";
import {
  createBuyVoidPaymentKeyedDispatcherNonReplayablePostgresV1 as createRunner,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_AUTHORITY_V1 as AUTHORITY,
  type BuyVoidPaymentKeyedDispatcherNonReplayableOptionsV1,
  type BuyVoidPaymentKeyedDispatcherNonReplayableOutcomeV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_nonreplayable_postgres_v1.js";

const ATTEMPT = "a".repeat(64);
const PRIVATE_ERROR = "synthetic-private-driver-detail-do-not-return";
const VALUE = Object.freeze({ status: "synthetic_accepted", receipt: "fixture-only" });
const cases: string[] = [];

type Fault = { statement: string; code: string; after_commit?: boolean };
function failure(code: string): Error & { code: string } {
  return Object.assign(new Error(PRIVATE_ERROR), { code });
}

// Exercise the actual canonical adapter with an injected SQL transport. This
// models failures; it is not a PostgreSQL server or a production pool fixture.
class Fixture implements BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
  BuyVoidPaymentKeyedDispatcherPostgresClientV1 {
  calls: { text: string; values: readonly unknown[] }[] = [];
  connects = 0;
  releases = 0;
  releaseArg: Error | boolean | undefined;
  effects = 0;
  lockHeld = false;
  transactionOpen = false;
  commitApplied = false;
  connectFails = false;
  releaseFails = false;
  unlockFalse = false;
  faults: Fault[] = [];

  async connect() {
    this.connects += 1;
    if (this.connectFails) throw failure("08006");
    return this;
  }

  async query(text: string, values: readonly unknown[] = []):
  Promise<BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1> {
    this.calls.push({ text, values });
    const index = this.faults.findIndex((item) => item.statement === text);
    if (index !== -1) {
      const [item] = this.faults.splice(index, 1);
      if (item.after_commit) {
        assert.equal(text, SQL.commit);
        this.commitApplied = true;
        this.transactionOpen = false;
      }
      throw failure(item.code);
    }
    if (text === SQL.set_lock_timeout || text === SQL.set_statement_timeout) {
      assert.match(String(values[0]), /^[0-9]+ms$/);
      return { rows: [{ value: values[0] }], rowCount: 1 };
    }
    if (text === SQL.advisory_lock) {
      assert.equal(this.transactionOpen, false);
      this.lockHeld = true;
    } else if (text === SQL.begin_serializable) {
      assert.equal(this.lockHeld, true);
      this.transactionOpen = true;
    } else if (text === SQL.commit) {
      assert.equal(this.transactionOpen, true);
      this.commitApplied = true;
      this.transactionOpen = false;
    } else if (text === SQL.rollback) {
      this.transactionOpen = false;
    } else if (text === SQL.advisory_unlock) {
      assert.equal(this.lockHeld, true);
      if (!this.unlockFalse) this.lockHeld = false;
      return { rows: [{ unlocked: !this.unlockFalse }], rowCount: 1 };
    } else if (text === SQL.now_us) {
      assert.equal(this.lockHeld, true);
      assert.equal(this.transactionOpen, true);
      return { rows: [{ now_us: "1700000000000000" }], rowCount: 1 };
    } else if (text === SQL.read_job_for_update) {
      assert.equal(this.lockHeld, true);
      assert.equal(this.transactionOpen, true);
      assert.deepEqual(values, [ATTEMPT]);
    } else if (text !== SQL.reset_statement_timeout && text !== SQL.reset_lock_timeout) {
      assert.fail("Unexpected SQL in non-replayable proof");
    }
    return { rows: [], rowCount: 0 };
  }

  release(error?: Error | boolean) {
    this.releases += 1;
    this.releaseArg = error;
    if (this.releaseFails) throw failure("08006");
  }

  count(text: string) {
    return this.calls.filter((call) => call.text === text).length;
  }

  effect = async () => {
    assert.equal(this.lockHeld, true);
    assert.equal(this.transactionOpen, true);
    this.effects += 1;
    return VALUE;
  };
}

function boundary<T>(outcome: BuyVoidPaymentKeyedDispatcherNonReplayableOutcomeV1<T>) {
  assert.equal(outcome.automatic_retry_allowed, false);
  assert.equal(outcome.cross_invocation_deduplication, false);
  assert.equal(outcome.durable_outcome_receipt, false);
  assert.equal(outcome.external_effect_database_atomicity, false);
  assert.equal(Object.isFrozen(outcome), true);
  assert.equal(JSON.stringify(outcome).includes(PRIVATE_ERROR), false);
}

function preserved(outcome: BuyVoidPaymentKeyedDispatcherNonReplayableOutcomeV1<typeof VALUE>) {
  boundary(outcome);
  assert.equal(outcome.status, "reconciliation_required");
  assert.equal(outcome.store_completion_confirmed, false);
  assert.equal(outcome.reconciliation_required, true);
  assert.equal(outcome.action_started, true);
  assert.equal(outcome.action_returned, true);
  assert.equal(outcome.result?.value, VALUE);
}

function once(fixture: Fixture) {
  assert.equal(fixture.connects, 1);
  assert.equal(fixture.effects, 1);
  assert.equal(fixture.count(SQL.begin_serializable), 1);
  assert.equal(fixture.releases, 1);
}

async function main() {
  // A real control over the existing adapter: database-only retry semantics stay
  // intact. This illustrates why an external action must not use that mode.
  for (const code of ["40001", "40P01"]) {
    const fixture = new Fixture();
    fixture.faults.push({ statement: SQL.commit, code });
    const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({ pool: fixture });
    await store.run_serializable_job_decision(ATTEMPT, fixture.effect);
    assert.equal(fixture.effects, 2);
    assert.equal(fixture.count(SQL.begin_serializable), 2);
    assert.equal(fixture.count(SQL.advisory_lock), 1);
    cases.push(`canonical_database_retry_preserved_${code}`);
  }

  {
    const fixture = new Fixture();
    const runner = createRunner({ pool: fixture });
    const outcome = await runner.run_once(ATTEMPT, async (tx) => {
      assert.equal(await tx.now_us(), 1700000000000000n);
      assert.equal(await tx.read_job_for_update(ATTEMPT), null);
      return fixture.effect();
    });
    boundary(outcome);
    once(fixture);
    assert.equal(outcome.status, "completed");
    assert.equal(outcome.result?.value, VALUE);
    assert.equal(outcome.store_completion_confirmed, true);
    assert.equal(outcome.reconciliation_required, false);
    assert.equal(fixture.releaseArg, undefined);
    assert.equal(fixture.lockHeld, false);
    assert.deepEqual(fixture.calls.map((call) => call.text), [
      SQL.set_lock_timeout, SQL.set_statement_timeout, SQL.advisory_lock,
      SQL.begin_serializable, SQL.now_us, SQL.read_job_for_update, SQL.commit,
      SQL.advisory_unlock, SQL.reset_statement_timeout, SQL.reset_lock_timeout,
    ]);
    assert.deepEqual(fixture.calls[0].values, ["5000ms"]);
    assert.deepEqual(fixture.calls[1].values, ["15000ms"]);
    assert.equal(runner.authority, AUTHORITY);
    assert.equal(Object.isFrozen(runner), true);
    assert.equal(Object.isFrozen(AUTHORITY), true);
    assert.equal(AUTHORITY.max_transaction_attempts, 1);
    assert.equal(AUTHORITY.lease_validation_performed, false);
    assert.equal(AUTHORITY.saga_validation_performed, false);
    cases.push("normal_exact_sql_order_and_unchanged_authority");
  }

  for (const code of ["40001", "40P01", "08006"]) {
    const fixture = new Fixture();
    fixture.faults.push({ statement: SQL.commit, code });
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, fixture.effect);
    preserved(outcome);
    once(fixture);
    assert.equal(fixture.count(SQL.rollback), 1);
    assert.equal(fixture.count(SQL.commit), 1);
    cases.push(`commit_failure_no_callback_replay_${code}`);
  }

  {
    const fixture = new Fixture();
    fixture.faults.push({ statement: SQL.commit, code: "08006", after_commit: true });
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, fixture.effect);
    preserved(outcome);
    once(fixture);
    assert.equal(fixture.commitApplied, true);
    cases.push("commit_applied_but_reply_lost_remains_unconfirmed");
  }

  for (const code of ["40001", "40P01", "08006"]) {
    const fixture = new Fixture();
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, async () => {
      await fixture.effect();
      throw failure(code);
    });
    boundary(outcome);
    once(fixture);
    assert.equal(outcome.status, "reconciliation_required");
    assert.equal(outcome.action_returned, false);
    assert.equal(outcome.result, null);
    assert.equal(fixture.count(SQL.commit), 0);
    assert.equal(fixture.count(SQL.rollback), 1);
    cases.push(`callback_throws_after_effect_no_replay_${code}`);
  }

  {
    const fixture = new Fixture();
    fixture.faults.push(
      { statement: SQL.commit, code: "40001" },
      { statement: SQL.rollback, code: "08006" },
    );
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, fixture.effect);
    preserved(outcome);
    once(fixture);
    assert.ok(fixture.releaseArg instanceof Error);
    cases.push("rollback_failure_preserves_callback_return");
  }

  for (const statement of [SQL.advisory_unlock, SQL.reset_statement_timeout, SQL.reset_lock_timeout]) {
    const fixture = new Fixture();
    fixture.faults.push({ statement, code: "08006" });
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, fixture.effect);
    preserved(outcome);
    once(fixture);
    assert.equal(fixture.commitApplied, true);
    assert.ok(fixture.releaseArg instanceof Error);
    assert.equal(fixture.count(SQL.reset_statement_timeout), 1);
    assert.equal(fixture.count(SQL.reset_lock_timeout), 1);
    cases.push(`cleanup_failure_preserves_callback_return_${statement}`);
  }

  for (const mode of ["release_throws", "unlock_returns_false"]) {
    const fixture = new Fixture();
    fixture.releaseFails = mode === "release_throws";
    fixture.unlockFalse = mode === "unlock_returns_false";
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, fixture.effect);
    preserved(outcome);
    once(fixture);
    assert.equal(fixture.commitApplied, true);
    cases.push(mode);
  }

  for (const statement of ["CONNECT", SQL.set_lock_timeout, SQL.set_statement_timeout, SQL.advisory_lock, SQL.begin_serializable]) {
    const fixture = new Fixture();
    if (statement === "CONNECT") fixture.connectFails = true;
    else fixture.faults.push({ statement, code: "40001" });
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, fixture.effect);
    boundary(outcome);
    assert.equal(outcome.status, "held");
    assert.equal(outcome.action_started, false);
    assert.equal(outcome.result, null);
    assert.equal(fixture.effects, 0);
    assert.equal(fixture.connects, 1);
    assert.equal(fixture.count(SQL.commit), 0);
    assert.equal(fixture.releases, statement === "CONNECT" ? 0 : 1);
    cases.push(`pre_action_failure_${statement}`);
  }

  for (const value of [undefined, null, false, 0, { ok: false, status: "held" }]) {
    const fixture = new Fixture();
    const outcome = await createRunner({ pool: fixture }).run_once(ATTEMPT, () => value);
    boundary(outcome);
    assert.equal(outcome.status, "completed");
    assert.equal(outcome.action_returned, true);
    assert.notEqual(outcome.result, null);
    assert.equal(outcome.result?.value, value);
    cases.push(`exact_callback_return_${cases.length}`);
  }

  for (const override of [{ max_attempts: 3 }, { on_retry: () => undefined }, { [Symbol("extra")]: true }]) {
    const fixture = new Fixture();
    assert.throws(() => createRunner({ pool: fixture, ...override } as BuyVoidPaymentKeyedDispatcherNonReplayableOptionsV1), /options_invalid/);
    assert.equal(fixture.connects, 0);
    cases.push(`retry_configuration_rejected_${cases.length}`);
  }

  {
    const fixture = new Fixture();
    const runner = createRunner({ pool: fixture });
    for (const attempt of ["", ATTEMPT.toUpperCase(), " " + ATTEMPT]) {
      const outcome = await runner.run_once(attempt, fixture.effect);
      boundary(outcome);
      assert.equal(outcome.status, "held");
      assert.equal(outcome.action_started, false);
    }
    const outcome = await runner.run_once(ATTEMPT, null as never);
    assert.equal(outcome.status, "held");
    assert.equal(fixture.connects, 0);
    cases.push("invalid_input_zero_connections");
  }

  {
    const fixture = new Fixture();
    const options = { pool: fixture, lock_timeout_ms: 1200, statement_timeout_ms: 2400 };
    const runner = createRunner(options);
    options.lock_timeout_ms = 9999;
    const outcome = await runner.run_once(ATTEMPT, fixture.effect);
    assert.equal(outcome.status, "completed");
    assert.deepEqual(fixture.calls[0].values, ["1200ms"]);
    assert.deepEqual(fixture.calls[1].values, ["2400ms"]);
    cases.push("configuration_snapshotted_before_execution");
  }

  {
    const fixture = new Fixture();
    const runner = createRunner({ pool: fixture });
    const first = await runner.run_once(ATTEMPT, fixture.effect);
    const second = await runner.run_once(ATTEMPT, fixture.effect);
    assert.equal(first.status, "completed");
    assert.equal(second.status, "completed");
    assert.equal(fixture.effects, 2);
    assert.equal(first.cross_invocation_deduplication, false);
    cases.push("separate_invocations_not_mislabeled_as_durable_deduplication");
  }

  assert.equal(new Set(cases).size, cases.length);
  console.log("VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_NONREPLAYABLE_POSTGRES_V1_PROOF_GREEN");
  console.log("canonical_database_retries_preserved=true");
  console.log("external_callback_replay=false");
  console.log("returned_outcome_preserved_on_commit_or_cleanup_failure=true");
  console.log("ambiguous_store_completion_requires_reconciliation=true");
  console.log("lease_and_saga_execution_fences_implemented=false");
  console.log("live_postgres_execution=false");
  console.log("signing=false");
  console.log("transaction_broadcast=false");
  console.log("funds_action=false");
  console.log("cases=" + cases.length);
}

const deadline = setTimeout(() => {
  console.error("NONREPLAYABLE_POSTGRES_PROOF_DEADLINE");
  process.exit(1);
}, 30_000);
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => clearTimeout(deadline));
