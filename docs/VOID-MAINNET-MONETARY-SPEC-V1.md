# VOID Network – Mainnet Monetary Spec (v1)

This document defines how VOID mainnet (chainId 2050) enforces its monetary
policy at the contract layer and how the different pieces fit together:

- Tokenomics constants (max supply, premine, emissions)
- Treasury layout (cold vs hot)
- ValidatorSet + RewardEngine integration
- Hard separation between premine and validator rewards

It is aligned with the current contracts and docs:

- contracts/mainnet/VoidTreasury.sol
- contracts/mainnet/OpsTreasury.sol
- contracts/mainnet/ValidatorSet.sol
- contracts/mainnet/IValidatorSetLike.sol
- contracts/mainnet/RewardEngine.sol
- test/mainnet/Treasury.t.sol
- test/mainnet/RewardEngine.t.sol
- test/mainnet/ValidatorSet.t.sol
- docs/VOID-TOKENOMICS-SPEC-V1.md
- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-VALIDATOR-SET-SPEC-V1.md
- docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md

This doc is not consensus code, but everything here must hold true for mainnet
to be considered valid.

---

## 1. Locked tokenomics

From the locked tokenomics spec:

- MAX_SUPPLY = 666,666,666 VOID
- PREMINE    = 333,333,333 VOID
- EMISSIONS  = 333,333,333 VOID

Emissions are split into four long-term eras:

1. Era 1: 177,777,777 VOID
2. Era 2:  88,888,889 VOID
3. Era 3:  44,444,444 VOID
4. Era 4:  22,222,223 VOID

Premine split (inside the 333,333,333 PREMINE):

- Founder / long-term trust: 230,000,000 VOID
- Other premine:            103,333,333 VOID

These numbers are already enforced by the tokenomics gauges and spec health
recordings:

- void_tokenomics_max_supply_void
- void_tokenomics_premine_void
- void_tokenomics_emissions_void
- void_tokenomics_founder_trust_void
- void_mainnet_tokenomics_max_supply
- void_mainnet_tokenomics_premine_total
- void_mainnet_tokenomics_emissions_total
- void_mainnet_tokenomics_premine_founder_trust
- void_mainnet_tokenomics_spec_health
- void:mainnet_tokenomics:spec_health:last_5m

If void_mainnet_tokenomics_spec_health ever goes to 0, Prometheus fires
VoidMainnetTokenomicsSpecMismatch and mainnet pillars are considered broken
until fixed.

---

## 2. Treasury layout

There are two treasury contracts in mainnet tokenomics v1:

- VoidTreasury  (cold premine treasury)
- OpsTreasury   (hot operational treasury)

### 2.1 VoidTreasury (cold premine treasury)

VoidTreasury is the only contract that ever holds the premine at genesis.

Invariant:

At genesis, 333,333,333 VOID (scaled to 18 decimals) are minted into
VoidTreasury. No premine goes directly to validators or any other address.

Key properties:

- Holds the entire 333,333,333 VOID premine.
- Controlled by a slow, hardened admin (ideally multi-sig, plus offline
  backups per the keys plan).
- Does NOT pay validators directly.
- The normal exit path is to OpsTreasury, not to arbitrary EOAs.

Core function:

- sendToOps(uint256 amount, bytes32 tag)

  - Only callable by the treasury admin.
  - Moves VOID from VoidTreasury to OpsTreasury.
  - Emits an event with tag for accounting and monitoring.
  - Subject to whatever internal policy you enforce for long-term spending.

### 2.2 OpsTreasury (hot ops treasury)

OpsTreasury holds a small working balance for operational spending:

Examples:

- Paying vendors
- Grants and ecosystem rewards
- Infra and bug bounties
- Any non-validator, non-emissions costs

Core function:

- spend(address to, uint256 amount, bytes32 tag)

  - Only callable by the OpsTreasury admin.
  - Transfers tokens to the target address.
  - Emits an event with tag for accounting.

