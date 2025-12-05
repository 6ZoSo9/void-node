# VOID Work Credits — Obelisk Wallet UI Spec (v0)

Status: **DRAFT v0**  
Scope: Obelisk Wallet + void-node, Work Credits (WC) only.  
Goal: Define exactly what the wallet must show and which actions it must support for VOID + WC, so we don’t ship a half-baked Work Credits UX.

---

## 1. Context & Roles

### 1.1 Actors

- **User (wallet owner)**  
  - Holds VOID and WC.
  - Can opt into using the **WorkCredits relayer** for gasless UX (fees paid in VOID via WC pool).
  - Can trade VOID <-> WC.
  - Can “collect” earned WC (from jobs / rewards path) into their wallet.

- **Protocol / Treasury / OpsTreasury**
  - Owns the initial 10M VOID seed used to bootstrap the WC/VOID pool.
  - Owns the WC mint/burn controller and the protocol-owned liquidity in the pool.
  - Funds relayer + rewards flows from VOID emissions + Treasury → OpsTreasury → WC paths.

- **Relayer**
  - Pays L1/L2 gas in VOID.
  - Gets reimbursed in VOID via the WC/VOID pool and Work Credits accounting.
  - Exposed to Obelisk via a simple HTTP API on top of void-node.

---

## 2. On-chain Pieces (for reference)

Contracts we already have in `contracts/workcredits`:

- `WorkCreditsToken` (WC)
  - Simple ERC20-like token with:
    - `controller` (only address allowed to `mint`/`burn`).
    - Standard `transfer`, `transferFrom`, `approve`, `allowance`, `balanceOf`, `totalSupply`.
  - Controller will be some protocol address (likely OpsTreasury or a dedicated WC controller).

- `WorkCreditsPoolV1`
  - Protocol-owned constant-product pool for **VOID <-> WC**.
  - Holds:
    - `voidToken` (VOID ERC20).
    - `wcToken` (WorkCreditsToken).
    - `treasury` (the only address allowed to `seed` the pool).
  - Key functions:
    - `seed(voidAmount, wcAmount)` — one-time treasury-only bootstrap.
    - `getReserves() -> (reserveVoid, reserveWC)`.
    - `quoteVoidForWC(wcOut) -> voidIn`.
    - `quoteWCForVoid(voidOut) -> wcIn`.
    - `swapVoidForWC(voidIn, minWCOut, to)`.
    - `swapWCForVoid(wcIn, minVoidOut, to)`.

- Relayer stack (existing from earlier WC work):
  - `WorkCreditsRelayerTypes`
  - `WorkCreditsQuoteLib`
  - `WorkCreditsRelayerQuoteHelper`
  - `WorkCreditsRelayerV1`
  - Tested with forge; provides a stable `hashRelayedCall` and deterministic quoting logic.

This doc is **UI-facing**: we’re not wiring mainnet bootstrap here, just defining how Obelisk should behave when these contracts + relayer are live.

---

## 3. Obelisk Wallet — Tabs & Views

Obelisk v0 high-level tabs (already agreed):

1. **Home** — summary / updates (out of scope for this doc).
2. **Wallet** — balances, send/receive, relayer toggle, collect WC.
3. **Trading View** — WC/VOID market, buy/sell UI.
4. **NullFeed** — chat.
5. **NFTs** — NFT listing / viewing.
6. **Dashboard** — network health.

This spec zooms into **Wallet** and **Trading View** for Work Credits.

---

## 4. Wallet Tab — VOID + WC

### 4.1 Wallet Overview Panel

Shown at the top of the Wallet tab:

- **Balances**
  - `VOID balance`
  - `WC balance`
- **Fiat-ish hints (optional later)**
  - `Approx. WC value in VOID` (using WC pool midprice).
  - Maybe a “power bar” or simple text like: “Work Credits available: 123.45 WC”.

UI fields:

- `VOID: <amount>`  
- `WC: <amount>`  
- `Relayer: <ON|OFF>` (see 4.3)  
- `Pending WC: <amount>` (see 4.4)

### 4.2 Send / Receive (VOID & WC)

Requirements:

- **Token selector**: `VOID` or `WC`.
- **Send flow**:
  - Inputs:
    - `To address` (0x… or ENS later).
    - `Amount`.
    - (Optional) “Max” button.
  - Under the hood:
    - If sending VOID: standard ERC20 transfer.
    - If sending WC: standard WorkCreditsToken transfer.
  - Error cases:
    - Insufficient balance.
    - Invalid/empty address.
    - Chain not connected / wrong network.

