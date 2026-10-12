# Public Agent Service Trusted Requester Acceptance Persistence HTTP Route Binding V1

## Purpose

This lane adds a framework-neutral, loopback-only HTTP handler around the
merged trusted-requester acceptance persistence runtime binding.

It defines two operator paths:

- `GET|HEAD /__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/status`
- `POST /__void/operator/public-agent-service-trusted-requester-acceptance-persistence-runtime-v1/command`

The lane does not mount either path into `src/index.ts`, create a listener,
modify a route registrar, install runtime configuration, deploy a runtime, or
invoke production persistence.

## Sealed dependency

The handler is pinned above the merged source-only runtime binding:

- merge `279fc9303c6652f57b44353af2d1b0e0c31826c7`;
- checkpoint
  `ckpt-public-agent-service-trusted-requester-acceptance-persistence-runtime-binding-v1-post-merge-exact-green-20260729T150731Z`; and
- runtime confirmation `persistTrustedRequesterAcceptanceRuntimeV1`.

The route forwards the exact server-owned trusted replay-plan input provider
as a separate in-process function. The JSON body never contains that provider
or its input.

## Disabled defaults

The route returns a generic `404` without validating the request, loading the
runtime configuration, invoking the runtime, or invoking the trusted input
provider unless the server sets:

`VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED=1`

This route flag is separate from the sealed runtime flag. Both must be enabled
by a later host integration before a confirmed command can persist anything.

The request-body bound defaults to 4 MiB and may be changed with:

`VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES`

This lane does not install either variable.

## Loopback containment

The pure handler requires a direct loopback peer address and rejects requests
that contain forwarding headers. A future host must supply the actual socket
peer address rather than a client-selected header.

Unknown paths and non-loopback requests return the same generic `404`.

## Status path

`GET` returns a no-store JSON status document. `HEAD` returns equivalent
representation headers with no body.

The document reports route and runtime enablement, the exact confirmation
required for apply, and the source-only posture. It does not expose the
operator persistence root.

No CORS header is emitted. Unsupported methods return `405` with an exact
`Allow` header.

## Command path

Only `POST` is accepted. The body must be uncompressed JSON with an optional
`Content-Length` that exactly matches the UTF-8 body length.

Compressed request bodies are rejected. Oversized bodies return `413`.
Malformed JSON and length mismatches return `400`.

The JSON body is passed as the sealed runtime command. It contains only:

- marker;
- version;
- `apply`;
- runtime confirmation; and
- `recorded_at_utc`.

The operator-owned persistence configuration and the server-owned trusted
replay-plan input provider remain outside the client command. The lower
composition and adapter confirmations remain internally injected.

## Response boundary

The handler maps runtime status as follows:

- disabled: `503`;
- planned: `200`;
- persisted: `201`;
- duplicate: `200`;
- recovered: `200`.

The response never echoes the trusted requester input or acceptance material.
The operator persistence root is replaced with a SHA-256 fingerprint. Runtime
errors are reduced to a generic code.

All responses use `Cache-Control: no-store`,
`Content-Type: application/json; charset=utf-8`, and
`X-Content-Type-Options: nosniff`.

## Proof

The workflow first reruns the complete trusted runtime-binding proof, including
its disposable-root acceptance persistence and atomic three-ID replay tests.
It then runs the route proof.

The route proof verifies:

- disabled short-circuiting;
- loopback-only containment;
- forwarding-header rejection;
- status and command method walls;
- JSON media type and encoding restrictions;
- body-size and content-length checks;
- exact runtime command forwarding;
- exact trusted provider function forwarding;
- no provider input in the JSON command;
- response redaction;
- runtime-status mapping; and
- source-only, unmounted posture.

## Authority

This lane adds a callable HTTP-shaped handler contract only. It creates no
listener, mounts no route, accepts no production network request, and performs
no production persistence or replay write.

It grants no payment authorization, payment execution, work authorization,
work dispatch, Work Credit write or settlement, wallet or signer access,
production signing, transaction broadcast, credential mutation, runtime
mutation, restart, deployment, or money movement.

A later integration lane must separately mount the handler into an existing
operator host, deploy with the route and runtime flags set to `0`, and prove
loopback containment and zero state mutation before any enabled canary.
