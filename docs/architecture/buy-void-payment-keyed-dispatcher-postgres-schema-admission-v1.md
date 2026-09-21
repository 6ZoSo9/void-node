# Buy VOID dispatcher PostgreSQL read-only schema admission v1

Marker: VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_SCHEMA_ADMISSION_V1

Status: source-only, read-only admission gate stacked on the reviewed production
PostgreSQL connection factory. This generation does not mount the dispatcher,
perform migration, mutate application data, enable Buy VOID, access a wallet,
sign, broadcast, or move funds.

## Boundary

The admission function accepts only a connection-factory-ready handle carrying
the accepted factory marker, authority object, configuration fingerprint, fixed
database/user identity, and fixed startup search path. It then verifies the live
session independently: both current_user and session_user must be the fixed
runtime login, application_name must be the fixed dispatcher value, and
client_encoding must be UTF8.

Admission opens one REPEATABLE READ READ ONLY transaction and applies only a
transaction-local five-second statement timeout. It then reads PostgreSQL
session state and pg_catalog metadata. The production module contains no
database-schema or application-data mutation statement.

The fixed database identity is void_buy_void_dispatcher_v1 and the fixed
runtime login is void_buy_void_dispatcher_v1. Ownership is deliberately
separate: the database and all canonical tables must be owned by the fixed
NOLOGIN role void_buy_void_dispatcher_owner_v1. The runtime login may not own
the database, schema, or tables and may not be a member of the owner role. The
runtime login may not be a direct or indirect member of any other role. The
owner role may have no direct or indirect membership except PostgreSQL's
implicit, database-scoped `pg_database_owner` membership that follows from
owning this database. Both roles must be non-superuser, NOCREATEDB,
NOCREATEROLE, NOREPLICATION, and NOBYPASSRLS; the owner must be NOLOGIN.

The runtime database authority is exactly CONNECT. CREATE and TEMPORARY are
forbidden, ambient PUBLIC database privileges are revoked, and no other
non-owner database ACL entry is accepted.

The public schema owner must be either
void_buy_void_dispatcher_owner_v1 directly or PostgreSQL's dynamic
pg_database_owner role, whose authority is bound to the separately verified
database owner. Ambient PUBLIC schema privileges are revoked. The runtime login
must have exactly USAGE on public and must not have CREATE.

Admission verifies the server-resolved effective search-path array with
current_schemas(true); it must be exactly [pg_catalog, public]. The session must
also report pg_my_temp_schema() = 0, so a pooled connection that has created a
temporary schema is held instead of admitted.

Because this is a dedicated dispatcher database, the complete non-system schema
set must be exactly [public]. An extra user schema is rejected even when it is
not on the runtime search path. The public schema may contain no user-defined
function or procedure; this prevents a default-PUBLIC executable routine,
including a SECURITY DEFINER routine, from becoming an undeclared privilege
surface.

## Admitted physical shape

The dedicated public schema must contain exactly the three accepted dispatcher
relations and no additional table, view, sequence, materialized view, partitioned
table, or foreign-table relation:

- void_buy_void_payment_keyed_dispatcher_jobs_v1
- void_buy_void_payment_keyed_dispatcher_decision_cursors_v1
- void_buy_void_payment_keyed_dispatcher_audit_v1

Each must be a permanent ordinary table owned by
void_buy_void_dispatcher_owner_v1 with row-level security disabled. The only
accepted non-owner ACL entries are the exact runtime DML surface required by the
reviewed store:

- jobs: SELECT, INSERT, UPDATE
- decision cursors: SELECT, INSERT, UPDATE
- audit: INSERT

DELETE, TRUNCATE, REFERENCES, TRIGGER, grant options, PUBLIC grants, and grants
to any other non-owner role are rejected. Column-level grants are also forbidden:
the runtime contract uses only the exact table-level ACL matrix above. Canonical
tables may not be partitions,
inheritance children, or inheritance parents; both directions of `pg_inherits`
are required to be empty. Column order, names, PostgreSQL types, nullability,
lack of defaults, lack of generated or identity columns, and primary-key column
order are checked against the accepted v1 schema. Each table must have exactly
one index: its valid, ready, unique btree primary-key index, with no predicate,
index expression, or included column. The index key and total-attribute counts
must both equal the canonical primary-key column count. Standalone additional
indexes are rejected as schema drift.

