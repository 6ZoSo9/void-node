# Buy VOID dispatcher PostgreSQL read-only schema admission v1

Marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1

Status: source-only, read-only admission gate stacked on the reviewed production
PostgreSQL connection factory. This generation does not mount the dispatcher,
perform migration, mutate application data, enable Buy VOID, access a wallet,
sign, broadcast, or move funds.

## Boundary

The admission function accepts only a connection-factory-ready handle carrying
the accepted factory marker, authority object, configuration fingerprint, fixed
database/user identity, and fixed startup search path.

Admission opens one REPEATABLE READ READ ONLY transaction and applies only a
transaction-local five-second statement timeout. It then reads PostgreSQL
session state and pg_catalog metadata. The production module contains no
database-schema or application-data mutation statement.

The fixed database identity is void_buy_void_dispatcher_v1 and the fixed
database user is void_buy_void_dispatcher_v1. The live database owner must be
that same fixed role. The public schema owner must be either that role directly
or PostgreSQL's dynamic pg_database_owner role, whose authority is thereby
bound to the separately verified database owner. No non-owner CREATE grant may
exist on the public schema.

Admission verifies the server-resolved effective search-path array with
current_schemas(true); it must
be exactly [pg_catalog, public]. The session must also report
pg_my_temp_schema() = 0, so a pooled connection that has created a temporary
schema is held instead of admitted.

## Admitted physical shape

The dedicated public schema must contain exactly the three accepted dispatcher
relations and no additional table, view, sequence, materialized view, partitioned
table, or foreign-table relation:

- void_buy_void_payment_keyed_dispatcher_jobs_v1
- void_buy_void_payment_keyed_dispatcher_decision_cursors_v1
- void_buy_void_payment_keyed_dispatcher_audit_v1

Each must be a permanent ordinary table owned by
void_buy_void_dispatcher_v1, with no privilege grant to any non-owner and with
row-level security disabled. Column order, names, PostgreSQL types, nullability,
lack of defaults, lack of generated or identity columns, and primary-key column
order are checked against the accepted v1 schema. Each table must have exactly one index: its valid, ready,
unique primary-key index, with no predicate or index expression. Standalone
additional indexes are rejected as schema drift.

The catalog must expose exactly the accepted number of CHECK constraints per
table: 12 for jobs, 2 for decision cursors, and 8 for audit. Admission requires
the complete normalized CHECK-definition set to match the canonical v1 schema;
constraint count plus substring presence is not sufficient. The older semantic
token checks remain as a second assertion over the exact set. This rejects a
same-count weakening such as `CHECK (last_decision_seq > 0 OR TRUE)` even though
it still contains the previously required `last_decision_seq > 0` token. No
non-internal trigger is allowed on the admitted tables.

## Proof

The hosted proof uses PostgreSQL 16 only as a controlled fixture. Fixture setup
creates the fixed role/database and explicitly applies the already-tracked
schema file. That setup is test authority, not production-module authority.

The proof then runs the real read-only admission module through the accepted
narrow Pool-compatible interface and requires GREEN on Node 22, 24, and 26.
After positive admission, the test harness pins admission to a session where it
deliberately created a temporary table and proves that session is rejected. It
then temporarily grants CREATE on public to PUBLIC and requires rejection,
revokes that grant, temporarily grants SELECT on a canonical dispatcher table
to PUBLIC and requires rejection, and revokes that grant. It also replaces the
`last_decision_seq > 0` CHECK with a same-count, same-token but vacuous
`last_decision_seq > 0 OR TRUE` constraint and requires the exact-definition
gate to reject it before restoring the canonical CHECK. Finally it adds one
synthetic public-schema column and proves the production admission module
rejects that drift as well. All adversarial mutations exist only in the proof
harness.

## Authority

production source:
- database transaction: read only
- catalog access: SELECT only
- exact database identity: required
- exact database user: required
- exact database owner: required
- public schema owner: bound to the verified database owner
- non-owner public-schema CREATE: forbidden
- non-owner canonical-table privileges: forbidden
- exact server-resolved effective search path: required
- active temporary session schema: forbidden
- exact public relation set: required
- exact table column shape: required
- exact primary key shape: required
- exact index set: required
- expected CHECK counts: required
- exact normalized CHECK definitions: required
- non-internal triggers: forbidden
- row-level security: forbidden
- automatic schema migration: false
- schema mutation: false
- data mutation: false
- runtime route mount: false
- wallet access: false
- signing: false
- transaction broadcast: false
- money movement: false

## Next gate

After the connection factory and this schema-admission stack are independently
accepted, a later composition may pass an admitted pool into the bounded
dispatcher worker. That later gate must preserve the existing runtime enable
flags, lease/context identity, non-replayability, guarded broadcast,
reconciliation, receipt, and terminal closeout walls.
