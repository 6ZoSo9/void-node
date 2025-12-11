# VOID RewardEngine & Validator Rewards — Spec v0

## 0. Purpose

This document defines how `RewardEngine` is intended to work for:

- **Mainnet validators** — how they earn **Work Credits (WC)** for running nodes / validating.
- **Treasuries** — how VOID flows from premine into rewards, and how WC interacts with VOID via the WC/VOID pool.
- **Devnet / testing** — how we simulate and rehearse this without risking real economics.

This is the reference for contracts, bootstrap scripts, exporters, and dashboards.

---

## 1. Actors & Contracts

### 1.1 Core contracts

- **VoidToken** — main VOID ERC20 (governance / scarce asset).
- **WorkCreditsToken (WC)** — earnable utility token for network work & AI agent jobs.
- **VoidTreasury** — cold treasury holding premine + strategic VOID reserves.
- **OpsTreasury** — hot-ish treasury used to fund operations / rewards.
- **RewardEngine** — contract that:
  - Tracks **reward epochs**.
  - Pulls authorized funding (VOID and/or WC) from OpsTreasury.
  - Attributes and stores **per-validator WC entitlements**.
  - Exposes `claim`/`claimFor` for validators to pull WC.

- **ValidatorSet** — manages registered validators and stakes (on mainnet).
- **WorkCreditsPoolV1 (WC/VOID pool)** — AMM where:
  - Validators can sell WC for VOID (or vice versa).
  - External users can provide liquidity.

### 1.2 Off-chain / services

- **Void Node** — produces receipts / metrics for validator work.
- **Prometheus + exporters** — already wired for:
  - `void_mainnet_rewardengine_health`
  - `void_devnet_rewardengine_*`
  - Future: RewardEngine payout metrics.

---

## 2. High-level design

### 2.1 Funding path (VOID → WC rewards)

**Mainnet high-level:**

1. `VoidToken` premine resides in **VoidTreasury**.
2. Governance / admin moves a stream of VOID from **VoidTreasury → OpsTreasury**.
3. `OpsTreasury` has the authority to:
   - Approve/mint **WC** to `RewardEngine` (if RewardEngine distributes WC directly), or
   - Approve **VOID** to `WorkCreditsPoolV1` and/or `RewardEngine` to maintain liquidity and buy WC.

**RewardEngine’s job** is:

- Maintain an **epoch-based accounting** of how much WC each validator has earned.
- Never mint or move VOID directly; it deals primarily in **WC**.
- Keep its logic deterministic and simple; complicated economics live in config and external scripts.

### 2.2 Epochs and rewards

We treat time in **epochs** (e.g., N blocks per epoch), but **RewardEngine** doesn’t need to know real “wall clock” time — only:

- `currentEpoch` (uint256).
- `epochRewardPool[currentEpoch]` — total WC allocated for that epoch.
- `validatorShare[validator][epoch]` — share/weight for each validator.

**Inputs** (from validator / node / governance systems):

- For each epoch:
  - A total reward amount: `epochRewardPool[epoch]` (in WC).
  - A set of `(validator, weight)` pairs that determine how the epoch pool is split.

How these weights are computed is out-of-contract (node metrics, receipts, etc.); RewardEngine just enforces:

- Sum of per-validator payouts **<=** epoch pool.
- No double spending across epochs.

### 2.3 Payout model

We use a **pull-based** model:

- RewardEngine records entitlements:
  - `entitlement[validator] += delta` when finalization happens.
- Validators call:
  - `claim()` or `claimFor(validator)` to pull their WC.
- RewardEngine transfers WC from its internal WC balance to the validator.

This is safer and cheaper than forcing automatic transfers every epoch, and matches the “collect pending WC” button we want in Obelisk.

---

## 3. Data model (RewardEngine core)

### 3.1 Storage sketch

At a high level:

- `address public workCreditsToken;`  
- `address public validatorSet;`
- `address public opsTreasury;`
- `uint256 public currentEpoch;`

- `mapping(uint256 => uint256) public epochRewardPool;`  
  Total WC allocated for each epoch.

- `mapping(uint256 => uint256) public epochWeightSum;`  
  Sum of all weights for that epoch.

- `mapping(address => mapping(uint256 => uint256)) public validatorWeight;`  
  Weight of a validator in a given epoch.

- `mapping(address => uint256) public accrued;`  
  Total WC earned but not yet claimed.

Optionally, we can keep:

- `mapping(uint256 => bool) public epochFinalized;`  
  Whether an epoch has been closed and rewards attributed.

### 3.2 Core flows

#### a) Configure epoch pool

- Function: `configureEpoch(uint256 epoch, uint256 poolAmount)`  
- Requirements:
  - Only callable by authorized role (AdminGate / Ops).
  - Epoch must not be finalized.
  - `poolAmount` is WC (not VOID) — RewardEngine must be funded in WC first.

#### b) Push weights

- Function: `pushWeights(uint256 epoch, address[] validators, uint256[] weights)`  
- Requirements:
  - Only callable by authorized role (e.g., Job / oracle / governance).
  - Lengths match.
  - Epoch must not be finalized.
  - Updates:
    - `validatorWeight[v][epoch] += weight[i]`.
    - `epochWeightSum[epoch] += weight[i]`.

#### c) Finalize epoch

- Function: `finalizeEpoch(uint256 epoch)`  
- Requirements:
  - Only callable by authorized role.
  - Epoch not yet finalized.
  - `epochWeightSum[epoch] > 0`.
  - RewardEngine holds at least `epochRewardPool[epoch]` WC.

