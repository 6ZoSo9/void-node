# Buy VOID dispatcher PostgreSQL admitted guarded runtime v1

Marker: \`VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_V1\`

Status: source-only composition gate. It is not mounted into a route, timer,
startup hook, service unit, or background worker by this change.

## Purpose

The accepted layers now provide:

1. a fixed production PostgreSQL configuration contract;
2. a systemd-credential-backed PostgreSQL connection factory;
3. exact read-only PostgreSQL schema/ACL admission; and
4. a bounded guarded-broadcast dispatcher worker.

The production-facing boundary must not let a caller inject a Pool-compatible
object, a fabricated connection-factory result, a PostgreSQL configuration,
root directory, runtime stage, signer, broadcaster, RPC URL, or confirmation.

This gate closes that composition boundary.

## Command input

The command accepts exactly one enumerable own top-level field:

\`\`\`text
lease
\`\`\`

The lease must match the canonical dispatcher lease shape and marker.

Unknown keys fail before any credential read or database connection.

## Server-owned configuration

The gate reads only these PostgreSQL variable fields from the process
environment:

\`\`\`text
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED
VOID_BUY_VOID_DISPATCHER_POSTGRES_HOST
VOID_BUY_VOID_DISPATCHER_POSTGRES_PORT
VOID_BUY_VOID_DISPATCHER_POSTGRES_POOL_MAX
VOID_BUY_VOID_DISPATCHER_POSTGRES_CONNECTION_TIMEOUT_MS
VOID_BUY_VOID_DISPATCHER_POSTGRES_IDLE_TIMEOUT_MS
CREDENTIALS_DIRECTORY
\`\`\`

Database name, database user, application name, schema-contract identity,
TLS mode, TLS server name, password credential ID, and CA credential ID are
compiled constants from the accepted production configuration contract rather
than caller/environment-selected identities.

The existing production verifier remains authoritative for all bounds and
shape validation.

## Ordered gates

The function is disabled unless its exact enable value is \`1\`.

Before credential access it requires:

1. the admitted-runtime enable flag;
2. the full payment-keyed runtime enable flag;
3. the full runtime apply-enable flag;
4. a valid full-runtime server policy; and
5. a server-derived non-root runtime directory consistent with that policy.

Only then does it:

1. construct the canonical PostgreSQL connection factory internally;
2. read the fixed systemd credentials through that factory;
3. perform live exact read-only PostgreSQL schema/ACL admission;
4. require matching configuration fingerprints and exact admission authority;
5. pass that same admitted factory Pool into the bounded guarded-broadcast
   worker; and
6. close the factory after the command.

The caller never receives the Pool, factory, credential material, or raw
configuration candidate.

## Failure semantics

Factory/configuration/admission failures are ordinary pre-worker HOLDs.

Once the guarded worker has been entered, an unexpected exception or worker
identity mismatch is conservatively returned as \`reconciliation_required\`
with possible external effect set true. A normal worker decision preserves
the worker's exact \`held\`, \`reconciliation_required\`, or \`applied\` status
and effect flags.

Factory close is attempted after every command that successfully constructs a
factory. Credential buffers are zeroed by the accepted factory close path.

The result distinguishes schema-admission mutation from worker-state mutation:
`schema_admission_database_mutation_performed=false` is invariant because
admission is read-only, while
`dispatcher_database_mutation_may_have_occurred=true` is reported
conservatively after bounded worker entry because the canonical dispatcher
store may update job/audit/lease state.

## Authority boundary

\`\`\`text
source_only_composition=true
disabled_by_default=true
caller_configuration_authority=false
caller_pool_authority=false
caller_factory_authority=false
caller_root_dir_authority=false
caller_stage_authority=false
caller_signer_authority=false
caller_broadcaster_authority=false
caller_rpc_url_authority=false
live_schema_admission_required_before_worker=true
schema_admission_database_mutation_allowed=false
dispatcher_database_mutation_may_have_occurred_after_worker_entry=true
automatic_retry=false
runtime_route_mount=false
service_mutation=false
\`\`\`

If this source function is later explicitly invoked with all independent
runtime/apply gates enabled and all production dependencies valid, the bounded
guarded-broadcast worker may sign, broadcast, and move funds. This PR does not
invoke that path.

## Proof scope

The focused proof executes only:

- exact input rejection;
- composition-disabled hold;
- full-runtime-disabled hold;
- apply-disabled hold; and
- runtime-policy hold.

Each executable proof path occurs before credential access and database
connection.

It also statically binds the required factory -> schema-admission -> worker
sequence and rejects caller pool/factory/config/root/stage/signer/broadcaster/RPC
authority.

A later live-composition gate must exercise the positive credential + PostgreSQL
admission path against an isolated fixture before any runtime mount is proposed.