Critical separation:

- Validator rewards never come from VoidTreasury or OpsTreasury.
- Validators are paid only from emissions via RewardEngine.

Treasury behaviour is covered by test/mainnet/Treasury.t.sol.

---

## 3. Validator set (IValidatorSetLike)

The validator set has a minimal, stable interface:

interface IValidatorSetLike {
    function getActiveValidators() external view returns (address[] memory);
    function getValidators() external view returns (address[] memory);
    function getVotingPower(address validator) external view returns (uint256);
    function totalPower() external view returns (uint256);
}

Meanings:

- getValidators():
  - Returns all configured validators (including 0-power entries for audit).

- getActiveValidators():
  - Returns only validators whose power is strictly greater than zero.
  - This is the reward-eligible set.

- getVotingPower(validator):
  - Returns the current voting power for a validator (0 if unknown or
    deliberately zeroed).

- totalPower():
  - Sum of getVotingPower(v) over all getValidators().

Invariants:

- totalPower() equals the sum of getVotingPower(v) for all validators
  returned by getValidators().
- totalPower() is greater than 0 whenever getActiveValidators().length is
  greater than 0.
- totalPower() is 0 if and only if getActiveValidators().length is 0.

The current v1 implementation is admin-managed and tested in:

- test/ValidatorSet.t.sol
- test/mainnet/ValidatorSet.t.sol

---

## 4. RewardEngine (emissions only)

RewardEngine is the only entrypoint that converts the emissions budget into
validator balances.

Key responsibilities:

1. Track a global emissions budget:
   - emissionsBudget = 333,333,333 * 1e18
   - totalPulled (sum of all pulls)
   - totalClaimed (sum of all successful claims)

2. Enforce the emissions cap:
   - totalPulled is less than or equal to emissionsBudget
   - totalClaimed is less than or equal to totalPulled

3. Distribute pulled emissions across validators in proportion to their
   voting power (from IValidatorSetLike).

4. Allow validators to claim their accrued rewards.

Conceptual function shapes:

- pullEmission(uint256 amount)
  - Only callable by the RewardEngine admin.
  - Requires totalPulled plus amount to be less than or equal to
    emissionsBudget.
  - Increases totalPulled and internal pool used for distribution.

- accrueToValidators (internal / accounting step)
  - Reads:
    - addrs = getActiveValidators()
    - For each v in addrs, p[v] = getVotingPower(v)
    - tot = totalPower()
  - Allocates amount across validators proportional to p[v] divided by tot.
  - Ensures the sum of all shares equals amount within a rounding tolerance.

- claim() or claimFor(address validator)
  - Transfers the accrued balance to the validator’s reward address.
  - Zeros out the internal balance so it cannot be double-claimed.
  - Increases totalClaimed.

Tests:

- testEmissionsBudgetMatchesSpec
- testClaimFlow
- testClaimRevertsWhenNothingToClaim
- testOnlyAdminCanPullEmission
- testPullEmissionCapsAtBudget

If any of these start failing, we have a direct mismatch with the tokenomics
spec and the emissions schedule.

---

## 5. Monetary flows (v1)

### 5.1 Genesis

At mainnet genesis:

1. VoidToken is deployed with:
   - MAX_SUPPLY = 666,666,666 * 1e18
   - Standard ERC-20 semantics.

2. The full premine is minted to VoidTreasury:

   - mint(address(VoidTreasury), 333,333,333 * 1e18)

3. RewardEngine is deployed with:
   - voidToken set to the VoidToken address
   - validatorSet set to the ValidatorSet address
   - admin set to a long-term controller (for example a multisig)
   - emissionsBudget = 333,333,333 * 1e18

4. ValidatorSet is deployed and seeded with an initial admin-set validator
   list and powers, matching the genesis validator map in the genesis spec.

No premine flows directly to validators at genesis.

### 5.2 Emission pulls (admin)

Periodically (for example daily or per epoch), the RewardEngine admin calls:

