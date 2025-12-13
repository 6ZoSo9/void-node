# VOID / Obelisk Wallet UI Spec (Devnet Snapshot)

Date: 2025-12-12  
Chain: VOID devnet (chainId 2050 on Anvil)  
UI Host: Obelisk UI (Vite/React)  
Scope: Document the current and intended layout/behavior of the Obelisk “mothership” wallet, so we can keep the React code, WorkCredits plumbing, and future NullFeed in sync.

---

## 1. Top-Level Layout

### 1.1 App Shell

- Full-screen background:
  - Dark, radial-gradient style as in current `AppShell` (retro/future vibe).
- Main content max-width: ~1100px centered.
- Font: system UI stack already in use.

### 1.2 Header

- Left side:
  - Small VOID / Obelisk branding text.
  - Tagline along the lines of: “VOID Network · Encryption-first chain for data, compute, and AI”.
- Right side:
  - Tab selector with **three core tabs** (for now):
    - `Wallet`
    - `WorkCredits`
    - `NullFeed`
  - Tabs styled as:
    - Rounded pill buttons.
    - Active tab: gradient border/background, brighter text.
    - Inactive tabs: dark background, subtle border, dimmed text.
- Future additions (not now, but reserved):
  - Chain indicator pill (e.g., `DEVNET`, `MAINNET`, `SAFEBOOT`).
  - Simple connection indicator (e.g., “Local node OK” once we wire node health).

---

## 2. Tabs and Screens

We treat these three tabs as **core**:

1. `Wallet`
2. `WorkCredits`
3. `NullFeed`

### 2.1 Wallet Tab (Devnet Stub → Real Wallet)

**Current state (stub):**

- Renders inside `AppShell` when `activeTab === "wallet"`.
- Shows:
  - Title: “Wallet (Devnet Stub)”
  - Text explaining that this will become the primary wallet view.
  - Bullet list describing:
    - View balances for VOID, WC, LP tokens.
    - Send / receive VOID and WorkCredits.
    - Toggle relayer options and claim pending WC.
  - A note telling users to use the **WorkCredits** tab for now.

**Target behavior (v1):**

- Component: `WalletDashboard` (to be extracted from inline stub later).
- Responsibilities:
  1. **Address panel**
     - Show the current wallet address (devnet for now).
     - Copy-to-clipboard button.
     - Label (e.g., “DEVNET wallet”).
  2. **Balances panel**
     - VOID balance (on devnet).
     - WorkCredits balance.
     - LP token balance (if any).
     - Future: per-chain balances once there are more networks/profiles.
  3. **Send / Receive actions**
     - Simple “Send” form:
       - Asset selector: VOID / WC (later: LP tokens).
       - To address input (re-using the same validation rules we already apply in WorkCredits transfer).
       - Amount input respecting decimals.
       - Button triggers a devnet transaction.
     - “Receive” section:
       - Just the address + QR code in the future.
  4. **Relayer / WorkCredits integration (future)**
     - Toggle: “Use relayer for tx fees (spend WC)” on/off.
     - “Claim pending WC” button to trigger RewardEngine / WorkCredits flow once wired on mainnet/devnet.

**Important:**  
The Wallet tab is the **home base** for humans. Everything else (WorkCredits trades, NullFeed, validators, AI agents) should feel like sub-features built around this.

---

### 2.2 WorkCredits Tab

**Current state (devnet, working):**

- Component: `WorkCreditsDashboard` under `obelisk-ui/src/workcredits/`.
- Backed by:
  - `devnetSwapConfig.ts`
  - `devnetSwapExecutor.ts`
  - `devnetTransferExecutor.ts`
  - `devnetApi.ts` and `useWorkCreditsDashboard.ts` (where present).
- Features already working:
  - Pulls devnet pool + account info from the helper HTTP (`/workcredits/devnet/dashboard/:addr.json` via `ops/void-workcredits-devnet-http.js`).
  - **Swap**:
    - VOID ↔ WorkCredits swap panel, using devnet pool state and math from `devnetSwapExecutor.ts`.
    - UI shows estimated output, simple slippage behavior, and uses the devnet helper for live pricing.
  - **Transfer**:
    - WorkCredits transfer widget using `devnetTransferExecutor.ts`.
    - Address validation logic centralized in `validation.ts`:
      - Empty address: no tx.
      - Bad format / wrong length: show clear error and block submit.
  - Errors are surfaced cleanly instead of throwing raw exceptions.

**Target behavior (v1 devnet panel):**

- Panels:
  1. **Pool Overview**
     - DEVNET WC/VOID reserves (from helper endpoint and Prom exporter).
     - Calculated price:
       - `WC per 1 VOID`
       - `VOID per 1 WC`
     - Optionally show data pulled from `void_workcredits_devnet_*` Prometheus metrics later.
  2. **Your Position**
     - Your VOID balance relevant to swaps.
     - Your WC balance.
     - Your share of the LP (if/when we expose LP tokens directly).
  3. **Swap Widget**
     - Input amount.
     - Direction selector (VOID → WC, WC → VOID).
     - Summary row: price, slippage note.
     - Disabled / error states when:
       - Invalid amount.
       - Missing or invalid address.
       - Devnet helper unreachable.
  4. **Transfer Widget**
     - Recipient address input with the same validation used in scripts.
     - Amount input.
     - “Send WC” button.
     - Clear success / failure messages.

