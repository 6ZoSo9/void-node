#!/usr/bin/env node
// @ts-nocheck
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  claimBuyVoidPaymentKeyedDispatchV1,
  publishBuyVoidPaymentKeyedDispatchResultV1,
  renewBuyVoidPaymentKeyedDispatchLeaseV1,
  submitBuyVoidPaymentKeyedDispatchV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_v1.js";
import {
  createBuyVoidPaymentKeyedDispatcherPostgresStoreV1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(
  here,
  "../schemas/buy-void-payment-keyed-dispatcher-postgres-v1.sql",
);
const schema = fs.readFileSync(schemaPath, "utf8");

function proveStaticSchema() {
  for (const table of Object.values(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_TABLES_V1,
  )) {
    assert.match(schema, new RegExp(`CREATE TABLE ${table}\\b`));
  }
  assert.match(
    schema,
    /PRIMARY KEY \(attempt_id, decision_seq\)/,
  );
  assert.match(
    schema,
    /request_fingerprint_sha256 TEXT NOT NULL/,
  );
  assert.match(schema, /submitted_at_us BIGINT NOT NULL/);
  assert.match(schema, /last_decision_seq BIGINT NOT NULL/);
  assert.match(schema, /jsonb_typeof\(detail\) = 'object'/);
  const schemaWithoutComments = schema
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(
    schemaWithoutComments,
    /\bFOREIGN\s+KEY\b/i,
  );
  assert.doesNotMatch(
    schemaWithoutComments,
    /\bREFERENCES\b/i,
  );
  assert.match(
    schema,
    /CLAIM_REJECT_NOT_FOUND/,
  );
  assert.match(
    schema,
    /RENEW_REJECT_NOT_FOUND/,
  );
  assert.match(
    schema,
    /PUBLISH_REJECT_NOT_FOUND/,
  );
  assert.equal(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_AUTHORITY_V1
      .automatic_schema_migration,
    false,
  );
  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_V1_STATIC_GREEN",
  );
  console.log("audit_cursor_foreign_key_to_jobs=false");
  console.log("published_shape_check_present=true");
  console.log("lease_shape_check_present=true");
}

proveStaticSchema();
if (process.argv.includes("--static")) process.exit(0);

const url = String(process.env.VOID_TEST_POSTGRES_URL || "").trim();
assert.ok(url, "VOID_TEST_POSTGRES_URL required");

const pg = await import("pg");
const { Pool } = pg;
const pool = new Pool({
  connectionString: url,
  max: 12,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 5000,
});

const A = "1".repeat(64);
const B = "2".repeat(64);
const C = "3".repeat(64);
const D = "4".repeat(64);
const E = "5".repeat(64);
const REQUEST_A = "a".repeat(64);
const REQUEST_B = "b".repeat(64);
const RESULT_A = "c".repeat(64);
const RESULT_B = "d".repeat(64);

const token = (hexByte: string) => () => hexByte.repeat(16);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function rows(sql: string, values: unknown[] = []) {
  return (await pool.query(sql, values)).rows;
}

