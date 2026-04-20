# VALIDATOR STAKING UPGRADE MULTI-VALIDATOR READINESS

Status: operational gate for upgrade-track validator truth after validator2 onboarding succeeded and epoch 2 became live.

## Why this exists

The frozen-vs-upgrade compare lane remains useful, but only for the original bridge-parity checkpoint where both lanes can still honestly describe the same validator set.

That means:

- epoch 1 compare remains the permanent bridge-baseline proof
- epoch 2+ should no longer be judged by frozen-vs-upgrade core equality
- epoch 2+ must instead be judged by upgrade-track-only runtime truth health

## What is now true

Upgrade-track validator truth is no longer a one-validator bootstrap demo.
It has live two-validator runtime truth with:

- loaded epochs including `1` and `2`
- latest epoch `2`
- epoch 2 validator count `2`
- epoch 2 total power `2000000000000000000000`
- published / publishedMatch both true
- shadow mismatch count `0`

## Permanent gate split

### Gate A — bridge baseline proof
Use the frozen-vs-upgrade compare lane only to assert:
- compare latest report is readable
- compare latest core summary remains the epoch 1 baseline
- `coreMismatchCount == 0`

This proves the upgrade path did not drift from the original bridge truth at the initial checkpoint epoch.

### Gate B — upgrade-track multivalidator readiness
Use the upgrade-only readiness gate to assert:
- loaded epochs include `1` and `2`
- latest epoch is `2`
- epoch 2 validator count is `2`
- epoch 2 total power is `2000000000000000000000`
- epoch 2 published and publishedMatch are true
- epoch 2 window contains at least two unique rewards
- shadow latest report is readable
- shadow latest mismatch count is `0`
- shadow latest loaded epochs include `1` and `2`

This is the operational gate for continued validator onboarding work.

## Current meaning

If Gate A and Gate B are both green, then:

- the original bridge-baseline proof still holds at epoch 1
- the live runtime is now operating correctly on real upgrade-track multivalidator truth at epoch 2+

## Next lane after this gate

If this gate is green, the next real build lane is:
- validator3 onboarding proof
or
- policy/UX work around real validator activation and staking flow
