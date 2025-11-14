# VOID Network – Validator Rewards Spec (v1)

This file defines how **validators (nodes)** are paid on VOID (chainId 2050).

It is paired with:
- docs/VOID-EMISSIONS-SCHEDULE.md (human description).
- docs/VOID-EMISSIONS-PARAMS-V1.json (machine-readable params).

---

## 1. Block reward basics

- Each block has a single **validator address** that is considered the proposer.
- For height h, the protocol computes `rewardPerBlock(h)` using the emissions params.
- The reward is minted directly to the validator address for that block.
- Rewards come from `REMAINING_EMISSIONS` and are bounded so total supply
  never exceeds `MAX_SUPPLY = 666,666,666 VOID`.

High level rule:

- `totalSupply(genesis) = PREMINE`.
- `totalSupply(h) = PREMINE + sum_{i=1..h} rewardPerBlock(i)`.
- Node software must clamp the last reward if needed so `totalSupply(h)`
  stays <= MAX_SUPPLY.

---

## 2. Era based decay model

- Time is split into **eras**:
  - `eraLengthBlocksMainnet = 31,536,000` blocks (approx one year at 1s blocks).
- Era index is `era(h) = floor(h / eraLengthBlocksMainnet)`.
- Base reward for an era e is:
  - `baseReward(e) = initialRewardWei * (decayNumerator / decayDenominator)^e`.

These parameters are stored in `VOID-EMISSIONS-PARAMS-V1.json`:
- `initialRewardWei`
- `decayNumerator` / `decayDenominator`
- `eraLengthBlocksMainnet`

Node side rule (conceptual, to be implemented in void-node):

- For a given height h:
  1. Compute era index e.
  2. Compute the era base reward from the JSON params.
  3. Use that as `rewardPerBlock(h)` (or a derived per block value).
  4. If minting this reward would push totalSupply above MAX_SUPPLY,
     reduce the reward so totalSupply equals MAX_SUPPLY exactly.

---

## 3. Who gets the reward

- Each block header carries a **validator address** field.
- `rewardPerBlock(h)` is credited to that address.
- In early VOID mainnet phases, this may be a small, curated set of validators.
- Later phases can add staking and larger validator sets without changing
  the core rule: reward goes to the validator address in the header.

---

## 4. Non goals (v1)

- This spec does not define staking, slashing, or delegation.
- This spec does not define MEV capture or fee-sharing; only **base emissions**.
- Fees from transactions are additive and can be routed by later designs.

---

## 5. Implementation notes for void-node

- `void-node` will load `VOID-EMISSIONS-PARAMS-V1.json` at startup for mainnet.
- Consensus code will expose a pure helper (conceptually):
  - `rewardPerBlock(height) -> uint256`.
- Block construction will credit this amount to the validator address in the header.
- Validation will recompute the expected reward and reject blocks whose
  coinbase mint does not match the function or exceeds the supply cap.
