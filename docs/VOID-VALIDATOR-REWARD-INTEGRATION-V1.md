# VOID Network – Validator Reward Integration v1

This doc defines how VOID's monetary policy (emissions_v1) is integrated into
the consensus layer so that **validators actually get paid** and the total
supply stays bounded by:

- MAX_SUPPLY = 666,666,666 VOID
- PREMINE   = 230,000,000 VOID

It is the blueprint for wiring `src/tokenomics/emissions_v1.ts` into `void-node`
proposer logic.

---

## 1. Concepts and invariants

State variables (whether implicit in chain state or tracked in node code):

- totalSupply(h): total VOID supply after block `h` is applied.
- totalMinted(h): total amount of VOID ever minted (premine + block rewards)
  after block `h`.

Invariants:

1. totalSupply(h) == totalMinted(h) (no burning yet in v1).
2. totalSupply(h) <= MAX_SUPPLY for all heights.
3. totalMinted(h) = PREMINE + sum_{i=1..h} rewardPerBlock(i).

If any block would violate (2), it is considered **invalid** and MUST be
rejected by honest nodes.

---

## 2. Emissions function (node-side helper)

We already have:

- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-EMISSIONS-PARAMS-V1.json
- src/tokenomics/emissions_v1.ts
- docs/VOID-EMISSIONS-SANITY-2025-11-14.txt

The helper in `emissions_v1.ts` should be treated as the **canonical shape** of
the final consensus code, even though the file itself is currently
non-consensus.

High-level:

- rewardPerBlock(height: number) -> bigint
- totalEmittedUpTo(height: number) -> bigint
- Both are pure and deterministic.

The long-tail curve is chosen so that:

- sum_{h=1..∞} rewardPerBlock(h) <= REMAINING_EMISSIONS
- REMAINING_EMISSIONS = 436,666,666 VOID

---

## 3. Who gets paid?

For v1, VOID is **single-asset PoA/PoS hybrid** at the node level:

- Each block has a **validator / proposer address** (coinbase).
- Emissions for that block go to that address.

Validator selection is handled **outside** this doc:

- In devnet: single validator (your main node).
- In early mainnet: small, fixed validator set defined in genesis or a simple
  contract.
- Later: full staking / validator set contract (v2).

This doc only defines *how much* to pay and *where* to send it once the
validator address is chosen.

We also have a non-consensus helper:

- src/tokenomics/validator_rewards_v1.ts

which can split a block reward across multiple validators / pools. In v1, we
may start with a trivial "100% to single validator" policy.

---

## 4. Consensus integration (block production)

For each new block at height `h`:

1. Compute the base reward from emissions:
   - R_base = rewardPerBlock(h)

2. Check cap against total minted so far:
   - totalMintedPrev = totalMinted(h-1)
   - require(totalMintedPrev + R_base <= MAX_SUPPLY)

   In practice, the node will track `totalMinted` (or totalSupply) in chain
   state and enforce the check when constructing the block. If the cap would be
   breached, block is **invalid**.

3. Determine the validator payout:

   - In the simplest v1:
     - validator = currentBlock.proposerAddress
     - R_validator = R_base

   - If/when we use `validator_rewards_v1.ts`:
     - rewards = splitReward(R_base, validatorSet, policy)
     - Sum of all rewards in `rewards` MUST equal R_base.

4. Minting rule:

   - Mint VOID directly to the validator(s) as part of the state transition.
   - No faucet, no side contract is required for core block rewards in v1.
   - Excess mint (beyond cap) is forbidden by step 2.

5. Fees (v1 simple):

   - TX fees can:
     - Either accumulate in a fee pool and be paid out periodically, or
     - Be paid directly to the validator address for that block.

   - For now, **v1 assumes "fees -> validator"** (simple ETH-style),
     but fee logic is not fully defined yet and can be upgraded separately.

---

## 5. Node implementation outline (void-node)

This section is the TODO for `void-node` consensus code. Implementation will
follow this shape:

- Add a "monetary state" to the chain:
  - totalMinted (bigint).
  - Maybe stored in a special system account or chain metadata.

- At block construction time:
  1. Read current height `h`.
  2. Compute `R_base = rewardPerBlock(h)` via emissions_v1 logic
     (or a consensus copy of it).
  3. Compute `totalMintedNext = totalMintedPrev + R_base` and assert
     `totalMintedNext <= MAX_SUPPLY`.
  4. Compute `validator` (proposer) and how to split R_base (simple: 100%
     to validator).
  5. Apply a state change that:
     - Credits validator's VOID balance by R_base.
     - Updates `totalMinted` to `totalMintedNext`.

- If any node sees a block with inconsistent reward application (e.g. wrong
  amount minted or minted to unexpected address), it MUST treat that block as
  invalid.

---

## 6. Monitoring and observability

When we wire this into void-node, we MUST export Prometheus metrics such as:

- void_monetary_total_minted
- void_monetary_total_supply
- void_monetary_reward_per_block
- void_monetary_cap = MAX_SUPPLY (constant)
- void_monetary_cap_gap = MAX_SUPPLY - totalSupply

Plus alerts:

- VoidMonetaryCapBreach:
  - Fires if `totalSupply > MAX_SUPPLY` (should never happen).
- VoidMonetaryDivergence:
  - Fires if a node's local `totalMinted` disagrees with emissions_v1 model for
    its current head.

This lets us **see** monetary policy on dashboards and catch bugs or attacks
early.

---

## 7. Versioning

This is v1 of validator reward integration. Future versions may:

- Introduce on-chain staking and dynamic validator sets.
- Split rewards between proposer, attesters, and other roles.
- Add burning components (e.g. fee burn, slashing).

But they MUST:

- Respect MAX_SUPPLY and PREMINE constants.
- Keep total minted <= MAX_SUPPLY for all time.

This doc is the canonical reference for wiring validator rewards into VOID
consensus for mainnet v1.