The catalog must expose exactly the accepted number of CHECK constraints per
table: 12 for jobs, 2 for decision cursors, and 8 for audit. Admission requires
the complete normalized CHECK-definition set to match the canonical v1 schema;
constraint count plus substring presence is not sufficient. The older semantic
token checks remain as a second assertion over the exact set. This rejects a
same-count weakening such as `CHECK (last_decision_seq > 0 OR TRUE)` even though
it still contains the previously required `last_decision_seq > 0` token. Exact
comparison also preserves case inside quoted literals and regexes; only the
legacy token view is lowercased. All accepted constraints must be validated and
non-deferrable; CHECK constraints must also remain inheritable rather than
`NO INHERIT`. No non-internal trigger is allowed on the admitted tables.

## Proof

The hosted proof uses PostgreSQL 16 only as a controlled fixture. Fixture setup
creates a fixed NOLOGIN owner role plus the fixed runtime LOGIN role, creates
the database under the owner, revokes ambient PUBLIC database/schema authority,
applies the already-tracked schema while SET ROLE'd to the owner, and grants
only the exact runtime DML matrix. That setup is test authority, not
production-module authority. The production admission module remains
catalog-select-only and read-only.

The proof then runs the real read-only admission module through the accepted
narrow Pool-compatible interface and requires GREEN on Node 22, 24, and 26.
After positive admission, the admin-only test harness temporarily grants
TEMPORARY to the runtime login, lets one pinned runtime session create a
temporary table, revokes TEMPORARY again, and proves that already-tainted
session is rejected. That backend is then destroyed rather than returned to the
pool because materializing `pg_temp` makes the session permanently outside
this generation's admission contract. It then temporarily grants CREATE on public to PUBLIC and
requires rejection, revokes that grant, temporarily grants SELECT on a
canonical dispatcher table to PUBLIC and requires rejection, and revokes that
grant. Additional privilege adversaries make the owner LOGIN-capable, grant the
owner role to the runtime login, grant an unrelated predefined role to each
fixed role, grant runtime DELETE on jobs, remove the required runtime SELECT on
jobs, and add a column-level PUBLIC SELECT grant; every drift must be held and
then restored. Separate adversaries add an otherwise-empty user schema and a
public SECURITY DEFINER function; both must be rejected and removed.
It also replaces the
`last_decision_seq > 0` CHECK with a same-count, same-token but vacuous
`last_decision_seq > 0 OR TRUE` constraint and requires the exact-definition
gate to reject it before restoring the canonical CHECK. A second mutation
changes the actor regex from `[A-Za-z...]` to a lowercase-only equivalent that
the old lowercased token view could not distinguish; the exact-definition gate
must reject that drift too. The fixture then creates an inheritance child in a
separate schema and requires the canonical parent table to be held, and replaces
the cursor primary key with a DEFERRABLE / INITIALLY DEFERRED equivalent and
requires rejection before restoring the canonical immediate primary key.
Finally it adds one synthetic public-schema column and proves the production
admission module rejects that drift as well. All adversarial mutations exist
only in the proof harness.

## Authority

production source:
- database transaction: REPEATABLE READ, read only
- catalog access: SELECT only
- exact database identity: required
- exact database user: required
- exact authenticated session_user: required
- exact application_name: required
- client encoding: UTF8 required
- exact database owner: void_buy_void_dispatcher_owner_v1
- runtime database ownership: forbidden
- owner role LOGIN: forbidden
- elevated owner/runtime role attributes: forbidden
- runtime membership in owner role: forbidden
- runtime direct/indirect membership in any other role: forbidden
- owner direct/indirect membership: only implicit pg_database_owner permitted
- runtime database CONNECT: required
- runtime database CREATE/TEMPORARY: forbidden
- other non-owner database ACL entries: forbidden
- public schema owner: bound to the verified owner role
- runtime public-schema USAGE: required
- runtime public-schema CREATE: forbidden
- other non-owner public-schema ACL entries: forbidden
- exact runtime canonical-table DML ACLs: required
- other non-owner canonical-table privileges: forbidden
- column-level privileges: forbidden
- exact server-resolved effective search path: required
- exact non-system schema set: [public]
- public user-defined functions/procedures: forbidden
- active temporary session schema: forbidden
- exact public relation set: required
- partition membership: forbidden
- table inheritance parent/child relationships: forbidden
- exact table column shape: required
- exact primary key shape: required
- constraints validated: required
- deferrable constraints: forbidden
- CHECK NO INHERIT: forbidden
- exact index set: required
- primary index access method: btree
- primary index INCLUDE columns: forbidden
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
accepted, production provisioning remains a separate operator-only action using
the NOLOGIN owner authority; the runtime credential never receives DDL or
ownership authority. A later composition may pass an admitted least-privilege
pool into the bounded dispatcher worker. That later gate must preserve the
existing runtime enable flags, lease/context identity, non-replayability,
guarded broadcast, reconciliation, receipt, and terminal closeout walls.
