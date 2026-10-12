# Typed Home Adapter Contract

## Endpoint

`GET /__void/ui/wave2/home.json`

The endpoint is loopback-only, accepts only GET and HEAD, sends `Cache-Control:
no-store`, and has no request parameters.

## Fixed sources

The adapter reads exactly four local routes:

- `/health`
- `/__void/ready.json`
- `/blocks/latest/number2.json`
- `/p2p/peers`

`VOID_UI_HOME_SOURCE_BASE` may override the source only when it is plain HTTP
on `127.0.0.1`, `localhost`, or `::1`, with no credentials, query, fragment,
or non-root path.

## Response groups

- `node`: hostname, label, and known node role
- `network`: health, readiness, chain head, and peer count
- `account`: explicitly not selected in Wave 2
- `balances`: explicitly unavailable in Wave 2
- `sources`: bounded source status and parsed JSON
- `boundaries`: all mutation and money-movement capabilities false

A source failure produces a degraded snapshot. It does not cause the client to
reuse invented values.
