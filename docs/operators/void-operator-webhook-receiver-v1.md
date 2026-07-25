# VOID operator webhook receiver V1

The receiver is a VOID-controlled, loopback-only authenticated endpoint for
candidate notification payloads produced by the Buy VOID operator webhook
delivery lane.

## Boundary

- Binds only to `127.0.0.1:4186` by default.
- Accepts only exact `POST /__void/operator-notifications/v1/candidate`.
- Requires an exact bearer token read from an operator-local mode-`0600`
  regular non-symlink file.
- Requires `application/json` and an exact `x-void-payload-sha256` binding.
- Enforces a 64 KiB request limit and a bounded request timeout.
- Writes one append-once local receipt per notification ID.
- Identical duplicates are acknowledged without another receipt.
- Conflicting payloads for the same notification ID return HTTP 409.
- Does not arm or apply a candidate stage.
- Does not access wallets, sign, broadcast, reserve inventory, mutate network
  state, or move money.

## Public composition route

The composition gateway contains a disabled-by-default exact route:

`POST /__void/operator-notifications/v1/candidate`

It becomes available only when
`VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM=http://127.0.0.1:4186` is configured
for the gateway service. The gateway does not validate the secret value. It
requires a bearer header, verifies the raw body SHA-256 header, applies the
same body limit, disables redirects, and forwards only the exact route.

## Source-only posture

This lane does not install or enable the receiver service, does not install the
gateway drop-in, does not read the live bearer token, and does not expose the
route publicly. Deployment and the first authenticated canary are separate
reviewed lanes.
