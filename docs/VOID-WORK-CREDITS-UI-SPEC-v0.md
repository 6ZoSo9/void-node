# VOID Work Credits UI – v0 Spec

Status: draft, pre-mainnet  
Scope: off-chain Work Credits, on-chain VOID, relayer helper, NullFeed hooks  
Audience: wallet / dashboard implementers (Obelisk, web, node UI)

---

## 1. Core idea

Work Credits (WC) are off-chain “credits” earned by doing useful work for the VOID Network (validators, relayers, infra, AI jobs, etc.).  
They are:

- **Earned** by nodes/agents doing approved work.
- **Represented** on-chain via `WorkCreditsToken` + `WorkCreditsMinter`.
- **Bridged** into VOID via `WorkCreditsRelayerHelper` and a WC⇄VOID relayer path.
- **Visible** to users through a unified dashboard (Obelisk & web), but **gated by metrics** so we don’t ship a broken UI.

This spec covers what the **UI should expose to users**, not the contract internals (tests already cover that).

---

## 2. Contracts and components in play

From current mainnet suite:

- `WorkCreditsToken`
  - ERC-20-style token representing Work Credits.
  - Controlled by governance + minter.
- `WorkCreditsMinter`
  - Admin + RewardEngine-driven.
  - Awards WC to workers (validators, relayers, other roles).
- `WorkCreditsRelayerHelper`
  - Holds config for relayer address and fee.
  - Handles WC→VOID swap flows, with relayer fee taken out.
- `RewardEngine`
  - Emits or accounts for “work” done (epochs, jobs, etc.) and talks to `WorkCreditsMinter`.

UI also talks to:

- **VOID L1** (chainId 2050) RPC.
- **Node HTTP** for receipts / jobs (later).
- **Prometheus** / textfile metrics for health gating.

---

## 3. User roles & views

The UI ultimately has three main personas:

1. **Validator / Node Operator**
   - Runs one or more nodes.
   - Earns WC via RewardEngine.
   - Wants to see earnings, claim WC, and occasionally swap WC→VOID.
2. **Relayer / Infra Operator**
   - Similar to validators but focused on relay / infra jobs.
   - May have additional per-relayer controls (e.g., discount tiers).
3. **Regular User**
   - Might not run a node.
   - Receives WC via airdrops, referrals, or NullFeed / app rewards.
   - Wants to see WC balance, send WC, and redeem it (if allowed) for VOID or sinks (avatars, boosts, etc.).

For v0 UI, **Validator / Operator view** is the priority. Regular user flows come once core is live.

---

## 4. Screens / tabs (high-level)

### 4.1 Command Center (what we already have)

- “VOID Mainnet — Command Center (UI v0)” page.
- Shows:
  - **Core pillars (5m)** – `void:mainnet_pillars:health:last_5m`
  - **UI pillars (WC + dashboard)** – `void:mainnet_ui_pillars:health:last_5m`
  - **Mainnet + UI composite** – `void:mainnet_pillars_with_ui:health:last_5m`
- Status pill at top right: `ALL GREEN` / `ATTENTION` based purely on metrics.
- This remains a **read-only health panel**, not user-interactive.

### 4.2 Work Credits tab (Operator view)

Top-level sections:

1. **Summary panel**
   - Display:
     - Current on-chain WC balance (`WorkCreditsToken`).
     - Current on-chain VOID balance.
     - “Effective WC” (WC minus pending swaps / locks).
   - Simple health line: “WC contracts OK” vs “WC contracts degraded” (from metrics).

2. **Earning WC**
   - Text + simple metrics for:
     - Which roles on this node are currently eligible (validator, relayer, agent, etc.).
     - Last N epochs/jobs with WC awards (later from receipts / RewardEngine).
   - Minimal table in v1:
     - Epoch / Job ID
     - Role
     - WC earned
     - Status (confirmed / pending).

3. **Claim / swap WC → VOID**
   - **v0 design only; not implemented yet.**
   - Flow:
     1. User selects amount of WC to convert.
     2. UI shows:
        - Relayer address.
        - Fee (from `WorkCreditsRelayerHelper`).
        - Expected VOID amount.
     3. User confirms, signs one transaction:
        - Either directly calls `WorkCreditsRelayerHelper` or a helper contract.
   - UI must surface:
     - “Relayer fee %”.
     - “Slippage / config last updated” (config timestamp, later).
   - Only enabled if:
     - WC contracts health gauge == 1.
     - Relayer config health == 1.

