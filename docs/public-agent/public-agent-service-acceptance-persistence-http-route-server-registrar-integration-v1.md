# Public Agent Service Acceptance Persistence HTTP Route Server Registrar Integration V1

## Purpose

This lane adapts the sealed two-route server-mount contract to a server-owned route registry with revision-bound compare-and-swap semantics. It remains a source-level integration adapter only. Merging it does not mount a production route, create or start a listener, restart a node, modify `src/index.ts`, or enable acceptance persistence.

## Prerequisite checkpoints

The implementation is cryptographically bound to five annotated checkpoints:

1. Acceptance materialization replay consumer V1.
2. Acceptance persistence adapter V1.
3. Acceptance persistence runtime binding V1.
4. Acceptance persistence HTTP route binding V1.
5. Acceptance persistence HTTP route server mount binding V1.

The bootstrap and later merge gates revalidate the 89-object source-evidence pack and all 30 prerequisite files on current `main`.

## Disabled-by-default controls

The registrar integration is disabled unless:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_REGISTRAR_INTEGRATION_ENABLED=1
```

The sealed server mount and sealed HTTP route must also be separately enabled. If any layer is disabled, the registry snapshot and compare-and-swap methods are not called.

Applied integration requires both exact confirmations:

```text
integrateAcceptancePersistenceHttpRouteServerRegistrarV1
mountAcceptancePersistenceHttpRouteServerV1
```

Dry-run integration requires both confirmation fields to be empty and does not read or mutate the registry.

## Registry contract

The server supplies only two registry operations:

1. `readExactRouteSnapshot()`
2. `compareAndSwapExactRouteSnapshot(expectedRevision, nextRoutes)`

The snapshot contains a bounded route table and an opaque revision. The adapter validates:

- a nonempty bounded revision,
- bounded route count,
- exact entry keys,
- uppercase method names,
- absolute paths without control characters,
- callable handlers,
- no duplicate method/path keys.

The interface contains no listener, socket, port, TLS, proxy, wallet, settlement, persistence-root, replay, or Work Credit methods.

## Compare-and-swap boundary

The registrar adapter performs one stable inspection:

1. Read the route snapshot exactly once.
2. Classify the canonical two-route set as free, exact, or conflicting.
3. Preserve every unrelated route.
4. Reject duplicate keys, conflicts, and partial prior state.
5. For a free route set, append exactly two canonical registrations.
6. Compare-and-swap the complete route table against the inspected revision.
7. Require an applied receipt with the exact previous revision, changed next revision, and exact final route count.

A stale revision fails without partial mutation. The registrar instance is one-shot: inspection cannot be repeated, and registration requires a prior matching inspection.

## Mounted handler boundary

The integration delegates the actual route identities, handler construction, confirmation, and route response behavior to the sealed server-mount binding. The trusted-context provider remains deferred until a mounted handler is invoked.

## Explicit exclusions

This lane grants no authority for:

- production route activation,
- network listener creation,
- external HTTP submission,
- production acceptance persistence,
- production replay writes,
- payment authorization or execution,
- work execution or dispatch,
- signing or transaction broadcast,
- Work Credit writes,
- wallet or treasury movement,
- service mutation or restart.

## Review sequence

1. Bootstrap the exact six-file lane.
2. Review and commit the six files only.
3. Push and open one exact pull request.
4. Require the full check floor.
5. Squash-merge under an exact head lock.
6. Re-run the detached proof.
7. Create an annotated post-merge checkpoint.
