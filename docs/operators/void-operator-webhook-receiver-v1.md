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

## User-manager and Node.js compatibility

The receiver is installed as a systemd **user** service. Its source unit uses
`PrivateDevices=false` because enabling `PrivateDevices` performs capability
bounding-set operations that are unavailable in the unprivileged user manager on
the supported deployment host.

The source unit also uses `MemoryDenyWriteExecute=false`. Node.js V8 requires
executable memory for normal runtime operation, and Node.js 22's bundled Undici
requires WebAssembly. `MemoryDenyWriteExecute=true` terminates V8, while
`--jitless` removes WebAssembly and prevents Undici from initializing.

This is a narrow runtime-compatibility exception. The receiver remains loopback
only and preserves `NoNewPrivileges=true`, `PrivateTmp=true`,
`ProtectSystem=strict`, `ProtectHome=read-only`, explicit `ReadWritePaths`,
restricted address families, `RestrictSUIDSGID=true`, `LockPersonality=true`,
and `UMask=0077`. Bearer authentication, the request body limit, payload digest
binding, and append-once receipts remain unchanged.

Marker: `VOID_OPERATOR_WEBHOOK_RECEIVER_USER_MANAGER_NODE_COMPAT_V1`

## Live public ingress ownership correction

The production ingress for the exact operator-notification route is
`void-ai-agent-public-gateway-v1.service`, implemented by
`ops/void-ai-agent-public-gateway-v1.mjs`. The public-app composition source is
not the installed target for this route.

The route remains disabled unless
`VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM=http://127.0.0.1:4186` is configured
for that AI-agent gateway service. The gateway accepts only exact authenticated
`POST /__void/operator-notifications/v1/candidate`, binds the body to
`x-void-payload-sha256`, enforces bounded request and response sizes, strips
redirect and cookie headers, and exposes no generic mutation, wallet, signing,
transaction-broadcast, RPC-mutation, or money-movement authority.

Marker: `VOID_OPERATOR_WEBHOOK_RECEIVER_AI_GATEWAY_SOURCE_INTEGRATION_V1`
