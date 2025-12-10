# Obelisk Wallet — WorkCredits UI & Flows (v0)

## 1. Scope

This doc defines the **human-facing** WorkCredits (WC) UI inside Obelisk Wallet.

- It does **not** define on-chain economics or contract internals (that lives in the WorkCredits spec + Solidity).
- It **does** define:
  - What users see in the wallet for VOID and WC.
  - How they toggle the relayer, collect pending WC, and trade WC/VOID.
  - How this fits into the overall Obelisk / NullFeed UI layout.

Goal: when we build the Obelisk front-end, this doc is the baseline for what must be visible and clickable for a normie.

---

## 2. Obelisk main navigation (baseline)

Obelisk Wallet will have the following top-level tabs:

1. **Home**
   - High-level summary for humans:
     - Current network (Devnet / Mainnet).
     - Node status (online / syncing / validator / non-validator).
     - High-level stats: latest block, TPS band, WorkCredits pillar health, etc.
   - “What’s new” / release notes cards (optional later).

2. **Wallet**
   - Core balances + send/receive:
     - **VOID balance**
     - **WorkCredits (WC) balance**
   - Actions:
     - **Send** (VOID or WC).
     - **Receive** (show address / QR).
   - Relayer controls:
     - **Toggle relayer ON/OFF** (per-user choice).
     - Relayer status (idle / processing / error).
   - WorkCredits:
     - **“Collect pending WC” button**:
       - Shows how many WC are pending claim.
       - On click: triggers the on-chain claim flow (or calls a relayer that does it on user’s behalf).

3. **Trading View (WC/VOID)**
   - Focus: WC/VOID AMM pool and simple trading UI.
   - Panels:
     - **Price panel**:
       - WC per 1 VOID.
       - VOID per 1 WC.
     - **Pool reserve panel**:
       - VOID reserve.
       - WC reserve.
     - **User position panel (later)**:
       - LP share % (if user is providing liquidity).
   - Actions:
     - **Buy WC with VOID**:
       - Input: amount of VOID to spend.
       - Output: estimated WC to receive.
       - Slippage + minimum received.
     - **Sell WC for VOID**:
       - Input: amount of WC to sell.
       - Output: estimated VOID to receive.
     - (Later) **Provide liquidity / remove liquidity**:
       - Deposit VOID + WC into the pool.
   - All prices and reserves should match the on-chain WorkCreditsPool contract and/or the devnet/mainnet WC pool metrics.

