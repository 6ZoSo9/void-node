# Obelisk Wallet — WorkCredits UI Spec (Devnet v0)

Status: DRAFT (devnet only)  
Scope: Wallet + Trading View integration for VOID / WorkCredits (WC) on devnet.

This spec describes what a human sees and can do in Obelisk Wallet around:
- Viewing VOID + WC balances
- Toggling the relayer (on/off)
- Collecting pending WorkCredits
- Viewing the WC/VOID pool price
- Placing basic buy/sell orders against the WC/VOID pool

It does **not** cover:
- Full NullFeed UI
- Full NFTs UI
- Advanced order types (limit, stop, etc.)
- Cross-chain / CEX integrations

Those live in their own specs; this file is WorkCredits-focused.

---

## 1. High-level Layout (where WorkCredits shows up)

Obelisk Wallet main tabs (top-level):

1. **Home**
   - High-level summary:
     - Network status (devnet/mainnet indicator)
     - Short VOID price / WC price summary
     - “You have X WC available” teaser
   - CTA buttons:
     - “Open Wallet”
     - “Open Trading View”
     - “Open NullFeed”

2. **Wallet**
   - Per-token balances:
     - VOID balance (wallet)
     - WC balance (wallet)
   - Controls:
     - **Relayer toggle**: ON/OFF
     - **Collect pending WC** button
   - Send / Receive:
     - “Send VOID”
     - “Send WC”
     - “Receive (show address / QR)”

3. **Trading View**
   - Live WC/VOID pool snapshot:
     - WC per VOID
     - VOID per WC
     - Pool reserves
   - Simple order ticket:
     - Buy WC with VOID
     - Sell WC for VOID

4. **NullFeed**
   - mIRC-style channels (out of scope here; see NullFeed spec).
   - Should still show **current WC balance** somewhere small (e.g., top bar).

5. **NFTs**
   - Future: WC-gated avatars, etc. (stub only).

6. **Dashboard**
   - Network health + mainnet pillars summary.
   - Panels for WorkCredits:
     - Pool reserves (VOID / WC)
     - WC/VOID price
     - “Last pool update” timestamp
     - Link to “Open Trading View”

---

## 2. Data sources for WorkCredits UI

### 2.1 On-chain

- **VOID token** (ERC-20-like)
- **WorkCredits token (WC)** (ERC-20-like)
- **WC/VOID pool contract** (AMM-style LP)
  - Exposes reserves: `reserveVOID`, `reserveWC` (or equivalent pair API)

Wallet uses on-chain reads for:
- User balances (VOID, WC)
- Pool reserves (if needed directly)

### 2.2 Node/HTTP APIs (devnet)

Devnet v0 should *not* hammer RPC directly from the browser if we can avoid it.  
Instead, the node exposes:

- JSON “pool snapshot” endpoint (example shape, not binding):

  {
    "chain": "devnet",
    "rpc_url": "http://127.0.0.1:8545",
    "void_reserve_raw": "0",
    "wc_reserve_raw": "0",
    "wc_per_void": "0",
    "void_per_wc": "0",
    "last_updated_ts": 0
  }

- JSON “user WorkCredits summary” endpoint:

  {
    "address": "0x...",
    "void_balance_raw": "0",
    "wc_balance_raw": "0",
    "pending_wc_raw": "0",
    "relayer_enabled": false
  }

Internally, these can be backed by the same logic that feeds:
- docs/VOID-WORKCREDITS-DEVNET-STATE.json
- void_workcredits_devnet_* metrics exported via node_exporter

---

## 3. Wallet Tab — WorkCredits UX

### 3.1 Wallet balances section

**Layout:**

- Card: “Balances”
  - Row 1: `VOID`
    - Amount (human readable, 18-dec)
    - Approx WC equivalent (optional, using latest price)
  - Row 2: `WorkCredits (WC)`
    - Amount (human readable, 18-dec)
    - Approx VOID equivalent (optional)

**States:**

- **Normal:**
  - Show numbers and “Updated X seconds ago”.
- **Loading:**
  - Skeleton loaders or “Loading balances…”.
- **Error:**
  - Red inline message: “Unable to load balances from node. Check your connection.”

### 3.2 Relayer toggle

**Control:**  
`[ Relayer:  ON | OFF ]  (switch)`

- When **ON**:
  - Text: “Relayer is ON. Obelisk can submit transactions on your behalf (within configured limits).”
- When **OFF**:
  - Text: “Relayer is OFF. You will sign and broadcast transactions manually.”

**Behavior:**

- Toggling ON:
  - Show confirmation modal:
    - “Enable relayer for this account?”
    - Short explanation of risk/benefit.
- Toggling OFF:
  - Simple confirmation.
- Persisted via:
  - Local encrypted settings + on-chain config (when ready).
  - For devnet v0, it can just be local / node-level config.

