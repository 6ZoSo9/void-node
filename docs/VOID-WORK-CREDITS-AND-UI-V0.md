# VOID Work Credits & UI — V0 Plan

## 0. Purpose

This document defines the **v0 plan** for Work Credits (WC) and the VOID Mainnet UI:

- What Work Credits are and how they relate to VOID.
- Which contracts exist (and how they’re wired).
- What we will (and will not) do before mainnet.
- The **minimum** user-facing + agent-facing flows the UI must support.
- How all of this connects to the existing mainnet pillars and dashboards.

This is a **plan**, not a promise of immediate implementation. Code and metrics always win; the doc is here to keep them aligned.

---

## 1. Work Credits (WC) — Concept

### 1.1 High-level concept

- **VOID** is the base asset (MAX_SUPPLY = 666,666,666; premine + 100-year emissions).
- **Work Credits (WC)** are a **separate ERC-20–style unit** that represent:
  - “You contributed useful work to the VOID Network.”
  - “You are entitled to some claim on VOID, perks, or ecosystem utilities.”

WC are:

- Minted in response to *real work* (validator work, AI jobs, relayer/infra work, etc.).
- Non-magical: they are just a token and all special behavior comes from contracts and off-chain rules.
- Designed to be easy for agents and humans to reason about.

In v0, WC exist as:

- A core token contract (`WorkCreditsToken`).
- A governance-controlled **minter** (`WorkCreditsMinter`).
- A **relayer helper** (`WorkCreditsRelayerHelper`) sitting next to a WC↔VOID pool.

### 1.2 Why a separate token?

Reasons we are not just “airdropping VOID” directly:

- We want **clean accounting**: total emissions of VOID are hard-capped and governed by `RewardEngine`.
- We want a flexible layer where:
  - Validators / workers earn WC.
  - The system (via pools and policies) decides how WC maps to VOID over time.
  - We can plug in other sinks (avatars, NFTs, boosted privileges, etc.) without touching base VOID economics.

---

## 2. Contracts & Roles (current state)

### 2.1 Contracts (implemented and tested)

Work Credits contracts implemented:

- `WorkCreditsToken`
  - Standard ERC-20–style token with:
    - `governance` (admin).
    - Optional extra permissions around mint/burn via a minter.
  - Supports:
    - `transfer`
    - `transferFrom`
    - `mint` (by minter/governance only)
    - `burn`/`burnFrom` (by minter/governance or authorized caller).

- `WorkCreditsMinter`
  - Controlled by an **admin** address.
  - **Only** the configured Reward Engine (or other authorized system) can “award” WC.
  - Guards:
    - Cannot award to zero address.
    - Cannot award zero amount.
    - Only admin can change admin.
    - Only admin can set Reward Engine address.

- `WorkCreditsRelayerHelper`
  - Sits between:
    - A WC holder.
    - A WC↔VOID pool / relayer / router.
  - Supports at least:
    - Direct swap: “swap WC for VOID directly”.
    - Relayer path: “swap WC for VOID via relayer and charge a small fee”.
  - Has:
    - `admin` (can adjust relayer address and fee).
    - Configurable basis points fee or similar.

### 2.2 Roles in PLAN JSON

As of now (`wc-plan-dump`):

- `config/void-mainnet-bootstrap-mainnet.dev.json` and `.live.json` both contain:

Core contracts (all still 0x0):

- `voidToken`
- `voidTreasury`
- `opsTreasury`
- `rewardEngine`

Work Credits contracts (all still 0x0):

- `workCreditsToken`
- `workCreditsMinter`
- `workCreditsRelayerHelper`

Roles relevant to WC:

- DEV config:
  - `rewardEngineOwner`      = dev rehearsal address.
  - `opsTreasuryAdmin`       = dev rehearsal address.

- LIVE config:
  - `rewardEngineOwner`      = real mainnet role.
  - `opsTreasuryAdmin`       = real mainnet role.

This is intentional:

- PLAN knows WC exist and which roles should own the wiring.
- No WC contracts are deployed yet.
- Bootstrap scripts won’t accidentally treat WC as live until we explicitly wire them.

---

## 3. Bootstrap & Wiring Plan (phased)

### 3.1 Phase A — Pre-mainnet (current)

Goals of this phase:

- Contracts compiled and **fully tested** (done).
- PLAN JSON extended with **WC contract placeholders** and relevant roles (done).
- CI + Prometheus + UI health for WC pillar (done):
  - `void_mainnet_ui_work_credits_health`
  - `void_mainnet_ui_pillars_health`
  - `void:mainnet_pillars_with_ui:health:last_5m`