4. **Spending WC (sinks)**
   - v0: **textual roadmap**, no actions:
     - Avatar marketplace.
     - NullFeed boosts.
     - Relayer fee discounts.
   - v1+ will show:
     - Available sinks.
     - Cost per sink in WC.
     - CTA buttons to spend WC.

5. **History**
   - v0: simple log with table:
     - Timestamp
     - Type: “Earned”, “Swap to VOID”, “Spend WC”.
     - Amount WC / VOID.
   - Data sources:
     - On-chain events (`Transfer`, `Mint`, `Burn`).
     - Later: off-chain receipts table (aggregated by node).

### 4.3 Wallet / balances view

This is the “normal user” panel, likely shared with Obelisk Wallet:

- Show:
  - VOID balance.
  - WC balance.
  - Estimated USD value (if price feed available).
- Buttons:
  - `Receive` (show addresses + QR).
  - `Send` VOID.
  - `Send` WC (if enabled for that user).
- Network selector: ensure it’s clearly marked as `VOID Mainnet (chainId 2050)`.

This view is **not** a DEX: swaps are done via the WC relayer flow above or a separate DEX UI.

---

## 5. Wallet connection model

We expect multiple front-ends:

- **Obelisk Wallet** (desktop / mobile) – primary.
- **Node dashboard** (what we’re prototyping now).
- **Web UI** (later, possibly hosted by nodes).

Design rules:

- All UIs talk to a **single wallet provider** (EIP-1193-like):
  - “Connect wallet” button.
  - Read accounts / chainId.
  - Sign transactions and messages.
- For dev:
  - Use a simple “local signer” stub (anvil key or node key).
- For mainnet:
  - Obelisk will provide the signer; the web dashboard should treat it as a remote provider.

---

## 6. NullFeed UI tie-in (future)

NullFeed is an mIRC-style, off-chain encrypted chat hosted by nodes.

UI expectations:

- **Channel list** (default channels):
  - `#general`, `#tech`, `#crypto`, `#sports`, `#music`, `#tv`, `#movies`, `#games`, `#religion`.
  - Dev/meta channels: `#void-dev`, `#ai-lab`, `#nullfeed-meta`.
- **Hidden channels**:
  - Join via `#<channelname>` directly.
  - Creators become admins automatically.
- **Admin & customization**:
  - Admins can:
    - Promote admins.
    - Kick / ban users.
    - Delete messages.
  - Later toggles per channel:
    - Images on/off.
    - Bots on/off.
    - Moderation settings (“slow mode”, word filters, etc.).

Work Credits linkage (future):

- Channels and bots can earn WC for:
  - Moderation work.
  - Hosting / relay work.
  - AI agents providing useful responses.
- UI should let users see:
  - WC earned via NullFeed.
  - Sinks (boosts, bot fees, premium channels) paid in WC.

None of this is implemented now; this section is a **roadmap stub**.

---

## 7. Metrics and gating

Before any interactive WC / wallet feature is shown as “live” to users, the UI must check:

- `void:mainnet_pillars:health:last_5m == 1`
- `void:mainnet_ui_pillars:health:last_5m == 1`
- `void:mainnet_pillars_with_ui:health:last_5m == 1`
- Work Credits test suite passing (dev gauge, later exposed as:
  - `void_dev_work_credits_tests_ok` or similar).

If any of these are red:

- UI should degrade gracefully:
  - Show “READ-ONLY / CHECK PILLARS” state.
  - Disable buttons for swaps, claims, or WC sinks.
  - Clearly say “Contracts/UI not healthy; try again later.”

This ensures we never have a “pretty but lying” dashboard.

---

## 8. What we implement **before** mainnet

Pre-mainnet priorities related to this spec:

1. Keep Work Credits contracts and tests green (already done via `dev-work-credits-health.sh`).
2. Expose a **simple Prometheus/textfile gauge** for “WC dev health OK”.
3. Keep the UI command center **read-only** and metrics-driven.
4. Do **not** implement real:
   - Wallet connect.
   - WC swap / claim flows.
   - NullFeed UI.
   until:
   - Mainnet bootstrap is rehearsed and ready.
   - Last-mile, receipts, and RewardEngine paths are stable.

This spec is a **contract** for future UI work, so we don’t have to keep it in our head while we finish mainnet.