4. **NullFeed**
   - Embedded chat / channel UI (mIRC-style):
     - Channel list (e.g., #general, #tech, #crypto, #sports, #music, #tv, #movies, #games, #religion, plus dev/meta channels).
     - Ability to **join custom channels** via `#<channelname>`.
   - Channel creators:
     - Automatically become admins.
     - Can promote other admins.
     - Can kick/ban users.
     - Can delete messages.
   - Future (roadmap, not v0):
     - Per-channel options for images, bots, etc.
     - Password-protected channels.

5. **NFTs**
   - View any VOID-related NFTs (avatars, channel cosmetics, future marketplace items).
   - Later:
     - Buy/sell NFTs (with VOID and/or WC).
     - Link NFTs to NullFeed avatars and channel cosmetics.

6. **Dashboard**
   - Network health for power users:
     - Head block, fork status, last non-empty block, txRoot health, validator set status, WorkCredits pillar health.
   - Validator view (if user is a validator or wants to become one):
     - Their staking balance / rewards (VOID and/or WC in future).
     - Node health, uptime, penalties (if any).

---

## 3. Wallet tab — detailed WorkCredits behavior

### 3.1 Balances display

On the **Wallet** tab:

- Show **VOID** and **WC** in a simple list:

  - `VOID: <balance>` (with USD estimate later if we have oracle/market data).
  - `WorkCredits (WC): <balance>`.

- Keep the display dead simple:
  - No weird decimals for humans: show a short, rounded number (with a hover/advanced toggle to show full 18-dec precise value).
  - Label WC clearly as “Work Credits” with a short subtitle like “Earned for contributing to VOID Network”.

### 3.2 Send / Receive

- **Send**:
  - Token selector: VOID / WC.
  - Recipient address input.
  - Amount input.
  - “Max” button.
  - Basic gas / fee summary (VOID-based network fee; WC itself is not used for gas).

- **Receive**:
  - User’s address (copyable).
  - QR code for mobile wallets.
  - Optionally, short “Share” link later (off-chain).

### 3.3 Relayer controls

- **Relayer toggle** in the Wallet tab:

  - Label: “Use relayer for on-chain actions”.
  - States:
    - ON: wallet is allowed to use relayer for certain tx flows (e.g., WC claims, simple swaps).
    - OFF: all txs go direct from the user’s key.

- Status indicators:
  - “Relayer status: OK / Degraded / Offline”.
  - Link to a small diagnostics panel (e.g., last job, last error).

- This must be simple enough that a non-dev understands what flipping the toggle does in plain language.

### 3.4 “Collect pending WC” button

- Show a dedicated card in the Wallet tab:

  - Title: “Work Credits”.
  - Body:
    - “Pending WC to collect: `<X>`”.
    - Maybe a short explanation: “These Work Credits are earned by running nodes or performing jobs. Click below to claim them.”

- Button: **“Collect pending WC”**:
  - If relayer ON:
    - Sends a minimal request to the relayer.
    - Relayer submits the claim tx on-chain.
  - If relayer OFF:
    - Wallet sends the claim tx directly from the user’s account.

- After claim:
  - UI updates balances:
    - Pending WC goes to 0 (or lowers appropriately).
    - WC wallet balance increases.
  - Optional toast: “Collected `<X>` WC”.

---

## 4. Trading View — WC/VOID AMM

The **Trading View** tab is focused on the **WorkCreditsPool (WC/VOID)** pair.

### 4.1 Data to show

- From the WC/VOID pool:
  - Current WC per 1 VOID price.
  - Current VOID per 1 WC price.
  - Total VOID reserve.
  - Total WC reserve.

- Optional charts (later):
  - Price over time (simple line chart).
  - Volume over time (if we track it).
  - Pool size over time.

### 4.2 Simple buy / sell UI

Minimal but not trash:

- Mode selector: **Buy WC** / **Sell WC**.

- For **Buy WC**:
  - Input: “You pay: `<amount>` VOID”.
  - Output: “You receive (est.): `<amount>` WC”.
  - Slippage + minimum received.
  - “Swap” button.

- For **Sell WC**:
  - Input: “You pay: `<amount>` WC”.
  - Output: “You receive (est.): `<amount>` VOID”.
  - Slippage + minimum received.
  - “Swap” button.

- Later:
  - Show route info (WC/VOID pool name/version).
  - Support limit orders or more advanced behavior if we ever build it — but v0 is pure AMM-style swaps.

### 4.3 Future: LP view

Not needed for mainnet day 0, but we plan for:

- Panel for liquidity providers:
  - “Your pool share: `<X>%`”.
  - “Value of your position: `<Y>` VOID + `<Z>` WC”.
- Buttons:
  - “Add liquidity”.
  - “Remove liquidity”.

This should align with the WorkCreditsPool contract and/or any LP tokens we issue.

---

## 5. NullFeed, NFTs, and WorkCredits interaction (high-level)

### 5.1 NullFeed

- WC will **not** be required to chat in v0.
- Later:
  - WC can be used for:
    - Channel cosmetics (themes, emojis, stickers).
    - Priority posting or anti-spam measures.
    - Optional “boosts” for channels.

### 5.2 NFTs

- Future plan:
  - Use WC to mint or buy **avatar NFTs** and **channel cosmetics**.
  - Obelisk’s NFT tab shows:
    - Owned avatar(s).
    - Owned channel themes / cosmetics.
  - NullFeed reads from NFTs to render the user’s avatar and channel look.

---

## 6. Dashboard integration

The **Dashboard** tab should expose WorkCredits health in a way power users can see at a glance:

- “WorkCredits mainnet pillar”: 0/1 (from `void_mainnet_workcredits_health`).
- “WorkCredits plan pillar”: 0/1 (from `void_mainnet_workcredits_plan_health`).
- Tooltip or detail card:
  - Explains whether mainnet WC token / pool are configured or stubbed.
  - Links back to the WorkCredits pillar doc.

The dashboard does **not** need to show user balances — that stays in the Wallet tab. It shows whether the system as a whole is wired correctly.

---

## 7. Non-goals for v0

Out of scope for v0 Obelisk WC UI (but on the roadmap):

- Hosting arbitrary **websites** from nodes with on-chain URL mapping.
- Full LP management (add/remove liquidity UI).
- Advanced order types (limit orders, DCA, etc.).
- Complex tax / accounting views for WC/VOID.

We will handle those after mainnet once the core chain, WorkCredits contracts, and relayer logic are stable.

