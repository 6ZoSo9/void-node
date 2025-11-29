# Obelisk Wallet Validators — VOID Mainnet Design

This doc describes how **Obelisk Wallet** participates in VOID mainnet validation.

Goal: make it possible for normal users (and power users) to help secure VOID,
with a clean story for:

- Desktop validators (Obelisk Titan)
- Phone-driven validators (Obelisk Mobile controlling a node)
- Browser-wallet / light clients (Obelisk Lite) that still integrate with staking

This doc is *design only* — it does not contain any secrets or live keys.

---

## 0. Core principles

1. **Keys live in wallets, not on bare servers**
   - Validator stake / ops keys live in Obelisk Wallet (Titan / Mobile), not as
     loose keys on disk.
   - Servers (nodes) act as **dumb engines** that receive signed messages /
     configs from wallets.

2. **Permissionless chain, gated core**
   - Anyone can stake and join via `ValidatorSet`, but core upgrades still flow
     through `UpdateGate` / `AdminGate` (v99 model).

3. **Phones are control planes first, not full datacenter**
   - High-end phones *might* run a light validator in the future, but the default
     path is:
     - Phone runs Obelisk Mobile.
     - Mobile controls 1+ validator nodes (desktop / VPS / home server).
     - Mobile shows health, rewards, and can pause/rotate keys.

4. **Everything is observable**
   - Every validator path has Prometheus / textfile hooks so we can measure:
     - Online/offline status
     - Head lag
     - Reward accrual
     - Slash / penalty events

---

## 1. Wallet tiers recap

### 1.1 Obelisk Lite (Browser extension)

- Role:
  - Basic transaction signing, viewing balances, interacting with dApps.
- Validator angle:
  - Can **delegate to existing validators** (if we add delegation later).
  - Can prepare / approve validator operations initiated by Titan/Mobile
    (e.g., using WalletConnect-style bridge), but does *not* run validators.

### 1.2 Obelisk Mobile (Core app — phones)

- Role:
  - Main user identity hub for VOID / NullFeed.
  - Holds user’s main keys (VOID, NullFeed, future agents).
- Validator angle:
  - Acts as a **remote control + signer** for validator nodes.
    - Phone stores validator staking key(s).
    - Phone signs:
      - `ValidatorSet` join transactions.
      - Top-ups / partial withdrawals.
      - Validator config updates (commission, metadata).
  - Talks to:
    - One or more VOID nodes (home server / cloud / Titan).
    - Obelisk Agent(s) for monitoring and automation (later).

### 1.3 Obelisk Titan (Desktop / heavy wallet)

- Role:
  - Full-featured wallet on top of a powerful node (GPU, SSD, etc.).
- Validator angle:
  - Runs **local validator instance** directly on the same machine as the node.
  - Can also expose a secure API for Mobile to:
    - Start/stop validator.
    - Rotate signing keys via Titan as a relay.
    - Query performance / rewards.

---

## 2. Validator types (conceptual)

### 2.1 Core validator (Titan-class)

- Runs on:
  - Desktop with good CPU/SSD, or server / VPS.
- Responsibilities:
  - Full node + validator:
    - Maintains full chain state (for now).
    - Proposes blocks when selected.
    - Participates in consensus.
  - Exports metrics:
    - `void_validator_head_lag`
    - `void_validator_duties_missed_total`
    - `void_validator_rewards_total`
- Key handling:
  - **Preferred**: signing keys are connected via wallet (Titan or Mobile) using
    a local signer process (no naked private keys on disk).

### 2.2 Phone-driven validator (Mobile control)

- Default path for “validators on phones”:

  1. Obelisk Mobile holds the validator staking key.
  2. A validator node runs elsewhere (home server / Titan / VPS).
  3. Node exposes a narrow, authenticated control API:
     - Register this node as validator for key X.
     - Report duties / health.
  4. Mobile approves:
     - Stake / unstake / top-up operations.
     - Major config changes (e.g. validator metadata).
  5. Mobile shows:
     - Online/offline status.
     - Rewards graph.
     - Alerts (missed duties, head lag, slash risk).

- Over time we can explore **actual on-device validation** for high-end phones, with:
  - Smaller resource footprint.
  - Rate limits / duty-selection that won’t cook the phone.

### 2.3 Light / delegated paths (future)

