# VOID Network – Econ Blueprint V1

Status: V1 snapshot (design + current implementation state)  
Scope: VOID, Work Credits (WC), RewardEngine, earning surfaces, and mainnet bootstrap expectations.

---

## 1. Tokens

### 1.1 VOID

- **Type**: Scarce, governance + staking + security token.
- **Max supply**: 666,666,666 VOID (fixed).
- **Premine (genesis)**: 333,333,333 VOID
  - Lives in a contract-based **VoidTreasury**, *not* a hot EOA.
  - Treasury is controlled via on-chain gates (AdminGate / UpdateGate / ConfigGate) and multi-sig owners, not a single key.
- **Emissions**: 333,333,333 VOID over 100 years, split into 4 eras:

  | Era | Years | Emission (VOID) |
  |-----|-------|-----------------|
  | 1   | 0–25  | 177,777,777     |
  | 2   | 25–50 | 88,888,889      |
  | 3   | 50–75 | 44,444,444      |
  | 4   | 75–100| 22,222,223      |

  Total = 177,777,777 + 88,888,889 + 44,444,444 + 22,222,223 = 333,333,333.

- **Primary roles**:
  - Securing the chain (validator stake / slashable collateral).
  - Governance / control over critical contracts (Treasury, RewardEngine, ValidatorSet, etc.).
  - High-value collateral for Work Credits and future on-chain services.

VOID is “hard mode”: you don’t casually print it, you don’t casually send it around from random hot wallets, and emissions are locked by the schedule.

---

### 1.2 Work Credits (WC)

- **Type**: Earnable, spendable “work” / usage token.
- **Supply model**:
  - Minted and burned under strict policy by contracts:
    - `WorkCreditsToken`
    - `WorkCreditsMinter`
    - `RewardEngine` (indirectly, via budgets).
  - Not fixed-supply; it’s a *policy-driven* token, backed by:
    - VOID emissions (RewardEngine budgets).
    - A seeded WC/VOID pool.
- **Primary roles**:
  - Pay for AI jobs, agent tasks, and node work.
  - Let **any user**, not just validators, earn from doing useful work.
  - Serve as the “retail” layer for NullFeed, avatars, small fees, etc.

WC is the *utility work surface*. VOID stays scarce; WC is where we route most “people doing stuff” rewards.

---

## 2. High-level flow of value

This is the mental model everything else should match.

### 2.1 Treasury path

1. **Genesis**:
   - 333,333,333 VOID premine → **VoidTreasury** (contract).
2. **Ongoing**:
   - RewardEngine pulls VOID from Treasury according to the locked emissions spec.
   - Treasury can (under policy) move VOID to:
     - **OpsTreasury** (operational funds).
     - **RewardEngine** (emissions budgets).
     - Special-purpose contracts (e.g., seed pools).

Treasury is the cold “vault”. RewardEngine, OpsTreasury, etc. are structured ways to *spend* from it.

---

### 2.2 RewardEngine

RewardEngine is the on-chain policy brain for emissions:

- Reads a JSON econ spec (already wired + tested on mainnet side).
- For each epoch / era, defines budgets for:
  - Validator rewards (VOID).
  - WorkCredits-related budgets (VOID or WC backing).
  - Other future categories (agents, content, infra, etc.).
- Enforces:
  - Total emissions per era sum to the era’s allowance.
  - No category can overshoot its budget.

Contracts / tests already in repo:
- `RewardEngine` core.
- `RewardEngine.t.sol` verifying:
  - Emissions budget matches spec.
  - Governance rules (only Admin can pull, etc.).
  - Pull caps at budget.

**Key point**: RewardEngine is where VOID → “budgeted” value happens. Everything downstream (validators, WC, agents…) must read from those budgets, not print value from thin air.

---

### 2.3 WorkCredits pool & one-time VOID seed

We have a dedicated WC/VOID pool:

- `WorkCreditsPoolV1`
- `WorkCreditsToken`
- WC relayer + helper stack:
  - `WorkCreditsRelayerV1`
  - `WorkCreditsRelayerHelper`
  - Quote + math libraries.

**One-time seed** (policy we’re locking in):

- Treasury will provide a **single** 10,000,000 VOID seed to the WC/VOID pool.
- That seed is:
  - Backing for early WC liquidity.
  - A “jumpstart” that should be sustained by:
    - Market trading fees.
    - Future emissions routed through RewardEngine.
- Seed is *one-shot*: there is no infinite VOID drip into the pool outside:
  - Emissions schedule.
  - Explicit governance-approved changes.

This is the bridge between VOID and WC: users can swap back and forth, and the pool prices WC relative to VOID.

---

## 3. Earning surfaces

**Core principle**:  
> Validators are *not* the only people getting rewarded.  
> Any user who does verifiable, useful work for VOID Network should be able to earn WC.

We split earning surfaces into categories. Exact rates and splits are governed by RewardEngine econ JSON + future policy, but the direction is fixed.

### 3.1 Validators (VOID-staked)

- **What they do**:
  - Run validating nodes.
  - Propose and attest blocks.
  - Keep the chain alive + secure.
- **What they earn**:
  - VOID emissions (per-era schedules via RewardEngine).
  - Possibly some WC in the future (small portion for UX / fees), but the primary payout is VOID.
- **Risk profile**:
  - Stake can be slashed / cut for misbehavior or downtime.

Validators are high-risk, high-responsibility. They get core VOID emissions.

---

### 3.2 Node operators / infra (non-validator)

Non-validator node roles should still earn WC:

