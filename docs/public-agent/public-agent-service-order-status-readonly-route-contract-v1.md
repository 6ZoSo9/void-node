# Public Agent Service Order Status Readonly Route Contract V1

## Purpose

The canonical order-status materializer defines what an external agent may see.
This lane defines how that object is represented by a future read-only HTTP GET
surface without registering a route, mounting a handler, reading persistence, or
changing a running service.

The route template is:

```text
/public-agent/services/v1/orders/:submission_id/status.json
```

This is a contract only. It does not register or expose the route.

## Source contract

The route source marker is
`VOID_PUBLIC_AGENT_SERVICE_ORDER_STATUS_READONLY_ROUTE_SOURCE_V1`.

The source contains:

- exact method `GET`;
- one exact route path;
- one observation timestamp;
- either a canonical order-status source object or `null`.

A non-null order-status source must use the same `submission_id` and observation
timestamp as the route request. Query strings, fragments, percent encoding,
trailing slashes, unsafe identifiers, non-GET methods, and unknown fields are
rejected.

## Responses

When a status source exists, the contract emits HTTP status `200`, `found=true`,
and the canonical order-status object.

When no status source exists, the contract emits HTTP status `404`,
`found=false`, `order_status=null`, and error code
`order_status_not_found`.

Both responses use:

```text
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
Allow: GET
```

The response is deterministic and includes `route_source_sha256` and a derived
`response_id`.

## Commands

Materialize:

```bash
node tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs \
  materialize route-source.json route-response.json
```

Verify:

```bash
node tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs \
  verify route-source.json route-response.json
```

Generate the canonical example:

```bash
node tools/void-public-agent-service-order-status-readonly-route-contract-v1.mjs \
  example examples/public-agent-service-order-status-readonly-route-contract-v1.example.json
```

## Safety boundary

This lane may read one provided JSON source and write one response JSON file. It
does not register an HTTP route, modify a server mount, read persistence, write
persistence, submit work, read tokens, select or authenticate providers, publish
or accept quotes, authorize or execute payment, authorize or dispatch work,
write Work Credits, mutate runtime state, restart a service, or deploy.
