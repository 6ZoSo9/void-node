# VOID Network – Mainnet Reward Flow (v1)

This document ties together the main monetary actors for VOID mainnet and defines
how emissions and premine are wired into contracts and validator rewards.

It is meant to stay consistent with:

- docs/VOID-TOKENOMICS-SPEC-V1.md
- docs/VOID-EMISSIONS-SCHEDULE.md
- docs/VOID-EMISSIONS-PARAMS-V1.json
- docs/VOID-MAINNET-MONETARY-SPEC-V1.md
- docs/VOID-VALIDATOR-SET-SPEC-V1.md
- docs/VOID-VALIDATOR-REWARD-INTEGRATION-V1.md
- docs/VOID-MAINNET-GENESIS-SPEC.md
- docs/VOID-MAINNET-GENESIS-PLAN.md

and with the following contracts and tests:

- contracts/mainnet/VoidToken.sol (mainnet ERC-20 for VOID)
- contracts/mainnet/VoidTreasury.sol
- contracts/mainnet/OpsTreasury.sol
- contracts/mainnet/IValidatorSetLike.sol
- contracts/mainnet/ValidatorSet.sol
- contracts/mainnet/IRewardEngineLike.sol
- contracts/mainnet/RewardEngine.sol
- test/mainnet/Treasury.t.sol
- test/mainnet/ValidatorSet.t.sol
- test/mainnet/RewardEngine.t.sol

This is the canonical v1 reward-flow spec for mainnet.

---

## 1. Monetary buckets (recap)

From the locked tokenomics spec:

- MAX_SUPPLY = 666,666,666 VOID
- PREMINE_TREASURY = 333,333,333 VOID
- EMISSIONS = 333,333,333 VOID

Emissions are split into four long-term eras:

1. Era 1: 177,777,777 VOID
2. Era 2: 88,888,889 VOID
3. Era 3: 44,444,444 VOID
4. Era 4: 22,222,223 VOID

High-level rules:

- The premine is minted once at genesis and lives in the VoidTreasury
  (cold treasury). It does not go directly to validators.
- The emissions bucket (333,333,333 VOID) is the only source of
  emission-based validator rewards.
- Transaction fees are a separate path (policy is simple in v1 and can evolve).

Monitoring enforces that:

- void_mainnet_tokenomics_spec_health == 1
- void:mainnet_tokenomics:spec_health:last_5m == 1

so exported constants match the locked JSON/specs.

---

## 2. Contracts and roles

### 2.1 VoidToken (mainnet ERC-20)

- Symbol: VOID
- Decimals: 18
- Max supply: hard-bounded by tokenomics plus monetary spec.
- Minting in mainnet v1 is controlled by:
  - Genesis (premine to VoidTreasury)
  - Emission logic (RewardEngine and validator rewards path)

There is no faucet. All minting must be justified by premine or the emissions schedule.

### 2.2 VoidTreasury (cold premine treasury)

Responsibilities:

- Holds the full premine: 333,333,333 VOID.
- Acts as the cold long-term treasury.
- Controlled by a slow, hardened admin (multi-sig or hardware-backed key).

Key function (simplified):

- sendToOps(uint256 amount, bytes32 tag)

  - Moves VOID from VoidTreasury to OpsTreasury.
  - Only callable by the treasury admin.
  - Emits an event for accounting.
  - Does not send directly to validators.

This path is for ops funding, grants, and ecosystem spending, not for
regular validator block rewards.

### 2.3 OpsTreasury (hot operational treasury)

Responsibilities:

- Holds a much smaller, hot balance for day-to-day spending.
- Used for:
  - Vendor payments
  - Grants and ecosystem support
  - General operational expenses

Key function:

- spend(address to, uint256 amount, bytes32 tag)

  - Only callable by the OpsTreasury admin.
  - Transfers VOID to the recipient.
  - Emits an event with the tag for bookkeeping.

OpsTreasury is not part of the emissions to validator reward pipeline. It is
an operational wallet funded by VoidTreasury.

### 2.4 ValidatorSet (implements IValidatorSetLike)

Interface used by consensus and rewards (informal shape):

- getActiveValidators() returns address[]
- getValidators() returns address[]
- getVotingPower(address validator) returns uint256
- totalPower() returns uint256

Meanings:

- getValidators()
  - Returns the full configured set of validator addresses (including ones with
    zero power, for audit and history).

- getActiveValidators()
  - Returns only validators with strictly positive voting power.
  - This is the set used for consensus weighting and reward splitting.

- getVotingPower(validator)
  - Returns the current voting power for the validator.
  - Must return 0 for unknown or removed validators.

- totalPower()
  - Sum of getVotingPower(v) over all getValidators().

Invariants expected by the rest of the system:

- totalPower() == sum(getVotingPower(v) for v in getValidators()).
- totalPower() > 0 whenever there is at least one active validator.
- getActiveValidators() is exactly the subset of getValidators() with power > 0.

Admin model v1:

- A single admin address (EOA or multisig) controls:
  - setValidatorPower(address validator, uint256 power)
  - setAdmin(address newAdmin)

All state mutations are gated by onlyAdmin. Consensus and RewardEngine use the
view-only functions.

### 2.5 RewardEngine (IRewardEngineLike)

RewardEngine bridges tokenomics to on-chain validator balances.

High-level responsibilities:

1. Track a global emissions budget (333,333,333 VOID, scaled to 18 decimals).
2. Enforce totalPulled <= emissionsBudget.
3. Distribute pulled emissions across validators proportionally to their
   voting power.
4. Allow validators to claim their accrued rewards.

Conceptual state:

- emissionsBudget – total emissions allowed (333,333,333 * 1e18).
- totalPulled – cumulative amount pulled against the budget.
- claimed[validator] – cumulative amount claimed per validator.
- accrued[validator] – claimable balance.

Key flows (as exercised in tests):

- Admin-only emission pull:

  - pullEmission(uint256 amount)

    - Precondition: totalPulled + amount <= emissionsBudget.
    - Effect: increases totalPulled and the amount available for distribution.

- Accrual:

  - Active validators and powers are read from ValidatorSet:
    - active = getActiveValidators()
    - total = totalPower()
  - Each validator v with power p receives a share of the pulled amount:
    - share[v] approximately equals amount * p / total
  - Sums of shares match the pulled amount up to rounding.

- Claims:

  - claim() (or claimFor(address validator) in some variants)
    - Sends accrued rewards to the validator address.
    - Zeros out their accrued balance.

Tests confirm:

- Emissions budget matches the spec.
- Admin gating on emission pulls.
- Pulls cannot exceed the configured budget.
- Claims work and revert with "nothing to claim".

---

## 3. Reward path (emissions to validators)

The only supported path from emissions to validators in mainnet v1 is:

1. Tokenomics and emissions specs describe the long-term curve:
   - docs/VOID-EMISSIONS-SCHEDULE.md
   - docs/VOID-EMISSIONS-PARAMS-V1.json
   - docs/VOID-MAINNET-MONETARY-SPEC-V1.md

2. RewardEngine is deployed at a fixed, known address (recorded in the
   genesis plan and spec). It is configured with:
   - voidToken (address of mainnet VoidToken)
   - validatorSet (address of ValidatorSet)
   - admin (reward engine admin)
   - emissionsBudget == 333,333,333 * 1e18

3. Periodically, the admin (or a chain-scheduler in v2) calls pullEmission
   to move a chunk of emissions from the global budget into the RewardEngine’s
   accounting.

4. RewardEngine consults ValidatorSet:
   - active = getActiveValidators()
   - total = totalPower()
   - p = getVotingPower(v) for each v in active

   and accrues per-validator balances proportional to p / total.

5. Validators claim their rewards by calling claim on RewardEngine.

6. At all times:

   - totalPulled <= emissionsBudget
   - sum over validators of (claimed + accrued) <= totalPulled

This path is completely separate from the premine treasury. Validators do
not draw from the premine.

---

## 4. Premine path (treasury only)

The premine path is:

1. At genesis, PREMINE_TREASURY = 333,333,333 VOID is minted into
   VoidTreasury.

2. Over time, the treasury admin may call:

   - VoidTreasury.sendToOps(amount, tag):
     - Moves tokens from VoidTreasury to OpsTreasury.

3. The OpsTreasury admin may call:

   - OpsTreasury.spend(to, amount, tag):
     - Moves tokens from OpsTreasury to an external recipient
       (vendor, grant, or other ops target).

This premine to treasury to ops path is for ecosystem and operational spending.
It is not used for block rewards and is intentionally separated from the
emissions path.

---

## 5. Invariants and monitoring

The system is expected to uphold at least the following invariants.

### 5.1 Tokenomics invariants

- void_mainnet_tokenomics_spec_health == 1
- void:mainnet_tokenomics:spec_health:last_5m == 1

These ensure metrics exported by node_exporter match the locked tokenomics JSON
and docs.

### 5.2 Emissions budget invariants

Within RewardEngine:

- totalPulled <= emissionsBudget
- totalClaimed <= totalPulled
- emissionsBudget == EMISSIONS * 1e18 (333,333,333 VOID)

Violations should be impossible at the contract level. If any monitoring detects
otherwise, it indicates either a bug or a compromised admin key.

### 5.3 Validator set invariants

From ValidatorSet:

- totalPower() == sum(getVotingPower(v) for v in getValidators()).
- getActiveValidators() contains exactly the validators with power > 0.
- totalPower() > 0 for a live mainnet.

Any divergence should cause a mainnet-core alert and be treated as a serious
fault in the validator configuration.

### 5.4 Separation of concerns

- Validators only receive emissions and fees.
- Premine is only in VoidTreasury and OpsTreasury.
- RewardEngine does not touch the premine bucket.
- OpsTreasury does not pay regular block rewards.

If monitoring ever sees premine addresses or treasury contracts being used as a
source for validator rewards, something is wrong.

---

## 6. Roadmap notes (v1 to v2 and beyond)

This spec intentionally keeps v1 simple:

- ValidatorSet v1 is admin-managed (no on-chain staking bond yet).
- RewardEngine v1 has a single emissions budget and simple share logic.
- VoidTreasury and OpsTreasury are straightforward admin-gated treasuries.

Future versions can:

- Introduce full on-chain staking and slashing feeding into ValidatorSet.
- Move RewardEngine admin duties behind governance or scheduler contracts.
- Add multiple reward classes (for example AI agents versus human validators)
  while still respecting the global emissions budget.
- Tighten metrics and alerts to include per-validator reward coverage and
  long-term emissions-utilized-versus-schedule graphs.

This document is the canonical description of how premine, emissions,
treasuries, ValidatorSet, and RewardEngine fit together in VOID mainnet v1.
