# VOID Network – Validator Reward Integration (v1)

This document describes how validator rewards are wired into VOID mainnet using:

- VoidToken (mainnet ERC-20)
- VoidTreasury (cold premine treasury)
- OpsTreasury (hot operational treasury)
- ValidatorSet (implements IValidatorSetLike)
- RewardEngine (emissions budget + per-validator claims)

It is aligned with the current contracts and tests:

- contracts/mainnet/VoidTreasury.sol
- contracts/mainnet/OpsTreasury.sol
- contracts/mainnet/ValidatorSet.sol
- contracts/mainnet/IValidatorSetLike.sol
- contracts/mainnet/RewardEngine.sol
- test/mainnet/Treasury.t.sol
- test/mainnet/RewardEngine.t.sol
- test/mainnet/ValidatorSet.t.sol

---

## 1. Tokenomics recap (locked)

From the locked tokenomics spec:

- MAX_SUPPLY = 666,666,666 VOID
- PREMINE (Treasury) = 333,333,333 VOID
- EMISSIONS (for validators and long-term incentives) = 333,333,333 VOID

Emissions are split into four eras:

1. Era 1: 177,777,777 VOID
2. Era 2: 88,888,889 VOID
3. Era 3: 44,444,444 VOID
4. Era 4: 22,222,223 VOID

The RewardEngine’s emissions budget is configured so that:

- totalPulled + headroom == EMISSIONS (scaled to 18 decimals)
- totalPulled can never exceed EMISSIONS

A separate Prometheus spec gauge (void_mainnet_tokenomics_spec_health) ensures that exported tokenomics constants exactly match the locked spec and the JSON/markdown docs.

---

## 2. Treasury layout

### 2.1 VoidTreasury (cold)

- Holds the premine (333,333,333 VOID) and long-term reserves.
- Controlled by a very slow, hardened key (or multi-sig).
- Core function:

    sendToOps(uint256 amount, bytes32 tag)

  - Moves VOID from the cold treasury to OpsTreasury.
  - Only callable by the treasury admin.
  - Emits an event for monitoring.

### 2.2 OpsTreasury (hot)

- Holds a much smaller operational balance.
- Used for:
  - Paying vendors
  - Grants
  - Misc ops costs that are not validator rewards

Core function:

    spend(address to, uint256 amount, bytes32 tag)

- Only callable by the OpsTreasury admin.
- Transfers tokens to the target vendor / recipient.
- Emits an event with the tag for accounting.

Treasury behaviour is tested in test/mainnet/Treasury.t.sol.

---

## 3. Validator set

ValidatorSet implements IValidatorSetLike (see its own spec doc). For rewards, the essential behaviour is:

- getActiveValidators() returns the current set of reward-eligible validators.
- getVotingPower(v) returns each validator’s weight.
- totalPower() is the sum of all powers.

ValidatorSet v1 is admin-managed: there is no on-chain staking yet. The admin (ideally a governance or multi-sig later) periodically updates powers to reflect real-world stake and performance.

---

## 4. RewardEngine

RewardEngine is the contract that bridges tokenomics into actual validator payouts.

High-level responsibilities:

1. Track a global emissions budget (333,333,333 VOID).
2. Enforce totalPulled <= emissionsBudget.
3. Distribute pulled emissions across validators proportionally to their voting power.
4. Allow validators to claim their accrued rewards.

The tests in test/mainnet/RewardEngine.t.sol confirm:

- Emissions budget matches the spec (testEmissionsBudgetMatchesSpec).
- Claim flow works for a mocked validator set (testClaimFlow).
- Claims revert when there is nothing to claim (testClaimRevertsWhenNothingToClaim).
- Only admin can pull emissions (testOnlyAdminCanPullEmission).
- Pulling cannot exceed the configured budget (testPullEmissionCapsAtBudget).

---

## 5. Reward flow (conceptual)

The v1 reward flow is:

1. Budget configuration
   - At deployment, RewardEngine is configured with:
     - address voidToken
     - address validatorSet
     - address admin
     - uint256 emissionsBudget (333,333,333 * 1e18)

2. Emission pulls (admin)
   - Admin periodically calls:

        pullEmission(uint256 amount)

   - Preconditions:
     - totalPulled + amount <= emissionsBudget
   - Side-effects:
     - totalPulled increases by amount.
     - Engine internal balance or accounting increases by amount.

3. Accrual to validators
   - For each accounting step / interval (implementation detail):
     - Read active := getActiveValidators().
     - Read total := totalPower().
     - For each v in active, read p := getVotingPower(v).
     - Compute share[v] ≈ amount * p / total.
   - Accrued shares are stored in per-validator state.

4. Claims
   - A validator calls claim() (or a helper can claimFor(validator)).
   - Engine transfers the accrued balance for that validator and zeros it out.
   - No double-claiming is possible because balances are reset after payment.

5. Monitoring
   - Exported metrics (via textfile or HTTP) should include:
     - reward_emissions_budget
     - reward_emissions_pulled_total
     - reward_emissions_claimed_total
     - reward_emissions_headroom = budget - pulled

   - Alerts:
     - pulled > budget (should be impossible)
     - headroom too low vs schedule
     - long-term mismatch between claimed totals and expected schedule

---

## 6. Invariants

The RewardEngine + ValidatorSet + Treasury system is expected to uphold:

1. Budget cap
   - totalPulled <= emissionsBudget
   - totalClaimed <= totalPulled

2. Tokenomics alignment
   - emissionsBudget equals the EMISSIONS constant from the tokenomics spec (333,333,333 VOID).
   - Prometheus spec health gauge (void_mainnet_tokenomics_spec_health) remains 1.

3. Fairness across validators
   - For each emission step, the sum of per-validator shares matches the pulled amount (within rounding).
   - share[v] is proportional to votingPower[v] / totalPower().

4. Validator set consistency
   - totalPower() == Σ getVotingPower(v) over getValidators().
   - getActiveValidators() contains exactly those validators with power > 0.

5. Ops separation
   - Validator rewards flow only through RewardEngine.
   - OpsTreasury handles non-validator operational spends.
   - VoidTreasury remains the cold long-term store.

---

## 7. Roadmap

Validator reward integration v1 is deliberately simple:

- No on-chain staking/slashing logic yet.
- No multi-pool reward curves.
- Fixed emissions budget aligned with the 4-era schedule.

Later versions can add:

- Dedicated staking modules that feed ValidatorSet.
- Slashing hooks integrated with monitoring / fault proofs.
- Different reward classes per validator type (e.g. AI agents vs human operators).
- Governance-controlled updates to emission cadence (while respecting the total budget).

Until then, this document is the canonical v1 integration spec matching the current contracts, tests, and Prometheus tokenomics health checks.
