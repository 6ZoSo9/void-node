# VOID Network – Validator Set & Staking Spec v1

This file defines how **validators / nodes** participate in VOID (chainId 2050)
and how they are rewarded in conjunction with the emissions + tokenomics docs.

It is meant to stay consistent with:

- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-EMISSIONS-PARAMS-V1.json
- docs/VOID-VALIDATOR-REWARDS-V1.md
- docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md
- docs/VOID-TOKENOMICS-SPEC-V1.md
- docs/VOID-MAINNET-GENESIS-PLAN.md

This spec focuses on **who is a validator**, **how they are selected**, and
**how rewards flow to them**.

---

## 0. Goals

- Validators (nodes) are the **primary recipients of emissions**.
- The validator set is **on-chain visible**, not just a config file.
- The design can start **simple/centralized** and evolve to more
  decentralized (e.g. full staking with slashing) without breaking invariants:

  - MAX_SUPPLY = 666,666,666 VOID
  - PREMINE   = 333,333,333 VOID
  - Emissions bounded by REMAINING_EMISSIONS.

---

## 1. Validator roles

A **validator** in VOID:

- Runs `void-node` with a **consensus keypair** (e.g. ed25519/BLS).
- Participates in block proposal / voting (depending on consensus flavor).
- Has an associated **reward address** (an EOA or contract on VOID).
- Is tracked on-chain by a **ValidatorSet contract** (v1 conceptual).

Validators are expected to:

- Stay online and follow protocol rules.
- Keep their node software updated per UpdateGate/ConfigGate (when they opt in).
- Accept that rewards are tied to correct participation.

---

## 2. ValidatorSet contract (logical design)

v1 focuses on **tracking who is in the active set** and what their **weight**
(stake) is. The actual Solidity contract will be defined separately; this file
is the design.

### 2.1 Core data

For each validator, ValidatorSet tracks:

- `validatorAddr` (address)
- `rewardAddr` (address)
- `stakeWeight` (uint256) – abstract “weight” for proposer selection and rewards
- `active` (bool)
- `joinedAt` / `updatedAt` (block numbers)

There is also a global view:

- `totalWeight` – sum of `stakeWeight` over all active validators.
- `validators[]` – array of active validator addresses (for enumeration).

### 2.2 Ownership / control

v1 control model (can evolve later):

- A **MasterKey / AdminGate-controlled address** has authority to:

  - Add / remove validators.
  - Adjust `stakeWeight` for testing / bootstrap.
  - Update `rewardAddr` in emergencies.

- Later versions can move toward:

  - **Self-stake**, where validators bond VOID in a staking contract.
  - Governance-controlled changes (e.g. on-chain voting / DAO).

The key invariant: **node software reads ValidatorSet and uses it**; the exact
control model can evolve via UpdateGate + ConfigGate.

---

## 3. Relationship to VOID token & rewards

Validators are the **primary sink** for emissions:

1. Emissions layer (emissions_v1) computes a per-block reward.
2. Monetary state (monetary_state_v1) clamps rewards so:
   - totalMinted <= REMAINING_EMISSIONS_WEI
   - PREMINE + totalMinted <= MAX_SUPPLY_WEI
3. Reward splitting (validator_rewards_v1) divides rewards between:

   - Proposer(s)
   - Active validator set (by `stakeWeight`)
   - Optional infra slices (e.g. community funding, dev fund)

4. The **reward addresses** for validators come from ValidatorSet.

The core guarantee:

> Over the life of the chain, **validators are paid out of emissions**, and the
> chain never exceeds the hard cap of 666,666,666 VOID.

---

## 4. Node / consensus integration (high-level)

`void-node` consensus must, for each block:

1. Determine the **active validator set** and their `stakeWeight` from
   ValidatorSet state at that height.

2. Use emissions_v1 + monetary_state_v1 to compute:

   - `rewardThisBlockWei`
   - `newTotalMintedWei`

3. Use validator_rewards_v1 (consensus version) to compute:

   - proposerRewardWei
   - perValidatorRewardWei (or validator-specific amounts)
   - optional infra slices

4. Create **reward outputs**:

   - For a pure account-based model: special “mint” operations that increase
     balances of reward addresses.
   - For an ERC20-like layer: calls / internal mints to VoidToken, respecting
     the cap.

5. Enforce **invariants**:

   - If applying this block’s reward would break the supply cap, the block is
     *invalid*.
   - If the validator set used does not match on-chain ValidatorSet state, the
     block is *invalid*.

This ties validator rewards directly into consensus – nodes cannot “skip” paying
validators and still produce valid blocks.

---

## 5. Validator selection & weight

v1 keeps selection rules simple:

- **Proposer selection** is out-of-scope for this doc, but must:

  - Only choose from `active == true` validators.
  - Weight selection by `stakeWeight` or use simple round-robin initially.

- **Reward weight**:

  - The share of block rewards per validator is proportional to
    `stakeWeight` (once we move beyond pure-round-robin bootstrap).

In bootstrap / dev networks, a single validator (you) may be 100% of the set.
The design must gracefully handle `N = 1` and gradually scale to many validators.

---

## 6. Evolution path (v2+)

Planned future upgrades (documented now so we don’t paint ourselves into a
corner):

- **Full on-chain staking**:

  - A dedicated Staking contract where validators bond VOID.
  - ValidatorSet reads stake balances from Staking contract, not direct admin
    writes.
  - Slashing hooks for misbehavior.

- **Self-service joining**:

  - Any address can stake above `MIN_STAKE` to become a validator.
  - Admin / MasterKey mainly controls parameters, not individual validators.

- **Decentralized governance**:

  - UpdateGate + ConfigGate used to evolve staking parameters and reward splits.
  - Eventually, community governance can control these, with MasterKey as a
    safety backstop only.

---

## 7. Status (2025-11-14)

As of this spec:

- Tokenomics is defined (MAX_SUPPLY, PREMINE, emissions, rewards).
- VoidToken ERC20 exists with tests.
- Non-consensus helpers exist in `src/tokenomics/*` for:
  - emissions_v1
  - validator reward splitting
  - monetary state / supply cap enforcement

This file **locks the high-level validator set / staking model** for v1 so that
the next steps can:

1. Implement a minimal `ValidatorSet.sol` consistent with this spec.
2. Add Foundry tests for validator registration / weights.
3. Wire validator rewards (non-consensus first, then consensus) to use the
   ValidatorSet view of the active set.

