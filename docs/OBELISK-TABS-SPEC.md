# Obelisk App Tabs + Flows (V1)

Scope: single place that defines the Obelisk Wallet tabs, what each tab shows, and how VOID, Work Credits (WC), and the relayer are surfaced.

Detailed WC + relayer behavior is in:

- `docs/WORKCREDITS-RELAYER-SPEC.md`
- `docs/WORKCREDITS-RELAYER-API-SPEC.md`
- `docs/OBELISK-WORKCREDITS-UX-SPEC.md`
- `docs/OBELISK-NULLFEED-UX-SPEC.md`

This file is the “router + layout” truth.

---

## 0. Tabs overview

Obelisk V1 exposes:

1. **Home**
2. **Wallet**
3. **Trading View (WC/VOID)**
4. **NullFeed**
5. **NFTs**
6. **Dashboard**

Tabs are mostly UI; all heavy lifting (quotes, relayer, WC accounting, metrics) stays in VOID nodes + off-chain services.

---

## 1. Home tab

**Goal:** quick status + one-click WC collect.

### 1.1 Main elements

- Identity:
  - Current address / ENS.
- Balances:
  - VOID balance.
  - WC balance.
  - Pending WC (if any).
- Toggles:
  - Global **“Use relayer by default”** (bool).
- Network:
  - Short status line, e.g. `VOID mainnet · chainId 2050 · healthy` (plumbed from Prometheus/health later).

### 1.2 Actions

- **Collect WC**:
  - Button: “Collect WC”.
  - Behavior:
    - If relayer OFF → call RewardEngine/WorkCreditsMinter directly, gas in VOID.
    - If relayer ON or user selects “Use WC to pay gas” → run meta-tx via WC relayer.
- Shortcuts:
  - “Send VOID” → jumps to Wallet tab, Send VOID form.
  - “Send WC” → jumps to Wallet tab, Send WC form.

---

## 2. Wallet tab

**Goal:** full money view and send forms.

### 2.1 Balances panel

- VOID:
  - `balance`, `fiat approx` (later).
- WC:
  - `balance`, `pending`, with “Collect WC” button.
- Simple display of current gas mode:
  - “Default gas mode: [VOID | WC via relayer]”.

### 2.2 Gas mode controls

- Global toggle (same as Home).
- Per-form override:
  - Radio:
    - “Pay gas directly (VOID)”
    - “Use Work Credits relayer (WC)”

### 2.3 Forms

1. **Send VOID**
   - Fields:
     - `To` (address/ENS/contact).
     - `Amount` (VOID).
   - Internals:
     - Direct: plain VOID/ERC20 tx, show gas estimate.
     - Relayer:
       - Build calldata for `VoidToken.transfer` (or native VOID send).
       - Call relayer `/quote` with `intent = "SEND_VOID"`.
       - Show `wcFee` and warning if high.
       - On confirm, sign and POST `RelayedCall`.

2. **Send WC**
   - Same UX as Send VOID, but:
     - Calldata targets `WorkCreditsToken.transfer`.
     - Relayer `intent = "SEND_WC"`.

3. **Collect WC (detailed)**
   - Shows pending WC breakdown (per-source later).
   - Two buttons:
     - “Collect (gas in VOID)”.
     - “Collect (gas in WC via relayer)”.
   - Relayer `intent = "COLLECT_WC"`.

---

## 3. Trading View tab (WC/VOID)

**Goal:** a simple WC/VOID LLP front-end; not Uniswap.

### 3.1 Info panel

- Pool snapshot:
  - `Pool VOID: A`, `Pool WC: B`.
- Implied prices:
  - `1 VOID ≈ N WC`.
  - `1 WC ≈ M VOID`.
- Fee:
  - `feeBps` from UptimeVaultLLP/relayer.

### 3.2 Actions

1. **Buy VOID with WC**
   - Fields:
     - `Spend WC amount`.
   - Flow:
     - Obelisk:
       - Calls relayer pricing endpoint (or dedicated trading endpoint) using LLP + QuoteLib.
       - Shows:
         - Expected VOID received.
         - WC fee / slippage.
     - Execution:
       - For now, treat as a “trade” request whose implementation lives in the relayer/LLP code.
       - Later can be:
         - Direct on-chain swap in UptimeVaultLLP.
         - Or WC-funded meta-tx into UptimeVaultLLP via relayer.

2. **Sell VOID for WC**
   - Mirror of above.

### 3.3 WC / gas wiring

- By default, trades use VOID for gas.
- User can choose to pay gas with WC (relayer).
- Trading tab internally uses same relayer intents:
  - `"TRADE_WC_FOR_VOID"`, `"TRADE_VOID_FOR_WC"`.

---

## 4. NullFeed tab

**Goal:** mIRC-style channels; see `OBELISK-NULLFEED-UX-SPEC.md` for details.

This spec only defines its place in Obelisk:

- Left sidebar: channel list + join/create input.
- Main view: messages, composer, status line.
- WC/relayer:
  - Any on-chain NullFeed actions (channel creation fee, boosts, etc.) go through:
    - Direct VOID, or
    - WC relayer with intents like `"NULLFEED_CREATE_CHANNEL"`, `"NULLFEED_BOOST"`.

Messages themselves are off-chain in v0; Obelisk talks to the node’s NullFeed service over HTTP/WebSocket.

---

## 5. NFTs tab

**Goal:** minimal NFT viewer first, trading later.

### 5.1 V0 behavior

- Fetch NFTs owned by the user (standard ERC-721/1155 via VOID node / indexer).
- List:
  - Collection name.
  - Token ID.
  - Thumbnail/preview.
- Detail panel on click:
  - Image/metadata.
  - “View on explorer”.

### 5.2 Future (WC + relayer hooks)

- Actions that might use WC later:
  - Listing fees, featured slots, etc.
- Any NFT listing/market actions eventually use:
  - Direct VOID or
  - WC relayer with intents like `"NFT_LIST"`, `"NFT_BUY"`, etc.

For now, this tab is read-only; write operations come post-mainnet.

---

## 6. Dashboard tab

**Goal:** human view over VOID Network health.

### 6.1 Data sources

- Node exposes:
  - `/metrics/void/*` exporters (txroot, head, seals, proposer, etc.).
  - Textfile metrics (mainnet pillars, keys, bootstrap status).
- Prometheus aggregates; Obelisk can either:
  - Query Prometheus, or
  - Hit a compact node/agent endpoint that summarizes state.

### 6.2 Panels

- “Chain status”:
  - Head block number.
  - Finalized/last txroot health.
- “Mainnet pillars”:
  - `mainnet_core_health`, `mainnet_lastmile`, `safeboot`, `tokenomics`, `keys`, `run`.
- “Relayer status”:
  - Is WC relayer reachable.
  - Last quote age.
- “My node” (if running locally):
  - Is local node healthy.
  - Peers count (later).

This tab is **read-only**; no WC or relayer writes here.

---

## 7. Dev vs mainnet wiring

Obelisk reads its config from a JSON file (dev) or env/config (production), see `config/obelisk-workcredits-dev.template.json`:

- Which RPC URL to hit.
- Which WC/relayer addresses to use.
- Which tabs/features are enabled.

This file is the canonical description of what the UI is supposed to offer at a high level.
