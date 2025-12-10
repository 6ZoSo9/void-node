# VOID Mainnet — Validator Bootstrap & Rewards v1 (Draft)

**Status:** draft, pre-launch  
**Chain ID:** 2050 (VOID mainnet)  
**Core contracts:** VoidToken, VoidEmissionsController, VoidTreasury, OpsTreasury, RewardEngine, ValidatorSet, AdminGate, UpdateGate, ConfigGate

---

## 1. High-level goals

- Keep VOID **permissionless**: anyone can become a validator once mainnet is live and parameters are set.
- Make early validators **actually compensated** for keeping the network alive and pushing blocks.
- Keep the design **simple + auditable**:
  - VOID is the scarce staking / governance token.
  - Emissions flow into a **RewardEngine**.
  - RewardEngine pays validators pro-rata for honest work.
- Ensure the network can **survive failures**:
  - Safeboot nodes, last-mile metrics, and SLOs are all part of the staking story.
  - Validators are expected to run with basic monitoring.

This doc is about *how the economics are supposed to work* and *how we will bootstrap the first validator set*.

---

## 2. Tokenomics recap (locked)

- **Max supply:** 666,666,666 VOID  
- **Premine (genesis Treasury):** 333,333,333 VOID  
- **Emissions:** 333,333,333 VOID over ~100 years, in 4 eras (25 years each):
  - Era 1: 177,777,777 VOID
  - Era 2: 88,888,889 VOID
  - Era 3: 44,444,444 VOID
  - Era 4: 22,222,223 VOID

The premine sits in a **VoidTreasury** contract at genesis. Emissions are controlled by **VoidEmissionsController** and distributed via **RewardEngine**.

---

## 3. Validator roles and responsibilities

Validators on VOID mainnet:

- Run a `void-node` instance (or more) with:
  - Proposer and last-mile pipeline enabled.
  - Safeboot / lifeboat node recommended for serious operators.
  - Basic monitoring via Prometheus (head, txroot, seals, last-mile).
- Stake VOID into **ValidatorSet**:
  - Staked balance determines weight in block production / reward share.
  - Slashing / penalties are **minimal or none** in the earliest phase (bootstrap era) — focus is on uptime, not complex slashing.
- Participate in **governance** indirectly:
  - Governance keys live behind AdminGate / UpdateGate.
  - Validators are not governance signers by default, but the network listens to validator metrics and on-chain signals.

We’ll keep phase 1 relatively simple: stake → produce blocks → earn rewards.

---

## 4. Reward flow (conceptual)

The intended path for rewards is:

1. **EmissionsController** mints VOID periodically into **VoidTreasury** (according to the era schedule).
2. The Treasury allocates a portion of emissions to **RewardEngine** (on a schedule defined by governance).
3. **RewardEngine** tracks:
   - Total reward pool available for distribution.
   - Per-validator shares based on stake and potentially uptime.
4. Validators **claim** rewards directly from RewardEngine:
   - `claim(id)` or similar interface (exact function name is defined in the contract).
   - Rewards are paid out in VOID to the validator’s address.

In bootstrap, we keep this near-linear: rewards ∝ stake, adjusted by simple health constraints (e.g. validator is not marked dead).

---

## 5. Bootstrap validator program (Phase 0)

Before we open the network to everyone, we will have a **small initial validator set** (“Genesis Validators”).

### 5.1 Genesis Validator Set

- Target N (tunable, example: 4–10 operators).
- Each Genesis Validator:
  - Runs a mainnet-prepared `void-node` with:
    - Stable seals, last-mile non-empty behavior, txroot health.
    - Safeboot node recommended (not strictly required for day 1, but preferred).
  - Commits to uptime and upgrade participation.

### 5.2 Initial stake source

- Genesis Validator stake **does not** come from infinite magic minting.
- The flow is:

  1. **VoidTreasury** (premine) → **OpsTreasury**:  
     A governance-authorized transfer moves a *small fraction* of premine into OpsTreasury for bootstrap incentives.
  2. **OpsTreasury** → Genesis Validators:
     - OpsTreasury funds initial validator stakes via on-chain calls to ValidatorSet or via direct VOID transfers with clear tracking.
  3. Once mainnet is healthy and usage grows, validators are expected to:
     - Top-up or replace bootstrap stake with their own VOID purchased from the market.

The intention is that **bootstrap stake is a jump-start, not a permanent subsidy**.

Exact numbers (X VOID per validator, total bootstrap pool size) are left as TODO and must be aligned with real emissions curves and treasury policy.

---

## 6. Joining as a validator (post-bootstrap, concept)

After mainnet is live and the Genesis Set is stable:

1. A prospective validator:
   - Acquires VOID (via exchanges, OTC, or future Work Credits conversions).
   - Runs `void-node` with:
     - Correct config for mainnet (chainId 2050, peers, safeboot optional).
     - Monitoring and metrics configured.
2. Stakes VOID into the **ValidatorSet**:
   - Must meet a **minimum stake** threshold (TBD, example range: 10,000–100,000 VOID).
3. Starts receiving rewards via **RewardEngine**:
   - Rewards per block or per epoch, pro-rata with stake.
   - Claimable continuously or in discrete epochs.

We will refine the exact parameters when we wire the final ValidatorSet + RewardEngine configuration into the mainnet bootstrap JSON.

---

## 7. Interaction with Work Credits (future)

Work Credits (WC) are a separate “earnable” token for useful work (relayers, agents, AI jobs, etc).  
For validators in the **long term**:

- Validators earn VOID via **RewardEngine** for consensus work.
- Validators and node operators also earn **Work Credits** for:
  - Running relayers.
  - Serving AI/agent jobs.
  - Hosting data/services that the network values.

In future phases, we may allow:

- WC → VOID flows via a WC/VOID pool (AMM).
- Some validator cost offsets to be denominated in WC.

For now, **VOID staking and RewardEngine rewards are the canonical validator incentive**, with WC treated as a parallel track for extra roles.

---

## 8. Safeboot & last-mile as validator requirements

Because VOID is AI-first and we treat data integrity as critical, validators are expected to:

- Run with **last-mile non-empty blocks** enabled:
  - No empty blocks when there are queued txs.
  - txRoot must match persisted txs; header3 vs dev txroot checks should stay green.
- Maintain a **safeboot node** (recommended):
  - Lifeboat node / fallback.
  - Exposes head, txroot, header3 metrics.
  - Can be used by the network and by the operator to recover from failures.

In the early bootstrap phase we won’t slash people for not doing this, but these are the **“grown-up” validator expectations**.

---

## 9. TODOs before mainnet launch

- [ ] Finalize **minimum stake** and **maximum validator count** for era 1.
- [ ] Confirm RewardEngine parameters (per-era budget, epoch length, payout formula).
- [ ] Add Prometheus metrics for:
  - Per-validator participation (blocks signed / missed).
  - RewardEngine payout rates.
- [ ] Integrate validator health into **mainnet pillars** and CI/pre-push gates.
- [ ] Add docs + scripts for:
  - “How to run a validator” (hardware, OS, systemd units, Prom stack).
  - “How to stake” (CLI and, later, Obelisk Wallet UI).
- [ ] Align this doc with actual Solidity code in the repo and keep them in sync.

---

## 10. Non-goals (for now)

- No complicated slashing or MEV rules in era 1.
- No on-chain governance voting by every validator on every decision.
- No hard dependency on Work Credits for basic validation.

We keep it simple: **run node → stake VOID → help secure the chain → earn VOID.**
