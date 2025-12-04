# VOID Work Credits — Dashboard UI (PLAN)

This document describes the planned UI/UX for the Work Credits (WC) dashboard
across Obelisk Wallet and NullFeed. It is PLAN-only; implementation comes
after VOID mainnet is live and stable.

## 1. Goals and principles

The WC dashboard is the **home base for network workers**:

- Validators
- Relayers
- Agents (future)
- Power users

Goals:

- Make it trivial to answer:
  - *“How much WC did I earn and why?”*
  - *“How do I turn WC into VOID?”*
  - *“What do I get for running nodes / relayers?”*
- Stay true to the VOID aesthetic:
  - Retro, terminal-inspired, nested panes.
  - Feels like an old client, **not** a glossy fintech app.
- Be AI-first:
  - Everything machine-readable.
  - Every panel maps back to metrics, receipts, and on-chain state.

The dashboard must be:

- **Read-only safe** by default, with explicit “action” buttons clearly separated.
- **Explorable**: clicking anything drills down instead of sending you to some
  external website.
- **Future-proof** for more roles (agents, data unions, etc.).

## 2. Where the WC dashboard lives

We have two front-ends:

1. **Obelisk Wallet**
   - Primary home for:
     - Wallet balances (VOID + WC),
     - Validator / relayer identity,
     - Node status,
     - Earnings breakdown.
   - WC dashboard appears as a **top-level tab**:
     - `Wallet` / `Mainnet` / `Work Credits`.

