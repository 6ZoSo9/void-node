# Obelisk Wallet — WorkCredits Trading View (Devnet v0)

This doc defines how Obelisk Wallet should consume the WorkCredits devnet WC/VOID
pool API and what the Trading View tab MUST display.

This is **UI contract only** — no on-chain trading logic here.

---

## 1. Backend API

Source: void-node main HTTP API on the operator's box.

Endpoint (devnet):

  GET /workcredits/devnet/pool

Response shape (see also: docs/VOID-WORKCREDITS-DEVNET-API.md):

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

Front-end rules:

- Treat non-200 or JSON parse failure as **hard error**.
- If ok is false, show a red error state and DO NOT show stale values as "live".

---

## 2. Data model (front-end)

TypeScript-ish description for the Obelisk client:

  type WorkCreditsPool = {
    ok: boolean;
    chain: "devnet" | "mainnet" | string;
    wcPerVoid: string;          // decimal, WC per 1 VOID
    voidReserveRaw: string;     // uint256 decimal, 18-dec
    wcReserveRaw: string;       // uint256 decimal, 18-dec
    liquidity2AssetRaw: string; // uint256 decimal, 18-dec (VOID+WC)
    updatedAt: number;          // seconds since epoch (float)
    source: string;             // provenance/debug only
  };

Derived values:

  const DECIMALS = 18;

  const voidReserve = Number(voidReserveRaw) / 1e18;
  const wcReserve  = Number(wcReserveRaw) / 1e18;
  const liquidity2 = Number(liquidity2AssetRaw) / 1e18;

  const priceWCPerVOID = Number(wcPerVoid); // "1.23" => 1.23

  const ageSeconds = nowSeconds - updatedAt;

The UI MUST treat wcPerVoid as the **canonical quoted price**. Reserves and
liquidity2 are for depth/size display, not for recomputing price.

---

## 3. Trading View layout (v0)

This is the minimal Trading View Obelisk must support for WorkCredits.

### 3.1. Header strip

Shows current price and status:

- "WorkCredits / VOID (devnet)"
- Primary price:
  - "1 VOID ≈ {wcPerVoid} WC"
- Secondary info:
  - "VOID reserve: {voidReserve} VOID"
  - "WC reserve: {wcReserve} WC"
  - "Total liquidity: {liquidity2} (VOID+WC)"

Status badge:

- If ok === true and ageSeconds <= 300:
  - Show green badge: "LIVE • updated <N> seconds ago"
- If ok === true and ageSeconds > 300:
  - Show yellow badge: "STALE • last update <N> seconds ago"
- If ok === false:
  - Show red badge: "ERROR • pool metrics unavailable"

### 3.2. Price box

Right-hand or central box that highlights:

  Price (WC per VOID): {wcPerVoid}

Formatting rules:

- Always show at least 3 decimal places (e.g., "1.000", "0.987").
- Clamp to a sensible max (e.g., 8 decimal places) to avoid ugly floats.

Optional (later): invert view toggle:

- Switch to "VOID per 1 WC" using 1 / priceWCPerVOID.

### 3.3. Liquidity / reserves box

Simple two-line summary:

  Liquidity (two-asset): {liquidity2} (VOID+WC)
  Reserves: {voidReserve} VOID / {wcReserve} WC

No charts required for v0, just clean numeric display.

---

## 4. Error states

The Trading View tab MUST handle these cases:

1. HTTP/network error:
   - Show "Unable to reach WC/VOID pool endpoint" and a retry button.

2. ok === false:
   - Show "Pool data reported unhealthy" and DO NOT show stale numbers as "live".

3. Missing or invalid fields:
   - Treat as hard error; show generic "Pool data invalid" and log the raw JSON to
     the debug console (dev builds only).

4. Very old data:
   - If ageSeconds > 900 (15 minutes), show a warning even if ok === true.

---

## 5. Devnet vs mainnet

For now, Obelisk can hard-code:

- Devnet API base: http://127.0.0.1:4100
- Endpoint: /workcredits/devnet/pool
- Chain label: "devnet"

When we move to mainnet:

- We'll introduce /workcredits/mainnet/pool with the exact same JSON shape.
- The UI should switch base URL + chain label but reuse the same component.

---

## 6. Non-goals (v0)

Out of scope for this first Trading View implementation:

- Actual buy/sell execution.
- Order book, slippage calc, or fee breakdown.
- Historical price charts.
- Multi-pool or multi-chain aggregation.

The only requirement for Obelisk v0 is:

- Query /workcredits/devnet/pool periodically (e.g., every 10–15 seconds).
- Render price, reserves, liquidity, and freshness status as described above.
- Fail hard and visibly when the pool data is bad or stale.