- **Receive flow**:
  - Display user’s address + QR code.
  - Let user copy address.
  - No extra WC logic here; both VOID/WC senders just use same address.

**NON-NEGOTIABLE**:  
Wallet tab MUST support sending and receiving both VOID and WC.  
No “backdoor” flows; this is core.

### 4.3 Relayer Toggle (Per-User)

Widget:

- Label: `Relayer`
- Control: **switch** `[ OFF | ON ]`
- Hint text:
  - When OFF: “You will pay gas yourself in VOID.”  
  - When ON: “Relayer may pay gas for you and charge a small fee via Work Credits.”

Behavior:

- When user toggles **ON**:
  - Wallet calls a local endpoint on void-node, e.g.:
    - `POST /api/workcredits/relayer/enable`
    - Body: `{ "address": "0xUser", "chainId": 2050 }`
  - Node stores relayer preference (local DB / config file).
  - Future transactions from this address may be routed through `WorkCreditsRelayerV1`.

- When user toggles **OFF**:
  - `POST /api/workcredits/relayer/disable`
  - Node stops using relayer for that user.

UI constraints:

- Show current state clearly.
- If node/relayer is not available:
  - Show switch as disabled with tooltip: “Relayer unavailable on this node.”

### 4.4 “Collect Work Credits” (Pending WC)

Users need a clear button to **pull earned WC** into their wallet.

Widget:

- Button: `Collect Work Credits`
- Subtext: `Pending: <X> WC`  
  - X comes from a simple API on the node.

Flow:

1. On Wallet tab load, Obelisk calls something like:
   - `GET /api/workcredits/pending?address=0xUser`
   - Returns:
     ```json
     {
       "address": "0xUser",
       "pendingWC": "123450000000000000000", // 123.45 WC
       "source": "devnet-jobs/mainnet-rewards/…",
       "lastUpdated": 1234567890
     }
     ```

2. User hits `Collect Work Credits`:
   - Wallet confirms with user (simple modal): “Collect X WC to your wallet?”
   - Then calls:
     - `POST /api/workcredits/collect`
     - Body:
       ```json
       {
         "address": "0xUser",
         "chainId": 2050
       }
       ```
   - Node executes the correct on-chain calls using the WC controller / reward engine.
   - Upon success, Obelisk refreshes balances + pendingWC.

Notes:

- For v0 we don’t overcomplicate:
  - Node is trusted as the one that knows how much WC the user is owed.
  - Later we can back this with receipts / proofs and a more complex accounting path.

---

## 5. Trading View Tab — VOID/WC Market

The Trading View is where users **buy/sell WC for VOID** against the protocol-owned `WorkCreditsPoolV1`.

### 5.1 Layout Overview

Sections:

1. **Market Summary**
   - `Pool VOID reserves`
   - `Pool WC reserves`
   - `Implied price` (e.g. `1 WC ≈ 100 VOID`, `1 VOID ≈ 0.01 WC`).
   - 24h volumes / trades (optional later).

2. **Buy WC** panel.
3. **Sell WC** panel.
4. **Relayer fee hint** (if relayer is ON).

### 5.2 Market Summary Panel

Data source:

- Node calls on-chain (or caches) from `WorkCreditsPoolV1`:
  - `getReserves() -> (reserveVoid, reserveWC)`
- Obelisk polls a simple endpoint:
  - `GET /api/workcredits/market`
  - Returns:
    ```json
    {
      "poolAddress": "0xPool",
      "voidToken": "0xVoid",
      "wcToken": "0xWC",
      "reserveVoid": "1000000000000000000000000",
      "reserveWC":   "10000000000000000000000",
      "priceVoidPerWC": "100000000000000000000",   // 100 VOID per WC
      "priceWCPerVoid": "10000000000000000"        // 0.01 WC per VOID
    }
    ```

UI must show:

- `Pool: <VOID_reserve> VOID / <WC_reserve> WC`
- `Price: 1 WC ≈ X VOID`
- `Price: 1 VOID ≈ Y WC`

We can keep price as a simple static snapshot (no chart needed for v0).

### 5.3 Buy WC (VOID → WC via Pool)

User wants to spend VOID to get WC.

Inputs:

- `Spend VOID: <amountIn>`
- `Min WC to receive: <minWC>` (auto-filled from quote + slippage slider)
- Slippage tolerance:
  - Simple selector: `[0.5%] [1%] [3%] [Custom]`.

Flow:

1. User enters `amountIn` (VOID).
2. Obelisk calls:
   - `GET /api/workcredits/quote/buy-wc?voidIn=<amountIn>`
   - Node computes:
     - `wcOut = (voidIn * reserveWC) / (reserveVoid + voidIn)`
     - Applies slippage checks.
   - Response:
     ```json
     {
       "voidIn": "...",
       "wcOut": "...",
       "priceImpactBps": 123,
       "recommendedMinWCOut": "...",
       "pool": "0xPool",
       "reservesBefore": { "void": "...", "wc": "..." }
     }
     ```

3. UI shows:
   - “You will receive ≈ `<wcOut>` WC”.
   - “Price impact: `<x>` %”.

4. User confirms trade:
   - If **relayer OFF**:
     - Wallet prepares a direct call to `WorkCreditsPoolV1.swapVoidForWC(voidIn, minWCOut, to)`.
   - If **relayer ON**:
     - Wallet prepares a **relayed call**:
       - Under the hood, it signs the appropriate `RelayedCall` struct (using `WorkCreditsRelayerTypes`) and sends it to the node’s relayer endpoint, e.g.:
         - `POST /api/workcredits/relayer/submit`
       - Node handles gas + execution.

UI requirements:

- Clearly indicate whether relayer is being used.
- Show estimated relayer fee (if ON). For v0, a simple static hint like:
  - “Relayer fee: up to 1% of VOID value paid via WC/VOID pool.”

### 5.4 Sell WC (WC → VOID via Pool)

Symmetric to Buy WC.

Inputs:

- `Sell WC: <wcIn>`
- `Min VOID to receive: <minVoidOut>`
- Slippage tolerance.

Flow:

1. User enters `wcIn`.
2. Obelisk calls:
   - `GET /api/workcredits/quote/sell-wc?wcIn=<amount>`
   - Node computes:
     - `voidOut = (wcIn * reserveVoid) / (reserveWC + wcIn)`
     - And returns:
       ```json
       {
         "wcIn": "...",
         "voidOut": "...",
         "priceImpactBps": 456,
         "recommendedMinVoidOut": "...",
         "pool": "0xPool",
         "reservesBefore": { "void": "...", "wc": "..." }
       }
       ```

3. UI shows:
   - “You will receive ≈ `<voidOut>` VOID”.
4. Confirm:
   - Direct pool call vs relayer, same as buy.

Important:

- Obelisk must ensure the user has **approved** the pool contract to spend WC when selling.
  - If not, show an “Approve WC” button first, then “Sell WC”.

---

## 6. Node / API Requirements (v0)

We’re not implementing these here, just specifying what **must exist** for UI to work.

The void-node + relayer layer should expose:

- `GET /api/workcredits/market`
  - Returns pool address, token addresses, reserves, derived prices.

- `GET /api/workcredits/quote/buy-wc?voidIn=...`
  - Returns WC out + price impact + suggested minWCOut.

- `GET /api/workcredits/quote/sell-wc?wcIn=...`
  - Returns VOID out + price impact + suggested minVoidOut.

- `GET /api/workcredits/pending?address=0xUser`
  - Returns pending WC for the user and metadata.

- `POST /api/workcredits/collect`
  - Collects WC to the user’s wallet, using protocol-owned controllers.

- `POST /api/workcredits/relayer/enable`
- `POST /api/workcredits/relayer/disable`
  - Toggle relayer usage for a given address.

- `POST /api/workcredits/relayer/submit`
  - Accepts signed relayed calls prepared by Obelisk. (Details to be specified in a later EIP-712 / types doc.)

All of this is **local node HTTP**, not a hosted SaaS.

---

## 7. Integration with NullFeed & Dashboard (Stubs)

We’re not wiring this yet, but we want to remember:

- **NullFeed**:
  - Show a small WC indicator near username: “WC: <balance>”.
  - Later we can let channels require a minimum WC balance or allow tipping in WC.
- **Dashboard**:
  - Show:
    - Pool reserves.
    - Daily WC volume.
    - Relayer usage (number of relayed txs).
  - Backed by Prometheus metrics later.

These are roadmap items; v0 UI only needs the Wallet + Trading View behavior defined above.

---

## 8. Open Questions / TODO (for backlog)

- Define the exact controller address for WorkCreditsToken on devnet vs mainnet.
- Specify how WC “pending” amounts are calculated from jobs/rewards.
- Decide how relayer fees are parameterized (bps, caps, etc.) and expose in the API.
- Decide if Obelisk should support “advanced” order settings (e.g., custom slippage, time-in-force) or keep it minimal.
- Add Prometheus exporters for:
  - Pool reserves snapshots.
  - Trade counts.
  - Relayer success/failure counts.

