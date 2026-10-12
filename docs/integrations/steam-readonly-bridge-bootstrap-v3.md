# VOID Steam Read-Only Bridge Bootstrap v3

Marker: `VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3`

## State

This lane attaches the merged Steam Read-Only Bridge Runtime v2 registrar to
`src/index.ts`. The source composition registers two private operator routes,
but this lane does not deploy or restart the node. No route becomes reachable
on a running service until a separately authorized deployment and restart.

The bridge remains disabled unless all later activation requirements are
satisfied. Source attachment does not enable Steam access.

## Mounted routes

- `GET /__void/operator/steam-readonly-bridge-v2/status`
- `POST /__void/operator/steam-readonly-bridge-v2/request`

The bootstrap callsite is deliberately placed after the existing
`VOID public sensitive route guard v1`, so `/__void/operator/*` remains
remote-blocked by default. The Steam bootstrap additionally requires its own
application-layer operator authentication and does not rely on locality alone.

## Operator authentication

Every Steam route request must satisfy both conditions:

1. `request.socket.remoteAddress` is exactly one of:
   - `127.0.0.1`
   - `::1`
   - `::ffff:127.0.0.1`
2. The request provides `Authorization: Bearer <token>`, and the SHA-256 of that
   token matches the lowercase 64-character digest in:

```text
VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256
```

The raw operator token is not committed, returned, logged, or persisted by this
module. The expected value is a digest only. Missing or malformed hash metadata,
missing bearer authorization, a wrong token, or a non-loopback socket all fail
closed with HTTP 401 through Runtime v2.

This lane does not generate or install an operator token. Token provisioning and
service configuration are later private operator actions requiring separate
review and authorization.

## Request body boundary

The node callsite injects a route-specific Express JSON parser only for the
request route:

```text
content type: application/json
maximum body: 16 KiB
strict JSON: true
```

The v2 exact confirmation requirement remains unchanged:

```json
{
  "confirmation": "steamReadonlyBridgeRouteFetchV2"
}
```

## Disabled state

Source attachment does not set any activation environment variables. With the
normal default environment, an authenticated local status request reports the
bridge as `disabled`. An authenticated and confirmed request returns
`bridge_disabled` without invoking the Steam transport.

The later live-read activation still requires separate private provisioning of:

```text
VOID_STEAM_READONLY_BRIDGE_ENABLED=1
VOID_STEAM_WEB_API_KEY_REFERENCE_ID=voidsteamref1_<64 lowercase hex>
VOID_STEAM_WEB_API_KEY_SOURCE_LOCATOR_SHA256=<64 lowercase hex>
VOID_STEAM_WEB_API_KEY=<private Steam Web API key>
VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256=<64 lowercase hex>
```

None of those values are created, installed, read from a live environment, or
used against Steam by this lane.

## Proof

```bash
npm run typecheck

./node_modules/.bin/tsc \
  --noEmit \
  --target ES2022 \
  --lib ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --strict \
  --esModuleInterop \
  --skipLibCheck \
  --types node \
  src/integrations/steam_readonly_bridge_v1.ts \
  src/http/steam_readonly_bridge_runtime_v2.ts \
  src/http/steam_readonly_bridge_bootstrap_v3.ts \
  scripts/prove_steam_readonly_bridge_bootstrap_v3.ts

./node_modules/.bin/tsx \
  scripts/prove_steam_readonly_bridge_runtime_v2.ts

./node_modules/.bin/tsx \
  scripts/prove_steam_readonly_bridge_bootstrap_v3.ts
```

Expected markers:

```text
VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_GREEN
VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_GREEN
```

The proof uses a fake Express app, synthetic operator tokens, and a transport
that must remain unused while disabled. It verifies:

- exact source callsite placement after the sensitive-route guard
- loopback socket enforcement
- SHA-256 bearer-token authentication
- timing-safe digest comparison
- bounded route-specific JSON parsing
- idempotent bootstrap registration
- authenticated status reachability in disabled state
- wrong-token and remote-socket refusal
- confirmed request refusal while disabled
- zero Steam transport calls

## Authority boundary

This source lane does not:

- generate, inspect, install, log, or persist an operator token
- create, inspect, install, or use a Steam API key
- contact Steam
- create a listener
- deploy or restart a service
- modify service units or runtime environment files
- persist Steam responses or receipts
- scrape the Steam client
- write Work Credits
- access a wallet or signer
- sign, settle, broadcast a transaction, or move funds
