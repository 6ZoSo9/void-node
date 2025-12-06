# VOID WorkCredits — Devnet HTTP API (v0)

Status: DRAFT / DEVNET ONLY  
Scope: Simple HTTP surface for Obelisk Wallet + CLI for WorkCredits on devnet.

This API sits on top of:
- The devnet chain (chainId 2050).
- The WorkCredits token (WC).
- The WC/VOID AMM pool.
- The existing metrics + state file:
  - docs/VOID-WORKCREDITS-DEVNET-STATE.json
  - void_workcredits_devnet_* Prometheus gauges.

Backends:
- Implemented by void-node HTTP routes (devnet).
- Internal scripts can ALSO use this API instead of hitting RPC directly.

Base URL (devnet example):

- `http://127.0.0.1:4100` (same host as main node HTTP, different path prefix)

All paths below are relative to `/workcredits/devnet`.

---

## 1. Pool Snapshot

### 1.1 GET `/workcredits/devnet/pool`

**Purpose:**  
Return the current WC/VOID pool snapshot for display in:
- Obelisk Trading View
- Dashboard cards

**Response:**

{
  "chain": "devnet",
  "rpc_url": "http://127.0.0.1:8545",
  "pool_address": "0x...",            // OPTIONAL in v0 (may be blank)
  "void_reserve_raw": "0",            // 18-dec decimals (string)
  "wc_reserve_raw": "0",              // 18-dec decimals (string)
  "wc_per_void": "0",                 // price (float/string)
  "void_per_wc": "0",                 // inverse price (float/string)
  "last_updated_ts": 0                // unix ms or s (backend choice, but stable)
}

**Notes:**

- For v0, this can be fully derived from:
  - docs/VOID-WORKCREDITS-DEVNET-STATE.json
  - The textfile metrics (node_exporter).
- Later, it can be wired to:
  - Direct on-chain reads from the WC/VOID pool contract.

---

## 2. Account Summary

### 2.1 GET `/workcredits/devnet/account/:address`

**Purpose:**  
Return a user-centric WorkCredits snapshot for the Wallet tab.

**Path param:**

- `:address` — hex, 0x-prefixed EVM address.

**Response:**

{
  "address": "0x...",
  "void_balance_raw": "0",      // 18-dec
  "wc_balance_raw": "0",        // 18-dec
  "pending_wc_raw": "0",        // 18-dec, claimable rewards
  "relayer_enabled": false,     // current relayer toggle for this address
  "updated_ts": 0
}

**Notes:**

- Devnet v0 can:
  - Stub `pending_wc_raw` as 0.
  - Stub `relayer_enabled` as false or a local setting.
- Later, this should be wired to:
  - Real reward calculation / claimable WC.
  - On-chain or node-side relayer config.

---

## 3. Quotes (Buy / Sell)

### 3.1 POST `/workcredits/devnet/quote/buy`

**Purpose:**  
Price a **Buy WC with VOID** order without committing to a transaction.

**Request JSON:**

{
  "address": "0x...",           // OPTIONAL for v0 (for future per-user fees)
  "void_in_raw": "0",           // 18-dec, amount of VOID user wants to spend
  "slippage_bps": 100           // OPTIONAL; default 100 = 1.00%
}

**Response JSON:**

{
  "ok": true,
  "quote_id": "devnet-quote-xyz",     // opaque, can be ignored by v0
  "void_in_raw": "0",
  "wc_out_raw": "0",
  "price_wc_per_void": "0",
  "price_impact_bps": 0,
  "min_wc_out_raw": "0",              // after slippage
  "warnings": []                      // e.g. ["HIGH_SLIPPAGE", "LOW_LIQUIDITY"]
}

### 3.2 POST `/workcredits/devnet/quote/sell`

Same shape, opposite direction.

**Request JSON:**

{
  "address": "0x...",
  "wc_in_raw": "0",
  "slippage_bps": 100
}

**Response JSON:**