- Behavior:
  - For each validator with non-zero weight:
    - `share = epochRewardPool[epoch] * validatorWeight[v][epoch] / epochWeightSum[epoch]`.
    - `accrued[v] += share`.
  - Mark `epochFinalized[epoch] = true`.

We’ll need an off-chain driver (script or job) to compute the per-validator weights and call this, but the contract behavior is straightforward.

#### d) Claim

- Function: `claim()` / `claimFor(address v)`  
- Behavior:
  - Read `amount = accrued[v]`.
  - Set `accrued[v] = 0`.
  - Transfer `amount` WC to `v`.

---

## 4. Integration with validators and WC

### 4.1 ValidatorSet link

RewardEngine **does not manage stakes** directly; it trusts `ValidatorSet` for:

- Who is a current validator.
- How much stake they have (if we use stake-based weighting).
- Optional: slashing / penalties, which can be reflected in the weights we push.

This keeps RewardEngine focused on **payouts** and avoids duplicated staking logic.

### 4.2 Work Credits behaviors

- Validators see WC in their balance after claiming.
- WC can be:
  - Held as “reputation / future work fuel”.
  - Sold into `WorkCreditsPoolV1` for VOID.
  - Used later in NullFeed, NFTs, or AI agent payments.

The real economics (how much WC per epoch, how emissions decay, etc.) live in a **separate tokenomics config**, not hard-coded in RewardEngine.

---

## 5. Devnet vs mainnet

### 5.1 Mainnet

- RewardEngine is **fully wired** in the mainnet bootstrap plan.
- Our current pillars:
  - `void_mainnet_rewardengine_health` (plan).
  - `void_mainnet_pillars_with_rewardengine_health`.
- Later:
  - Additional metrics from RewardEngine itself (total accrued, total claimed, etc.).

### 5.2 Devnet

- Current state (as of this spec):
  - Devnet has a **stub RewardEngine address** in `VOID-DEVNET-PROTOCOL-STATE.json`.
  - Prometheus sees:
    - `void_devnet_rewardengine_health = 1` (plan).
    - `void_devnet_rewardengine_code_health = 0` (no bytecode yet).
  - `ops/void-devnet-rewardengine-smoke.sh`:
    - SKIP exit when code health is 0 (expected).

- Future state:
  - Deploy a real RewardEngine on devnet.
  - Use `ops/void-devnet-rewardengine-state-add.sh` with the real address.
  - Code health flips to 1.
  - Implement a **real smoke** inside `ops/void-devnet-rewardengine-smoke.sh`:
    - Stake → accrue → claim WC.
    - Export `void_devnet_rewardengine_smoke_ok`.

---

## 6. Metrics & observability

We already have:

- **Mainnet:**
  - `void_mainnet_rewardengine_health`
  - `void_mainnet_pillars_with_rewardengine_health`
  - `void:mainnet_pillars_with_rewardengine:health:last_5m`

- **Devnet (plan + code):**
  - `void_devnet_rewardengine_health`
  - `void:devnet_rewardengine:health:last_5m`
  - `void_devnet_rewardengine_code_health`
  - `void:devnet_rewardengine_code:health:last_5m`

- **Ops helper:**
  - `ops/void-rewardengine-health-all.sh`

Future metrics to add once RewardEngine is live on-chain:

- Total WC accrued / claimed per epoch.
- Per-validator accrued / claimed (with sensible sampling).
- Gauge of latest finalized epoch.

---

## 7. Implementation checklist

**Contracts:**

- [ ] Implement `RewardEngine` solidity contract with:
  - [ ] Config: `workCreditsToken`, `validatorSet`, `opsTreasury`.
  - [ ] Epoch bookkeeping: `epochRewardPool`, `epochWeightSum`, `validatorWeight`, `epochFinalized`.
  - [ ] Entitlements: `accrued`.
  - [ ] Core functions: `configureEpoch`, `pushWeights`, `finalizeEpoch`, `claim`, `claimFor`.
  - [ ] Basic guards and events.

- [ ] Update Foundry tests:
  - [ ] Unit tests for RewardEngine math and edge cases.
  - [ ] Integration tests with ValidatorSet + WC.

**Bootstrap (mainnet):**

- [ ] Ensure mainnet bootstrap script:
  - [ ] Deploys RewardEngine.
  - [ ] Wires it to VoidToken, WorkCreditsToken, ValidatorSet, OpsTreasury.
  - [ ] Updates `void-mainnet-bootstrap-mainnet.live.json` with RewardEngine address.
  - [ ] Leaves metrics pillar unchanged (already wired).

**Devnet:**

- [ ] Deploy RewardEngine to devnet.
- [ ] Run `ops/void-devnet-rewardengine-state-add.sh` with real address.
- [ ] Verify:
  - [ ] `void_devnet_rewardengine_health == 1`.
  - [ ] `void_devnet_rewardengine_code_health == 1`.
- [ ] Flesh out `ops/void-devnet-rewardengine-smoke.sh` to do:
  - [ ] Tiny stake → accrue → claim WC.
  - [ ] Emit `void_devnet_rewardengine_smoke_ok`.

**UI / Obelisk (later):**

- [ ] Expose “Pending WC” and “Claim WC” in the validator-facing UI.
- [ ] Show simple history of claimed rewards.

---

## 8. Ground truth

If there is ever disagreement between:

- This spec,
- The Solidity contracts,
- The bootstrap scripts,
- The Prometheus metrics,

then the **source of truth** is:

1. Mainnet contracts & addresses (what is on-chain).
2. Bootstrap mainnet live JSON and tags.
3. This spec, updated after those two.

