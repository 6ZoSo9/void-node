# Buy VOID payment-keyed dispatcher PostgreSQL store v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_STORE_V1`

Status: **source-only production-store adapter implementation**. The adapter is present in the repository, but no production PostgreSQL connection factory, schema migration, runtime route mount, parent dispatch, wallet action, signing, broadcast, or money movement is added.

## Purpose

`buy_void_payment_keyed_dispatcher_v1.ts` defines the qualified concurrency contract for one canonical Buy VOID attempt. This module supplies the PostgreSQL transaction/store implementation of that contract while preserving the V3 qualification boundary:

```text
transaction_isolation=SERIALIZABLE
per_job_admission=session_advisory_lock_before_serializable_snapshot
canonical_audit_order=per_job_decision_seq
retry_sqlstates=40001,40P01
```

The adapter does not import `pg` and does not construct a connection from environment variables. A caller must inject a Pool-compatible object. This keeps dependency selection, credentials, network reachability, TLS, pool sizing, and production activation outside this source-only gate. The adapter itself now configures bounded session `lock_timeout` and `statement_timeout` values before per-job admission and resets both settings before returning the checked-out session to the pool.

## Qualified reference binding

The dispatcher contract remains bound to the externally qualified PostgreSQL V3 reference:

```text
postgres_reference_v3_sha256=
0ebc2ae33838080dc08fe238d950d8b1558d306b2165a42502630d0e887c710b
```

The reference campaign established the state-machine semantics, crash behavior, audit ordering, differential agreement, and linearizability. This repository adapter translates those accepted semantics into a concrete PostgreSQL transaction surface; it does not claim a live production database has been provisioned or exercised.

## Transaction lifecycle

For each `attempt_id`, one checked-out PostgreSQL session is used:

1. Derive two signed 32-bit advisory keys from the first 64 bits of the canonical 256-bit `attempt_id`.
2. Acquire `pg_advisory_lock(key1, key2)` **before** opening a SERIALIZABLE transaction.
3. Start `BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE`.
4. Execute one dispatcher decision callback using only the transaction adapter.
5. Commit on success.
6. On SQLSTATE `40001` or `40P01`, roll back and retry on the same session while retaining the session advisory lock.
7. All other failures are rolled back and returned without retry.
8. Release the advisory lock after the decision succeeds or fails.
9. Release the pooled client; an advisory-unlock failure destroys/invalidates the session through the injected client release error.

The default bound is three total transaction attempts. The constructor accepts `max_attempts` from 1 through 8; this is an explicit source configuration, not an environment read.

The same constructor accepts bounded `lock_timeout_ms` and `statement_timeout_ms` values. Defaults are 5,000 ms and 15,000 ms respectively. They are applied with parameterized `set_config(...)` calls before the advisory lock is acquired and reset before pool release. Lock-timeout (`55P03`) and statement-timeout (`57014`) failures are not added to the retry set.

## Advisory-key collision semantics

Only 64 bits are available to PostgreSQL's two-key session advisory lock form. The adapter maps:

```text
attempt_id[0:8]  -> signed int32 key 1
attempt_id[8:16] -> signed int32 key 2
```

A collision can only over-serialize two unrelated attempts. It cannot merge rows, change `attempt_id`, grant lease authority, alter payload identity, or authorize a result.

## Database time

Lease decisions use database time from inside the SERIALIZABLE transaction:

```sql
SELECT floor(extract(epoch FROM clock_timestamp()) * 1000000)::bigint AS now_us
```

No caller-supplied or process-local wall clock is admitted through the store interface.

## Canonical tables

The adapter uses three fixed table identifiers:

```text
void_buy_void_payment_keyed_dispatcher_jobs_v1
void_buy_void_payment_keyed_dispatcher_decision_cursors_v1
void_buy_void_payment_keyed_dispatcher_audit_v1
```

This module performs **no** `CREATE`, `ALTER`, or `DROP`. Provisioning remains a separate operational gate.

The expected logical schema is:

### jobs

One row per canonical `attempt_id` containing the immutable request fingerprint, submission time, terminal result, lease generation/capability/owner/expiry, publication generation, and optimistic `version`.

The database should enforce `attempt_id` uniqueness and preserve nullable lease fields as one all-null or all-present group.

### decision cursors

