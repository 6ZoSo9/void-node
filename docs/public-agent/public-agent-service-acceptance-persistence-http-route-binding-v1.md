# VOID Public Agent Service Acceptance Persistence HTTP Route Binding V1

## Purpose

This lane adds a framework-neutral, loopback-only HTTP handler around the
sealed acceptance-persistence runtime binding.

It defines two operator paths:

- `GET|HEAD /__void/operator/public-agent-service-acceptance-persistence-runtime-v1/status`
- `POST /__void/operator/public-agent-service-acceptance-persistence-runtime-v1/command`

The lane does **not** mount either path into `src/index.ts`, create a listener,
install a systemd drop-in, provision a persistence directory, enable the
runtime, or invoke production persistence.

## Sealed dependencies

The handler is pinned to:

- source-evidence pack SHA-256
  `4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec`;
- transition merge `525e1c8f6200f1a590de42270d5a08ad21c6281b` and checkpoint
  `ckpt-public-agent-service-acceptance-materialization-replay-consumer-v1-pr800-post-merge-exact-green-525e1c8f6200`;
- persistence-adapter merge `b6354ff1c8b15a51e3f6379077982355b5a4b258` and checkpoint
  `ckpt-public-agent-service-acceptance-persistence-adapter-v1-pr804-post-merge-exact-green-b6354ff1c8b1`;
- runtime-binding merge `ceef7f7ebd5ead737b08f517cddefa8c0d867efe` and checkpoint
  `ckpt-public-agent-service-acceptance-persistence-runtime-binding-v1-pr809-post-merge-exact-green-ceef7f7ebd5e`.

## Disabled-by-default route

The handler returns a generic `404` without validating the request or loading
runtime configuration unless the server sets:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_ROUTE_ENABLED=1
```

This route flag is separate from the sealed runtime flag. Both must be enabled
before a command can reach persistence.

The server may bound JSON request bytes with:

```text
VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_HTTP_MAX_BODY_BYTES=4194304
```

The accepted range is 1 KiB through 16 MiB.

## Loopback containment

Only server-supplied peer addresses `127.0.0.1`, `::1`, and
`::ffff:127.0.0.1` are accepted. Requests carrying `Forwarded`,
`X-Forwarded-For`, or `X-Real-IP` are hidden behind the same generic `404`.

This pure handler trusts the future host integration to supply the socket peer
address. It does not trust client headers as connection identity.

## Status route

`GET` returns a no-store JSON status document. `HEAD` returns identical
representation headers with no body. The document reports route/runtime
posture without exposing the persistence root.

No CORS header is emitted. Unsupported methods return `405` with
`Allow: GET, HEAD`.

## Command route

The command route accepts only `POST` with `application/json` or
`application/json; charset=utf-8`. Compressed request bodies are rejected.
Optional `Content-Length` must exactly match the UTF-8 body length.

The body is passed as the sealed runtime command. The client cannot provide the
runtime configuration, persistence root, replay-state snapshot, trusted
catalog/order/quote context, adapter confirmation, recovery policy, or
generation bound.

The route maps runtime status as follows:

- `disabled` -> `503`;
- `planned` -> `200`;
- `persisted` -> `201`;
- `duplicate` -> `200`;
- `recovered` -> `200`.

Runtime errors are reduced to `command_rejected`; raw error text is not
returned.

## Response redaction

The response never echoes the signed requester-authentication input or
acceptance draft. The server persistence path is replaced with a SHA-256
fingerprint. All responses use `Cache-Control: no-store` and
`X-Content-Type-Options: nosniff`.

## Authority boundary

The source handler provides a future loopback HTTP command-binding capability.
This lane itself creates no listener, mounts no production route, accepts no
external network request, and performs no production persistence or replay
write.

It grants no payment authorization, payment execution, execution
authorization, work dispatch, credential mutation, provider selection, wallet
access, production signing, transaction broadcast, Work Credit write, runtime
mutation, service change, or money movement.

A later integration lane must separately mount the handler into the existing
operator host, deploy with both route and runtime flags set to `0`, and prove
loopback route containment and zero state mutation before any enabled canary.
