# VOID Steam Read-Only Bridge Runtime v2

Marker: `VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2`

## State

This lane adds an **attachable Express route registrar** for the reviewed Steam
Read-Only Bridge v1. It remains source-only and creates no listener by itself.
No route is deployed or reachable until a separately reviewed node bootstrap
or composition lane registers it with an authenticated operator surface.

The source proof registers the routes only against a local fake Express app and
uses a mock Steam transport. It does not read credential material or contact
Steam.

## Routes

Both routes require an injected operator-authentication callback.

- `GET /__void/operator/steam-readonly-bridge-v2/status`
- `POST /__void/operator/steam-readonly-bridge-v2/request`

The request route additionally requires this exact body confirmation:

```json
{
  "confirmation": "steamReadonlyBridgeRouteFetchV2"
}
```

Missing or incorrect confirmation fails with HTTP 428 before the adapter or
transport can run.

## Credential-reference boundary

Runtime status uses non-secret metadata only:

```text
VOID_STEAM_WEB_API_KEY_REFERENCE_ID
VOID_STEAM_WEB_API_KEY_SOURCE_LOCATOR_SHA256
```

The reference ID must match:

```text
voidsteamref1_<64 lowercase hexadecimal characters>
```

The source-locator value must be a 64-character lowercase SHA-256 digest. It
binds the privately managed source location without publishing that location.

The actual v1 runtime credential remains:

```text
VOID_STEAM_WEB_API_KEY
```

The status route deliberately reports its state as `not_inspected`; it does not
read, hash, return, or prove the credential. Credential presence and validity
are revalidated only inside a separately confirmed request attempt. The
reference metadata does not authorize a live request.

Schema and non-secret example:

- `schemas/steam-readonly-bridge-credential-reference-v2.schema.json`
- `examples/steam-readonly-bridge-credential-reference-v2.example.json`

## Status states

- `disabled`
  - `VOID_STEAM_READONLY_BRIDGE_ENABLED` is not exactly `1`
- `credential_reference_hold`
  - bridge is enabled but reference metadata is absent or malformed
- `ready_for_confirmed_attempt`
  - bridge is enabled and reference metadata is structurally valid
  - this does **not** prove credential presence, validity, scope, or revocation
    state

## Redacted receipt

A successful authenticated and confirmed request returns authorized upstream
data and a separate receipt. The receipt includes:

- operation and target count
- request-binding SHA-256
- hashed credential-reference ID
- credential source-locator SHA-256
- bounded timing
- upstream status
- received byte count
- upstream response SHA-256

The receipt excludes:

- SteamIDs
- profile or game data
- the Steam API key
- any credential digest
- the raw credential-reference ID
- the private credential locator
- the upstream response body

The route performs no receipt or response persistence.

## Registration

A trusted node composition surface can call:

```ts
registerSteamReadonlyBridgeRuntimeV2(app, {
  authorize_operator: async (request) => {
    // Existing trusted operator-authentication boundary.
    return false;
  },
});
```

The authentication dependency is mandatory. There is no permissive default.

This lane does not modify `src/index.ts`, create a new server, or register
itself automatically. Actual node-bootstrap composition requires a separate
reviewed lane because it changes live route reachability.

## Request examples

Player summaries:

```json
{
  "confirmation": "steamReadonlyBridgeRouteFetchV2",
  "operation": "player_summaries",
  "steamids": ["76561198000000000"]
}
```

Visible owned games:

```json
{
  "confirmation": "steamReadonlyBridgeRouteFetchV2",
  "operation": "owned_games",
  "steamid": "76561198000000000",
  "include_appinfo": true,
  "include_played_free_games": false
}
```

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
  scripts/prove_steam_readonly_bridge_runtime_v2.ts

./node_modules/.bin/tsx \
  scripts/prove_steam_readonly_bridge_runtime_v2.ts
```

Expected marker:

```text
VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_GREEN
```

The proof verifies authentication, confirmation, disabled-by-default behavior,
credential-reference validation, v1 adapter reuse, mock-only transport,
redaction, no response persistence, and idempotent route registration.

## Authority boundary

This source lane does not:

- create or read a Steam API key
- invoke a private credential provider
- contact Steam
- register a live route
- create a listener
- deploy or restart a service
- scrape the Steam client
- write Work Credits
- access a wallet or signer
- sign, settle, broadcast a transaction, or move funds
