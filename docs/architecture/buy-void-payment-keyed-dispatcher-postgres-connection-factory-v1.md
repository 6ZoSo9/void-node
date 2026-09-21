# Buy VOID dispatcher PostgreSQL production connection factory v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CONNECTION_FACTORY_V1`

Status: source-only production connection factory. This gate introduces the
reviewed PostgreSQL client dependency and credential-to-pool composition, but it
does not mount the pool into the dispatcher runtime, perform schema admission,
run a production query, enable Buy VOID, sign, broadcast, or move funds.

## Accepted predecessors

This factory consumes the accepted source contracts for:

- PostgreSQL production configuration;
- the fixed systemd password credential ID;
- the fixed systemd CA credential ID; and
- the narrow dispatcher PostgreSQL pool/client interface.

Callers supply the explicit production configuration candidate. The factory
revalidates it before any credential read.

## Dependencies

The production dependency is pinned exactly:

```text
pg        8.23.0
@types/pg 8.23.1
```

The pure-JavaScript `pg` client is used. `pg-native` is not introduced.

`package.json` and npm lockfile v3 are generated together. No connection URI
or `connectionString` is accepted.

## Credential admission

Credential IDs remain fixed source constants:

```text
buy-void-dispatcher-postgres-password-v1
buy-void-dispatcher-postgres-ca-v1
```

The factory walks `/run/credentials` through opened directory descriptors on
Linux. Every child beneath the root is opened with `O_NOFOLLOW`; the final
credential directory must be private and owned by the service UID.

Credential leaves are opened relative to the pinned directory descriptor
through `/proc/self/fd/<fd>/<fixed-id>`, again with `O_NOFOLLOW`. The opened
file is validated with `fstat`, read directly into one exact-size,
zero-initialized owned buffer through the same descriptor under a hard byte
ceiling, and re-`fstat`ed so an in-place generation change during the read
fails closed. Failed reads wipe that owned buffer before returning; no
scratch/chunk credential copies are retained.

Credential leaves must have exact mode `0400`, matching systemd's secure
credential classification. Owner-write, group, or world access is rejected,
as are symlinks, non-regular files, wrong ownership, empty files, oversized
files, and mid-read metadata changes.

The password credential must be exact UTF-8, non-empty, and contain no NUL,
carriage return, or newline. Leading/trailing spaces are not silently trimmed.
The CA credential must be exact UTF-8 certificate material and must not contain
a private-key PEM block. The complete credential is partitioned into certificate
PEM blocks with whitespace-only separators; any trailing non-certificate content
is rejected. Every certificate block must parse as X.509, and the full CA
material must also construct a Node TLS context with TLS 1.2 or newer.

Password bytes remain private to the factory and are provided to `pg` through
a callback. The narrow handle never returns the password, CA, raw `pg.Pool`,
or raw `PoolClient`. Credential buffers are zeroed when the factory handle is
closed.

## Explicit node-postgres policy

Every authority-bearing connection value is provided programmatically:

```text
host
port
database
user
password callback
application_name
fallback_application_name
options="-c client_encoding=UTF8"
replication=false
client_encoding=UTF8
ssl.ca
ssl.servername=localhost
ssl.rejectUnauthorized=true
ssl.minVersion=TLSv1.2
sslnegotiation=postgres
enableChannelBinding=true
pipeline=false
connectionTimeoutMillis
keepAlive=true
keepAliveInitialDelayMillis=10000
statement_timeout=0
query_timeout=0
lock_timeout=0
idle_in_transaction_session_timeout=0
pool max
pool min=0
idleTimeoutMillis
allowExitOnIdle=false
maxLifetimeSeconds=0
```

The explicit configuration prevents missing values from becoming ambient
`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`,
`PGAPPNAME`, `PGSSLMODE`, `PGSSLNEGOTIATION`, `PGOPTIONS`, or
`PGREPLICATION` authority. In `pg@8.23.0`, an empty `options` string is falsy and would fall
back to `PGOPTIONS`; this factory therefore uses the non-empty fixed startup
option `-c client_encoding=UTF8`. That both closes the environment fallback
and makes the server-side UTF-8 client-encoding policy explicit. The factory
also sends the truthy fixed startup value `replication=false`; this prevents
`PGREPLICATION` from selecting replication or logical-replication database mode.

The traditional PostgreSQL SSLRequest negotiation is fixed explicitly. Direct
TLS negotiation is not selected by this generation. Channel binding is enabled
when the server supports it. Query pipelining is explicitly disabled.

## Lazy construction

Constructing the factory creates a `pg.Pool` but does not call
`pool.connect()`. Therefore factory construction reads the two systemd
credentials but performs no network connection or database query.

The returned dispatcher pool is a wrapper exposing only the already-accepted
`connect/query/release` contract. The raw `pg.Pool` and raw client are not
returned.

A safe pool-error snapshot records only bounded error class/code metadata. Raw
errors or credential values are not emitted by the factory.

## Hosted proof

The focused Node 22/24/26 proof is non-production:

1. create an ephemeral private directory under `/run/credentials`;
2. generate a one-day self-signed CA for `localhost`;
3. create a synthetic password credential;
4. start a synthetic PostgreSQL TLS listener on loopback using the disposable
   localhost certificate and its test-only private key;
5. set hostile ambient `PG*`/DATABASE_URL values;
6. construct the real factory and prove the listener sees zero connections;
7. call the narrow pool once, prove the canonical eight-byte SSLRequest, complete
   a verified TLS handshake for `localhost`, capture the PostgreSQL 3.0 startup
   packet, and prove exact user/database/application/options/replication values with no
   attacker-controlled ambient value;
8. reject broad permissions, password newline normalization, credential
   symlinks, credential-directory symlinks, private-key CA content, malformed
   CA content, trailing non-certificate CA content, malformed additional CA
   certificates, and oversized password material; and
9. clean the disposable credential fixture.

The synthetic listener never authenticates a PostgreSQL session and executes no
database query. It exists only long enough to validate SSLRequest, TLS identity,
and the startup packet, then closes the connection.

## Authority

```text
production_connection_factory_present=true
credential_read_performed_on_ready_factory=true
pool_construction_network_connect=false
schema_query_on_factory_creation=false
automatic_schema_migration=false
runtime_route_mount=false
wallet_access=false
signing=false
transaction_broadcast=false
money_movement=false
```

## Next gate

After this factory is accepted, the next database gate is **read-only schema
admission** against a controlled PostgreSQL instance. It must verify the exact
accepted tables, columns, constraints, and schema/version contract and must
perform no `CREATE`, `ALTER`, `DROP`, or automatic migration.

Only after schema admission is accepted should a later composition inject this
pool into the bounded dispatcher guarded-broadcast worker. Runtime activation
and production database connectivity remain separate operator-authorized gates.
