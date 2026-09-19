#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_STORE_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1,
  buyVoidPaymentKeyedDispatcherPostgresAdvisoryKeysV1,
  createBuyVoidPaymentKeyedDispatcherPostgresStoreV1,
  type BuyVoidPaymentKeyedDispatcherPostgresClientV1,
  type BuyVoidPaymentKeyedDispatcherPostgresPoolV1,
  type BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
  type BuyVoidPaymentKeyedDispatcherJobRecordV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";

const A = "ffffffff00000000" + "1".repeat(48);
const B = "00000001ffffffff" + "2".repeat(48);
const REQUEST = "a".repeat(64);
const RESULT = "b".repeat(64);

type QueryCall = {
  text: string;
  values: readonly unknown[];
};

function empty(rowCount: number | null = null): BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1 {
  return { rows: [], rowCount };
}

class RecordingClient implements BuyVoidPaymentKeyedDispatcherPostgresClientV1 {
  calls: QueryCall[] = [];
  releases: Array<Error | boolean | undefined> = [];
  handler: (
    text: string,
    values: readonly unknown[],
  ) => Promise<BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1>;

  constructor(
    handler: (
      text: string,
      values: readonly unknown[],
    ) =>
      | BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1
      | Promise<BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1>,
  ) {
    this.handler = async (text, values) => await handler(text, values);
  }

  async query(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<BuyVoidPaymentKeyedDispatcherPostgresQueryResultV1> {
    this.calls.push({ text, values: [...values] });
    const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
    if (
      text === sql.set_lock_timeout ||
      text === sql.set_statement_timeout ||
      text === sql.reset_statement_timeout ||
      text === sql.reset_lock_timeout
    ) {
      return empty(null);
    }
    return await this.handler(text, values);
  }

  release(error?: Error | boolean): void {
    this.releases.push(error);
  }
}

function poolFor(
  client: RecordingClient,
): BuyVoidPaymentKeyedDispatcherPostgresPoolV1 & { connects: number } {
  return {
    connects: 0,
    async connect() {
      this.connects += 1;
      return client;
    },
  };
}

function sqlError(code: string): Error & { code: string } {
  return Object.assign(new Error("synthetic_sql_" + code), { code });
}

function baseJob(): BuyVoidPaymentKeyedDispatcherJobRecordV1 {
  return {
    schema: "void_buy_void_payment_keyed_dispatcher_job_v1",
    marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
    attempt_id: A,
    request_fingerprint_sha256: REQUEST,
    submitted_at_us: 1_000_000n,
    result_fingerprint_sha256: null,
    published: false,
    published_gen: null,
    lease_gen: 0n,
    lease_token: null,
    lease_owner: null,
    lease_expires_us: null,
    version: 5n,
  };
}

const row = {
  attempt_id: A,
  request_fingerprint_sha256: REQUEST,
  submitted_at_us: "1000000",
  result_fingerprint_sha256: null,
  published: false,
  published_gen: null,
  lease_gen: "0",
  lease_token: null,
  lease_owner: null,
  lease_expires_us: null,
  version: "5",
};

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_STORE_V1,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_STORE_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1,
  {
    jobs: "void_buy_void_payment_keyed_dispatcher_jobs_v1",
    audit: "void_buy_void_payment_keyed_dispatcher_audit_v1",
    decision_cursors:
      "void_buy_void_payment_keyed_dispatcher_decision_cursors_v1",
  },
);
assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_AUTHORITY_V1,
  {
    source_only_adapter: true,
    production_store_adapter_implementation_present: true,
    production_connection_factory_present: false,
    injected_pool_required: true,
    package_pg_dependency_added: false,
    automatic_schema_migration: false,
    runtime_route_mount: false,
    canonical_parent_dispatch: false,
    transaction_isolation: "SERIALIZABLE",
    per_job_admission:
      "session_advisory_lock_before_serializable_snapshot",
    session_advisory_key:
      "first_64_bits_of_attempt_id_as_two_signed_int32",
    advisory_lock_collision_effect: "safe_over_serialization_only",
    canonical_audit_order: "per_job_decision_seq",
    audit_id_is_commit_order: false,
    retry_sqlstates: ["40001", "40P01"],
    default_max_attempts: 3,
    default_lock_timeout_ms: 5000,
    default_statement_timeout_ms: 15000,
    session_timeout_reset_before_release: true,
    immutable_update_identity_enforced_in_sql: true,
    database_time_source: "clock_timestamp",
    sql_values_parameterized: true,
    transaction_broadcast: false,
    wallet_access: false,
    signing: false,
    money_movement: false,
  },
);

