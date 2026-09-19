# Buy VOID payment-keyed dispatcher PostgreSQL integration v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_INTEGRATION_V1`

Status: **isolated real-PostgreSQL acceptance gate**. This generation provisions the dispatcher schema only inside a disposable CI PostgreSQL service and executes the repository PostgreSQL store adapter against that real server. It does not add a production database dependency, connection factory, credential source, runtime route mount, parent dispatch, wallet action, signing, transaction broadcast, Chain-2050 mutation, inventory mutation, or funds movement.

## Purpose

The merged dispatcher and PostgreSQL store adapter already define the accepted concurrency contract. This gate closes the next uncertainty: whether the concrete SQL, physical table constraints, session advisory lock behavior, rollback behavior, and dispatcher state machine agree when executed by a real PostgreSQL server rather than a deterministic mock client.

The workflow uses:

```text
postgres=16-alpine
node=22,24,26
test-only pg client=8.16.3
```

`pg@8.16.3` is installed with `--no-save --package-lock=false` only inside the disposable CI job. `package.json` and `package-lock.json` must remain byte-for-byte unmodified. The production source still imports no `pg` package and constructs no connection.

## Explicit schema provisioning

The accepted physical schema is:

`schemas/buy-void-payment-keyed-dispatcher-postgres-v1.sql`

It creates exactly three tables:

```text
void_buy_void_payment_keyed_dispatcher_jobs_v1
void_buy_void_payment_keyed_dispatcher_decision_cursors_v1
void_buy_void_payment_keyed_dispatcher_audit_v1
```

The adapter still performs no `CREATE`, `ALTER`, `DROP`, or automatic migration.

### No jobs foreign key on audit/cursors

The audit and decision-cursor tables intentionally do **not** reference the jobs table.

This is required by the dispatcher contract: `CLAIM_REJECT_NOT_FOUND`, `RENEW_REJECT_NOT_FOUND`, and `PUBLISH_REJECT_NOT_FOUND` are durable decisions for attempts that have no canonical jobs row. A jobs foreign key would make those legitimate decisions impossible to commit atomically.

The integration proof begins with a missing-attempt claim and requires:

```text
jobs row count = 0
audit decision_seq = 1
event_type = CLAIM_REJECT_NOT_FOUND
cursor last_decision_seq = 1
```

## Physical invariants

The jobs table enforces:

- canonical lowercase 64-hex `attempt_id`;
- canonical 64-hex request/result fingerprints;
- positive submission and lease-expiry microsecond timestamps;
- nonnegative lease generation and version;
- positive publication generation when present;
- 32-hex lease capability;
- bounded actor/owner identifier grammar;
- lease token/owner/expiry all-null or all-present;
- active lease implies positive generation;
- unpublished rows have no terminal result/publication generation;
- published rows have a canonical result, `published_gen = lease_gen`, and no active lease metadata.

The decision cursor enforces one positive `last_decision_seq` per attempt.

The audit table enforces:

- canonical attempt ID;
- positive decision sequence;
- exact event/outcome vocabulary;
- bounded actor grammar;
- nonnegative lease generation;
- positive database timestamp;
- JSON object detail;
- primary key `(attempt_id, decision_seq)`.

## SQL update hardening

The PostgreSQL store adapter now protects the immutable request identity at the SQL boundary, not only in dispatcher caller logic.

The optimistic update predicate requires all of:

```text
attempt_id = canonical attempt
version = expected version
request_fingerprint_sha256 = proposed immutable fingerprint
submitted_at_us = proposed immutable submission time
```

Therefore a direct misuse of `tx.update_job(...)` cannot rewrite request identity merely by supplying `version = expected + 1`. The real-server integration attempts that rewrite and requires `rowCount = 0` with the canonical fingerprint unchanged.

## Bounded session timeouts

The store configures two bounded PostgreSQL session settings before acquiring the per-job advisory lock:

```text
lock_timeout
statement_timeout
```

Defaults:

```text
lock_timeout_ms=5000
statement_timeout_ms=15000
```

Both settings are explicit constructor options with bounded positive integer validation. They are reset before the checked-out client is returned to the injected pool.

This closes two production liveness gaps:

1. waiting forever for a session advisory lock;
2. waiting forever on a blocked SQL statement inside a transaction.

The real-server proof requires:

- a second same-job dispatcher session to fail with SQLSTATE `55P03` under a 200 ms lock timeout while another session holds the advisory lock;
- a row read blocked behind an `ACCESS EXCLUSIVE` table lock to fail with SQLSTATE `57014` under a 250 ms statement timeout;
- both failures to remain outside the `40001`/`40P01` retry set.

## Real concurrency and recovery checks

The integration proof executes the repository adapter and dispatcher against the service database and requires:

- missing-attempt audit without a jobs row;
- submit plus idempotent replay;
- conflicting request fingerprint rejection;
- one active lease at a time;
- successful lease renewal;
- database-time expiry followed by generation-incrementing reclaim;
- stale-generation publication rejection;
- one canonical publication;
- publication replay returning the canonical result even when a different result is submitted;
- contiguous per-job decision sequence equal to the durable cursor;
- same-payload concurrent submit producing exactly one `submitted` and one `idempotent`;
- concurrent claims producing exactly one lease and one `active_lease` rejection;
- a thrown transaction callback rolling back a prior row insert;
- malformed direct SQL state rejected by a physical `CHECK` constraint;
- bounded advisory-lock wait;
- bounded blocked-statement execution.

## Authority boundary

This integration is still below production activation:

```text
production_store_adapter_present=true
real_postgres_integration_proof_present=true
production_connection_factory_present=false
package_pg_dependency_added=false
automatic_schema_migration=false
production_database_provisioned=false
production_database_credentials_configured=false
runtime_route_mount=false
canonical_parent_dispatch=false
transaction_broadcast=false
wallet_access=false
signing=false
money_movement=false
```

No production hostname, password, TLS key, wallet material, signer, broadcaster, deployment, runtime service mutation, or live Chain-2050 state is touched by this gate.

## Acceptance sequence

A candidate is accepted only if all Node 22/24/26 jobs:

1. install the repository lockfile exactly;
2. install the pinned disposable `pg` test client without changing repository package manifests;
3. validate the schema statically;
4. pass the deterministic PostgreSQL store proof;
5. provision the explicit schema into the disposable PostgreSQL service;
6. pass the real-server integration proof;
7. pass root strict typecheck and production build;
8. re-prove the dispatcher contract;
9. pass the focused Buy VOID TypeScript compilation; and
10. pass diff hygiene.

## Next gate

After this integration is green, the next gate is **production connection/configuration composition**, not runtime activation.

That later generation must define a reviewed production connection factory, credential/TLS source, pool bounds, connection/application identity, schema-version admission, startup health behavior, and operator configuration. It must remain fail-closed and must not mount the dispatcher into the Buy VOID runtime until the production database connection and schema admission are separately accepted.
