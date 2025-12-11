# VOID Mainnet Reward Flow — V1 Spec (DRAFT)

This doc describes how rewards are supposed to move through the VOID mainnet system:
from the **fixed VOID supply** into **RewardEngine**, then into **Work Credits (WC)**,
and finally into **validators and other workers**.

It’s meant to be the human-readable counterpart to the Solidity tests and the monitoring
we’ve already wired.

---

## 1. High-level goals

1. Respect the locked tokenomics:
   - MAX_SUPPLY = 666,666,666 VOID
   - PREMINE   = 333,333,333 VOID (into a Treasury contract at genesis)
   - EMISSIONS = 333,333,333 VOID over 100 years in 4 eras:
     - Era 1: 177,777,777
     - Era 2:  88,888,889
     - Era 3:  44,444,444
     - Era 4:  22,222,223

2. Make VOID **the scarce governance/staking asset**, not a farming token.

3. Use **Work Credits (WC)** as the fluid “earnable” token for:
   - Node / validator rewards
   - Agent / job execution rewards
   - Future NFT / avatar / NullFeed ecosystem

4. Keep emissions and flows **contract-based and monitorable**, not hidden in random scripts.

---

## 2. Actors and contracts

### Core contracts (mainnet path)

- **VoidToken (VOID)**
  - The main governance/staking token.
  - Fixed MAX_SUPPLY; premine minted at genesis into Treasury.

- **VoidTreasury**
  - Holds the PREMINE = 333,333,333 VOID.
  - Long-term cold Treasury; controlled via AdminGate/UpdateGate etc.
  - Feeds downstream OpsTreasury / RewardEngine paths.

- **OpsTreasury**
  - Hotter, operational treasury.
  - Receives VOID from VoidTreasury for actual usage (e.g., seeding pools, funding on-chain incentives).

- **RewardEngine**
  - Manages the emissions schedule and budgeting over 100 years.
  - Knows the remaining emission per era/epoch.
  - Can “pull” emission (up to a cap) from a configured source (Treasury/Ops path) under admin control.
  - Provides **budgeted reward VOID** to downstream systems or accounting.

- **WorkCreditsToken (WC)**
  - Mintable/burnable credits representing work done on the network.
  - Governance-controlled minter role.
  - Used to pay validators, agents, etc.

- **WorkCreditsMinter**
  - Bridges RewardEngine → WC.
  - Holds authority to mint WC.
  - Only accepts instructions from RewardEngine (or a tightly controlled admin path).
  - Enforces the mapping between VOID emission budget and WC minting (e.g., 1 VOID of budget corresponds to X WC minted according to policy).

- **WorkCreditsPoolV1 (WC/VOID AMM)**
  - A simple on-chain pool holding both WC and VOID.
  - Seeded once with a special one-time allocation (e.g., 10M VOID + corresponding WC).
  - Price of WC ↔ VOID floats based on this pool.
  - Validators / workers who earn WC can swap to VOID here (or hold WC).

- **WorkCreditsRelayerV1 + helper**
  - Allows “meta-transactions” / relayed swaps on behalf of users, paid in WC with a fee.
  - Wallet/relayer UI will hit this to swap WC ↔ VOID without users dealing with gas weirdness.

- **ValidatorSet / RewardEngine integration**
  - ValidatorSet tracks who is staked and in the active set.
  - RewardEngine + WorkCreditsMinter collectively decide how much WC to mint/allocate over time based on a configuration that includes validator rewards.

---

## 3. Conceptual reward flow (VOID → WC → Validators)

### 3.1 Supply-side (emissions) perspective

1. **VOID emissions budget** is tracked inside RewardEngine according to the locked schedule.
2. On a regular cadence (epoch, era, or some admin-triggered interval):
   - An admin or automated policy calls into RewardEngine to **pull emission**.
   - RewardEngine:
     - Checks its 100-year budget and the current era’s cap.
     - Computes how much emission is allowed this period.
     - Marks that amount as “pulled” or reserved in its internal accounting.
3. The practical path for the pulled emission is:
   - Either:
     - VOID is actually moved from Treasury/OpsTreasury into a RewardEngine-owned bucket or dedicated vault.
   - Or:
     - RewardEngine accounts for “emission authorized” and records how much VOID is backing the WorkCredits system, with actual VOID movements done via Treasury/OpsTreasury operations.

The exact accounting mechanics depend on final contract wiring, but the invariant is:

> **RewardEngine must never authorize more VOID equivalent rewards than the 100-year emissions schedule allows.**

### 3.2 Conversion into Work Credits (WC)

Once RewardEngine has authorized some amount of emission for a period:

1. RewardEngine calls into **WorkCreditsMinter** with:
   - An amount of emission budget (VOID-equivalent).
   - Optional metadata: epoch, era, reward type (validator vs agent), etc.

