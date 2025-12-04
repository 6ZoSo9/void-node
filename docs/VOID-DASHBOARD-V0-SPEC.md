# VOID / Obelisk / NullFeed Dashboard — v0 Spec

Status: **v0 stub**  
File: `src/ui/MainDashboard.tsx`  
Scope: Single integrated UI surface for **node**, **wallet**, **NullFeed**, and future **Work Credits / marketplace** views.

---

## 1. Goals

- Give users **one place** to see:
  - Node / mainnet health (heads, last-mile, txroot).
  - Wallet basics (VOID, Work Credits).
  - NullFeed channels (mIRC-style switching).
- Make it easy to extend with:
  - Work Credits (WC) sinks and relayer flow.
  - NFT marketplace and “tradeview” panels.
  - Per-channel and per-node metrics tiles.

This spec is for the **UI shell** only. Wiring into real APIs / metrics happens later.

---

## 2. Component: `MainDashboard`

Location: `src/ui/MainDashboard.tsx`  
Exports: `default` React component.

### 2.1 Top-level layout

- Full-screen dark gradient background, retro/future VOID style.
- Top bar:
  - Φ icon and title: **VOID / Obelisk**.
  - Subtitle: `Node · Wallet · NullFeed`.
  - Nav pills:
    - **Overview** (default).
    - **Wallet**.
    - **NullFeed**.
    - **Marketplace (soon)** — disabled.
    - **Tradeview (soon)** — disabled.
  - Right side:
    - Pillars health pill: `Pillars: GREEN` (stub).
    - Active wallet address + VOID/WC balance summary (stub, static).

### 2.2 Tabs (high level)

- **Overview tab**
  - Left column: Node/pillars/WC summary.
  - Middle column: Wallet quick actions.
  - Right column: embedded NullFeed panel.
- **Wallet tab**
  - Wallet overview (VOID, WC, validator status placeholder).
  - Quick actions (send, swap WC→VOID, receive, export history).
- **NullFeed tab**
  - For now: explanatory text that full-screen NullFeed view will live here later.
  - v0 chat UI lives in Overview panel.

No actual network calls yet — all “live” values are stubbed in component state.

---

## 3. Node & mainnet panel (Overview/left)

Component section: **Node card** in Overview tab.

### 3.1 Stub data

Hard-coded `nodeStatus` object:

- `chainId: 2050`
- `network: "VOID mainnet (plan-ready)"`
- `head: 1717588` (example main head).
- `safebootHead: 231260` (example safeboot head).
- `safebootGap: 1486328` (example gap).
- `txrootHealthy: true`
- `lastmileHealthy: true`

These must later be replaced with **real data from the node**:

- `/head.txt` or Prometheus `void_head_number`.
- Safeboot head from safeboot node.
- `void_txroot_health` and last-mile health gauges.
- Safeboot gap from Prom rules (`void_header3_*` / gap metrics).

### 3.2 Visuals

- Status pill “Healthy”.
- Tiles:
  - Head (main).
  - Head (safeboot).
  - Safeboot gap.
  - Last-mile status (“Non-empty & healthy”).
- Footer row:
  - `TxRoot health: OK/BAD` based on `txrootHealthy`.
  - “View metrics” button — currently a stub; later should link to:
    - Prometheus/Grafana URLs, or
    - Local `/__void/metrics/...` summary route.

---

## 4. Work Credits v0 panel (Overview/left)

Component section: **Work Credits card** in Overview tab.

### 4.1 Stub data

Hard-coded `wcHealth` object:

- `ciHealth: 1`
- `policyProfile: "dev"`

This should later reflect **real WC health**:

- `void_mainnet_work_credits_ci_health` or similar gauge from
  `ops/void-mainnet-work-credits-health.sh` textfile exporter.
- Policy profile from `config/void-work-credits-policy.*.json`.

### 4.2 Behavior

- Shows:
  - “Work Credits (WC) represent off-chain/AI work.”
  - CI badge: `PASS` / `FAIL` based on `ciHealth`.
  - Stub text about:
    - Contracts + sinks + relayer helper being green.
    - Future link to WC spec.

- “View WC spec” button:
  - For now: no click handling.
  - Later: open `docs/VOID-WORK-CREDITS-SPEC.md` in docs viewer or external site.

---

## 5. Wallet summary and quick actions (Overview/middle + Wallet tab)

### 5.1 Stub wallet summary

`walletSummary` object:

- `address: "0x7D49...E6f1"` (example).
- `voidBalance: "0.00"`.
- `wcBalance: "0"`.

Later these should be populated from:

- Obelisk wallet / node RPC (on-chain VOID).
- WC balances (WorkCreditsToken) on mainnet.

### 5.2 Overview quick actions

Buttons (no-op for now):

- **Send VOID**
- **Swap WC → VOID**
- **Stake / Validate**
- **Advanced wallet**

