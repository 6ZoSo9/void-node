# Obelisk Validator UX — v1/v2 Flows

This doc describes how REAL users move from “I have VOID” to
“I’m running or backing a validator” using Obelisk Wallet.

It’s split into:

- v1 (mainnet launch): Titan-first validators, Mobile as helper.
- v2 (post-mainnet): Mobile as control plane, richer automation.

This is UX only — no secrets, no live keys.

---

## 0. User types (personas)

### P1: Basic HOLDER

- Has VOID on mainnet.
- Uses:
  - Obelisk Lite (browser) and/or
  - Obelisk Mobile.
- Wants:
  - Simple way to **delegate** to validators (later),
  - Or just view on-chain validator stats.

### P2: Home VALIDATOR (Titan)

- Has:
  - Desktop / server with SSD + stable internet.
  - Willing to run void-node + validator.
- Uses:
  - Obelisk Titan on the same machine.
- Wants:
  - Stake, run validator, and see rewards.
  - Simple monitoring + alerts.

### P3: Mobile CONTROL (future)

- Has:
  - Phone with Obelisk Mobile.
  - Validator(s) running at home / VPS.
- Wants:
  - Control / overview from phone.
  - Approve stake/unstake/claims from phone.
  - Get alerts when validators misbehave.

---

## 1. v1 — Titan-first validator journey

### 1.1 Pre-requisites

- User has:
  - Obelisk Titan running on a machine that can also run `void-node`.
  - VOID in a wallet controlled by Titan.
- Node:
  - Already synced (devnet/mainnet depending on environment).
  - Has standard metrics exporters (head / txroot / seals / proposer).

### 1.2 Flow: “Become a validator” (Titan)

**Screen 1: Validator Overview**

- Shows:
  - Current validator status for this address:
    - NOT A VALIDATOR
    - ACTIVE VALIDATOR
    - EXITING / SLASHED
  - Basic chain info:
    - Chain: VOID Mainnet (id: 2050)
    - Estimated APY (from RewardEngine / off-chain calc)
    - Minimum stake to join

**User actions:**

- Button: **“Become a validator”** (enabled only if:
  - balance >= minimum stake,
  - node status is HEALTHY).

---

**Screen 2: Stake amount + risk disclosure**

- Inputs:
  - Stake amount (VOID).
- Text:
  - Slashing risk, uptime expectations.
  - That validator rewards are not guaranteed.

**UX:**

- Checkbox: “I understand the risks.”
- Button: **“Continue”** (only after checkbox).

---

**Screen 3: Node health check**

Titan pings local node:

- /health
- /metrics/void/head
- Any validator-specific health check.

Must show:

- Node sync status (head lag vs known peers).
- Disk free space.
- CPU/mem quick snapshot (optional).

If node unhealthy:

- Show a **blocking warning**:
  - “Your node must be healthy and in sync before staking.”
- Button: **“Retry health check”**.

If healthy:

- Button: **“Confirm & stake”**.

---

**Screen 4: TX preview + sign**

Titan prepares:

1. `VoidToken.approve(ValidatorSet, stakeAmount)`
2. `ValidatorSet.join(...)` (or current join function).

Shows:

- Contract addresses.
- Gas estimates.
- Exact VOID amount.
- Validator metadata (if we support it v1).

User:

- Confirms in wallet.
- Signs transactions (Titan pops signer modal).

---

**Screen 5: Post-stake status**

After success:

- Status: `JOINED / PENDING ACTIVATION` or `ACTIVE`.
- Show:
  - Staked balance.
  - Estimated rewards.
  - Links to:
    - “View in Explorer” (later).
    - “Open metrics dashboard” (Grafana).

Buttons:

- **“Start validator process”** (if not already started).
- **“View validator details”**.

---

### 1.3 Flow: “View validator status” (Titan)

From main screen:

- List all validators controlled by this wallet address:
  - For v1, likely just one.

Each validator entry shows:

- Status:
  - ACTIVE / PENDING / EXITING / SLASHED.
- Head lag:
  - derived from Prom metrics (e.g. `void_validator_head_lag` or head gap vs `void_head_number`).
- Recent performance:
  - Duties missed in last 24h.
  - Rewards earned in last 24h / 7d.

**Details page per validator:**

- On-chain info:
  - Stake amount.
  - Pending rewards.
  - Commission rate (if/when we support).
- Node info:
  - Host label (user-defined, e.g. “Home server”).
  - Online / offline.
  - Last heartbeat timestamp.
- Buttons:
  - **“Claim rewards”** (if > 0).
  - **“Pause validator”** (if we implement a soft pause).
  - **“Export metrics link”** (copy Grafana link).

---

### 1.4 Flow: “Claim rewards” (Titan)

From validator details:

1. Titan queries `RewardEngine` / `ValidatorSet`:
   - amount claimable.
2. Shows:
   - Current claimable VOID.
   - Gas estimate.
3. User hits **“Claim rewards”**.
4. Titan:
   - Prepares `claim()` TX.
   - Presents sign modal.
5. After confirmation:
   - TX sent.
   - New balance + updated claimable shown.

Longer-term: also show claim history.

---

### 1.5 Flow: “Stop validating / exit”

We keep v1 simple:

- “Stop validating” triggers:
  - Validator exit TX (whatever our contract semantics are).