### 3.3 Collect Pending WorkCredits button

**Button:**  
`[ Collect pending WorkCredits ]`

- Visible only if `pending_wc_raw > 0` (or always visible but disabled with explanation).

**Behavior:**

1. Fetch current `pending_wc_raw` for the connected address.
2. If zero:
   - Disable button, tooltip: “No pending WorkCredits to collect.”
3. If > 0:
   - Show confirmation:
     - “You are about to collect X WC from rewards.”
     - Show the VOID/WC pool price and approximate USD equivalent if available.
4. On confirm:
   - Call a devnet API / contract method to claim WC.
   - Show tx status: pending → confirmed → success/fail.
5. On success:
   - Refresh:
     - WC balance
     - pending_wc_raw
     - Any on-screen totals

---

## 4. Trading View — WorkCredits

### 4.1 Layout

Two main regions:

1. **Left: Pool status**
   - WC per 1 VOID
   - VOID per 1 WC
   - VOID reserve in pool
   - WC reserve in pool
   - “Seeded” badge when appropriate (e.g. “Seeded with 10M VOID” on mainnet).

2. **Right: Order ticket**
   - Tabbed or toggle:
     - **Buy WC**
     - **Sell WC**

### 4.2 Buy WC flow

**Fields:**

- “You pay” (VOID)
  - Input box (numeric)
- “You receive” (WC)
  - Calculated from pool quote
- Pool price + slippage estimate
- Estimated fees (gas, relayer fee if applicable)

**Steps:**

1. User enters amount in VOID.
2. Wallet queries quote from:
   - Node WC API or
   - Direct contract call (devnet)
3. UI displays:
   - Expected WC out
   - Price impact
   - Minimum WC out (after slippage)
4. User clicks “Confirm Buy”.
5. Tx path:
   - If relayer ON: prepare signed message / meta-tx, send to relayer.
   - If relayer OFF: show raw transaction and sign via wallet.
6. On success:
   - Update balances + pool snapshot.

### 4.3 Sell WC flow

Symmetric to Buy:

- “You sell” (WC)
- “You receive” (VOID)
- Same quote / slippage / fee display.

### 4.4 Edge cases

- **Zero/low liquidity (devnet bootstrapping):**
  - If reserves are zero or below some minimal threshold:
    - Show message: “Pool is not seeded yet. Trading is disabled.”
    - Disable buy/sell buttons.
- **Large orders / high slippage:**
  - Warn if price impact > X% (e.g. 5–10%).
  - Require extra confirmation: “This trade has high slippage.”

---

## 5. Send / Receive VOID and WC

Even though WorkCredits is a special token, sending/receiving it should feel normal.

### 5.1 Send flow (VOID / WC)

- Token selector: `VOID` | `WC`
- Amount input
- Recipient address input
- Confirmation screen:
  - Token, amount, recipient
  - Estimated gas / relayer info
- Tx status with clear success/fail indicator.

### 5.2 Receive flow

- Show wallet address
- Optional QR code
- Clarify:
  - “This address can receive both VOID and WC on chainId 2050 (VOID Network).”

---

## 6. Devnet vs Mainnet UX

The UI must make it obvious which environment the user is in.

- Top bar or status chip:
  - `DEVNET (unsafe test tokens)`
  - `MAINNET (real funds)` (later)

For **WorkCredits**:

- On devnet:
  - Use obvious testnet styling (e.g. “Devnet WorkCredits, NOT real money”).
- On mainnet:
  - Show “Seeded with X VOID from WorkCredits bootstrap pool” (one-time 10M VOID seed).

---

## 7. Metrics / Telemetry tie-in

The WorkCredits UI should plug into the **existing metrics / textfile exporters**:

- Pool view uses:
  - `void_workcredits_devnet_void_reserve_raw`
  - `void_workcredits_devnet_wc_reserve_raw`
  - `void_workcredits_devnet_wc_per_void`
  - `void_workcredits_devnet_void_per_wc`

- Dashboard charts can use Prometheus directly to show:
  - Pool reserves over time
  - Price over time

Implementation notes:

- Frontend should **not** depend on PromQL directly; instead:
  - Node exposes a simple JSON API that is derived from the metrics/state.
  - Grafana dashboards speak PromQL for ops.

---

## 8. Future extensions (v1+)

Not for devnet v0, but design should allow:

- Limit orders / DCA-style recurring orders (optional, later).
- WC rewards breakdown:
  - “You earned X WC from running a node.”
  - “You earned Y WC from relaying / other work.”
- NullFeed integration:
  - Show WC tip/earn actions inline in chat.
- NFT avatar marketplace:
  - WC used to buy avatar NFTs / cosmetics.

These are **roadmap items** and should not block v0.
