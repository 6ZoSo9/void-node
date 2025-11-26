# VOID Network – Validator Set Spec (v1)

This document describes the on-chain validator set contract used by VOID mainnet-core and how it matches the current contracts:

- contracts/mainnet/IValidatorSetLike.sol
- contracts/mainnet/ValidatorSet.sol
- test/ValidatorSet.t.sol
- test/mainnet/ValidatorSet.t.sol

The v1 design is intentionally minimal and auditable: a single admin maintains powers, consensus and rewards only depend on a small, stable view interface.

---

## 1. Interface

The consensus / rewards layer only depends on:

    interface IValidatorSetLike {
        function getActiveValidators() external view returns (address[] memory);
        function getValidators() external view returns (address[] memory);
        function getVotingPower(address validator) external view returns (uint256);
        function totalPower() external view returns (uint256);
    }

Meanings:

- getValidators()
  - Returns the full configured set of validator addresses (including those with power 0).

- getActiveValidators()
  - Returns only validators whose voting power is strictly greater than zero.
  - This is the set used for consensus weighting and reward shares.

- getVotingPower(validator)
  - Returns the current voting power for a given address.
  - MUST return 0 for unknown or zeroed validators.

- totalPower()
  - Returns the sum of getVotingPower(v) across all validators in getValidators().

Invariants:

- totalPower() == sum of votingPower[v] for all v in getValidators().
- totalPower() > 0 whenever getActiveValidators().length > 0.
- totalPower() == 0 iff getActiveValidators().length == 0.

---

## 2. Admin model (v1)

The v1 contract exposes a single admin address:

- admin (EOA or multisig; configured at deployment)
- all mutating functions are protected by onlyAdmin

Key mutating function:

- setValidatorPower(address validator, uint256 power)
  - If power > 0:
    - validator is active and appears in getActiveValidators().
  - If power == 0:
    - validator becomes inactive but remains in getValidators() for audit/history.
  - totalPower() is updated to remain equal to the sum of all powers.

Admin rotation:

- setAdmin(address newAdmin)
  - Rotates the admin.
  - Emits an event for monitoring.

The admin is expected (in v1) to mirror the “real” staking / slashing state that is enforced off-chain.

---

## 3. Security & invariants

ValidatorSet v1 is expected to maintain:

1. Total power consistency
   - After any sequence of setValidatorPower calls:
     - totalPower() == Σ getVotingPower(v) for v in getValidators().

2. Non-negative power
   - Powers are uint256; no negative values.
   - Power 0 means “configured but currently inactive”.

3. Correct active set
   - getActiveValidators() is exactly the subset of getValidators() with power > 0.

4. View-only read path
   - All four IValidatorSetLike methods are view and cannot mutate state.

5. Admin-only writes
   - All state mutations (power updates, admin rotation) are gated by onlyAdmin.

Test coverage:

- test/ValidatorSet.t.sol exercises generic behaviour and master-key rotation.
- test/mainnet/ValidatorSet.t.sol exercises mainnet-facing invariants:
  - totalPower tracks the sum of individual powers;
  - getActiveValidators() filters out zero-power validators;
  - only the admin may update powers.

---

## 4. Integration points

The validator set feeds into:

1. Consensus (void-node)
   - Node reads:
     - getActiveValidators()
     - getVotingPower(v)
     - totalPower()
   - These values form the weighted validator set for proposer selection and voting rules (exact fork-choice logic is outside this spec).

2. RewardEngine
   - RewardEngine uses:
     - getActiveValidators()
     - getVotingPower(v)
     - totalPower()
   - Rewards are allocated pro-rata:
     - share[v] ∝ votingPower[v] / totalPower().

3. Tooling and ops
   - Off-chain scripts (ops/) can:
     - Dump active set and powers.
     - Compare on-chain config against the genesis / planned config.
     - Propose updates to be applied by the admin.

---

## 5. Monitoring expectations

Prometheus / exporters are expected to enforce at least:

- totalPower() > 0 for a live network.
- getActiveValidators().length > 0.
- totalPower() == Σ getVotingPower(v) over getValidators() (within one read cycle).
- No “accidental zeroing” of the entire set.

Any deviation should trip a mainnet-core alert.

---

## 6. Roadmap (v1 → v2)

ValidatorSet v1 is intentionally simple. Future iterations can:

- Add on-chain staking contracts that feed into ValidatorSet.
- Add slashing hooks to reduce voting power and unclaimed rewards.
- Move from single admin to a multi-sig or on-chain governance, while keeping the same IValidatorSetLike interface.
- Distinguish between “consensus power” and “reward weight” if needed later.

This document is the canonical description of ValidatorSet v1 as currently implemented in the repository.
