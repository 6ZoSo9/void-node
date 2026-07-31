# Public Agent Service Order Status Read-Only Request Handler V1

## Purpose

This contract composes the canonical order-status route parser, bounded filesystem source resolver, lifecycle materializer, and route-response materializer into one pure read-only request handler.

It accepts an explicit request description and configured source root. It returns a deterministic JSON handler result. It does not register or mount an HTTP route, create a listener, write source data, submit work, select or authenticate a provider, accept a quote, execute payment, dispatch work, write Work Credits, mutate runtime state, restart a service, or deploy.

## Input

```text
method=GET
path=/public-agent/services/v1/orders/<submission_id>/status.json
handled_at_utc=<explicit UTC timestamp>
root=<configured order-status source directory>
```

The handler never derives time from the system clock. `handled_at_utc` is required so repeated calls over the same bytes and inputs remain deterministic.

## Composition

```text
strict GET/path validation
  -> bounded source resolution
  -> canonical lifecycle materialization
  -> deterministic route response
  -> handler result with all authority false
```

For a found source, the nested route response preserves the source's `observed_at_utc`, as required by the route contract. For a missing source, the nested `404` response uses `handled_at_utc`.

## Output

The handler result includes:

- deterministic `handler_id`
- explicit request identity
- source-resolution metadata with no configured root path
- the canonical route response
- all authority flags set to `false`

The raw source object is not duplicated in the resolution metadata. A found source appears only through the canonical materialized `order_status` in the nested route response.

## CLI

```bash
node tools/void-public-agent-service-order-status-readonly-request-handler-v1.mjs \
  handle \
  --root /path/to/order-status-sources \
  --method GET \
  --path /public-agent/services/v1/orders/voidawsr1_example_order_status_0001/status.json \
  --handled-at 2030-01-01T00:00:05Z
```

The result is written to standard output. The tool has no output-file option and performs no writes.

## Non-authority

This contract is not a server registrar or deployment mechanism. A separate reviewed lane is required before any live route registration, server mount, listener, service restart, or deployment.
