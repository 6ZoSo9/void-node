# Public Agent Service Trusted Requester Acceptance Persistence HTTP Route Server-Mount Binding V1

## Purpose

This lane binds the sealed trusted-requester acceptance-persistence HTTP route
handler to a server-owned exact-route registrar. It is a source-level mount adapter only.

Merging it does not mount a production route, create a network listener,
modify an Express application, edit `src/index.ts`, restart a node, deploy a
runtime, enable the lower route, or enable acceptance persistence.

## Sealed dependency chain

The adapter sits above:

1. trusted-requester acceptance verification;
2. trusted-requester replay-plan verification;
3. trusted-requester persistence composition;
4. trusted-requester persistence runtime binding; and
5. trusted-requester persistence HTTP route binding.

The immediate dependency is merge
`13ce1a2bcc8f993e8b16bfba4baf443c61934e55` with checkpoint
`ckpt-public-agent-service-trusted-requester-acceptance-persistence-http-route-binding-v1-post-merge-exact-green-20260729T160346Z`.

## Disabled defaults and confirmation

The server mount is disabled unless:

`VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_SERVER_MOUNT_ENABLED=1`

The sealed HTTP route itself must also be enabled separately. If either layer
is disabled, no registrar inspection or registration method is called.

Applied mounting additionally requires this exact confirmation:

`mountTrustedRequesterAcceptancePersistenceHttpRouteServerV1`

Dry-run planning requires an empty confirmation and never inspects or mutates
the registrar.

## Exact mount contract

The adapter owns exactly two immutable route identities:

- `ALL /__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/status`
- `ALL /__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/command`

Using `ALL` preserves the lower sealed handler's exact `405` and `Allow`
behavior. The command cannot supply or override the method, path, handler
identity, environment, route configuration, trusted provider, or registrar.

Both routes use the same immutable handler identity:

`void.public-agent-service-trusted-requester-acceptance-persistence-http-route-server.v1`

The registrar boundary is atomic:

1. inspect both exact identities once;
2. reject unexpected identities or handlers;
3. reject partial mount state;
4. treat a complete exact prior mount as idempotent; and
5. register both routes in one atomic registrar call.

The registrar interface contains no listener, socket, port, TLS, proxy,
authentication, wallet, settlement, persistence-root, replay, or Work Credit
methods.

## Mounted handler boundary

The mounted function forwards the internal request to the sealed trusted HTTP
route binding with:

- the server-owned environment;
- the exact normalized request;
- the exact server-owned trusted replay-plan input provider; and
- the sealed route binding's default dependencies.

The mount adapter does not invoke the trusted replay-plan input provider while
mounting. It does not inspect trusted input, persistence configuration, replay
state, or acceptance material. The provider remains deferred until a mounted
handler is actually invoked.

## Proof

The workflow reruns the complete trusted runtime proof and trusted HTTP route
proof before the server-mount proof.

The mount proof verifies:

- disabled short-circuiting before command validation;
- exact confirmation before route-config loading or registrar access;
- lower-route-disabled short-circuiting;
- dry-run planning without registrar access;
- two exact `ALL` identities;
- partial-state and wrong-handler rejection;
- idempotent exact prior mounting;
- one atomic two-route registration;
- one shared handler function and identity;
- no listener access;
- server-owned environment forwarding;
- trusted-provider deferral;
- exact invocation of the sealed trusted route handler; and
- response preservation.

## Authority

The proof uses an in-memory registrar and may perform a source-level exact
two-route registration there. This is not a production route mount.

The lane grants no authority for production HTTP activation, listener
creation, live registrar integration, Express or `src/index.ts` mutation,
production HTTP submission, acceptance persistence, replay writes, payment,
work dispatch, Work Credit mutation, wallet or signer access, transaction
broadcast, credential mutation, restart, deployment, or money movement.

A later registrar-integration lane must separately adapt this sealed mount
contract to a server-owned revision-bound registry. A later live host lane must
still bind the actual socket peer address, preserve all flags disabled, and
prove zero production state mutation before any controlled canary.