- FX:
  - Mark validator as EXITING.
  - Eventually funds become withdrawable (depending on rules).

UX:

- Force a **confirmation screen** with slashing / cooldown warning.
- Possibly require an extra confirmation phrase:
  - e.g. “type EXIT to confirm”.

---

## 2. v1 — Mobile (read + partial control)

In v1, Mobile doesn’t run validators itself. It:

- Reads validator status for addresses it controls.
- Optionally signs TXs forwarded from Titan.

### 2.1 Flow: “View my validators” (Mobile)

- Home > “Staking & Validators”.

For each known address:

- Query on-chain:
  - Does this address appear in `ValidatorSet`?
  - What is the stake and status?
- Show condensed cards per validator:
  - Status.
  - Stake amount.
  - Rewards pending.
  - Last known health summary from Prometheus (if we mirror metrics into a light API).

This is **read-only** in v1.

---

### 2.2 Flow: “Approve validator TX from Titan”

Later in v1 (optional):

- Titan prepares a transaction for stake / claim / exit.
- Titan sends a WalletConnect-like request to Mobile.
- Mobile shows:
  - All details (like Titan does).
  - User signs on phone.
- Titan broadcasts with that signature.

This preserves the pattern:
- Desktop runs the node/validator.
- Phone holds / signs with the key.

---

## 3. v2 — Mobile as validator control plane

After mainnet + NullFeed:

Mobile becomes a **first-class control plane**.

### 3.1 Node control API (concept)

Validator nodes expose a **minimal control API**:

- `GET /validator/status`
- `GET /validator/metrics-snapshot`
- `POST /validator/config` (signed instructions only)
- `POST /validator/pause`
- `POST /validator/resume`

Auth:

- Node trusts only instructions signed by a specific wallet key.
- That wallet key lives in Mobile (or Titan), not on the node.

### 3.2 Flow: “Link this node to my Mobile” (pairing)

On Titan / node side:

- User runs a command:
  - `voidctl validator pair --label "Home server"`
- It prints:
  - Pairing QR code / code.

On Mobile:

- Screen: “Add validator node”.
- Scan QR / enter code.
- Mobile:
  - Stores node endpoint (URL + expected fingerprints).
  - Sends a signed “pairing complete” message.

Result:

- Node now knows this Mobile wallet is the controller.

---

### 3.3 Flow: “Monitor validators” (Mobile v2)

Mobile UI:

- List of linked nodes & validators:
  - Each card shows:
    - Node label (home/VPS).
    - Validator status (OK / Warning / Critical).
    - Head lag / missed duties / last heartbeat.

Mobile periodically:

- Polls node APIs.
- Optionally hits a VOID Agent backend for aggregated Prometheus views.

Alerts:

- Show push-style notifications (at least in-app) when:
  - Validator offline for N minutes.
  - Head lag > threshold.
  - Duties missed > threshold.
  - Slash event detected on-chain.

---

### 3.4 Flow: “Pause validator from phone”

Prereq:

- Node control API supports `pause`/`resume`.
- Contracts + consensus allow some notion of “soft pause” (or at least safe disconnect).

Flow:

1. User taps validator card.
2. Hits **“Pause validator”**.
3. Mobile:
   - Sends signed `pause` command to node.
   - Node stops proposing/validating duties gracefully.
4. UI:
   - Shows “paused” state.
   - Warns that extended pauses hurt rewards / uptime.

---

### 3.5 Flow: “Stake/claim from Mobile only”

Once “forward TX from Titan” path is stable, we can:

- Let Mobile call contracts directly (on-chain RPC) for stake/claim:
  - Provided Mobile can talk to:
    - An RPC (either via node at home or external).
  - And we’re okay with gas from the phone.

UX is same as Titan stake/claim screens, just with a lighter view.

---

## 4. Guardrails and pitfalls

1. **Do not ship phone-only validator v1**
   - It’s tempting, but we prioritize:
     - Stability.
     - Observability.
     - Not burning user hardware.

2. **No silent validator actions**
   - Every stake/unstake/exit is a highly visible UX event.
   - No “auto-exit” or “auto-stake” without explicit user consent.

3. **Consistent terminology**
   - In all wallets:
     - “Stake” / “Unstake” / “Claim rewards”.
     - “Validator” (not “miner” or “baker” etc.).
   - Reserved names:
     - VOID mainnet.
     - Obelisk Titan / Mobile / Lite.

4. **Safeboot awareness**
   - UI should understand safeboot vs mainnet:
     - Make sure users don’t accidentally stake on a safeboot/devnet
       unless they are explicitly in test mode.

---

## 5. What needs to exist in code to support this UX

Checklist we will eventually align with the codebase:

- Contracts:
  - `ValidatorSet` join/exit/claim functions clearly documented.
  - View functions for:
    - validator status.
    - stake amount.
    - pending rewards.

- Node / exporters:
  - Per-validator metrics for:
    - head lag.
    - missed duties.
    - online/offline.
  - API endpoints to expose those metrics to wallets / agents.

- Wallet:
  - Unified key model (hot/warm/cold).
  - Clear separation of:
    - user balances.
    - validator stake.
    - claimable rewards.
  - Warning surfaces for slashing / penalties.

This doc will evolve as we wire Obelisk Wallet into the real VOID mainnet path.
