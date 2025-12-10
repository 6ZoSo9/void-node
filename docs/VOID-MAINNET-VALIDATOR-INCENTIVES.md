# VOID Mainnet — Validator Incentives & WorkCredits (v0)

## 1. Scope

This doc defines the high-level **incentive model** for validators and node operators on VOID mainnet, and how it connects to WorkCredits (WC).

It is **not** Solidity-level detail or a formal spec. It is the human-readable design that must stay consistent with:

- Tokenomics tests (TokenomicsSpec, RewardEngine, ValidatorSet tests).
- Mainnet bootstrap config (`void-mainnet-bootstrap-mainnet.live.json`).
- WorkCredits docs:
  - `docs/VOID-MAINNET-WORKCREDITS-PILLAR.md`
  - `docs/VOID-OBELISK-WORKCREDITS-UI.md`

Goal: make it obvious **how validators and nodes get paid**, and how VOID vs WC interact.

---

## 2. Baseline tokenomics (recap)

Global constants (locked):

- **MAX_SUPPLY**: `666,666,666 VOID`
- **PREMINE**: `333,333,333 VOID`
  - Minted at genesis into a **contract** (VoidTreasury), **not** an EOA.
- **EMISSIONS**: `333,333,333 VOID` over 100 years
  - Split across 4 eras (25 years each):
    - Era 1 (years 0–25): `177,777,777 VOID`
    - Era 2 (years 25–50): `88,888,889 VOID`
    - Era 3 (years 50–75): `44,444,444 VOID`
    - Era 4 (years 75–100): `22,222,223 VOID`

High-level:

- The **premine** lives in VoidTreasury and is used for:
  - Validator bootstrap / incentives.
  - Ecosystem & dev funding.
  - WorkCredits pool seeding (one-time 10M VOID).
- The **emissions** stream is controlled by RewardEngine + ValidatorSet and is meant to reward:
  - Long-term validator security.
  - Node work and network services (over time).
  - AI / data / agent workloads.

---

## 3. Core contracts and roles (simplified)

Main actors:

- **VoidToken** — ERC20 VOID.
- **VoidTreasury** — holds premine; governed by AdminGate / UpdateGate roles.
- **OpsTreasury** — operational funds for ongoing emissions / payments.
- **RewardEngine** — computes and distributes rewards (VOID) based on:
  - Emission schedule.
  - ValidatorSet state (stake, participation).
  - Potentially other signals later (jobs, WC-related activity).
- **ValidatorSet** — tracks validators and their staked VOID.
- **Gates**:
  - **AdminGate** — high-level admin / ownership routing.
  - **ConfigGate** — configuration knobs (rates, addresses, etc.).
  - **UpdateGate** — upgrade paths, feature activation over time.

Chain ID:

- VOID mainnet chainId is locked to `2050`.

---

## 4. Validator rewards — high level

### 4.1 Staking

- Validators **stake VOID** into ValidatorSet.
- Stake determines:
  - Eligibility to produce blocks.
  - Share of emission-based rewards.
- Unstaking / withdrawal is delayed and controlled to protect the network (cooldown period, etc. — details defined in ValidatorSet tests/spec).

### 4.2 Emissions → RewardEngine → Validators

At a high level:

1. Each era defines a **total emissions budget**.
2. Emissions are “streamed” over time (per block / per epoch) into the **RewardEngine**.
3. RewardEngine:
   - Tracks per-validator shares based on:
     - Staked amount.
     - Participation (producing valid blocks, not missing too many).
   - Updates internal accounting so validators can **claim** rewards owed.

4. Rewards are **paid in VOID**, not WorkCredits:
   - The main security incentive is pure VOID.
   - This keeps consensus economics simple and aligned.

5. Funding source:
   - Emissions bucket flows **through** VoidTreasury and/or OpsTreasury into RewardEngine.
   - Tests enforce:
     - No emission over-mint.
     - Total supply never exceeds MAX_SUPPLY.
     - Distribution matches era schedules.

