# Public Agent Service Order Status Read-Only HTTP Integration V1

## Purpose

This lane mounts the canonical order-status route registrar into the existing VOID Express application behind an explicit, disabled-by-default environment gate.

The integration reuses the existing HTTP listener. It does not create another server, bind another port, restart a service, deploy, or write configuration.

## Environment

The route is disabled unless this value is exactly `1`:

```text
VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_HTTP_INTEGRATION_V1_ENABLED=1
```

When enabled, an absolute source root is required:

```text
VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_SOURCE_ROOT=/absolute/path/to/order-status
```

An optional bounded byte limit may be supplied:

```text
VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_MAX_BYTES=1048576
```

The maximum accepted value is 1 MiB, matching the canonical source resolver.

## Route

When explicitly enabled, the integration mounts exactly:

```text
GET /public-agent/services/v1/orders/:submission_id/status.json
```

When disabled, the application provider is not called and no route is mounted.

## Express adapter

The integration supplies an abstract registrar to the canonical registrar. The abstract handler is translated into the existing Express request and response interfaces.

The adapter:

- forwards only the request method and original path;
- writes exactly one status, header set, and JSON body;
- sets `Cache-Control: no-store`;
- keeps source-root paths out of public output;
- returns a sanitized `500 order_status_unavailable` response if the pure handler refuses a request or source;
- refuses duplicate mounts on the same Express application;
- marks the application as mounted only after registration succeeds.

## Startup callsite

`src/index.ts` invokes the integration after the existing acceptance-persistence bootstrap callsite and before early/minimal boot branching.

The callsite always executes, but the integration is inert unless the exact enable flag is present.

The live clock is explicitly injected by the server callsite. Proofs inject a fixed clock.

## Authority boundary

When disabled, the integration has no route-registration, source-read, or server-mount authority.

When explicitly enabled at service startup, it may:

- register one read-only GET route on the existing application;
- read one bounded status source per matching request.

It never gains authority to:

- create a network listener;
- write source data;
- perform authenticated submission;
- read token bytes;
- select or authenticate providers;
- accept quotes;
- execute payment;
- dispatch work;
- write Work Credits;
- perform general runtime mutation;
- restart a service;
- deploy.

This lane changes repository code only. It does not enable the environment flag, write a source root, restart a node, or deploy.
