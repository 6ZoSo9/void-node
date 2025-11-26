# VOID Network – Tokenomics Spec v1 (Canonical)

This file ties together VOID’s monetary policy:

- Max supply / premine
- Emissions curve
- Validator rewards
- Node-side helpers
- VoidToken ERC20

It MUST stay consistent with:
- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-EMISSIONS-PARAMS-V1.json
- docs/VOID-VALIDATOR-REWARDS-V1.md
- docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md
- docs/VOID-MAINNET-GENESIS-PLAN.md

---

## 0. Locked constants

- SYMBOL      = VOID
- DECIMALS    = 18
- MAX_SUPPLY  = 666,666,666 VOID
- PREMINE   = 333,333,333 VOID
- REM_EMISS   = 333,333,333 VOID (= MAX_SUPPLY - PREMINE)

Rules:

- At genesis: totalSupply = PREMINE.
- Over time: emissions mint at most REM_EMISS more.
- Always: totalSupply <= MAX_SUPPLY.
- There is NO “turn rewards off” switch; rewards decay but never fully vanish.

---

## 1. VoidToken (on-chain ERC20)

`contracts/VoidToken.sol`:

- Cap: MAX_SUPPLY (18 decimals).
- Premine: PREMINE to the deployer (genesis treasury).
- Invariants enforced by tests:
  - totalSupply() <= MAX_SUPPLY at all times.
  - On deploy: totalSupply == PREMINE and deployer balance == PREMINE.

Consensus integration MUST respect this cap: no consensus path may cause total
token supply to exceed MAX_SUPPLY.

---

## 2. Emissions helper: emissions_v1

`src/tokenomics/emissions_v1.ts` defines `rewardPerBlockWei(height)`:

- Pure, deterministic, height-based.
- Uses params from `VOID-EMISSIONS-PARAMS-V1.json`.
- Asymptotic sum of rewards is <= REM_EMISS (in wei).

Conceptual rules:

- rewardPerBlockWei(h) >= 0.
- Sum over all h of rewardPerBlockWei(h) <= REM_EMISS_WEI.

This means rewards conceptually run forever, but the **total** emitted is hard
capped by design.

---

## 3. Reward split helper: validator_rewards_v1

`src/tokenomics/validator_rewards_v1.ts` (NON-CONSENSUS helper):

- Input: rewardPerBlockWei, activeValidatorCount, split config.
- Output: proposerRewardWei, perValidatorRewardWei, optional infra slices.
- Sum of outputs <= rewardPerBlockWei (dust handled deterministically).

Today this is for modelling and docs; once wired into consensus, that concrete
version becomes part of the protocol.

---

## 4. Monetary state helper: monetary_state_v1

`src/tokenomics/monetary_state_v1.ts` tracks an emissions-only counter
`totalMinted` and enforces:

- totalMinted <= REM_EMISS_WEI.
- PREMINE_WEI + totalMinted <= MAX_SUPPLY_WEI.

For each block:

- Start from previous `totalMinted`.
- Compute desired reward from `emissions_v1`.
- Clamp reward if needed so the cap cannot be exceeded.
- Return (rewardThisBlockWei, newTotalMinted).

This is the **last guardrail** between the math curve and actual minting.

---

## 5. Consensus integration (high level)

When we wire this into `void-node` consensus, the seal path must:

1. For block height h, compute `rewardPerBlockWei(h)` via emissions_v1.
2. Run it through monetary_state_v1 to get:
   - rewardThisBlockWei
   - updated totalMinted
3. If rewardThisBlockWei > 0, split using a fixed, protocol-defined version of
   validator_rewards_v1 and mint:
   - directly to proposer / validators, OR
   - to a rewards contract which then pays them out.
4. If applying the reward would break:
   - totalMinted <= REM_EMISS_WEI, or
   - PREMINE + totalMinted <= MAX_SUPPLY,
   the block MUST be considered invalid.

Details of exact state fields and storage layout will be specified in the
consensus docs and implemented in void-node, but they MUST respect this spec.

---

## 6. Status (2025-11-14)

Already implemented:

- VoidToken.sol + tests (cap + premine).
- emissions_v1.ts (curve).
- validator_rewards_v1.ts (split helper).
- monetary_state_v1.ts (cap enforcement).
- emissions_sanity.ts + VOID-EMISSIONS-SANITY-2025-11-14.txt (modelling run).
- Multiple docs describing emissions, validator rewards, and genesis.

Next step: integrate monetary_state_v1 and validator rewards into the seal
pipeline so every block mints protocol-correct VOID to validators.
