# VOID Network — Work Credits UI & Ops Dashboard Spec

This document defines the **application-level dashboard** for Work Credits (WC), the WC/VOID LLP, and gasless UX. It is for **Obelisk Wallet / NullFeed UI**, not Grafana.

Goal: make it trivial for a user to see:

- How much WC and VOID they have
- How their node/agent earned WC
- How to swap WC ↔ VOID
- Whether gasless flows (relayers) are healthy
- How much “work” the network is doing overall

---

## 1. Placement in the Product

The **VOID Ops Dashboard** is a top-level section shared between:

- **Obelisk Wallet** (mobile / desktop)
- **NullFeed** (web / embedded inside Obelisk)

Suggested navigation:

- `Home`
- `Wallet`
- `NullFeed`
- `VOID Ops`  ← **this spec**
- `Settings`

Within `VOID Ops`, we have multiple tabs/cards dedicated to Work Credits.

---

## 2. Top-Level Overview Card

At the top of the VOID Ops Dashboard:

**[Card: Work Credits Overview]**

Fields:

- **VOID balance**
  - On-chain balance of $VOID in the user’s wallet(s).
- **WC balance**
  - On-chain balance of Work Credits token for the user.
- **Work score (24h)**
  - Aggregated WC awarded in last 24h.
  - Broken down by:
    - validator rewards
    - node uptime / storage
    - AI agent jobs
    - other infra work

- **Quick actions**
  - Button: `Swap WC → VOID`
  - Button: `View Work History`
  - Button (future): `Spend WC on NFTs`

This gives users a simple answer: “What do I have, and how did I earn it?”

---

## 3. Work Credits Detail Tab

**Tab: Work Credits**

This tab gives deeper visibility into WC.

### 3.1 Balances & History

Panels:

1. **Balances**
   - `WC balance: <amount>`
   - `VOID balance: <amount>`
   - `Estimated WC value in VOID` (rough quote via LLP price).

2. **Work Credits history**
   - Table or list:
     - timestamp
     - amount
     - category (bootstrap, mainnet-core, safeboot, ai, nullfeed, etc.)
     - source (validator, node, agent, manual)
   - Data source: on-chain logs from `WorkCreditsMinter` + off-chain aggregations, or receipts.

3. **WC by pillar (current totals)**
   - Bar chart or list using metrics:
     - `void:work_credits:total_by_pillar`
   - Example:
     - mainnet-core: 300
     - later: safeboot, devnet, nullfeed, etc.

4. **WC by agent (current totals)**
   - Breakdown from:
     - `void:work_credits:total_by_agent`
   - Example:
     - ai: 200
     - zoso: 100
     - future: validator addresses, other agents.

### 3.2 Health Indicators

Use the existing Prometheus-derived health:

- `void:work_credits:health_v3:last_5m`

UI presentation:

- If `== 1`: show **“Work Credits system: Healthy”** with a green indicator.
- Else: show **“Work Credits system: Unhealthy / degraded”**, with a link to diagnostics (for power users).

---

## 4. WC/VOID Swap Tab

**Tab: Swap (WC ↔ VOID)**

This is the front-end to `UptimeVaultLLP` and the relayer logic.

### 4.1 Swap Widget

Single unified widget with a toggle or two entries:

- From: WC  
  To: VOID  
- From: VOID  
  To: WC  

Fields:

- Input amount (e.g. `100 WC`).
- Output estimate (e.g. `≈ 0.1234 VOID`).
- Slippage warning if large trades.
- Fee estimate:
  - Swap fee (LLP fee)
  - Gas fee (if not using gasless)
  - WC fee (if using gasless mode).

Modes:

- **Normal (user pays gas)**:
  - User’s wallet sends the tx, gas paid in VOID from the user.

- **Gasless (relayer)**:
  - If enabled:
    - Show WC fee required to cover gas via relayer.
    - Show whether relayer is currently healthy (based on relayer metrics, see below).
    - Sign a message instead of broadcasting directly.

### 4.2 LLP Health Card

Side card next to the swap widget:

- `LLP VOID reserve: X`
- `LLP WC reserve: Y`
- `Price (WC per VOID): P`
- `Price (VOID per WC): 1/P`
- `Pool fee: f bps`

Visuals:

- Simple chart showing recent price and volume (if available).
- Health state:
  - Green if reserves above configured thresholds.
  - Yellow/red if liquidity is too thin or metrics indicate issues.

This makes the WC/VOID pool tangible: users can see it’s real, has depth, and evolves with usage.

---

## 5. Relayer & Gasless UX Status

**Tab/Section: Gasless Status**  
(or a card inside the Swap tab for most users)

Goals:

- Show whether gasless UX is available.
- Show that it’s funded and healthy.
- Show that it is *not* an infinite subsidy — just convenience built on WC economics.

### 5.1 Status Card

Fields:

- Overall status:
  - `Gasless swaps: Enabled / Disabled / Degraded`.
- For each relayer (or aggregated):
  - `relayer ID`
  - `VOID balance (approx)`
  - `WC collected (lifetime)`
  - `VOID spent on gas (lifetime)`
  - `VOID P&L (lifetime or last 24h)`

These values map to future Prometheus metrics as described in the relayer spec.

UI behavior:

- If relayer P&L is negative over some period → show warning and a short explanation.
- If relayer VOID balance drops below a safety threshold → show “Gasless swaps may be limited or disabled soon”.

For regular users, simplify copy to:

> “Gasless swaps are paid for using your Work Credits. If relayers can’t stay profitable in VOID, gasless will pause until conditions improve.”

---

## 6. NFT & WC Sink Tab (Future)

**Tab: WC Store / Avatars (Future)**

This will go live when NFT marketplace and WC sinks are implemented.

Panels:

1. **Avatar / background gallery**
   - Items priced in **WC only**.
   - Shows:
     - Name
     - Preview image
     - Price in WC
     - “Buy” button (with gasless option if available)

2. **Owned items**
   - List of NFTs owned by the user:
     - Equipped avatar/background for NullFeed.
     - Status / rarity.

3. **WC burn stats**
   - Display how much WC the user has burned on items.
   - Optional global stat:
     - “Total WC burned on avatars/backgrounds”.

Under the hood:

- Purchases:
  - Consume WC (burn or send to sink).
  - May involve VOID swaps indirectly if the marketplace needs VOID for anything.
- UI can reuse the same gasless flow / relayer logic:
  - Show WC fee that covers gas.
  - Show that VOID gas is paid *indirectly* via LLP and relayers.

---

## 7. Dev / Power User Panels

For devs and power users, add an “Advanced” section under VOID Ops:

- Raw metrics view (read-only):
  - `void_work_credits_total` by agent/pillar.
  - `void:work_credits:health_v3:last_5m`.
  - LLP reserve stats (VOID/WC).
  - Relayer VOID balances and P&L.

- Links to:
  - `docs/work-credits-plan.md`
  - `docs/work-credits-relayer-spec.md`

So anyone reading the UI can jump straight into the design docs used to build it.

---

## 8. Non-Goals for v0

This spec **does not** require:

- Implementing actual relayer infrastructure yet.
- Implementing signature formats or EIP-712.
- Implementing NFT marketplace contracts.

It only defines:

- How the **user-facing dashboard** must present Work Credits, WC/VOID pool, and gasless UX.
- What metrics and concepts must be visible so the system feels transparent and not magical.

Implementation will come later in Obelisk / NullFeed front-end code, using:

- On-chain data (balances, events).
- Off-chain metrics (Prometheus exporters).
- The existing WC contracts (`WorkCreditsToken`, `WorkCreditsMinter`, `UptimeVaultLLP`).
