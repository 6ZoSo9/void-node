# VALIDATOR STAKING UPGRADE MULTI-VALIDATOR READINESS

Status: operational gate for upgrade-track validator truth after validator onboarding succeeds.

## Why this exists

The frozen-vs-upgrade compare lane remains useful, but only for the original bridge-parity checkpoint where both lanes can still honestly describe the same validator set.

That means:

- epoch 1 compare remains the permanent bridge-baseline proof
- epoch N (for N >= 2) should not be judged by frozen-vs-upgrade core equality
- epoch N (for N >= 2) must instead be judged by upgrade-track-only runtime truth health

## Permanent split of responsibility

### Gate A — bridge baseline proof
Use the frozen-vs-upgrade compare lane only to assert:
- compare latest report is readable
- compare latest core summary remains the epoch 1 baseline
- `coreMismatchCount == 0`

### Gate B — upgrade-track multi-validator readiness
Use the upgrade-only readiness gate to assert the target epoch and expected validator count are healthy.

The gate is parameterized by:

- `TARGET_EPOCH`
- `EXPECTED_VALIDATOR_COUNT`
- `STAKE_WEI`

Default values remain the currently proven state:

- `TARGET_EPOCH=2`
- `EXPECTED_VALIDATOR_COUNT=2`
- `STAKE_WEI=1000000000000000000000`

## What the gate must prove

For the selected target epoch:

- loaded epochs include all epochs `1..TARGET_EPOCH`
- latest epoch equals `TARGET_EPOCH`
- target epoch validator count equals `EXPECTED_VALIDATOR_COUNT`
- target epoch total power equals `EXPECTED_VALIDATOR_COUNT * STAKE_WEI`
- target epoch published / publishedMatch are true
- target epoch window contains at least two unique rewards
- shadow latest report is readable
- shadow mismatch count is `0`
- shadow latest loaded epochs include all epochs `1..TARGET_EPOCH`

## Current meaning

If Gate A and Gate B are both green, then:

- the original bridge-baseline proof still holds at epoch 1
- the live runtime is operating correctly on upgrade-track multivalidator truth through the selected target epoch

## Machine gate

Run:

- `ops/mainnet/validator-staking-upgrade-multivalidator-readiness.sh`

Optional env:

- `TARGET_EPOCH=<n>`
- `EXPECTED_VALIDATOR_COUNT=<n>`
- `STAKE_WEI=<wei>`

## Next lane after this gate

If this gate is green for a higher target epoch, the next practical lanes are:

- onboarding the next validator
- refining validator activation policy / operator UX
