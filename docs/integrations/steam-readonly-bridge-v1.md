# VOID Steam Read-Only Bridge v1

Marker: `VOID_STEAM_READONLY_BRIDGE_V1`

## State

This lane is **source-only**, **disabled by default**, and **not attached to
`src/index.ts`**. It introduces a bounded server-side adapter and a manual
operator probe. It does not deploy, restart a node, open a listener, create a
Steam API key, or perform a live request during proof.

## Purpose

Allow a VOID operator to make narrowly allowlisted, read-only Steamworks Web
API requests from a trusted backend without exposing the API key in URLs,
logs, receipts, or public node status.

Supported v1 operations:

- `player_summaries`
  - `ISteamUser/GetPlayerSummaries/v2`
  - maximum 100 validated SteamID64 values
- `owned_games`
  - `IPlayerService/GetOwnedGames/v1`
  - returns only information Steam makes visible to the API caller

Official Steamworks references:

- https://partner.steamgames.com/doc/webapi_overview
- https://partner.steamgames.com/doc/webapi_overview/auth
- https://partner.steamgames.com/doc/webapi/ISteamUser
- https://partner.steamgames.com/doc/webapi/IPlayerService

## Security boundary

The bridge:

- permits only `https://partner.steam-api.com`
- permits only the two exact GET paths listed above
- sends the key in the `x-webapi-key` header, never the query string
- refuses operation unless explicitly enabled
- requires an exact manual confirmation token for the operator probe
- rejects redirects, non-JSON responses, invalid SteamID64 values, duplicates,
  oversized responses, and timeouts
- does not persist upstream response bodies
- does not scrape the local Steam client
- does not read Steam passwords, cookies, chat, inventories, purchases, or
  private messages
- cannot write to Steam, trade, purchase, alter achievements, move funds, or
  write Work Credits
- has no automatic polling or background loop

Steam responses may still contain personal or activity information. Treat
operator output as private and do not publish it without the Steam user's
consent.

## Configuration

No configuration is required to inspect status:

```bash
npx tsx scripts/steam_readonly_bridge_probe_v1.ts status
```

A live read requires all of the following:

```bash
export VOID_STEAM_READONLY_BRIDGE_ENABLED=1
export VOID_STEAM_WEB_API_KEY='set-private-key-outside-the-repository'
```

Optional bounds:

```bash
export VOID_STEAM_READONLY_TIMEOUT_MS=5000
export VOID_STEAM_READONLY_MAX_RESPONSE_BYTES=1048576
```

The API key must never be committed, pasted into issue or PR text, included in
a receipt, or stored in a public environment file.

## Manual calls

Player summaries:

```bash
npx tsx scripts/steam_readonly_bridge_probe_v1.ts \
  player-summaries \
  --steamids 76561198000000000 \
  --confirm steamReadonlyBridgeFetch
```

Owned games:

```bash
npx tsx scripts/steam_readonly_bridge_probe_v1.ts \
  owned-games \
  --steamid 76561198000000000 \
  --confirm steamReadonlyBridgeFetch
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
  scripts/steam_readonly_bridge_probe_v1.ts \
  scripts/prove_steam_readonly_bridge_v1.ts

./node_modules/.bin/tsx scripts/prove_steam_readonly_bridge_v1.ts
```

Expected terminal marker:

```text
VOID_STEAM_READONLY_BRIDGE_V1_GREEN
```

The proof uses a local mock transport. It makes no Steam request and validates
that the API key is absent from the URL and status output.

The repository-wide `typecheck:scripts` command is deliberately not used as
the lane gate. It covers the entire historical `scripts/` tree, including
unrelated scripts outside this five-file change. The scoped TypeScript command
above compiles both new bridge scripts and their imported adapter directly.

## Deliberately deferred

A later lane may add an authenticated VOID HTTP route, opt-in Steam identity
linking, signed evidence receipts, and Work Credit task definitions. Those
features are not present or authorized by v1.
