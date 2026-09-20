# Buy VOID dispatcher PostgreSQL production configuration v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_PRODUCTION_CONFIG_V1`

Status: source-only, pure configuration validation. This gate does not add the
`pg` package, open a database connection, read a credential, query PostgreSQL,
provision a schema, mount a runtime route, start a worker, sign, broadcast, or
move funds.

## Purpose

The accepted dispatcher PostgreSQL adapter requires an injected Pool-compatible
client. Real PostgreSQL semantics are already exercised in isolated CI, but the
repository intentionally has no production connection factory.

Before a production factory can exist, connection authority must be closed and
reviewable. This contract fixes that policy independently of execution.

## Candidate fields

The verifier requires exactly these fields and rejects every unknown field:

```text
VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST
VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT
VOID_BUY_VOID_DISPATCHER_POSTGRES_DATABASE
VOID_BUY_VOID_DISPATCHER_POSTGRES_USER
VOID_BUY_VOID_DISPATCHER_POSTGRES_APPLICATION_NAME
VOID_BUY_VOID_DISPATCHER_POSTGRES_SCHEMA_CONTRACT
VOID_BUY_VOID_DISPATCHER_POSTGRES_SSL_MODE
VOID_BUY_VOID_DISPATCHER_POSTGRES_TLS_SERVER_NAME
VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX
VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS
VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS
VOID_BUY_VOID_DISPATCHER_POSTGRES_PASSWORD_CREDENTIAL_ID
VOID_BUY_VOID_DISPATCHER_POSTGRES_CA_CREDENTIAL_ID
CREDENTIALS_DIRECTORY
```

No URI/DSN field exists. In particular, a `DATABASE_URL` field is rejected so
a password cannot be smuggled into a normal environment value or PR-visible
configuration artifact.

## Fixed identities

The contract fixes:

```text
database          void_buy_void_dispatcher_v1
database user     void_buy_void_dispatcher_v1
application name  void-node-buy-void-dispatcher-v1
schema contract   buy-void-payment-keyed-dispatcher-postgres-v1
password cred     buy-void-dispatcher-postgres-password-v1
CA cred           buy-void-dispatcher-postgres-ca-v1
TLS server name   localhost
SSL mode          verify-full
```

A future factory may not choose alternate database, user, application, schema,
credential, TLS-mode or server-name identities from request input.

The factory must also provide every connection-critical option explicitly and
must not inherit libpq-style ambient variables such as `PGHOST`, `PGPORT`,
`PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGSSLMODE`, or `PGAPPNAME`.
Those variables are outside the verified candidate and therefore cannot become
fallback authority.

## Network policy

Only literal loopback hosts are accepted:

```text
127.0.0.1
::1
```

No DNS hostname, private-LAN address, wildcard host, redirect, discovery record,
cloud endpoint or remote database authority is accepted by this generation.

Port is explicit and bounded to 1..65535.

## TLS policy

TLS is mandatory and certificate verification is mandatory. The accepted mode
is exactly `verify-full`, with the fixed TLS server name `localhost`.

The future connection factory must read the CA bytes only from the fixed systemd
credential and must configure the client so certificate-chain and hostname
verification cannot silently fall back to insecure mode.

This source gate does not read or validate certificate bytes.

## Credential policy

The candidate carries only credential **IDs**, never secret contents.

The future factory is expected to reuse the existing VOID pattern:

- systemd `LoadCredential=` owns materialization;
- the process receives `CREDENTIALS_DIRECTORY`;
- credential IDs are fixed source constants;
- password/CA environment variables are forbidden;
- arbitrary credential paths are forbidden;
- symlinks and broad file permissions must fail closed before reading;
- raw password/CA bytes must never be logged or returned.

This verifier only accepts an absolute path below `/run/credentials/`.
It performs no filesystem operation.

## Pool and timeout bounds

```text
pool_max                1..16
connection_timeout_ms   100..10000
idle_timeout_ms         1000..60000
```

These are connection-pool bounds only. The accepted dispatcher store continues
to own SQL `lock_timeout` and `statement_timeout` policy separately.

## Schema boundary

The candidate must bind the existing
`buy-void-payment-keyed-dispatcher-postgres-v1` schema contract.

This gate does **not** prove the live database has that schema. A later
schema-admission gate must query the connected server read-only and fail closed
unless the exact required tables/constraints/version contract are present.

Automatic `CREATE`, `ALTER`, `DROP`, or migration remains forbidden.

## Authority

```text
pure_configuration_validation_only=true
package_pg_dependency_added=false
production_connection_factory_present=false
production_connection_performed=false
credential_read_performed=false
schema_admission_ready=false
runtime_route_mount=false
transaction_broadcast=false
wallet_access=false
signing=false
money_movement=false
```

## Next gates

The next database generation may add a reviewed production connection factory,
but only after this configuration contract is accepted. That factory must:

1. consume this verified policy rather than free-form connection options;
2. source password and CA from the fixed systemd credential IDs;
3. pin the reviewed `pg` dependency/version;
4. enforce TLS and application identity;
5. expose only the Pool-compatible interface required by the accepted store;
6. perform no schema mutation; and
7. remain unmounted from worker/runtime execution.

Live schema admission and runtime worker composition remain later, separate
gates.