- Obelisk Lite and Mobile should support:
  - Delegation to validators for users who don’t want to run hardware.
  - Viewing validator metrics before delegating (APY, miss rate, fees).

We don’t have delegation contracts yet — this is future work on top of `ValidatorSet`.

---

## 3. Integration with current contracts

We already have:

- `ValidatorSet` (L1 + mainnet variants).
- `RewardEngine`.
- `VoidToken` with fixed tokenomics.
- `VoidTreasury` + `OpsTreasury`.

Obelisk validators fit in as follows:

1. **Stake flow**
   - Wallet (Titan/Mobile) calls:
     - `VoidToken.approve(ValidatorSet, stakeAmount)`
     - `ValidatorSet.join(...)` or equivalent.
   - Staking key is held in wallet, not exposed raw to node.

2. **Reward flow**
   - `RewardEngine` accumulates validator rewards.
   - Wallet shows claimable rewards by querying:
     - `RewardEngine` and/or `ValidatorSet` view functions.
   - Claim:
     - Wallet sends `claim()` transactions, optionally auto-claimable through an
       Obelisk Agent later.

3. **Slashing / penalties**
   - Detection is contract-level (slashing logic in `ValidatorSet`).
   - Wallet UI must:
     - Surface penalties / slashes clearly.
     - Show when a validator is at risk (missed duties, high head lag).

---

## 4. Practical validator UX v1 (what we ship first)

We keep v1 **boring but solid**:

1. **Titan-first validator**
   - First real validators are Titan-class:
     - Obelisk Titan + void-node + validator process on a desktop/server.
   - Titan handles:
     - Staking UI.
     - Start/stop validator.
     - Rewards and health view (via Prometheus / HTTP exporters).

2. **Mobile as read-only / partial control**
   - Mobile v1:
     - Shows validator balances and rewards for the user’s addresses.
     - Can approve *some* operations via WalletConnect-style flows with Titan:
       - e.g., sign stake / claim TX that Titan broadcasts.

3. **No “phone-only validator” in v1**
   - Phones aren’t primary validator engines yet.
   - We focus on:
     - Not losing keys.
     - Not cooking hardware.
     - Not overcomplicating our first mainnet release.

---

## 5. Mobile-driven validator v2 (future plan)

For v2 (post-mainnet, post-NullFeed), we evolve:

1. **Node control API**
   - A secure API exposed by validator nodes (behind auth, TLS, maybe VPN):
     - `GET /validator/status`
     - `POST /validator/config` (signed instructions only)
     - `POST /validator/pause`, `POST /validator/resume`
   - Obelisk Mobile uses this to:
     - Control home/remote validators.
     - Receive status + metrics snapshots.

2. **Agents as copilots**
   - Obelisk Agent instances can:
     - Watch Prometheus / textfile metrics.
     - Raise alerts to Mobile when:
       - Validator is offline.
       - Head lag > threshold.
       - Missed duties exceed budget.

3. **Gradual on-device validation experiments**
   - High-end phones:
     - Optionally run a “mini-validator” build with:
       - Reduced duties.
       - Thermal / battery guards.
     - Only after extensive testing on devnet/safeboot.

---

## 6. Security and key-handling rules

1. **No naked validator keys on server disk by default**
   - Server-side key storage is an advanced knob, not the default.
   - Normal path: validators use wallet-driven signing.

2. **Explicit “hot level” for each key**
   - Wallet UI should mark keys as:
     - COLD (never connected)
     - WARM (used occasionally for stake moves)
     - HOT (used for validator duties)
   - Validators use HOT keys; everything else uses WARM/COLD.

3. **Rotation flows**
   - We need a clear story for:
     - Rotating validator keys without losing rewards.
     - Escaping compromised validator nodes.
   - This will be wired into the `ValidatorSet` design where possible.

---

## 7. Next steps from this design

Concrete follow-ups:

1. Add a short **Obelisk validator UX** doc focused on UI flows:
   - Stake, unstake, claim, view status, set alerts.
2. Sketch a **validator-node control API** (types + routes, no implementation yet).
3. Later, align the validator metrics we already have (txroot/head/seals/proposer)
   with a per-validator view in Prometheus / Grafana.

This file is the anchor for all of that. It can evolve as we get closer to
mainnet and start wiring Obelisk Wallet into real validator operations.