assert.deepEqual(
  buyVoidPaymentKeyedDispatcherPostgresAdvisoryKeysV1(A),
  [-1, 0],
);
assert.deepEqual(
  buyVoidPaymentKeyedDispatcherPostgresAdvisoryKeysV1(B),
  [1, -1],
);
assert.notDeepEqual(
  buyVoidPaymentKeyedDispatcherPostgresAdvisoryKeysV1(A),
  buyVoidPaymentKeyedDispatcherPostgresAdvisoryKeysV1(B),
);

{
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
  const client = new RecordingClient((text) => {
    if (text === sql.advisory_lock) return empty(1);
    if (text === sql.begin_serializable) return empty(null);
    if (text === sql.now_us) {
      return { rows: [{ now_us: "1000001" }], rowCount: 1 };
    }
    if (text === sql.read_job_for_update) {
      return { rows: [row], rowCount: 1 };
    }
    if (text === sql.insert_job) return empty(1);
    if (text === sql.update_job) return empty(1);
    if (text === sql.allocate_decision_seq) {
      return {
        rows: [{ last_decision_seq: "7" }],
        rowCount: 1,
      };
    }
    if (text === sql.insert_audit) return empty(1);
    if (text === sql.commit) return empty(null);
    if (text === sql.advisory_unlock) {
      return { rows: [{ unlocked: true }], rowCount: 1 };
    }
    throw new Error("unexpected_sql:" + text);
  });
  const pool = poolFor(client);
  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool,
  });

  const value = await store.run_serializable_job_decision(A, async (tx) => {
    assert.equal(await tx.now_us(), 1_000_001n);
    const existing = await tx.read_job_for_update(A);
    assert.deepEqual(existing, baseJob());

    const inserted: BuyVoidPaymentKeyedDispatcherJobRecordV1 = {
      ...baseJob(),
      version: 0n,
    };
    assert.equal(await tx.insert_job(inserted), true);

    const next: BuyVoidPaymentKeyedDispatcherJobRecordV1 = {
      ...baseJob(),
      lease_gen: 1n,
      lease_token: "11".repeat(16),
      lease_owner: "worker-a",
      lease_expires_us: 2_000_000n,
      version: 6n,
    };
    assert.equal(await tx.update_job(A, 5n, next), true);

    const decisionSeq = await tx.append_decision({
      schema: "void_buy_void_payment_keyed_dispatcher_audit_v1",
      marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
      attempt_id: A,
      event_type: "CLAIM",
      outcome: "SUCCESS",
      actor_id: "worker-a",
      lease_gen: 1n,
      created_at_us: 1_000_001n,
      detail: {
        lease_expires_us: "2000000",
        recovered: false,
      },
    });
    assert.equal(decisionSeq, 7n);
    return "committed";
  });

  assert.equal(value, "committed");
  assert.equal(pool.connects, 1);
  assert.deepEqual(client.releases, [undefined]);

  const texts = client.calls.map((call) => call.text);
  assert.equal(texts[0], sql.set_lock_timeout);
  assert.equal(texts[1], sql.set_statement_timeout);
  assert.equal(texts[2], sql.advisory_lock);
  assert.equal(texts[3], sql.begin_serializable);
  assert.ok(
    texts.indexOf(sql.set_lock_timeout) <
      texts.indexOf(sql.advisory_lock),
  );
  assert.ok(
    texts.indexOf(sql.set_statement_timeout) <
      texts.indexOf(sql.advisory_lock),
  );
  assert.ok(
    texts.indexOf(sql.advisory_lock) <
      texts.indexOf(sql.begin_serializable),
  );
  assert.ok(
    texts.indexOf(sql.allocate_decision_seq) <
      texts.indexOf(sql.insert_audit),
  );
  assert.equal(texts.at(-4), sql.commit);
  assert.equal(texts.at(-3), sql.advisory_unlock);
  assert.equal(texts.at(-2), sql.reset_statement_timeout);
  assert.equal(texts.at(-1), sql.reset_lock_timeout);

  assert.deepEqual(client.calls[0]?.values, ["5000ms"]);
  assert.deepEqual(client.calls[1]?.values, ["15000ms"]);
  assert.deepEqual(client.calls[2]?.values, [-1, 0]);
  const update = client.calls.find((call) => call.text === sql.update_job);
  assert.ok(update);
  assert.equal(update!.values[0], A);
  assert.equal(update!.values[1], "5");
  assert.equal(update!.values[2], REQUEST);
  assert.equal(update!.values[3], "1000000");
  assert.equal(update!.values.at(-1), "6");
  assert.match(
    sql.update_job,
    /request_fingerprint_sha256 = \$3/,
  );
  assert.match(sql.update_job, /submitted_at_us = \$4::bigint/);

  const audit = client.calls.find((call) => call.text === sql.insert_audit);
  assert.ok(audit);
  assert.deepEqual(JSON.parse(String(audit!.values[7])), {
    lease_expires_us: "2000000",
    recovered: false,
  });

  const runtimeSql = texts.join("\n").toUpperCase();
  assert.doesNotMatch(runtimeSql, /\bCREATE\s+TABLE\b/);
  assert.doesNotMatch(runtimeSql, /\bALTER\s+TABLE\b/);
  assert.doesNotMatch(runtimeSql, /\bDROP\s+TABLE\b/);
}