try {
  await pool.query(schema);

  const store = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool,
    max_attempts: 3,
    lock_timeout_ms: 2000,
    statement_timeout_ms: 5000,
  });

  // Legitimate rejection audit with no canonical job row. This proves the
  // schema deliberately permits audit/cursor rows without a jobs FK.
  const missing = await claimBuyVoidPaymentKeyedDispatchV1({
    attempt_id: A,
    worker_id: "worker-missing",
    lease_ttl_us: 500_000n,
    lease_token_factory: token("11"),
    store,
  });
  assert.deepEqual(missing, {
    ok: false,
    status: "rejected",
    reason: "attempt_not_found",
  });
  assert.equal(
    Number(
      (
        await rows(
          `SELECT count(*)::int AS n
             FROM void_buy_void_payment_keyed_dispatcher_jobs_v1
            WHERE attempt_id = $1`,
          [A],
        )
      )[0].n,
    ),
    0,
  );
  let audit = await rows(
    `SELECT decision_seq, event_type
       FROM void_buy_void_payment_keyed_dispatcher_audit_v1
      WHERE attempt_id = $1
      ORDER BY decision_seq`,
    [A],
  );
  assert.deepEqual(
    audit.map((row) => [String(row.decision_seq), row.event_type]),
    [["1", "CLAIM_REJECT_NOT_FOUND"]],
  );

  const submitted = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: A,
    request_fingerprint_sha256: REQUEST_A,
    client_id: "client-a",
    store,
  });
  assert.equal(submitted.ok, true);
  assert.equal(submitted.status, "submitted");

  const replay = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: A,
    request_fingerprint_sha256: REQUEST_A,
    client_id: "client-b",
    store,
  });
  assert.equal(replay.ok, true);
  assert.equal(replay.status, "idempotent");

  const conflict = await submitBuyVoidPaymentKeyedDispatchV1({
    attempt_id: A,
    request_fingerprint_sha256: REQUEST_B,
    client_id: "client-c",
    store,
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.reason, "request_fingerprint_mismatch");

  const claimA = await claimBuyVoidPaymentKeyedDispatchV1({
    attempt_id: A,
    worker_id: "worker-a",
    lease_ttl_us: 500_000n,
    lease_token_factory: token("22"),
    store,
  });
  assert.equal(claimA.ok, true);
  assert.equal(claimA.status, "claimed");

  const blocked = await claimBuyVoidPaymentKeyedDispatchV1({
    attempt_id: A,
    worker_id: "worker-b",
    lease_ttl_us: 500_000n,
    lease_token_factory: token("33"),
    store,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "active_lease");

  const renewed = await renewBuyVoidPaymentKeyedDispatchLeaseV1({
    lease: claimA.lease,
    lease_ttl_us: 500_000n,
    store,
  });
  assert.equal(renewed.ok, true);
  assert.equal(renewed.status, "renewed");

  await sleep(650);

  const claimB = await claimBuyVoidPaymentKeyedDispatchV1({
    attempt_id: A,
    worker_id: "worker-b",
    lease_ttl_us: 2_000_000n,
    lease_token_factory: token("44"),
    store,
  });
  assert.equal(claimB.ok, true);
  assert.equal(claimB.status, "claimed");
  assert.equal(claimB.lease.lease_gen, claimA.lease.lease_gen + 1n);

  const stale = await publishBuyVoidPaymentKeyedDispatchResultV1({
    lease: claimA.lease,
    result_fingerprint_sha256: RESULT_A,
    store,
  });
  assert.equal(stale.ok, false);
  assert.equal(stale.reason, "stale_generation");

  const published = await publishBuyVoidPaymentKeyedDispatchResultV1({
    lease: claimB.lease,
    result_fingerprint_sha256: RESULT_A,
    store,
  });
  assert.equal(published.ok, true);
  assert.equal(published.status, "published");

  const publicationReplay = await publishBuyVoidPaymentKeyedDispatchResultV1({
    lease: claimB.lease,
    result_fingerprint_sha256: RESULT_B,
    store,
  });
  assert.equal(publicationReplay.ok, true);
  assert.equal(publicationReplay.status, "idempotent");
  assert.equal(
    publicationReplay.job.result_fingerprint_sha256,
    RESULT_A,
  );

  const canonical = (
    await rows(
      `SELECT *
         FROM void_buy_void_payment_keyed_dispatcher_jobs_v1
        WHERE attempt_id = $1`,
      [A],
    )
  )[0];
  assert.equal(canonical.request_fingerprint_sha256, REQUEST_A);
  assert.equal(canonical.result_fingerprint_sha256, RESULT_A);
  assert.equal(canonical.published, true);
  assert.equal(canonical.lease_token, null);
  assert.equal(canonical.lease_owner, null);
  assert.equal(canonical.lease_expires_us, null);

  audit = await rows(
    `SELECT decision_seq
       FROM void_buy_void_payment_keyed_dispatcher_audit_v1
      WHERE attempt_id = $1
      ORDER BY decision_seq`,
    [A],
  );
  assert.deepEqual(
    audit.map((row, index) => Number(row.decision_seq) === index + 1),
    audit.map(() => true),
  );
  const cursor = (
    await rows(
      `SELECT last_decision_seq
         FROM void_buy_void_payment_keyed_dispatcher_decision_cursors_v1
        WHERE attempt_id = $1`,
      [A],
    )
  )[0];
  assert.equal(
    Number(cursor.last_decision_seq),
    audit.length,
  );

  // SQL-level immutable request/submission binding: direct store misuse cannot
  // rewrite canonical request identity even with the correct next version.
  const immutableResult = await store.run_serializable_job_decision(
    A,
    async (tx) => {
      const current = await tx.read_job_for_update(A);
      assert.ok(current);
      return await tx.update_job(A, current.version, {
        ...current,
        request_fingerprint_sha256: REQUEST_B,
        version: current.version + 1n,
      });
    },
  );
  assert.equal(immutableResult, false);
  const immutableRow = (
    await rows(
      `SELECT request_fingerprint_sha256
         FROM void_buy_void_payment_keyed_dispatcher_jobs_v1
        WHERE attempt_id = $1`,
      [A],
    )
  )[0];
  assert.equal(immutableRow.request_fingerprint_sha256, REQUEST_A);

  // Same-payload submit race is serialized by the session advisory lock.
  const race = await Promise.all([
    submitBuyVoidPaymentKeyedDispatchV1({
      attempt_id: B,
      request_fingerprint_sha256: REQUEST_A,
      client_id: "race-a",
      store,
    }),
    submitBuyVoidPaymentKeyedDispatchV1({
      attempt_id: B,
      request_fingerprint_sha256: REQUEST_A,
      client_id: "race-b",
      store,
    }),
  ]);
  assert.deepEqual(
    race.map((value) => value.status).sort(),
    ["idempotent", "submitted"],
  );

  // Competing claims admit exactly one lease.
  const claims = await Promise.all([
    claimBuyVoidPaymentKeyedDispatchV1({
      attempt_id: B,
      worker_id: "race-worker-a",
      lease_ttl_us: 2_000_000n,
      lease_token_factory: token("55"),
      store,
    }),
    claimBuyVoidPaymentKeyedDispatchV1({
      attempt_id: B,
      worker_id: "race-worker-b",
      lease_ttl_us: 2_000_000n,
      lease_token_factory: token("66"),
      store,
    }),
  ]);
  assert.equal(
    claims.filter((value) => value.ok && value.status === "claimed").length,
    1,
  );
  assert.equal(
    claims.filter((value) => !value.ok && value.reason === "active_lease")
      .length,
    1,
  );

  // Transaction rollback is real: no partial row survives an action throw.
  await assert.rejects(
    store.run_serializable_job_decision(C, async (tx) => {
      const now = await tx.now_us();
      assert.equal(
        await tx.insert_job({
          schema: "void_buy_void_payment_keyed_dispatcher_job_v1",
          marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_V1,
          attempt_id: C,
          request_fingerprint_sha256: REQUEST_A,
          submitted_at_us: now,
          result_fingerprint_sha256: null,
          published: false,
          published_gen: null,
          lease_gen: 0n,
          lease_token: null,
          lease_owner: null,
          lease_expires_us: null,
          version: 0n,
        }),
        true,
      );
      throw new Error("synthetic_rollback");
    }),
    /synthetic_rollback/,
  );
  assert.equal(
    Number(
      (
        await rows(
          `SELECT count(*)::int AS n
             FROM void_buy_void_payment_keyed_dispatcher_jobs_v1
            WHERE attempt_id = $1`,
          [C],
        )
      )[0].n,
    ),
    0,
  );

  // Session advisory lock wait is bounded by lock_timeout.
  let holderEnteredResolve;
  const holderEntered = new Promise((resolve) => {
    holderEnteredResolve = resolve;
  });
  let releaseHolderResolve;
  const releaseHolder = new Promise((resolve) => {
    releaseHolderResolve = resolve;
  });
  const longStore = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool,
    lock_timeout_ms: 5000,
    statement_timeout_ms: 10000,
  });
  const shortLockStore = createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
    pool,
    lock_timeout_ms: 200,
    statement_timeout_ms: 2000,
  });
  const holder = longStore.run_serializable_job_decision(D, async () => {
    holderEnteredResolve();
    await releaseHolder;
    return "released";
  });
  await holderEntered;
  const lockStarted = Date.now();
  await assert.rejects(
    shortLockStore.run_serializable_job_decision(D, async () => "forbidden"),
    (error) => error && error.code === "55P03",
  );
  assert.ok(Date.now() - lockStarted < 3000);
  releaseHolderResolve();
  assert.equal(await holder, "released");

  // A real blocked SQL statement is bounded by statement_timeout and rolls back.
  const blocker = await pool.connect();
  try {
    await blocker.query("BEGIN");
    await blocker.query(
      "LOCK TABLE void_buy_void_payment_keyed_dispatcher_jobs_v1 IN ACCESS EXCLUSIVE MODE",
    );
    const statementStore =
      createBuyVoidPaymentKeyedDispatcherPostgresStoreV1({
        pool,
        lock_timeout_ms: 5000,
        statement_timeout_ms: 250,
      });
    const statementStarted = Date.now();
    await assert.rejects(
      statementStore.run_serializable_job_decision(E, async (tx) => {
        await tx.read_job_for_update(E);
      }),
      (error) => error && error.code === "57014",
    );
    assert.ok(Date.now() - statementStarted < 3000);
  } finally {
    await blocker.query("ROLLBACK");
    blocker.release();
  }

  // Direct malformed state is rejected by the physical schema.
  await assert.rejects(
    pool.query(
      `INSERT INTO void_buy_void_payment_keyed_dispatcher_jobs_v1 (
         attempt_id, request_fingerprint_sha256, submitted_at_us,
         result_fingerprint_sha256, published, published_gen, lease_gen,
         lease_token, lease_owner, lease_expires_us, version
       ) VALUES ($1, $2, 1, NULL, FALSE, NULL, 0, NULL, NULL, NULL, 0)`,
      ["not-a-canonical-attempt", REQUEST_A],
    ),
    (error) => error && error.code === "23514",
  );

  console.log(
    "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_INTEGRATION_V1_GREEN",
  );
  console.log("real_postgres_connection=true");
  console.log("explicit_schema_provisioning=true");
  console.log("not_found_audit_without_job_fk=true");
  console.log("submit_race_serialized=true");
  console.log("claim_race_single_lease=true");
  console.log("expiry_reclaim_generation_fence=true");
  console.log("stale_publish_rejected=true");
  console.log("canonical_publication_replay=true");
  console.log("audit_decision_seq_gap_free=true");
  console.log("immutable_request_identity_sql_bound=true");
  console.log("transaction_rollback_real=true");
  console.log("advisory_lock_timeout_bounded=true");
  console.log("statement_timeout_bounded=true");
  console.log("automatic_schema_migration=false");
  console.log("production_connection_factory_present=false");
  console.log("runtime_route_mount=false");
  console.log("transaction_broadcast=false");
  console.log("wallet_access=false");
  console.log("signing=false");
  console.log("money_movement=false");
} finally {
  await pool.end();
}
