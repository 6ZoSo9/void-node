# Work Credits (WC) — Devnet Metrics and UI Wiring

This doc explains how the Work Credits (WC) / VOID pool is exposed to monitoring and to the Obelisk Wallet UI.

## 1. HTTP Endpoints (void-node main @ 127.0.0.1:4100)

All WorkCredits HTTP routes are exposed off the main node HTTP API.

### 1.1 Health

- URL: GET /workcredits/devnet/health

Example response (current stub, no pool yet):

    {
      "ok": true,
      "chain": "devnet",
      "rpc_url": "http://127.0.0.1:8545",
      "pool": {
        "pool_address": null,
        "void_reserve_raw": "0",
        "wc_reserve_raw": "0"
      },
      "notes": []
    }

Semantics:

- ok: node managed to talk to the devnet RPC and compute a sane state.
- rpc_url: where we are querying devnet from.
- pool:
  - pool_address: address of the WC/VOID LLP pool on devnet.
    - null or empty string = pool not configured / not created yet.
  - void_reserve_raw: raw 18-dec reserve of VOID in the pool (string).
  - wc_reserve_raw: raw 18-dec reserve of WC in the pool (string).

Right now, because the LLP does not exist, pool_address is null and both reserves are "0".

### 1.2 Pool snapshot

- URL: GET /workcredits/devnet/pool

Example (no pool yet):

    {
      "chain": "devnet",
      "rpc_url": "http://127.0.0.1:8545",
      "pool_address": null,
      "void_reserve_raw": "0",
      "wc_reserve_raw": "0",
      "wc_per_void": 0,
      "void_per_wc": 0,
      "last_updated_ts": 1764999309575
    }

Semantics:

- wc_per_void: price = how many WC per 1 VOID (0 if no liquidity).
- void_per_wc: price = how many VOID per 1 WC (0 if no liquidity).
- last_updated_ts: milliseconds since epoch when this snapshot was computed.

Once the LLP exists and has non-zero reserves, these numbers will become real prices.

## 2. Prometheus Exporter

Exporter endpoint:

- URL: GET /metrics/void/workcredits-devnet.prom

Example current output (stub, no pool):

    # HELP void_workcredits_devnet_up Is WorkCredits devnet state readable (1 ok, 0 bad)
    # TYPE void_workcredits_devnet_up gauge
    void_workcredits_devnet_up{chain="devnet"} 1

    # HELP void_workcredits_devnet_void_reserve_raw VOID reserve in pool (raw 18-dec units)
    # TYPE void_workcredits_devnet_void_reserve_raw gauge
    void_workcredits_devnet_void_reserve_raw{chain="devnet"} 0

    # HELP void_workcredits_devnet_wc_reserve_raw WorkCredits reserve in pool (raw 18-dec units)
    # TYPE void_workcredits_devnet_wc_reserve_raw gauge
    void_workcredits_devnet_wc_reserve_raw{chain="devnet"} 0

    # HELP void_workcredits_devnet_wc_per_void WC per 1 VOID (price)
    # TYPE void_workcredits_devnet_wc_per_void gauge
    void_workcredits_devnet_wc_per_void{chain="devnet"} 0

    # HELP void_workcredits_devnet_void_per_wc VOID per 1 WC (price)
    # TYPE void_workcredits_devnet_void_per_wc gauge
    void_workcredits_devnet_void_per_wc{chain="devnet"} 0

    # HELP void_workcredits_devnet_pool_meta Static metadata for WC/VOID pool
    # TYPE void_workcredits_devnet_pool_meta gauge
    void_workcredits_devnet_pool_meta{chain="devnet",rpc_url="http://127.0.0.1:8545",pool_address=""} 1

Key points:

- void_workcredits_devnet_up:
  - 1 = exporter working, devnet reachable, JSON parse OK.
  - 0 = exporter cannot talk to devnet or response is broken.
- *_reserve_raw and *_per_* are all 0 until the LLP exists and has liquidity.
- void_workcredits_devnet_pool_meta is a static info gauge that carries rpc_url and pool_address as labels.

Prometheus job (conceptual):

- Job name: void-workcredits-devnet
- Target: 127.0.0.1:4100
- Path: /metrics/void/workcredits-devnet.prom

## 3. Recording Rules

Recording rules live in /etc/prometheus/void-workcredits-devnet-rules.yml.