async function proveRetry(
  code: "40001" | "40P01",
  failures: number,
  maxAttempts: number,
) {
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
  const client = new RecordingClient((text) => {
    if (
      text === sql.advisory_lock ||
      text === sql.begin_serializable ||
      text === sql.rollback ||
      text === sql.commit
    ) {
      return empty(null);
    }
    if (text === sql.advisory_unlock) {
      return { rows: [{ unlocked: true }], rowCount: 1 };
    }
    throw new Error("unexpected_retry_sql:" + text);
  });
  const pool = poolFor(client);
  const retries: unknown[] = [];
  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool,
    max_attempts: maxAttempts,
    on_retry(event) {
      retries.push(event);
    },
  });
  let actions = 0;
  const result = await store.run_serializable_job_decision(A, async () => {
    actions += 1;
    if (actions <= failures) throw sqlError(code);
    return "retry-green";
  });

  assert.equal(result, "retry-green");
  assert.equal(actions, failures + 1);
  const texts = client.calls.map((call) => call.text);
  assert.equal(
    texts.filter((text) => text === sql.advisory_lock).length,
    1,
  );
  assert.equal(
    texts.filter((text) => text === sql.begin_serializable).length,
    failures + 1,
  );
  assert.equal(
    texts.filter((text) => text === sql.rollback).length,
    failures,
  );
  assert.equal(
    texts.filter((text) => text === sql.commit).length,
    1,
  );
  assert.equal(
    texts.filter((text) => text === sql.advisory_unlock).length,
    1,
  );
  assert.equal(retries.length, failures);
  assert.equal(client.releases.length, 1);
  assert.equal(client.releases[0], undefined);
}

await proveRetry("40001", 2, 3);
await proveRetry("40P01", 1, 2);

{
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
  const client = new RecordingClient((text) => {
    if (
      text === sql.advisory_lock ||
      text === sql.begin_serializable ||
      text === sql.rollback
    ) {
      return empty(null);
    }
    if (text === sql.advisory_unlock) {
      return { rows: [{ unlocked: true }], rowCount: 1 };
    }
    throw new Error("unexpected_nonretry_sql:" + text);
  });
  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool: poolFor(client),
    max_attempts: 3,
  });
  let actions = 0;
  await assert.rejects(
    store.run_serializable_job_decision(A, async () => {
      actions += 1;
      throw sqlError("23505");
    }),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code === "23505",
  );
  assert.equal(actions, 1);
  assert.equal(
    client.calls.filter(
      (call) => call.text === sql.begin_serializable,
    ).length,
    1,
  );
  assert.equal(
    client.calls.filter((call) => call.text === sql.rollback).length,
    1,
  );
}

