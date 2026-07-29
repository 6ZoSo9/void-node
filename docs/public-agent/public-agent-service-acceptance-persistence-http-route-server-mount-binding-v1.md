# Public Agent Service Acceptance Persistence HTTP Route Server Mount Binding V1

## Purpose

This lane binds the sealed acceptance-persistence HTTP route handler to a server-owned exact-route registrar. It is a source-level mount adapter only. Merging it does not mount a production route, create a network listener, restart a node, or enable acceptance persistence.

## Prerequisite checkpoints

The implementation is cryptographically bound to four annotated checkpoints:

1. Acceptance materialization replay consumer V1.
2. Acceptance persistence adapter V1.
3. Acceptance persistence runtime binding V1.
4. Acceptance persistence HTTP route binding V1.

The bootstrap and later merge gates revalidate the 89-object source-evidence pack and all 24 prerequisite files on current `main`.

## Disabled-by-default controls

The server mount is disabled unless:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED=1
```

The sealed HTTP route itself must also be enabled. If either flag is disabled, no registrar method is inspected or called.

Applied mounting additionally requires this exact command confirmation:

```text
mountAcceptancePersistenceHttpRouteServerV1
```

Dry-run planning uses an empty confirmation and never inspects or mutates the registrar.

## Exact mount contract

The adapter plans exactly two server registrations:

```text
ALL /__void/operator/public-agent-service-acceptance-persistence-runtime-v1/status
ALL /__void/operator/public-agent-service-acceptance-persistence-runtime-v1/command
```

Using `ALL` preserves the sealed handler's exact `405` and `Allow` behavior. The route paths and handler identity are constants; the command cannot supply or override them.

The registrar boundary is atomic:

1. Inspect the exact two-route set once.
2. Reject conflicts.
3. Reject partial prior state.
4. Treat a complete exact prior mount as idempotent.
5. Register both routes in one atomic registrar call.

The registrar interface intentionally contains no `listen`, socket, port, TLS, proxy, authentication, wallet, settlement, or persistence methods.

## Handler authority

The mounted function forwards a normalized internal HTTP request to the sealed HTTP route binding with:

- the server-owned environment,
- the server-owned trusted-context provider,
- the sealed default route dependencies.

The mount adapter does not invoke the trusted-context provider itself. It does not read a persistence root, inspect replay state, or authorize acceptance. Those operations remain behind the separately disabled runtime and route layers.

## Explicit exclusions

This lane grants no authority for:

- production route activation,
- listener creation,
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