Current rules:

    groups:
      - name: void-workcredits-devnet-rules
        rules:
          - record: void:workcredits_devnet:up:last_1m
            expr: max_over_time(void_workcredits_devnet_up[1m])

          - record: void:workcredits_devnet:has_liquidity:last_1m
            expr: max_over_time((void_workcredits_devnet_void_reserve_raw > 0) and (void_workcredits_devnet_wc_reserve_raw > 0))[1m:]

Semantics:

- void:workcredits_devnet:up:last_1m:
  - 1 if the exporter was up at any point in the last minute.
  - 0 if it has been completely down for the last minute.
- void:workcredits_devnet:has_liquidity:last_1m:
  - 1 if, at any point in the last minute, both VOID and WC reserves were > 0.
  - 0 otherwise.
  - Right now this is 0, because there is no LLP / no liquidity.

Example queries (Prometheus UI → Graph / Expression):

- void_workcredits_devnet_up
- void_workcredits_devnet_void_reserve_raw
- void_workcredits_devnet_wc_reserve_raw
- void:workcredits_devnet:up:last_1m
- void:workcredits_devnet:has_liquidity:last_1m

## 4. Obelisk Wallet UI Wiring (Plan)

Obelisk Wallet will have a Work Credits / Trading view. It needs to use these signals as follows.

### 4.1 Health check

For the Work Credits dashboard tab:

- Use void:workcredits_devnet:up:last_1m to decide whether to show:
  - Green “WC/VOID price online (devnet)” badge when value = 1.
  - Red “Work Credits price feed offline” banner when value = 0.

The UI does not need to query Prometheus directly; instead, we will either:

- Have a small backend Obelisk API that proxies these values, or
- Have the wallet call a light JSON endpoint we expose later (for example /workcredits/devnet/ui_health).

For now this doc just specifies the source of truth.

### 4.2 Liquidity status

- Use void:workcredits_devnet:has_liquidity:last_1m as the LLP readiness flag:

  - 0:
    - Show “Pool not initialized yet” or a grayed out trading UI.
    - Disable buy/sell order forms and “Provide liquidity” forms.
  - 1:
    - Enable trading UI (buy/sell forms, price display, order previews).

Once the LLP exists and has non-zero reserves:

- void:workcredits_devnet:has_liquidity:last_1m should flip to 1.
- At that point, we treat the pool as live in the UX.

### 4.3 Price display

When liquidity exists:

- UI should source prices from the JSON endpoint:

  - GET /workcredits/devnet/pool

- Use:
  - wc_per_void → show “WC per VOID”.
  - void_per_wc → show “VOID per WC”.

The wallet should use the live HTTP JSON (not Prometheus) for exact prices and trade previews.

### 4.4 Future hooks (TODO)

These are agreed but not implemented yet:

1. LLP creation / seed

   - A CLI or Obelisk flow that:
     - Creates the WC/VOID pool on devnet.
     - Seeds it with the one-time 10M VOID allocation and some WC.
     - Updates node config so /workcredits/devnet/* knows the pool_address.

2. User trading

   - Obelisk Wallet Trade tab should:
     - Show balances for VOID and WC.
     - Let users submit buy/sell orders using the AMM pool.
     - Respect a relayer toggle and show “Collect pending WC” based on on-chain state.

3. Prometheus alerts

   - Alert when:
     - void:workcredits_devnet:up:last_1m == 0 (exporter broken).
     - LLP is configured (pool_address != "") but void:workcredits_devnet:has_liquidity:last_1m == 0 for a long time.

## 5. Summary

- HTTP routes under /workcredits/devnet/* are the source of truth for WC/VOID pool state and prices.
- Prometheus exporter at /metrics/void/workcredits-devnet.prom exposes gauges for:
  - Health (up),
  - Raw reserves,
  - Prices,
  - Pool metadata.
- Recording rules collapse this into:
  - void:workcredits_devnet:up:last_1m → exporter / RPC health.
  - void:workcredits_devnet:has_liquidity:last_1m → “LLP has non-zero reserves” flag.
- Obelisk Wallet UI will use these signals to:
  - Flip between offline/online states,
  - Detect when the LLP is actually ready,
  - Display WC/VOID prices when the pool is live.

This file is the canonical reference for Work Credits devnet metrics and UI wiring going forward.