- pullEmission(amount)

Constraints:

- totalPulled plus amount is less than or equal to emissionsBudget
- amount is greater than zero

Effect:

- Increases RewardEngine’s internal accounting for emissions.
- Forms the basis for the accrual step.

### 5.3 Accrual to validators

On each configured interval (implementation detail), RewardEngine:

1. Reads:
   - addrs = getActiveValidators()
   - For each v in addrs, p[v] = getVotingPower(v)
   - tot = totalPower()

2. For each v:
   - share[v] is approximately equal to pulledAmount times p[v] divided by tot
   - Updates internal accrual balance for v.

3. Ensures:
   - The sum of share[v] over active validators matches pulledAmount within
     a small rounding tolerance.

### 5.4 Claims

A validator or delegated agent calls:

- claim for msg.sender, or
- claimFor(validator) if such a helper exists

RewardEngine:

- Transfers the accrued balance to the validator’s reward address.
- Zeros out the internal balance so it cannot be double-claimed.
- Increases totalClaimed.

### 5.5 Treasury vs emissions (hard rule)

The hard separation is:

- Premine (333,333,333 VOID)
  - Lives in VoidTreasury.
  - Can only move via sendToOps into OpsTreasury and from there to vendors or
    ecosystem recipients via spend.
  - Never used for paying validator block or epoch rewards.

- Emissions (333,333,333 VOID)
  - Only flow through RewardEngine.
  - Only accrue to validators via the ValidatorSet-based split.
  - Bounded by emissionsBudget.

If, in code or deployment, any validator rewards ever start coming from
VoidTreasury or OpsTreasury, that is a violation of this spec.

---

## 6. Invariants and monitoring

Monetary v1 expects the following invariants:

1. Supply cap:
   - totalSupply is less than or equal to MAX_SUPPLY at all times.
   - The sum of premine plus emissions minted must never exceed MAX_SUPPLY.

2. Budget cap:
   - totalPulled is less than or equal to emissionsBudget.
   - totalClaimed is less than or equal to totalPulled.

3. Tokenomics alignment:
   - void_mainnet_tokenomics_spec_health equals 1.
   - void:mainnet_tokenomics:spec_health:last_5m equals 1.

4. Validator set consistency:
   - totalPower() equals the sum of getVotingPower(v) across getValidators().
   - getActiveValidators() is exactly the set of validators with power greater
     than zero.
   - totalPower() is greater than 0 for a live mainnet.

5. Reward pipeline sanity (via exporters or textfiles):
   - reward_emissions_budget equals EMISSIONS.
   - reward_emissions_pulled_total is less than or equal to
     reward_emissions_budget.
   - reward_emissions_claimed_total is less than or equal to
     reward_emissions_pulled_total.
   - reward_emissions_headroom equals budget minus pulled.

Prometheus should enforce:

- Alerts if spec health drops to 0.
- Alerts if any budget or supply invariant breaks.
- SLO-style alerts if validator rewards are not being pulled or claimed over
  expected windows.

---

## 7. Evolution (v1 to v2)

This spec intentionally keeps v1 simple:

- Premine fully isolated in VoidTreasury.
- OpsTreasury for non-validator operational costs.
- Fixed emissions budget (four eras) wired into RewardEngine.
- ValidatorSet v1 is admin-managed and read-only from the point of view of
  consensus and RewardEngine.

Future versions (v2 and beyond) can add:

- Full on-chain staking (stake controls ValidatorSet power).
- Slashing for misbehavior, feeding back into power and unclaimed rewards.
- Richer reward classes (for example separate flows for AI agents and infra
  providers).
- On-chain governance driving RewardEngine policy (while still respecting the
  emissions budget and MAX_SUPPLY).

All future versions must keep the core invariants from sections 1, 2, 4, and 6
intact.

This document is the canonical v1 monetary spec for mainnet and is expected to
stay in sync with the contracts and monitoring configuration in this repo.