2. WorkCreditsMinter:
   - Applies a conversion policy (for now conceptually 1:1 VOID-equivalent → WC, but could be more complex).
   - Mints WC to:
     - A distribution contract, OR
     - Directly to validator / worker accounts, depending on final design.

3. The minted WC is **backed by the fact** that an equivalent amount of VOID emission has been reserved/authorized by RewardEngine, and the econ tests + monitoring ensure this isn’t violated.

### 3.3 Distribution to validators

Validators earn WC as follows (conceptually):

1. Validator performance metrics (uptime, correctness) feed into RewardEngine’s “who gets what” logic (directly or via an intermediate RewardDistributor contract).
2. For each period:
   - RewardEngine / distribution logic decides a WC allocation per validator.
   - WorkCreditsMinter mints WC and sends it to the validators’ addresses (or a rewards-claim contract they can pull from).
3. Validators end up with WC balances they can:
   - Hold as-is for ecosystem usage (NullFeed, NFTs, services).
   - Swap for VOID via the WC/VOID pool.

This means validators are not directly spewing new VOID; they’re earning **Work Credits** that are economically tied to VOID through the pool and the emissions budget.

---

## 4. WC/VOID pool and the one-time 10M seed

We also have the **one-time 10M VOID seed** concept that powers the pool and keeps relayer/UX sane.

### 4.1 One-time seed

- From the premine/Treasury:
  - A fixed amount of VOID (e.g., 10,000,000 VOID) is moved into WorkCreditsPoolV1.
  - A matching amount of WC is minted and paired in the pool.
- This creates a **liquidity pool** that bootstraps:
  - WC price discovery vs VOID.
  - The ability for validators to convert WC → VOID reliably.
  - Trade volume that can feed fees back into OpsTreasury or a DAO later.

This seed is **one-time** and is sustained by:
- Market activity.
- Protocol flows.
- Emissions turning into WC which then gets swapped, etc.

### 4.2 Price and user experience

- Users and validators see:
  - WC as their “earnable” unit.
  - VOID as the scarce, long-term asset.
- WorkCreditsRelayer / helper:
  - Lets wallets swap WC ↔ VOID in one click.
  - Can charge small WC fees for relayed swaps.
- Over time:
  - Pool reserves / price reflect how much demand there is for VOID vs WC.

---

## 5. Validator rewards vs other workers (agents, datasets, etc.)

The same RewardEngine → WorkCreditsMinter path can be used for **non-validator rewards**:

- Agents that complete jobs on Void Network.
- Dataset providers.
- Model providers.
- Other future work roles.

Conceptually:

1. RewardEngine assigns emission budget slices to categories:
   - Validators
   - Agents / AI jobs
   - Datasets
   - Misc / ecosystem
2. Each category has its own policy for how WC is allocated.
3. Everything still flows through:
   - RewardEngine → WorkCreditsMinter → WC distribution
   - Optional downstream accounting contracts per category.

Validators are just the most critical “first-class” category we must get right for mainnet launch.

---

## 6. Monitoring + invariants

We already have monitoring for:

- RewardEngine econ JSON presence + self-consistency.
- WorkCredits PLAN health.
- Mainnet pillars + validators + RewardEngine econ + WorkCredits PLAN all in one composite metric.

We still need final invariants (some enforced in tests, some via metrics):

1. **Emissions budget invariant**
   - Total authorized VOID emission (summed over RewardEngine history) ≤ 333,333,333.
   - Per-era caps respected.

2. **WC minting invariant**
   - Sum of WC minted due to RewardEngine instructions should not break the mapping to emissions budget.
   - Long-term: WC supply and VOID emission relationship must remain within configured policy bounds.

3. **Pool sanity**
   - WorkCreditsPoolV1 reserve gauges:
     - VOID reserve
     - WC reserve
   - Prices (WC per VOID, VOID per WC) in expected ranges for devnet / mainnet.

4. **Validator payout sanity**
   - Gauges or logs tying:
     - Validator performance → WC allocations.
   - Long-term: SLOs for “validator rewards actually being distributed” and “no absurd outliers.”

---

## 7. TL;DR (for Future-Me)

- VOID is scarce and sits in Treasury + OpsTreasury.
- RewardEngine enforces the 100-year emissions schedule.
- RewardEngine authorizes emission budget and hands it off to **WorkCreditsMinter**.
- WorkCreditsMinter mints **WC** based on that budget and distributes it to validators/workers.
- Validators earn **WC**, not direct VOID.
- Validators (and others) can convert WC ↔ VOID through **WorkCreditsPoolV1**, seeded once with a 10M VOID allocation.
- Monitoring and tests must ensure:
  - Emissions budget isn’t violated.
  - WC minting stays consistent with RewardEngine’s budget.
  - Pool + pillars + econ gauges remain healthy.

This doc is the narrative spec that the contracts and ops scripts are supposed to match. Any future changes to RewardEngine, WorkCreditsMinter, or the pool should update this doc.