- Safeboot / lifeboat nodes.
- Full nodes providing indexing / archival services.
- Specialized infra nodes (metrics exporters, agent gateways, etc.).

**Payout mode** (directional, not final numbers):

- They should receive **WC** based on:
  - Uptime.
  - Data availability.
  - Serving agent/job traffic.
- Funding source:
  - RewardEngine WC budgets.
  - Possibly a portion of fees routed via WorkCreditsPoolV1 / relayer.

This gives people a reason to run nodes long before they become validators.

---

### 3.3 AI agents & jobs

Agents are a first-class citizen in VOID:

- Jobs go into `JobQueue`.
- Results + proofs/receipts go into `ReceiptRegistry` (already wired + monitored on devnet).
- Agents do off-chain compute (AI work, analysis, etc.).

**User POV**:

- You pay **WC** to get an AI job done.
- Some of that WC flows to:
  - The agent/operator.
  - Possibly upstream contributors (model providers, dataset providers).
- WC budgets for agents are backed by:
  - RewardEngine (for protocol-level incentives).
  - Real demand (users buying WC and spending it).

Again: **any user** can become an agent operator and earn WC.

---

### 3.4 Liquidity providers (WC/VOID pool)

LPs feeding liquidity into the WC/VOID pool gain:

- Swap fees.
- Possibly protocol-level WC “drip” incentives for keeping liquidity deep enough.

Funding comes from:
- A slice of RewardEngine’s WC-related budgets.
- Swap fees captured by the pool contracts themselves.

The point: people who keep WC liquid and tradable are also doing work; they deserve WC emissions.

---

### 3.5 End-users (NullFeed, content, misc)

We want **regular users** to be able to earn WC without running infra:

Examples (future roadmap, but direction is set):

- NullFeed posts / channels:
  - High-quality content / moderation / curation can earn WC.
- On-chain actions:
  - Participating in governance.
  - Running useful small tasks for agents or other users.
- Contributions to open source / datasets / models tied into Registry contracts.

**Important**: These surfaces **must** be backed by budgets and constraints in RewardEngine / WC policy.  
No “airdropping WC at random” – it all flows from:

> RewardEngine budgets → Minter / specific programs → WC payouts.

---

## 4. Roles of VOID vs WC (hard separation)

To avoid future slop, we keep a clean mental split:

### VOID

- Scarce.
- Long-term, high-value collateral.
- Used for:
  - Staking.
  - Governance.
  - Strategic protocol-level payments (e.g., 10M VOID seed).
- Emissions schedule fixed at design time; changes (if ever) require governance + code changes.

### WC

- Elastic, policy-driven, *work-oriented*.
- Used for:
  - Paying for agents / AI jobs.
  - Node work, infra, content, misc.
  - Small user-facing payments in Obelisk Wallet and NullFeed.
- Backed by:
  - VOID emissions.
  - Treasury actions.
  - Market trading in the WC/VOID pool.

IF WE EVER SEE:
- “Mint VOID directly to random users,” or
- “Bypass RewardEngine/Treasury for major value flows”

→ That’s a design violation.

---

## 5. Implementation status (V1)

**Already implemented and tested (at time of this doc):**

- `VoidToken` (VOID) core.
- WorkCredits stack:
  - `WorkCreditsToken`
  - `WorkCreditsPoolV1`
  - `WorkCreditsRelayerV1` + helpers + quote libs.
- RewardEngine:
  - Contract logic.
  - Econ JSON spec + tests for emission budgets.
  - Metrics and health scripts:
    - `void_mainnet_rewardengine_econ_health`
    - `void:mainnet_rewardengine_econ:health:last_5m`
- WorkCredits plan:
  - Devnet + mainnet PLAN exporters & health:
    - `void:mainnet_workcredits_plan:health:last_5m`
- Validators:
  - ValidatorSet contracts (L1 + mainnet).
  - Validators RUN pillar + metrics.

**Designed / documented but still to fully wire or harden:**

- Actual devnet RewardEngine deployment + WC payout wiring.
- Full “RewardEngine → WorkCreditsMinter → WC” live flow on devnet.
- Mainnet bootstrap wiring:
  - Funding RewardEngine and OpsTreasury from Treasury.
  - Seeding the WC/VOID pool with the one-time 10M VOID.
  - Turning on per-category budgets for validators, agents, LPs, etc.
- Obelisk Wallet + dashboards:
  - WC/VOID trading view.
  - “Collect pending WC” button.
  - Per-user breakdown of WC earnings (validator vs non-validator vs LP vs agent vs content).

---

## 6. Non-negotiables going forward

1. **All users can earn WC.**
   - Validators are *one* earning surface, not the only one.
   - Node operators, agents, LPs, and regular users doing useful work and content should all be able to earn WC.

2. **RewardEngine is the root of truth for emissions.**
   - Any long-lived reward stream must ultimately trace back to a RewardEngine budget + econ spec.

3. **VOID remains scarce and scheduled.**
   - No emissions outside the defined 4-era schedule, except through explicit, auditable governance changes and hard forks.

4. **Docs + metrics are first-class.**
   - This blueprint should match:
     - RewardEngine econ JSON.
     - Prometheus gauges and health rules.
     - Foundry tests.
   - If we change tokenomics, we update **all four**.

---

This document is V1. Future versions may refine percentages and add new earning surfaces, but the **direction** stays the same:

- VOID = scarce backbone + security.
- WC = work and usage.
- **Any user who contributes real value to VOID Network can earn WC.**
