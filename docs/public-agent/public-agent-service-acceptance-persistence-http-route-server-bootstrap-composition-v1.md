# Public Agent Service Acceptance Persistence HTTP Route Server Bootstrap Composition V1

## Purpose

This lane binds the sealed acceptance-persistence HTTP route server registrar integration to the real Express server bootstrap boundary through a revision-bound Express route-registry adapter. It remains source-only and disabled by default. Merging it does not modify `src/index.ts`, mount a production route, create a listener, restart a node, or enable acceptance persistence.

## Source topology reviewed

The implementation is bound to source evidence captured from exact `main`:

```text
0eeec78e8cff6e6de3725e3c3bd8c8d786583aab
```

The reviewed server topology establishes:

- `src/index.ts` owns `const app = express();`
- `src/index.ts` exports the live app through `(globalThis as any).__void_http_app = app;`
- `src/index.ts` remains the only owner of `app.listen(...)`
- the general JSON body parser is mounted later in bootstrap
- the previous registrar integration is sealed at `7d5abc9c47e87e1363cc8dc4e0b1cee98d6512d7`

This lane does not edit the server entrypoint. A later, separately reviewed call-site lane is required before the composition can run inside production bootstrap.

## Prerequisite chain

The composition depends on the sealed chain:

1. Acceptance materialization replay consumer V1.
2. Acceptance persistence adapter V1.
3. Acceptance persistence runtime binding V1.
4. Acceptance persistence HTTP route binding V1.
5. Acceptance persistence HTTP route server mount binding V1.
6. Acceptance persistence HTTP route server registrar integration V1.

The default dependency is the exact sealed registrar-integration executor.

## Disabled-by-default controls

The composition is disabled unless:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_BOOTSTRAP_COMPOSITION_ENABLED=1
```

Applied composition also requires every upstream layer to be independently enabled:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED=1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED=1
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED=1
```

The acceptance persistence runtime and persistence adapter retain their own separate enablement and confirmation boundaries. This lane does not bypass them.

Applied composition requires three exact confirmations:

```text
bootstrapAcceptancePersistenceHttpRouteServerCompositionV1
integrateAcceptancePersistenceHttpRouteServerRegistrarV1
mountAcceptancePersistenceHttpRouteServerV1
```

Dry-run composition requires all three confirmation fields to be empty. Disabled and dry-run execution do not invoke the Express app provider, inspect the route stack, or install a dispatcher.

## Express registry adapter

The adapter exposes the two operations required by the sealed registrar integration:

1. `readExactRouteSnapshot()`
2. `compareAndSwapExactRouteSnapshot(expectedRevision, nextRoutes)`

The revision covers the inspected Express stack, route identities, handler identities, and adapter-managed state. The adapter:

- bounds route count and nesting depth;
- aggregates duplicate unmanaged method/path routes into stable identities;
- preserves unrelated route layers and their order;
- converts any unmanaged canonical path into a conflict identity;
- rejects stale revisions;
- requires exactly two canonical appended registrations;
- requires one exact mounted handler for both canonical paths;
- installs one dispatcher middleware with one `app.use(...)` call;
- rolls back the dispatcher layer if installation fails;
- treats an exact prior managed mount as idempotent.

The canonical managed paths remain:

```text
ALL /__void/operator/public-agent-service-acceptance-persistence-runtime-v1/status
ALL /__void/operator/public-agent-service-acceptance-persistence-runtime-v1/command
```

## Request and response bridge

The dispatcher is inert for unrelated paths and calls `next()` unchanged. For either canonical path it builds the sealed internal HTTP request from server-owned values:

- uppercase method;
- exact URL pathname;
- socket remote address;
- normalized request headers;
- bounded UTF-8 request body.

A pre-parsed body may be deterministically re-serialized, with `content-length` recomputed to match the exact forwarded bytes. The sealed route binding still owns loopback enforcement, method handling, media-type validation, command validation, runtime enablement, persistence confirmation, and response construction.

The dispatcher copies the sealed status, headers, and body to the Express response. It does not invoke the trusted-context provider itself.

## Listener boundary

The Express app interface contains `use(...)` and route-stack inspection only. It contains no listener method. The proof installs a throwing `listen` getter and verifies it is never accessed.

The lane grants no authority to:

- create, start, stop, or rebind a network listener;
- change a port, host, TLS, proxy, or firewall configuration;
- restart or mutate a service;
- call production HTTP endpoints;
- perform acceptance persistence or replay writes;
- authorize or execute payment;
- dispatch work;
- sign or broadcast transactions;
- write Work Credits;
- access a wallet, signer, treasury, or secret;
- move money.

## Proof coverage

The proof requires:

- disabled short-circuit before command validation;
- invalid enable-flag rejection;
- upstream-disabled short-circuit before app access;
- dry-run without app access;
- exact three-confirmation enforcement;
- app-provider invocation exactly once on applied mounting;
- trusted-context deferral;
- exact route-stack snapshot and compare-and-swap counts;
- unrelated-route preservation;
- stale-revision rejection without partial mutation;
- exact one-dispatcher installation;
- rollback after synthetic `app.use` failure;
- exact two-route managed state;
- idempotent repeat execution;
- unmanaged canonical conflict rejection;
- normalized request and reconstructed-body forwarding;
- sealed response preservation;
- unrelated request deferral;
- no listener access;
- no `src/index.ts` modification.

## Review sequence

1. Bootstrap the exact six-file lane from the sealed source-evidence pack.
2. Review and commit only the six files.
3. Push and open one exact pull request.
4. Require the full check floor.
5. Squash-merge under an exact head lock.
6. Re-run the detached proof.
7. Create an annotated post-merge checkpoint.
8. Only then evaluate a separate `src/index.ts` call-site integration lane.