{
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
  const client = new RecordingClient((text) => {
    if (
      text === sql.advisory_lock ||
      text === sql.begin_serializable ||
      text === sql.rollback
    ) {
      return empty(null);
    }
    if (text === sql.advisory_unlock) {
      return { rows: [{ unlocked: true }], rowCount: 1 };
    }
    throw new Error("unexpected_exhaustion_sql:" + text);
  });
  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool: poolFor(client),
    max_attempts: 2,
  });
  let actions = 0;
  await assert.rejects(
    store.run_serializable_job_decision(A, async () => {
      actions += 1;
      throw sqlError("40001");
    }),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code === "40001",
  );
  assert.equal(actions, 2);
  assert.equal(
    client.calls.filter(
      (call) => call.text === sql.begin_serializable,
    ).length,
    2,
  );
  assert.equal(
    client.calls.filter((call) => call.text === sql.rollback).length,
    2,
  );
}

{
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
  const client = new RecordingClient((text) => {
    if (
      text === sql.advisory_lock ||
      text === sql.begin_serializable ||
      text === sql.commit
    ) {
      return empty(null);
    }
    if (text === sql.advisory_unlock) {
      return { rows: [{ unlocked: false }], rowCount: 1 };
    }
    throw new Error("unexpected_unlock_sql:" + text);
  });
  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool: poolFor(client),
  });
  await assert.rejects(
    store.run_serializable_job_decision(A, async () => "ok"),
    /dispatcher_postgres_advisory_unlock_failed/,
  );
  assert.equal(client.releases.length, 1);
  assert.ok(client.releases[0] instanceof Error);
}

{
  const next = {
    ...baseJob(),
    version: 9n,
  };
  const sql = VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SQL_V1;
  const client = new RecordingClient((text) => {
    if (
      text === sql.advisory_lock ||
      text === sql.begin_serializable ||
      text === sql.rollback
    ) {
      return empty(null);
    }
    if (text === sql.advisory_unlock) {
      return { rows: [{ unlocked: true }], rowCount: 1 };
    }
    throw new Error("unexpected_binding_sql:" + text);
  });
  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool: poolFor(client),
  });
  await assert.rejects(
    store.run_serializable_job_decision(A, async (tx) => {
      await tx.update_job(A, 5n, next);
    }),
    /dispatcher_postgres_update_binding_invalid/,
  );
}

{
  const here = path.dirname(fileURLToPath(import.meta.url));
  const source = fs.readFileSync(
    path.resolve(
      here,
      "../src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.ts",
    ),
    "utf8",
  );
  assert.doesNotMatch(source, /from\s+["']pg["']/);
  assert.doesNotMatch(source, /process\.env/);
  assert.doesNotMatch(source, /\bCREATE\s+TABLE\b/i);
  assert.doesNotMatch(source, /\bALTER\s+TABLE\b/i);
  assert.doesNotMatch(source, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(source, /\bapp\.(?:get|post|put|delete)\b/);
  assert.doesNotMatch(source, /\b(?:Wallet|signTransaction|broadcastTransaction)\b/);
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_STORE_V1_PROOF_GREEN",
);
console.log("session_advisory_lock_before_serializable_snapshot=true");
console.log("advisory_lock_reused_across_retries=true");
console.log("serializable_sqlstate_40001_retry_bounded=true");
console.log("deadlock_sqlstate_40P01_retry_bounded=true");
console.log("nonretry_sqlstate_not_retried=true");
console.log("database_time_inside_transaction=true");
console.log("per_job_decision_seq_transactional=true");
console.log("audit_cursor_before_audit_insert=true");
console.log("sql_values_parameterized=true");
console.log("session_lock_timeout_bounded=true");
console.log("session_statement_timeout_bounded=true");
console.log("session_timeouts_reset_before_pool_release=true");
console.log("immutable_update_identity_enforced_in_sql=true");
console.log("automatic_schema_migration=false");
console.log("production_connection_factory_present=false");
console.log("runtime_route_mount=false");
console.log("transaction_broadcast=false");
console.log("wallet_access=false");
console.log("signing=false");
console.log("money_movement=false");