Expected future wiring:

- **Send VOID** → opens send form hitting node transaction API (`/tx/submit`).
- **Swap WC → VOID** → calls WorkCreditsRelayerHelper path:
  - Either local node helper script, or
  - On-chain call sequence from wallet.
- **Stake / Validate** → validator registration / staking flow.
- **Advanced wallet** → opens dedicated wallet management view.

### 5.3 Wallet tab

- Wallet overview cards:
  - VOID balance.
  - Work Credits balance.
  - Validator status (placeholder “Coming soon”).
- Explanatory text:
  > “This page will eventually show validator earnings, node uptime, WC
  > earn/burn flows, and a full transaction history.”

- Second card: **Quick actions** (same actions as overview).

---

## 6. NullFeed v0 (Overview/right and NullFeed tab)

### 6.1 Channel model

`Channel` type:

- `id: string` — internal ID (without `#`).
- `name: string` — displayed label (`#general`, etc.).
- `isDefault: boolean` — default vs user-created (“hidden”).

Default channels hard-coded:

- `#general`, `#tech`, `#crypto`, `#sports`, `#music`,
  `#tv`, `#movies`, `#games`, `#religion`,
  `#void-dev`, `#ai-lab`, `#nullfeed-meta`.

These match the earlier NullFeed design:

- Default visible channels.
- Dev / AI / meta lanes.

### 6.2 Messages model

`ChatMessage` type:

- `id: number` — local incrementing ID.
- `channel: string` — channel id (no `#`).
- `author: string` — e.g. `"you"` or `"system"`.
- `text: string`.
- `ts: string` — timestamp string.

Initial mock messages:

- Welcome message in `#general`.
- “Mainnet pillars: GREEN. Work Credits v0: GREEN.” in `#void-dev`.

All messages currently live only in React component state.

### 6.3 UI behavior

- Channel chips:
  - Click to switch `activeChannel`.
  - Default vs hidden channels are visually distinguished.
- “Join / create channel”:
  - Input accepts `#channel` or `channel`.
  - If channel doesn’t exist:
    - Creates new `Channel` with `isDefault: false`.
    - Label shows `(hidden)` marker.
  - Sets `activeChannel` to the joined/created channel.
- Chat window:
  - Scrollable messages area.
  - Timestamp, author, text per line.
- Input:
  - Multiline textarea + **Send** button.
  - `handleSendChat()` just appends to local state.

### 6.4 Future wiring (post-mainnet)

- Backend:
  - Use node-hosted NullFeed chat service (off-chain, encrypted).
  - Map channels to on-chain **channel IDs** for discovery / moderation.
- Admin / moderation:
  - Channel creators → admins with:
    - Ban / kick.
    - Delete messages.
    - Promote other admins.
  - Per-channel policy flags:
    - Images on/off.
    - Bots allowed.
    - Logging/retention rules.
- Integration:
  - Eventually, a full-screen NullFeed tab:
    - Multi-column layout.
    - Private / passworded channels.
    - AI agent channels.

---

## 7. Marketplace & Tradeview stubs

### 7.1 Marketplace tile

- Located in Overview/middle column.
- Visual only:
  - “NFT Marketplace (soon)”.
  - Mentions:
    - “VOID avatars, AI artifacts, and WC-powered items.”
  - Button `Open marketplace (after mainnet)` — disabled.

Future expectations:

- Entry point for:
  - NFT marketplace for VOID avatars and AI outputs.
  - WC as “earnable” budget, VOID for settlement.
- Integration with WC policy / sinks:
  - e.g. spend WC to mint / upgrade NFTs.

### 7.2 Tradeview

- Top nav button, disabled for now.
- Future intention:
  - Token / WC / NFT “tradeview”:
    - Price charts, depth, position view.
  - Could embed external DEX or custom on-chain analytics.

---

## 8. Integration plan (later)

v0 dashboard is **not wired** into the running node yet. Future steps:

1. **Decide front-end host**:
   - Obelisk desktop/mobile shell.
   - Browser-based front-end served from void-node.
2. **Create React entrypoint & bundler config**:
   - Vite/Next/other, depending on project choice.
   - Render `<MainDashboard />` as the root app.
3. **Add API adapters**:
   - Fetch node health from:
     - Local HTTP endpoints (`/head.txt`, `/health/txroot3`, etc.).
     - Or from Prometheus proxies.
   - Fetch balances and WC info via:
     - Node RPC / Obelisk wallet.
     - WC health exporter.
4. **Guardrails**:
   - UI must never block or endanger node.
   - All calls should be:
     - Read-only where possible.
     - Clearly scoped.
   - Actions (send, swap, stake) must go through existing tx-submit path with proper checks.

For now, the spec + TSX component are enough to:

- Capture the design.
- Let us wire it safely later without re-inventing the layout.

