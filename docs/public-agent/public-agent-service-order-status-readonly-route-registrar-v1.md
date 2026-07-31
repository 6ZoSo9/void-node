# Public Agent Service Order Status Read-Only Route Registrar V1

## Purpose

This adapter binds the canonical pure order-status request handler to an abstract GET-route registrar. It proves the registration and response-write boundary without importing a web framework, mounting a live server, opening a network listener, restarting a service, or deploying.

## Abstract interfaces

The registrar must expose:

```text
registrar.get(routePath, asyncHandler)
```

The response object supplied to the registered handler must expose:

```text
responder.write({
  status_code,
  headers,
  body
})
```

The adapter registers exactly:

```text
GET /public-agent/services/v1/orders/:submission_id/status.json
```

A caller must inject:

- an absolute, configured source root;
- a deterministic `handledAtUtcForRequest(request)` function;
- optionally, a bounded source-byte limit.

The adapter never derives time from the system clock.

## Guards

The adapter:

- refuses duplicate registration on the same registrar object;
- adds the registrar to its registration set only after `registrar.get` succeeds;
- validates request and responder interfaces;
- refuses reusing a completed response object;
- emits exactly one deterministic response write;
- preserves the pure handler response as the HTTP body;
- keeps the configured source root out of registration and invocation receipts.

## Authority boundary

The adapter can perform one abstract in-process route registration against a caller-supplied registrar. It has no authority to:

- mount a live server;
- create or bind a network listener;
- write source data;
- submit authenticated work;
- read token bytes;
- select or authenticate a provider;
- accept a quote;
- execute payment;
- dispatch work;
- write Work Credits;
- mutate runtime state;
- restart a service;
- deploy.

A separate reviewed integration lane is required before this adapter may be mounted into a live VOID HTTP server.
