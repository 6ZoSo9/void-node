# Buy VOID dispatcher PostgreSQL claimed runtime v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1`

Status: source-only composition gate. It is **not mounted into a route, timer,
startup hook, service unit, or background worker** by this change.

## Purpose

The accepted dispatcher stack now has all individual production-facing pieces:

1. durable prepared-attempt enqueue;
2. custody-bound claim with a fixed 30-second cryptographic lease;
3. PostgreSQL production connection and exact schema/ACL admission;
4. a bounded guarded-broadcast worker; and
5. the positive PostgreSQL/TLS live fixture accepted by #1599.

The remaining composition problem is authority provenance. The accepted admitted
worker takes a canonical lease, but a future operator surface must never let a
caller fabricate that lease or choose its worker identity.

This gate supplies that server-owned bridge.

## Command input

The function accepts exactly three enumerable own fields:

```text
attempt_id
apply
confirmation
```

Requirements:

- `attempt_id` is exactly 64 lowercase hexadecimal characters;
- `apply` is exactly `true`; and
- `confirmation` is exactly
  `VOID_CONFIRM_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_V1`.

Unknown fields, accessors, arrays, alternate prototypes, false/missing apply, and
wrong confirmation fail before credential access or database activity.

The caller cannot provide a root directory, PostgreSQL configuration, Pool,
factory, client ID, worker ID, lease TTL, lease token, signer, broadcaster, RPC
URL, runtime stage, transaction material, or retry policy.

## Independent gates

Before PostgreSQL credential access, the composition requires all of:

```text
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=1
```

It then requires the existing full-runtime production policy and the exact
server-derived non-root runtime directory.

This source merge changes none of those environment values.

## Server-owned dispatcher authority

After the preflight gates pass, the function:

1. constructs the accepted systemd-credential-backed PostgreSQL factory;
2. performs the accepted read-only exact schema/ACL admission;
3. creates the canonical dispatcher store from that admitted Pool;
4. idempotently enqueues the selected durable prepared attempt using the fixed
   server client ID
   `void-buy-void-postgres-claimed-runtime-v1`;
5. claims that exact job using the fixed server worker ID
   `void-buy-void-postgres-worker-v1`;
6. receives the existing claim contract's random 128-bit lease token and fixed
   30-second lease;
7. closes the claim-side factory; and only then
8. passes the lease internally to the already accepted
   `runBuyVoidPaymentKeyedDispatcherPostgresAdmittedGuardedRuntimeV1`.

The lease capability is never returned from this composition.

## Fresh-child revalidation

The admitted child deliberately constructs a fresh production PostgreSQL
factory and repeats live schema admission before entering its existing guarded
worker.

That means one explicit future operator command pays for two admissions:

- one for enqueue/claim; and
- one for the admitted guarded worker.

This is intentional for v1. It preserves #1599's accepted worker bytes and gives
the claim boundary and effect boundary independent connection/admission
lifetimes. If the second factory cannot be established or the 30-second lease is
no longer valid, the child fails closed. There is no automatic retry.

A later optimization may prove a same-factory handoff, but it must be a separate
reviewed gate rather than silently widening this one.

## Failure behavior

Pre-worker configuration, schema, custody, enqueue, or claim failures return
`held`.

The claim-side factory is closed before child entry. A close failure stops the
composition and does not invoke the child; any issued lease is allowed to expire
under the existing fixed lease policy.

Once the admitted child is entered, its existing conservative effect accounting
is preserved. If child execution is uncertain after worker entry, the result is
`reconciliation_required`. A child factory-close failure is never reported as
a successful composition.

Dispatcher database mutation is reported conservatively after enqueue/claim
operations. Schema admission itself remains read-only.

## Authority boundary

```text
source_only_composition=true
runtime_route_mount=false
caller_attempt_id_selection_only=true
caller_root_dir_authority=false
caller_client_id_authority=false
caller_worker_id_authority=false
caller_lease_authority=false
caller_lease_ttl_authority=false
caller_postgres_authority=false
caller_pool_authority=false
caller_factory_authority=false
caller_signer_authority=false
caller_broadcaster_authority=false
caller_rpc_url_authority=false
server_enqueue_required=true
server_claim_required=true
claim_factory_closed_before_child=true
fresh_child_factory_revalidation_required=true
lease_capability_returned=false
raw_signed_transaction_returned=false
automatic_retry=false
runtime_route_mount=false
service_mutation=false
```

If this source function is later mounted and all independent enable/apply gates,
the exact command confirmation, durable custody, dispatcher state, production
PostgreSQL admission, runtime policy, signer credential, and Chain-2050
dependencies are valid, the already accepted admitted child may sign, broadcast,
and move funds. This PR does not mount or invoke that positive production path.

## Proof scope

The focused proof is hermetic and executes only pre-credential gates:

- malformed/extra caller input;
- missing explicit apply authority;
- claimed-runtime disabled;
- admitted-child disabled;
- full runtime disabled;
- full runtime apply disabled; and
- incomplete runtime production policy.

It also statically requires enqueue -> claim -> admitted-child ordering, fixed
server identities, no direct signer/broadcaster import, no scheduler, and no
route mount.

No PostgreSQL connection, credential read, Chain-2050 RPC, signing, broadcast,
service mutation, inventory/WC action, or funds action occurs in this proof.

## Next gate

After this source composition is exact-head green, the next gate is a dedicated
isolated PostgreSQL live fixture for the claimed path. It should prove a
synthetic durable custody record can be enqueued and claimed with the fixed
server identity, and that the admitted child reaches a deterministic pre-effect
HOLD without exposing the lease or bootstrapping signing/broadcast. Only after
that live composition is accepted should the action be mounted into the existing
loopback operator parent.
