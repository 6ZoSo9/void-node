# Buy VOID Precision PostgreSQL host qualification v1

Marker: `VOID_BUY_VOID_PRECISION_POSTGRES_HOST_QUALIFICATION_V1`

Status: source-only designated-host qualification. This lane does not enable
Buy VOID execution, change a systemd unit, mutate PostgreSQL, invoke a worker,
broadcast a transaction, activate the presale/market, or move funds.

## Purpose

Precision already has the production PostgreSQL substrate installed:

- PostgreSQL 16 on loopback;
- the fixed dispatcher database and owner/runtime roles;
- the accepted three-table schema;
- TLS with `localhost` identity;
- systemd credential bindings for the dispatcher password and CA; and
- the reviewed `91`, `92`, and Precision-specific `94` drop-ins.

The remaining question is no longer provisioning. It is whether the **actual
production connection factory** can consume the materialized credentials,
establish the reviewed loopback TLS connection, and whether the **actual schema
admission engine** accepts the live catalog/ACL state while every execution gate
remains disabled.

This qualifier answers only that question.

## Fail-closed dormant boundary

The wrapper requires the live service process to expose exactly:

```text
VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=0

VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST=127.0.0.1
VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT=5432
VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX=4
VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS=5000
VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS=5000
```

Any mismatch is a HOLD. The qualifier never flips a gate.

## Source/process coupling

Exact host `main` HEAD equality is deliberately not required because Precision
may be behind current GitHub `main` on unrelated files while still executing
the identical reviewed PostgreSQL/Buy-VOID slice.

Instead, the wrapper pins Git blob identities for:

- `91`, `92`, and `94` source examples;
- production PostgreSQL configuration;
- connection factory;
- schema admission;
- PostgreSQL store;
- claimed runtime;
- admitted guarded runtime;
- payment-keyed full runtime;
- claimed-runtime parent;
- `package.json`; and
- `package-lock.json`.

Every live-checkout blob must match the reviewed source generation exactly.

The installed `91` and `94` drop-ins must be byte-identical to source.
The live `92` may contain operator-private source paths, so only its two fixed
credential IDs are inspected. The generic `93` dormant overlay must be absent
on Precision because `94` is the designated-host reconciliation overlay.

## Credential boundary

The wrapper checks metadata only:

- current-UID systemd user credential directory;
- no symlink at the credential directory or leaves;
- owner UID equals the current runtime UID;
- directory has no group/world permissions;
- password and CA leaves are regular files;
- leaves are mode `0400`;
- password size is 1..4096 bytes;
- CA size is 1..524288 bytes.

The wrapper itself does **not** read credential contents.

The next step intentionally calls the already-reviewed production connection
factory. That factory **does read the password and CA bytes internally** because
real TLS/password authentication cannot be proven otherwise. Its reviewed
contract:

- uses descriptor-pinned/no-follow credential reads;
- requires exact owner and mode;
- validates password/CA shape;
- never prints raw credential material;
- zeros owned credential buffers on close;
- constructs only the fixed loopback/TLS Pool configuration.

The qualifier output contains no credential content.

## Actual production schema admission

The host tool imports only:

1. `buy_void_payment_keyed_dispatcher_postgres_production_config_v1.ts`;
2. `buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts`;
3. `buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts`.

It does **not** import or call the claimed runtime, admitted guarded runtime,
guarded broadcast worker, or full-runtime execution function.

After factory construction, it calls the existing schema admission engine. That
engine connects with the reviewed TLS/password policy and performs a
`REPEATABLE READ READ ONLY` transaction with bounded statement timeout. It
checks the exact database/role/ACL/schema/table/column/constraint/index/trigger
and routine contract.

A green result reports only:

- configuration fingerprint;
- schema fingerprint;
- credential read occurred internally;
- no credential content was output;
- loopback TLS connection occurred;
- schema catalog queries occurred;
- database mutation did not occur; and
- all full/apply/claimed/admitted gates remained disabled.

## Sanitized environment

The wrapper launches the host tool with `env -i` and forwards only:

- `PATH` and `HOME`;
- the live repository root;
- the reviewed safe Buy VOID/PostgreSQL fields; and
- `CREDENTIALS_DIRECTORY`.

No ambient `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`,
`PGSSLMODE`, `PGAPPNAME`, or unrelated process environment is forwarded.

## Authority

```text
service_mutation=false
database_mutation=false
schema_mutation=false
runtime_gate_mutation=false
worker_invoked=false
transaction_construction=false
transaction_signing=false
transaction_broadcast=false
token_or_work_credit_mutation=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

A green host qualification is **not activation authority**. It proves only that
the production PostgreSQL factory/schema layer is ready while dormant. Any later
transition of full runtime, apply, claimed runtime, or admitted guarded runtime
remains a separate reviewed and explicitly authorized gate.