{
  "ok": true,
  "quote_id": "devnet-quote-abc",
  "wc_in_raw": "0",
  "void_out_raw": "0",
  "price_void_per_wc": "0",
  "price_impact_bps": 0,
  "min_void_out_raw": "0",
  "warnings": []
}

**Implementation notes (v0):**

- Devnet can compute quotes purely from:
  - Current reserves (from state/metrics).
- No actual locking is needed yet; this is for UX preview.

---

## 4. Trades (Buy / Sell)

### 4.1 POST `/workcredits/devnet/trade/buy`

**Purpose:**  
Execute a **Buy WC with VOID** trade.

**Request JSON (v0 minimal):**

{
  "address": "0x...",           // EVM account
  "void_in_raw": "0",
  "min_wc_out_raw": "0",
  "relayer": true               // OPTIONAL; if true, attempt meta-tx in future
}

**Response JSON:**

{
  "ok": true,
  "tx_hash": "0x...",
  "void_in_raw": "0",
  "wc_out_raw": "0",
  "final_price_wc_per_void": "0",
  "note": "devnet stub - replace with real trade wiring"
}

### 4.2 POST `/workcredits/devnet/trade/sell`

Mirror of buy:

**Request JSON:**

{
  "address": "0x...",
  "wc_in_raw": "0",
  "min_void_out_raw": "0",
  "relayer": true
}

**Response JSON:**

{
  "ok": true,
  "tx_hash": "0x...",
  "wc_in_raw": "0",
  "void_out_raw": "0",
  "final_price_void_per_wc": "0",
  "note": "devnet stub - replace with real trade wiring"
}

**Devnet v0 behavior:**

- Initially, this can return:
  - `ok: false`
  - `note: "NOT_IMPLEMENTED_DEVNET_STUB"`
- Or simulate effects without touching the chain, to unblock UI testing.

---

## 5. Collect Pending WorkCredits

### 5.1 POST `/workcredits/devnet/collect-pending`

**Purpose:**  
Backend for the “Collect pending WorkCredits” button.

**Request JSON:**

{
  "address": "0x..."
}

**Response JSON (v0):**

{
  "ok": false,
  "tx_hash": null,
  "collected_wc_raw": "0",
  "note": "NOT_IMPLEMENTED_DEVNET_STUB"
}

Later:

- Wire to the real claim method in the WorkCredits reward system.
- On success, it should:
  - Emit a real tx.
  - Return `ok: true`, `tx_hash`, and `collected_wc_raw`.

---

## 6. Health / Debug

### 6.1 GET `/workcredits/devnet/health`

**Purpose:**  
Quick check that the WorkCredits devnet stack is wired and reading metrics correctly.

**Response JSON (example):**

{
  "ok": true,
  "chain": "devnet",
  "rpc_url": "http://127.0.0.1:8545",
  "pool": {
    "void_reserve_raw": "0",
    "wc_reserve_raw": "0"
  },
  "metrics": {
    "void_workcredits_devnet_void_reserve_raw": 0,
    "void_workcredits_devnet_wc_reserve_raw": 0,
    "void_workcredits_devnet_wc_per_void": 0,
    "void_workcredits_devnet_void_per_wc": 0
  },
  "notes": []
}

**Notes:**

- This endpoint can be used in:
  - Manual curl checks.
  - Lightweight CI / health scripts (non-gating).

---

## 7. Implementation Notes (devnet v0)

- **Security:** devnet-only, local host only. No auth required for now.
- **Rate limiting:** not required for local dev, but design should allow for future throttling.
- **Error format:** keep it simple:

  {
    "ok": false,
    "error": "SHORT_MACHINE_READABLE_CODE",
    "message": "Human readable explanation"
  }

- **Timeouts:** backend should not block on slow RPC; fail fast with a clear error.

---

## 8. Roadmap Hooks

Not needed for v0 but design should keep these in mind:

- Per-user fee tiers (e.g., cheaper relayer fees for node operators).
- WC rewards breakdown per activity type.
- NullFeed integration (tipping, rewards).
- Multi-pool support (e.g., WC/USDC later).