2. **NullFeed / Web client**
   - Slim overlay version for:
     - View-only WC stats (balance, basic earnings),
     - WC-powered channel perks (boosts, skins, etc.).
   - WC dashboard appears as:
     - A side panel (`[WC]`) next to channel lists (#general, #tech, etc.),
     - Or a modal overlay the user can summon from the nav.

Same data, different skins:

- Obelisk: operator/worker-centric.
- NullFeed: social/perks-centric.

## 3. Top-level layout (Obelisk WC dashboard)

Main layout (Obelisk):

- **Left column: “Status & balances”**
  - Card: `Work Credits balance`
    - WC balance (with fiat-ish approximation if we have a WC↔VOID price).
    - VOID balance.
    - LLP share (% of the UptimeVaultLLP if applicable).
  - Card: `Role summary`
    - Badges:
      - `Validator`
      - `Relayer`
      - `Agent (future)`
    - Each badge has a small colored indicator:
      - Green = active / healthy.
      - Yellow = degraded.
      - Red = inactive / slashed / misconfigured.

- **Center column: “Earnings timeline”**
  - Chart-style panel showing **WC earned over time**:
    - Tabs:
      - `24h` / `7d` / `30d` / `All`.
    - Stacked view:
      - WC from validation,
      - WC from relaying,
      - WC from agents (future).
  - Hovering a point shows:
    - Epoch / time slice,
    - WC amounts per source,
    - Links: “View epoch details”.

- **Right column: “Actions & plumbing”**
  - Card: `Swap WC ↔ VOID`
    - Embedded AMM call:
      - Simple form:
        - `You pay: [WC | VOID]`
        - `You receive: [VOID | WC]`
      - Shows:
        - Current WC↔VOID rate (from the canonical pool),
        - Slippage warning,
        - Fees, if any.
  - Card: `Use WC`
    - Shortcuts:
      - `Open avatar market`
      - `Open NullFeed perks`
    - Long-term: other WC sinks.

Everything remains **visually nested** in panels that feel like mIRC / old
clients, with clear text + simple graphs rather than modern “glassmorphism”.

## 4. Validator view (Obelisk)

When the wallet controls a validator or is linked to a validator identity:

Validator tab:

- Header:
  - `Validator: <short address or nickname>`
  - Status indicator from mainnet metrics (online/lagging/slashed).
- Key stats:
  - Current stake (VOID),
  - Uptime (last 24h/7d),
  - Blocks proposed,
  - Last block number proposed.

WC section:

- `WC earned (validator)`:
  - Last epoch WC,
  - Last 7d sum,
  - Lifetime earned WC (validator-only).
- Breakdown by factor:
  - Uptime contribution,
  - Participation (attestations, proposals, etc.),
  - Penalties (if any).

Links:

- `View in metrics` → opens a deep-linked “metrics view” (or just describes the
  Prometheus series name for power users).
- `Explain this epoch` → textual breakdown:
  - “You earned X WC because you met uptime threshold Y, proposed Z blocks, had
    Q successful attestations” (backed by on-chain or receipts data when available).

## 5. Relayer / infra view

If the wallet is linked to a relayer identity (matching `relayerAdmin` or
relayer address from LIVE JSON):

Relayer tab:

- Status:
  - Requests served per minute,
  - Last successful job/relay timestamp,
  - Error rate.
- WC stats:
  - WC earned from relaying (time-series),
  - WC per job type (if we classify jobs: tx relays, bridge ops, etc.).

Callouts:

- “You’re earning WC from **relayer work**, not from staking alone.”
- “To increase WC, keep latency low, keep uptime high, and avoid errors.”

## 6. Agent / Job executor view (future)

Agent tab (stub for future):

- Cards:
  - `Jobs completed`,
  - `Receipts confirmed`,
  - `WC earned (agents)`.
- Each receipt is linkable:
  - Show inputs/outputs hashed,
  - Show whether PoP (Proof-of-Processing) was validated.

For now:

- UI shows a **“coming later”** badge.
- Under the hood we make sure the structure is ready to ingest:
  - Agent receipts,
  - WC payouts.

## 7. NullFeed integration: channels + perks

NullFeed needs WC awareness but without over-complicating chat.

### 7.1 WC overlay

In the NullFeed UI:

- Add a `[WC]` button or small credit indicator in the top bar:
  - Shows `WC: <balance>` on hover.
  - Clicking opens the dashboard overlay:
    - `Summary` tab:
      - WC balance,
      - Recent earnings (condensed),
      - Shortcut to full Obelisk WC dashboard (if installed).
    - `Perks` tab:
      - Channel boosts,
      - Cosmetic / theme purchases,
      - Future NFT market entries.

### 7.2 Channel-level customization and WC

For each channel (e.g. #general, #tech, #crypto, #void-dev, hidden channels):

- Channel owners/admins see:
  - `Channel WC settings` panel:
    - Enable/disable:
      - WC-based boosts,
      - WC-based pinned messages,
      - WC-based access tiers (PLAN, optional).
- Users see:
  - “Boost channel with WC” button:
    - Example:
      - Spend X WC to boost channel exposure / priority.
  - “Unlock theme with WC”:
    - Spend WC to apply special skins, color schemes, emoji packs, etc.

All of this is PLAN-only for now, but the dashboard doc defines:

- Where WC shows up in NullFeed,
- How it links to channel customization,
- How it stays consistent with the retro/mIRC-style UI.

## 8. Obelisk / NullFeed navigation model

Within **Obelisk**:

- Left nav includes:
  - `Wallet`,
  - `Mainnet`,
  - `Work Credits`,
  - `NullFeed`,
  - `Settings`.

WC dashboard is its own node with nested views for:

- `Overview`,
- `Validator`,
- `Relayer`,
- `Agents (future)`,
- `Perks / Sinks`.

Within **NullFeed**:

- Channel sidebar:
  - Default channels (#general, #tech, #crypto, #sports, #music, #tv,
    #movies, #games, #religion, #void-dev, #ai-lab, #nullfeed-meta).
- Top bar:
  - `[WC]` indicator / button.
- Channel context menu:
  - `Channel settings (admins)`,
  - `WC perks` entry when WC features are enabled.

## 9. Data + metrics wiring expectations

Every panel in this dashboard must be backed by:

- On-chain data (VOID balances, WC balances, validator / relayer ID).
- Off-chain metrics (Prometheus):
  - WC emitted per role,
  - LLP balances,
  - Relayer performance,
  - Agent receipts coverage.

For developers / power users:

- The UI should expose:
  - The metric names (e.g., `void_wc_emitted_validator_total`).
  - A link or hint on how to query them directly from Prometheus.

This makes the WC dashboard not just pretty, but **inspectable** and verifiable
for anyone running their own node.

## 10. Status / implementation notes

- This document is PLAN-only and describes UI/UX and data flow.
- No contracts, no APIs, and no final component libraries are fixed here yet.
- Actual Obelisk and NullFeed implementations must:
  - Read this doc,
  - Keep the overall structure (tabs, roles, WC↔VOID actions),
  - Hook into the finalized contracts and exporters once VOID mainnet is live.

