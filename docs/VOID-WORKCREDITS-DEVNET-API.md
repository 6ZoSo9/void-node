# VOID / WorkCredits — Devnet Pool API

This doc defines the canonical API contract for the WorkCredits devnet WC/VOID pool.
Obelisk Wallet and any Trading View UI MUST treat this as the source of truth.

---

## 1. HTTP Endpoint

GET /workcredits/devnet/pool

JSON response example (pretty-printed for clarity):

{
  "ok": true,
  "chain": "devnet",
  "wcPerVoid": "1",
  "voidReserveRaw": "100000000000000000000",
  "wcReserveRaw": "100000000000000000000",
  "liquidity2AssetRaw": "200000000000000000000",
  "updatedAt": 1764963228.447,
  "source": "prometheus:void-workcredits-devnet"
}

### Field semantics

ok (boolean)
  - true if the exporter + Prometheus + HTTP proxy are all healthy enough to serve data.
  - UI SHOULD treat ok=false as a hard error and show a red state.

chain (string)
  - Logical network identifier. For now: "devnet".

wcPerVoid (string, decimal)
  - Price of Work Credits per 1 VOID (WC per VOID).
  - This is the number Trading View should display as "price".
  - UI MUST parse as a decimal string, not assume integer.

voidReserveRaw (string, uint256 as decimal)
  - VOID reserve in the pool, raw 18-dec units (wei-style).
  - To get human tokens: voidReserve = voidReserveRaw / 1e18.

wcReserveRaw (string, uint256 as decimal)
  - WorkCredits reserve in the pool, raw 18-dec units.
  - To get human tokens: wcReserve = wcReserveRaw / 1e18.

liquidity2AssetRaw (string, uint256 as decimal)
  - Simple 2-asset liquidity metric: voidReserveRaw + wcReserveRaw.
  - Also in raw 18-dec units.
  - Intended for UI "liquidity" bars or sanity display, not for math-critical logic.

updatedAt (number, float seconds since epoch)
  - Timestamp when the exporter last wrote the Prom textfile -> ingested by node_exporter
    -> scraped by Prometheus -> read by HTTP proxy.
  - UI MAY show a "last updated X seconds ago" badge.

source (string)
  - Free-form provenance marker, currently: "prometheus:void-workcredits-devnet".
  - UI can display this in a debug pane or ignore it.

### UI expectations

For Obelisk Wallet / Trading View:

- Use wcPerVoid as the primary price:
  - Show: "1 VOID ≈ {wcPerVoid} WC".
- Convert reserves from raw:
  - voidReserve = Number(voidReserveRaw) / 1e18
  - wcReserve  = Number(wcReserveRaw)  / 1e18
- Show liquidity:
  - liquidityTokens = Number(liquidity2AssetRaw) / 1e18
- Show recency:
  - age = nowSeconds - updatedAt
  - If age > 300 (5 minutes), consider showing a "stale data" warning.

---

## 2. CLI Helper (dev-only)

Script: ops/void-workcredits-devnet-cli.sh

Dev convenience wrapper around the same HTTP endpoint.

/workcredits/devnet/pool

Usage:

  ./ops/void-workcredits-devnet-cli.sh

Example output:

  === VOID / WorkCredits devnet pool ===
  chain         : devnet
  wcPerVoid     : 1   (WC per 1 VOID)
  void reserve  : 1E+2 VOID
  wc reserve    : 1E+2 WC
  2-asset liq   : 2E+2 (VOID+WC, 18-dec units)
  updated_at    : 1764963228.447

Interpretation:
  - 1 VOID ≈ 1 WC on devnet right now.
  - Reserves show total liquidity backing the price.

This is for developers / ops; Obelisk Wallet SHOULD hit the HTTP endpoint directly.

---

## 3. Prometheus Metrics

These are produced by the WorkCredits devnet pool exporter and scraped via node_exporter
textfile collector.

Raw gauges:

- void_workcredits_devnet_void_reserve_raw{chain="devnet"}
  - VOID reserve in raw 18-dec units (uint256 dumped as decimal).

- void_workcredits_devnet_wc_reserve_raw{chain="devnet"}
  - WC reserve in raw 18-dec units.

- void_workcredits_devnet_wc_per_void{chain="devnet"}
  - WC per 1 VOID (price), as a Prometheus gauge.

- void_workcredits_devnet_void_per_wc{chain="devnet"}
  - VOID per 1 WC (inverse price), as a Prometheus gauge.

Recording rules (5m view):

- void:workcredits_devnet:wc_per_void:last_5m{chain="devnet"}
  - Max-over-5m smoothed view of wc_per_void.

- void:workcredits_devnet:pool_liquidity_2asset_raw:last_5m{chain="devnet"}
  - Max-over-5m view of void_reserve_raw + wc_reserve_raw.

These are what Grafana and any future alerts should use rather than instantaneous gauges.

---

## 4. Invariants and Notes (devnet)

- Both VOID and WC are 18-dec ERC-20 tokens on devnet.
- WorkCreditsPoolV1 is the canonical WC/VOID pool for devnet.
- The HTTP endpoint and CLI are read-only; any trading/swapping on devnet will go through
  on-chain calls, not through this API.
- For mainnet, the same contract shape will likely be reused with:
  - chain = "mainnet"
  - Potential additional fields for fees, pool version, etc. if needed.

