# VOID WorkCredits Devnet — Trading View Data Contract (v0)

## 1. Source of truth

### 1.1 On-chain

- Network: devnet (chainId 2050)
- Tokens:
  - VOID: DevVoidToken (18 decimals)
  - WorkCredits (WC): WorkCreditsDevToken (18 decimals)
- LP AMM pool:
  - WorkCreditsDevnetPool (constant product: k = Rv * Rw)

### 1.2 Off-chain metrics

Exporter script:

- ops/void-workcredits-devnet-export-once.sh

Textfile target:

- /var/lib/node_exporter/textfile_collector/void-workcredits-devnet.prom

Raw gauges written by exporter (chain="devnet"):

- void_workcredits_devnet_up
- void_workcredits_devnet_has_liquidity
- void_workcredits_devnet_void_reserve_raw
- void_workcredits_devnet_wc_reserve_raw
- void_workcredits_devnet_wc_per_void
- void_workcredits_devnet_void_per_wc
- void_workcredits_devnet_pool_meta (static metadata)

Recording rules (colon metrics):

- void:workcredits_devnet:up:last_1m
- void:workcredits_devnet:has_liquidity:last_1m

Contract: Obelisk and any backend code MUST treat these Prometheus views as the source of truth for market status. The node HTTP JSON is best-effort and can lag or show null pool_address.

---

## 2. CLI surface for Obelisk backend

All CLI paths are relative to repo root.

### 2.1 Market snapshot (for price / liquidity panel)

Script:

- ops/workcredits/void-workcredits-devnet-market-json.sh

Example output (structure is the contract, not the numeric values):

    {
      "chain": "devnet",
      "up_last_1m": "1",
      "has_liquidity_last_1m": "1",
      "void_reserve_raw": "1e+24",
      "wc_reserve_raw": "1e+26",
      "wc_per_void": "100",
      "void_per_wc": "0.01"
    }

Field semantics:

- chain: network identifier ("devnet" for now).
- up_last_1m: "1" when void:workcredits_devnet:up:last_1m == 1.
- has_liquidity_last_1m: "1" when void:workcredits_devnet:has_liquidity:last_1m == 1.
- void_reserve_raw: VOID reserve in the pool, 18-decimal raw string.
- wc_reserve_raw: WC reserve in the pool, 18-decimal raw string.
- wc_per_void: spot price WC per 1 VOID as a stringified float from exporter.
- void_per_wc: inverse price VOID per 1 WC as a stringified float.

Obelisk backend MUST:

- Treat up_last_1m != "1" OR has_liquidity_last_1m != "1" as "market offline / no liquidity".
- In that case, return an error / status that the UI can display and disable trades.

### 2.2 Human CLI dashboard (for debugging only)

Script:

- ops/workcredits/void-workcredits-devnet-dashboard.sh

Behavior:

- Reads void-workcredits-devnet-market-json.sh.
- Prints:
  - exporter health flags
  - raw reserves
  - spot prices
  - a few sample quotes from void-workcredits-devnet-trade-preview.sh.

This script is HUMAN-FACING ONLY. Obelisk UI MUST NOT parse its output.

---

## 3. Quote previews (for sliders and confirm dialogs)

Script:

- ops/workcredits/void-workcredits-devnet-trade-preview.sh

Contract:

- VOID to WC:

      ops/workcredits/void-workcredits-devnet-trade-preview.sh void 100

- WC to VOID:

      ops/workcredits/void-workcredits-devnet-trade-preview.sh wc 500

Example shapes (numbers are examples):

VOID -> WC:

    {
      "side": "void->wc",
      "amount_in_void": 100,
      "est_wc_out": 9999.000099986792,
      "price_wc_per_void_before": 100,
      "price_wc_per_void_after": 99.98000299960005,
      "Rv_before": 1000000,
      "Rw_before": 100000000,
      "Rv_after": 1000100,
      "Rw_after": 99990000.99990001
    }

WC -> VOID:

    {
      "side": "wc->void",
      "amount_in_wc": 500,
      "est_void_out": 4.999975000158884,
      "price_void_per_wc_before": 0.01,
      "price_void_per_wc_after": 0.009999900000749995,
      "Rv_before": 1000000,
      "Rw_before": 100000000,
      "Rv_after": 999995.0000249998,
      "Rw_after": 100000500
    }

Fields:

- side: "void->wc" or "wc->void".
- amount_in_void / amount_in_wc: human-sized float inputs (not raw).
- est_wc_out / est_void_out: estimated output amount (float) before any extra safety margin.
- price_wc_per_void_before / after: effective WC-per-VOID price around this trade.
- price_void_per_wc_before / after: effective VOID-per-WC price around this trade.
- Rv_* / Rw_*: reserves before/after, in the internal math units (for debugging and slippage viz).

Obelisk backend SHOULD:

- Wrap this into an HTTP endpoint later, e.g.:

      GET /api/workcredits/devnet/quote?side=void&amount=100
      GET /api/workcredits/devnet/quote?side=wc&amount=500

- Return:
  - side
  - amount_in_void / amount_in_wc
  - est_wc_out / est_void_out
  - price_*_before / price_*_after
  - optionally the R* fields for debug.

The wallet UI SHOULD:

- Use est_*_out for "You will receive approximately X" previews.
- Show price impact by comparing price_before vs price_after.
- Refuse to show a quote if the underlying market JSON reports offline / no-liquidity.

---

## 4. Planned Obelisk HTTP endpoints (stub design)

When we actually wire a backend (Express or similar), the minimal REST surface:

1. GET /api/workcredits/devnet/market

   - Returns exactly the JSON shape produced by void-workcredits-devnet-market-json.sh.
   - HTTP 503 (or explicit status) if up_last_1m != "1" or has_liquidity_last_1m != "1".

2. GET /api/workcredits/devnet/quote

   - Query params:
     - side = "void" or "wc"
     - amount = decimal string (human units)
   - Internally calls void-workcredits-devnet-trade-preview.sh.
   - Returns:
     - side
     - amount_in_void or amount_in_wc
     - est_wc_out or est_void_out
     - price_before / price_after
     - optional R* fields.

3. POST /api/workcredits/devnet/trade  (future, not implemented yet)

   - Will construct a real on-chain tx for the LP pool.
   - Out of scope for this v0 contract; UI can still be built around market + quote.

---

## 5. Obelisk Trading View UI mapping (v0)

The wallet Trading View tab will:

- Show top-line prices:

  - "1 VOID ≈ {wc_per_void} WC"
  - "1 WC ≈ {void_per_wc} VOID"

- Show liquidity box:

  - "Pool liquidity"
  - VOID: void_reserve_raw converted from 18-decimal raw.
  - WC: wc_reserve_raw converted from 18-decimal raw.

- Show market status chip:

  - Online if:
    - up_last_1m == "1" AND
    - has_liquidity_last_1m == "1".
  - Otherwise: "Offline / No liquidity" and trade controls disabled.

- Use quote previews for trade forms:

  - User selects direction (buy WC with VOID, or buy VOID with WC).
  - User types amount in "from" asset.
  - UI calls /api/workcredits/devnet/quote.
  - UI displays:
    - estimated receive amount
    - price impact text using price_before vs price_after
    - a confirm button (future: triggers real tx).

This document is v0 of the WorkCredits devnet Trading View data contract. Future changes MUST be additive or versioned; existing fields and their semantics must not be broken.