One row per `attempt_id`:

```text
attempt_id PRIMARY KEY
last_decision_seq BIGINT NOT NULL
```

Allocation is transactional:

```sql
INSERT ... VALUES (attempt_id, 1)
ON CONFLICT (attempt_id) DO UPDATE
SET last_decision_seq = last_decision_seq + 1
RETURNING last_decision_seq
```

The cursor increment and corresponding audit insert occur in the same SERIALIZABLE transaction. A failed audit insert therefore rolls the sequence allocation back.

### audit

The canonical audit key is `(attempt_id, decision_seq)`. The table intentionally must not require a foreign key to the jobs table because rejected `CLAIM_REJECT_NOT_FOUND`, `RENEW_REJECT_NOT_FOUND`, and `PUBLISH_REJECT_NOT_FOUND` decisions are valid durable audit events for attempts with no canonical job row.

A database-generated audit ID may exist for storage convenience, but it is not a commit or linearization clock.

## SQL safety

All dynamic values are positional parameters. Table names and SQL statement shapes are static source constants. The adapter validates:

- canonical 64-hex attempt IDs;
- 64-hex request/result fingerprints;
- 32-hex lease capabilities;
- bounded actor identifiers;
- integer/bigint fields;
- published/lease record shape;
- audit event/outcome vocabulary;
- audit detail keys and scalar values;
- update `attempt_id` identity and `version = expected + 1`;
- immutable request fingerprint and submission time in the SQL update predicate.

## Retry boundary

Only:

```text
40001  serialization_failure
40P01  deadlock_detected
```

are retried, and only up to `max_attempts`. The per-job session advisory lock is acquired once and retained across the retry loop. Non-retry SQLSTATEs are returned after one failed transaction.

The dispatcher callback is required to contain transactional database decision logic only. External signing, broadcasting, or other irreversible side effects do not belong inside this retryable callback.

## Repository authority

After this adapter lands, the dispatcher truth surface becomes:

```text
source_only_contract=true
runtime_route_mount=false
canonical_parent_dispatch=false
production_store_adapter_present=true
```

The adapter itself reports:

```text
production_store_adapter_implementation_present=true
production_connection_factory_present=false
injected_pool_required=true
package_pg_dependency_added=false
automatic_schema_migration=false
runtime_route_mount=false
canonical_parent_dispatch=false
transaction_broadcast=false
wallet_access=false
signing=false
money_movement=false
```

No production database hostname, credentials, TLS material, wallet material, signer, broadcaster, Chain-2050 mutation, inventory mutation, or funds action is introduced.

## Acceptance proof

`scripts/prove_buy_void_payment_keyed_dispatcher_postgres_store_v1.ts` deterministically proves:

- session advisory lock occurs before SERIALIZABLE `BEGIN`;
- the same advisory lock is retained across retries;
- `40001` and `40P01` retries are bounded;
- non-retry SQLSTATEs are not retried;
- database time is read inside the transaction;
- canonical row parsing and update version binding;
- per-job decision cursor allocation precedes audit insertion;
- audit detail is parameterized JSON;
- update/audit SQL uses positional parameters;
- advisory unlock failure invalidates the pooled session;
- bounded lock/statement timeout configuration precedes admission and is reset before pool release;
- immutable request/submission identity is enforced in the SQL update predicate;
- runtime query traces perform no schema migration;
- source imports no `pg`, reads no `process.env`, and mounts no HTTP route;
- wallet/signing/broadcast/money surfaces remain absent.

CI runs root strict typecheck, the production build, the existing dispatcher proof, and this adapter proof on Node 22, 24, and 26.

## Next gate

Before any runtime mount or parent dispatch can be considered, a separate acceptance generation must:

1. provision the documented schema explicitly in an isolated PostgreSQL cluster;
2. inject a real reviewed Pool-compatible PostgreSQL client;
3. execute the repository adapter—not a parallel test implementation—against that cluster;
4. reproduce submit/claim/renew/reclaim/publish/audit behavior;
5. prove `40001`/`40P01` retry and rollback behavior on the real server;
6. prove restart/crash recovery and per-job audit continuity; and
7. keep deployment, wallet, signing, transaction broadcast, inventory funding, and funds movement disabled.

Only after that real-adapter database gate is green should a runtime composition/mount be proposed.
