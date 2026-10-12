# Public Agent Service Trusted Requester Acceptance Persistence HTTP Route Server Bootstrap Composition V1

## Purpose

This lane binds the sealed trusted-requester server registrar integration to an
injected Express-like application through a revision-bound Express route-registry adapter. It remains source-only and disabled by default.

Merging it does not modify `src/index.ts`, invoke a live bootstrap callsite,
mount a production HTTP route, create or start a listener, restart a node,
deploy a runtime, or enable acceptance persistence.

## Sealed dependency chain

The composition sits above:

1. trusted-requester acceptance verification;
2. trusted-requester replay-plan verification;
3. trusted-requester persistence composition;
4. trusted-requester persistence runtime binding;
5. trusted-requester persistence HTTP route binding;
6. trusted-requester persistence HTTP route server-mount binding; and
7. trusted-requester persistence HTTP route server registrar integration.

The immediate dependency is merge
`f40554e4bcfc09f01e9eca131de78c13eb4c7638` with checkpoint
`ckpt-public-agent-service-trusted-requester-acceptance-persistence-http-route-server-registrar-integration-v1-post-merge-exact-green-20260729T181451Z`.

## Disabled defaults and confirmations

The composition is disabled unless:

`VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED=1`

Applied composition requires all three exact confirmations:

`bootstrapTrustedRequesterAcceptancePersistenceHttpRouteServerCompositionV1`

`integrateTrustedRequesterAcceptancePersistenceHttpRouteServerRegistrarV1`

`mountTrustedRequesterAcceptancePersistenceHttpRouteServerV1`

The registrar integration, server mount, and HTTP route retain independent
enablement flags. If any of those layers is disabled, the Express app provider
is not invoked.

Dry-run composition requires all three confirmation fields to be empty. It
does not invoke the app provider, inspect the route stack, read a registry
snapshot, perform compare-and-swap, or install middleware.

## Express registry adapter

The source-level adapter exposes exactly the two operations required by the
sealed registrar integration:

1. `readExactRouteSnapshot()`
2. `compareAndSwapExactRouteSnapshot(expectedRevision, nextRoutes)`

The adapter scans a bounded Express-like route stack and produces an opaque
SHA-256 revision. It:

- bounds route count and stack nesting;
- aggregates duplicate unmanaged method/path routes into one stable identity;
- converts any unmanaged canonical path into a conflict identity;
- preserves unrelated route layers and their order;
- preserves the complete prior snapshot as the compare-and-swap prefix;
- requires exactly two canonical `ALL` additions;
- requires one exact shared mounted handler;
- rejects stale revisions;
- installs exactly one dispatcher middleware;
- rolls the stack back after a synthetic `app.use` failure; and
- treats an exact prior managed mount as idempotent.

The adapter state is retained per application object so repeat execution can
recognize the exact prior managed mount without adding another dispatcher.

## Dispatcher boundary

The dispatcher is inert for unrelated paths and calls `next()` unchanged. For
either canonical path it builds the sealed internal HTTP request from
server-owned request values:

- uppercased method;
- normalized path without a query string;
- socket or connection remote address;
- normalized lowercase headers; and
- an exact string body with recomputed `content-length`.

A pre-parsed body is deterministically serialized as JSON. The sealed route
handler still owns loopback enforcement, method walls, media-type validation,
command validation, runtime enablement, persistence confirmation, and response
construction.

The trusted replay-plan input provider remains deferred until a mounted route
handler is actually invoked.

## Source-level proof authority

The proof uses a fake in-memory Express-like application. It may invoke the app
provider, inspect the fake route stack, perform source-level snapshot and
compare-and-swap operations, and install a dispatcher into that fake app.

Those proof operations are not a production HTTP route mount, live route
registry integration, live Express application modification, or bootstrap
callsite integration.

The app interface contains `use(...)` and route-stack inspection only. It does
not contain listener authority. The proof installs a throwing `listen` getter
and verifies it is never accessed.

## Proof

The workflow reruns the complete trusted runtime, HTTP route, server-mount, and
registrar-integration proofs before the bootstrap-composition proof.

The bootstrap proof verifies:

- environment-disabled default;
- disabled short-circuit before command validation and app-provider access;
- all three confirmations before app-provider access;
- registrar-disabled, mount-disabled, and route-disabled short-circuiting;
- dry-run operation without app-provider or registry access;
- one app-provider invocation on applied composition;
- one route-stack snapshot;
- duplicate unmanaged route aggregation;
- unrelated route-layer preservation;
- exact expected-revision compare-and-swap;
- one compare-and-swap call;
- one dispatcher installation;
- exact rollback after synthetic installation failure;
- stale-revision rejection without partial mutation;
- exactly two managed routes;
- idempotent repeat execution;
- unmanaged canonical-route conflict rejection;
- trusted-provider deferral;
- mounted response preservation;
- unrelated request deferral;
- no listener access; and
- no `src/index.ts` modification.

## Authority

This lane grants no authority to:

- invoke a live server bootstrap callsite;
- create, start, stop, or rebind a network listener;
- claim that a production HTTP route is mounted;
- modify a live Express application;
- install or enable production runtime configuration;
- submit production HTTP requests;
- persist production acceptances or replay transitions;
- authorize or execute payment;
- authorize or dispatch work;
- write or settle Work Credits;
- access wallets, keys, mnemonics, or signers;
- sign or broadcast transactions;
- issue or change credentials;
- restart or deploy a node; or
- move money.

A later live call-site lane must separately add the minimum reviewed call from
the real server bootstrap after application creation and before listener
startup. That lane must keep every flag disabled and prove zero production
mutation before any controlled canary.