- No WC contracts deployed on any “real” mainnet RPC.
- No WC addresses written into the live PLAN JSON yet.

What we do **not** do in Phase A:

- We do not deploy Work Credits on real mainnet.
- We do not wire WC to RewardEngine yet.
- We do not promise any specific WC↔VOID exchange rate.

### 3.2 Phase B — Dev rehearsal (anvil / devnet only)

(For later; not implemented yet but this is the outline.)

On dev-only chainId 2050 (our devnet):

1. Deploy VOID core stack via existing dev bootstrap script.
2. Deploy:
   - `WorkCreditsToken`
   - `WorkCreditsMinter`
   - `WorkCreditsRelayerHelper`
3. Wire:
   - `WorkCreditsToken.governance` → WC governance role (likely ops or a dedicated WC admin).
   - `WorkCreditsMinter.admin` → `rewardEngineOwner`.
   - `WorkCreditsMinter` granted mint permission on `WorkCreditsToken`.
   - `WorkCreditsRelayerHelper.admin` → `opsTreasuryAdmin` or a dedicated relayer admin.

4. Point `RewardEngine` to use `WorkCreditsMinter` (or an equivalent path) so that:
   - When RewardEngine decides “node X earned N units of work”, it calls `WorkCreditsMinter.award(...)`.

5. Optionally seed a small WC↔VOID pool on devnet (depends on how far we want to go before mainnet).

JSON PLAN changes (dev only):

- Write WC contract addresses into *dev* JSON.
- Keep live JSON still at 0x0.

### 3.3 Phase C — Mainnet bootstrap

This is **after**:

- Mainnet core bootstrap plan is finalized and rehearsed.
- Key ceremony is done and mainnet addresses are blessed.

Steps (conceptual):

1. Run mainnet bootstrap script to:
   - Deploy VOID core stack (VoidToken, VoidTreasury, OpsTreasury, RewardEngine, ValidatorSet, gates).
   - Deploy Work Credits stack (WorkCreditsToken, WorkCreditsMinter, WorkCreditsRelayerHelper).
2. Wire roles (on-chain and off-chain):
   - Transfer WC governance to the intended governance address.
   - Set `WorkCreditsMinter.admin` to the correct admin.
   - Register `RewardEngine` as the **only** caller allowed to award WC.
   - Configure relayer helper admin + fee.

3. Update LIVE PLAN JSON with **real** deployed addresses:
   - `contracts.workCreditsToken`
   - `contracts.workCreditsMinter`
   - `contracts.workCreditsRelayerHelper`

4. Snapshot the PLAN + metrics:
   - WC-related health gauges must be 1.
   - `void:mainnet_pillars_with_ui:health:last_5m` must remain green.

---

## 4. User-Facing UI Requirements (v0 and beyond)

The UI we’re building (main dashboard + future Obelisk / NullFeed views) must support:

### 4.1 Wallet & balances

Minimum:

- Show **VOID balance** for the connected wallet.
- Show **WC balance** for the connected wallet.
- Show **pending WC** (if/when we add an off-chain or on-chain notion of “pending rewards”).

Details:

- Reads via RPC provider (Obelisk / browser wallet), not from backend secrets.
- Must be agent-friendly:
  - Simple JSON APIs for “balances for address X” so bots can act on behalf of users.

### 4.2 Work Credits claim / earn view

We need a dedicated “Work Credits” section showing:

- **How WC are earned**:
  - Running validator / full node.
  - Running AI agents or relayers (future).
- **Your WC stats**:
  - Current WC balance.
  - 24h / 7d WC earned (if we track it).
  - Basic breakdown by source (validators, agents, relayers), even if approximate.

Short term (pre-mainnet):

- This page will mostly be **explanatory** with stub metrics pulled from devnet or mocks.

Long term (post-mainnet):

- Live data, driven by on-chain events and Prometheus metrics.

### 4.3 WC ↔ VOID trading

We will eventually support:

- **Swap WC → VOID**:
  - Either directly via a simple AMM pool (on VOID chain).
  - Or via `WorkCreditsRelayerHelper` + external liquidity (bridge to wVOID on Ethereum, etc.).

The UI must:

- Show current **pool rate** (approx conversion of WC → VOID).
- Allow the user to:
  - Enter WC amount.
  - See estimated VOID amount.
  - Confirm swap with an on-chain transaction.

v0 constraints:

- We do not need to implement full swap UI now.
- We must leave **clear hooks**:
  - Buttons/components that can later wire to a `swapWorkCreditsForVoid(...)` call.
  - Room in the dashboard layout for “Work Credits Pool” card.

### 4.4 Transfers

Standard wallet flows:

- Transfer VOID to another address.
- Transfer WC to another address.

The UI must:

- Reuse the same basic transfer form for both assets:
  - Select token: `VOID` / `WC`.
  - Recipient address.
  - Amount.
- Handle basic UX:
  - ENS-style lookups in the future (optional).
  - Replay protection and gas estimation via underlying wallet provider.

For now:

- We don’t need a custom transfer flow; we can use base wallet functionality and just ensure that WC is visible and selectable.

### 4.5 Validators & node operators

The UI must give node / validator operators a clear picture of:

- Whether their node is **healthy** and recognized as a validator.
- How much **VOID** and **WC** they are earning over time.
- Whether they are **in or out of rotation** as a validator.

Integration points:

- Read from:
  - On-chain ValidatorSet / RewardEngine state.
  - Prometheus metrics (mainnet-core, lastmile, WC pillar).
- Surface:
  - “Validator status” panel.
  - “Recent WC earnings” chart (post-mainnet).
  - Simple copy-paste commands to start/stop nodes and health scripts.

---

## 5. Agent-Facing Requirements (AI-first)

VOID Network is **AI-first, human-second**. The UI must be mirrored by a clean, agent-facing API surface:

- Any interactive widget we build (balances, WC earnings, swaps, validator status) should have:
  - A JSON endpoint (no auth beyond wallet/addr parameters and CORS/safety).
  - Stable response shapes.
- Agents must be able to:
  - Fetch balances for a given address.
  - Fetch WC stats for operators.
  - Propose actions: “swap N WC for VOID”, “transfer N WC to X”, “top up validator stake” (where allowed).

For now:

- We have the **UI health proxy** (`/api/ui/health`) and Prom-based metrics.
- Later:
  - We add `/api/ui/wallet/:address`, `/api/ui/work-credits/:address`, etc.
  - The React dashboard consumes these, and agents can too.

---

## 6. Integration with Obelisk & NullFeed

Long-term routes (future phases, not required for v0):

- **Obelisk Wallet**:
  - Native “Work Credits” tab:
    - Show balances.
    - Show earnings.
    - Trigger WC↔VOID swaps.
  - Same health and metrics gating as the main dashboard.

- **NullFeed**:
  - Integrate WC as:
    - A “reputation / contribution” signal for channels or bots.
    - A gating mechanism for premium features, e.g. WC holders get early access to features.

For now:

- We just ensure the **design leaves space** for these integrations:
  - No assumptions that UI is browser-only.
  - No tight coupling to one host; everything should be runnable off your node/developer box.

---

## 7. Phasing & Non-goals

### 7.1 What we will do before mainnet

- Keep Work Credits contracts:
  - **Compiled and fully tested** (already done).
  - Integrated into PLAN JSON with proper roles (already done).
- Extend bootstrap and PLAN tooling:
  - Scripts that **understand** WC addresses in dev/live JSON.
  - Dev rehearsal that deploys and wires WC on devnet.
- Keep metrics + UI:
  - `void_mainnet_ui_work_credits_health` and related gauges must be green.
  - Dashboard v0 shows WC pillar as part of “Mainnet + UI composite” health.

### 7.2 What we will NOT do before mainnet

- We will not:
  - Overbuild UI flows (claim/trade/perks) before base mainnet is ready.
  - Lock in a permanent WC↔VOID rate.
  - Promise any specific airdrops or distribution schemes beyond what the on-chain contracts enforce.

Mainnet first, shiny UI second — but with the plan already written so we don’t guess later.

---

## 8. Summary

- Work Credits (WC) are a **clean, contract-governed layer** on top of VOID to reward useful work.
- Contracts are implemented and tested; PLAN JSON is extended with WC placeholders and roles.
- Metrics and UI health pillars are in place, but WC contracts are not yet deployed on mainnet.
- The v0 UI (Command Center + future Obelisk views) must:
  - Show VOID + WC balances.
  - Reflect Work Credits health and pillar status.
  - Reserve space for claim, transfer, and swap flows without forcing them now.
  - Expose JSON APIs that agents can call directly.

From here, the next concrete steps after mainnet core bootstrap work will be:
- Devnet deployment of WC stack, wiring to RewardEngine.
- PLAN JSON updates with real dev addresses.
- Gradual rollout of interactive WC UI elements on top of that baseline.
