# Public Agent Service Trusted Requester Acceptance Persistence HTTP Route Server Registrar Integration V1

## Purpose

This lane adapts the sealed trusted-requester two-route server-mount contract
to a server-owned route registry with revision-bound compare-and-swap semantics.
It is a source-level integration adapter only.

Merging it does not mount a production route, create or start a listener,
connect to a live route registry, modify an Express application or
`src/index.ts`, restart a node, deploy a runtime, enable the lower route or
mount flags, or enable acceptance persistence.

## Sealed dependency chain

The adapter sits above:

1. trusted-requester acceptance verification;
2. trusted-requester replay-plan verification;
3. trusted-requester persistence composition;
4. trusted-requester persistence runtime binding;
5. trusted-requester persistence HTTP route binding; and
6. trusted-requester persistence HTTP route server-mount binding.

The immediate dependency is merge
`9213363122fd9ffba1e790f74110d27ff749ba7b` with checkpoint
`ckpt-public-agent-service-trusted-requester-acceptance-persistence-http-route-server-mount-binding-v1-post-merge-exact-green-20260729T165438Z`.

## Disabled defaults and confirmations

The registrar integration is disabled unless:

`VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED=1`

The sealed server mount and sealed HTTP route must also be enabled separately.
If any layer is disabled, the registry snapshot and compare-and-swap methods
are not called.

Applied integration requires both exact confirmations:

`integrateTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1`

`mountTrustedRequesterAcceptancePersistenceHttpRouteServerV1`

Dry-run integration requires both confirmation fields to be empty and does not
read or mutate the registry.

## Registry contract

The server supplies only two operations:

1. `readExactRouteSnapshot()`
2. `compareAndSwapExactRouteSnapshot(expectedRevision, nextRoutes)`

The snapshot contains a bounded route table and an opaque nonempty revision.
The adapter validates:

- bounded revision and route count;
- exact entry keys;
- absolute paths;
- bounded method, path, and handler identity strings;
- callable handlers; and
- unique method-and-path keys.

The registry interface contains no listener, socket, port, TLS, proxy,
authentication, wallet, settlement, persistence-root, replay, or Work Credit
methods.

## Compare-and-swap boundary

The adapter performs one stable inspection:

1. Read the route snapshot exactly once.
2. Classify the canonical two-route set as free, exact, partial, or conflicting.
3. Preserve every unrelated route.
4. Reject duplicate route keys.
5. Reject partial or conflicting canonical state.
6. Treat a complete exact prior mount as idempotent.
7. For a free route set, append exactly two canonical registrations.
8. Compare-and-swap the complete route table against the inspected revision.
9. Require an applied receipt with the exact previous revision, changed next
   revision, and exact final route count.

A stale revision fails without partial mutation. The registrar instance is
one-shot: inspection cannot be repeated, and registration requires a prior
matching inspection.

## Mounted handler boundary

The integration delegates route identity validation, handler construction,
mount confirmation, lower-route gating, and response behavior to the sealed
trusted server-mount binding.

The trusted replay-plan input provider remains deferred until a mounted handler
is invoked. The integration does not inspect trusted input, persistence
configuration, replay state, or acceptance material.

## Proof

The workflow reruns the complete trusted runtime proof, trusted HTTP route
proof, and trusted server-mount proof before the registrar-integration proof.

The integration proof verifies:

- disabled short-circuiting before command validation, mount-config loading,
  or registry access;
- integration and mount confirmations before mount-config loading or registry
  access;
- mount-disabled and route-disabled short-circuiting;
- dry-run operation without registry access;
- canonical identity enforcement;
- one snapshot read;
- duplicate-key rejection;
- preservation of unrelated routes;
- exact expected-revision and final-route-count CAS binding;
- one compare-and-swap call;
- stale-revision rejection without partial mutation;
- one-shot inspection;
- registration requiring prior inspection;
- idempotent exact prior mounting;
- partial and conflicting state rejection;
- exact delegation to the sealed mount contract;
- trusted-provider deferral;
- mounted response preservation; and
- no listener access.

## Authority

The proof uses an in-memory registry and may perform a source-level snapshot
read and compare-and-swap there. This is not a production route mount or live
route-registry integration.

The lane grants no authority for production HTTP activation, listener
creation, live registry mutation, Express or `src/index.ts` modification,
production HTTP submission, acceptance persistence, replay writes, payment,
work dispatch, Work Credit mutation, wallet or signer access, transaction
broadcast, credential mutation, restart, deployment, or money movement.

A later live-host integration lane must separately bind this sealed adapter to
the real server-owned registry and socket peer identity. That lane must preserve
all flags disabled and prove zero production state mutation before any
controlled canary.