**Mainnet alignment:**

- The devnet widgets should mirror the logic that will be used on VOID mainnet:
  - Same token decimals.
  - Same direction naming (VOID vs WC).
  - Similar flow: swap / transfer / claim.

---

### 2.3 NullFeed Tab

**Current state (stub):**

- Renders a static block:
  - Title: “NullFeed (Devnet Stub)”.
  - Text explaining it will be the off-chain encrypted chat layer.
  - Bullet list describing:
    - Default channels (#general, #tech, #crypto, #void-dev, #sports, #music, #tv, #movies, #games, #religion).
    - Hidden channels via `#<name>` plus per-channel admins and moderation.
    - Future support for images and bots.

**Target behavior (roadmap):**

- Phase 1 (post-mainnet, off-chain only):
  - Connect to an off-chain encrypted messaging backend.
  - Channel list:
    - Default visible channels as above.
    - Additional “hidden” channels accessible only by typing `#channelname`.
  - Basic features:
    - Join/leave channels.
    - Send/receive encrypted messages.
    - Local “pinned” channels.
- Phase 2:
  - Per-channel customization:
    - Toggle images on/off.
    - Bot integrations on a per-channel basis.
    - Admin tools (kick/ban, delete messages, promote admins).
  - Optional anchoring: periodic cryptographic summaries of channel state to VOID chain (not for v0).

---

## 3. Data Sources and Backends

### 3.1 Devnet RPC + Contracts

- RPC: `http://127.0.0.1:8545` (Anvil devnet).
- Protocol state file:
  - `docs/VOID-DEVNET-PROTOCOL-STATE.json` holds addresses for:
    - VoidToken
    - WorkCreditsToken
    - WorkCreditsPoolV1
    - JobQueue, ReceiptRegistry, etc. (for AI jobs and receipts).
- WorkCredits devnet state:
  - `docs/VOID-WORKCREDITS-DEVNET-STATE.json` describes:
    - Pool addresses.
    - Initial liquidity.
    - Example accounts (including the demo wallet used by the UI).

### 3.2 WorkCredits Devnet HTTP Helper

- Script: `ops/void-workcredits-devnet-http.js`.
- Exposes:
  - `/workcredits/devnet/ui`        → main devnet UI page.
  - `/workcredits/devnet/dashboard/:addr.json` → JSON for pool + account view.
- Obelisk UI expects this helper to be running (via `ops/void-workcredits-devnet-ui-open.sh`).

### 3.3 Metrics / Prometheus

- Textfile exporter: `ops/void-workcredits-devnet-helper-exporter.sh`.
  - Scrapes the devnet helper and writes:
    - `/var/lib/node_exporter/textfile_collector/void_workcredits_devnet_helper.prom`.
  - Metrics (examples, exact names in script):
    - Pool WC/VOID reserves.
    - WC per VOID and VOID per WC.
    - Account balances for the demo wallet.
- These metrics will be used later for:
  - Grafana panels under a “WorkCredits Devnet” dashboard.
  - Health checks for the WorkCredits devnet pipeline.

---

## 4. UX Principles

1. **No slop.**
   - Fewer, clearer panels with real meaning.
   - Avoid clutter and half-baked experimental widgets on the main view.
2. **Retro but readable.**
   - Dark, CRT-adjacent aesthetic, but text remains readable.
   - Color-coded hints:
     - Cyan: chain + network info.
     - Magenta/purple: active tab, primary actions.
     - Green: success / health cues.
3. **Human-first Wallet, AI-first Network.**
   - Obelisk Wallet: emphasizes balances, swaps, transfers, relayer toggles, and rewards.
   - Under the hood: VOID Network remains AI-centered (JobQueue, receipts, datasets, models).
4. **Stable routes & components.**
   - Keep:
     - `AppShell`
     - `WalletProvider` and `WalletContext`
     - `WorkCreditsDashboard` (and devnet helpers)
   - Future additions (validators, AI agents, safeboot status) must slot into this structure instead of rewriting it.

---

## 5. Next UI Steps (Concrete)

1. Extract the inline wallet stub into `WalletDashboard.tsx`.
2. Wire `WalletDashboard` into the Wallet tab (AppShell) without changing behavior yet.
3. Add a tiny hook to display the actual devnet wallet address once we finalize `WalletContext` shape.
4. Later: hook balances and send/receive forms to the devnet contracts using the same config that powers the WorkCredits widgets.

This document is the canonical spec for the Obelisk wallet shell as of the WorkCredits devnet milestone. Future changes should be additive and consistent with the structure above.