### 4.3 Punishments / slashing (future detail)

- The system will need:
  - Missed block penalties.
  - Potential slashing hooks for malicious behavior.
- Exact details are coded in ValidatorSet / RewardEngine and tested, but not elaborated here.
- Design principle:
  - Honest validators with good uptime accrue VOID.
  - Dishonest or lazy validators lose yield or stake.

---

## 5. WorkCredits — separate but connected

WorkCredits (WC) is **not** the consensus/security token.

Instead, WC is the **network work currency**, used for:

- Paying for AI jobs, data retrieval, and other services.
- Rewarding **useful work**:
  - Rendering jobs.
  - Agent tasks.
  - Storage, bandwidth, indexing, etc.
- Powering the **WC/VOID AMM** that connects labor → token → market.

Key points:

- WC is **separate** from VOID emissions.
- Validators primarily earn **VOID** for security.
- Nodes (including validators) can earn **WC** for additional services/work.

---

## 6. WorkCredits pool and one-time VOID seed

We are locking in:

- A **one-time seed** of **10,000,000 VOID** from the premine to support the WC/VOID pool + relayer liquidity.
- This seed is **not emissions**; it’s a Treasury decision.

The WC/VOID pool (WorkCreditsPoolV1 or successor):

- Holds VOID + WC as reserves.
- Sets on-chain price between WC and VOID.
- Drives:
  - The “Trading View” in Obelisk Wallet.
  - Conversions between “network labor token” (WC) and main asset (VOID).

Validators and serious node operators benefit because:

- They earn VOID via staking/emissions.
- They can earn WC via work/agents.
- WC can be swapped to VOID (or held for ecosystem reasons) through the pool.

---

## 7. How a validator gets paid (story view)

From the validator’s perspective:

1. **Stake VOID** into ValidatorSet.
2. **Run a node** that:
   - Proposes blocks when selected.
   - Stays online and in sync.
3. Over time:
   - **RewardEngine** accrues emission-based VOID rewards for your validator.
   - You **claim** these rewards (either directly or via a helper / relayer).
4. If you also run:
   - **Agent nodes / AI workers**.
   - **Storage / index / NullFeed hosting**.
   - Other jobs integrated with JobQueue / WorkCredits.
   Then you can additionally earn **WC** for those tasks.

Result:

- Base layer: validator earns **VOID** for securing the chain.
- Work layer: node earns **WC** for doing useful work, which is tradable for VOID via WC/VOID pool.

---

## 8. Interaction with Obelisk Wallet UI

Obelisk Wallet surfaces this model to humans via:

- **Wallet tab**:
  - Shows VOID + WC balances.
  - Allows users (including validators) to **send/receive** both VOID and WC.
  - Has a **“Collect pending WC”** button for node/work rewards.
  - Controls relayer ON/OFF.

- **Trading View tab**:
  - Shows WC/VOID price and pool reserves.
  - Lets users swap VOID ↔ WC.
  - Eventually, lets LPs provide/remove liquidity.

- **Dashboard tab**:
  - Shows validator-related health and metrics:
    - ValidatorSet status (up, down, missing).
    - Last-mile/txRoot health.
    - WorkCredits pillar health.
  - Power users and validators can see at a glance whether:
    - Core mainnet is okay.
    - WorkCredits pillar is configured and healthy.
    - Validators RUN pillar is green.

---

## 9. Future extensions (roadmap, not v0)

Not needed for initial mainnet, but in scope later:

- Direct WC-based incentives for:
  - Latency-sensitive routing.
  - Serving NullFeed channels.
  - Hosting websites + content addressed to on-chain URLs.
- More complex reward splits:
  - PART of emissions routed into WorkCredits mechanisms.
  - Tiered validator classes (light vs heavy, AI-centric vs general).

Those belong in a future “Validator Incentives v1+ / WC Integration” doc and corresponding contract changes. For now, v0 remains:

- **VOID**: security, emissions, staking.
- **WC**: work, AI tasks, relayer/liquidity economy.
