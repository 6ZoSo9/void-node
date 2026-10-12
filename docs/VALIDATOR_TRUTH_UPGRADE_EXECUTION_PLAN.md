# VALIDATOR TRUTH UPGRADE EXECUTION PLAN

Status: execution plan for moving from frozen Mainnet-0 hybrid validator truth to upgraded on-chain validator truth.

## Current state

Today the live node can consume validator runtime truth from a verified manifest directory, and the current live manifests can be produced from a frozen Mainnet-0 hybrid source:
- on-chain reward/power from live `ValidatorSet`
- repo-side handoff identity from `ops/mainnet/void-mainnet.deployed.json`

This is acceptable as a bounded Mainnet-0 bridge, but it is not the final design.

## Final target

Canonical validator truth must come from upgraded on-chain staking truth:
- `ValidatorStakingV2` (or equivalent)
- read through `IValidatorTruthSource`
- selection/runtime built on top of that read-only truth

## Non-goals

- Do not fake participant staking on frozen Mainnet-0 contracts.
- Do not pretend current `ValidatorSet` exposes consensus keys on-chain.
- Do not create a permanent mirror loop into frozen `ValidatorSet.setValidatorPower(address,uint256)` as steady-state truth.
- Do not cut runtime consumers directly to upgraded truth without a shadow lane.

## Required read truth from upgraded contracts

The upgraded truth source must support, at minimum:
- `minStake()`
- `getActiveValidatorCount()`
- `getActiveValidatorAt(uint256)`
- `getActiveValidators()`
- `getValidatorTruth(address)`
- `isSelectableValidator(address)`
- `effectivePowerOf(address)`

The truth returned must include:
- reward address
- controller/admin address
- consensus key
- stake / effective power
- active / pending-exit / jailed flags

## Required write / lifecycle surface

The upgraded contract family should support the validator lifecycle:
- `registerValidator(address reward, bytes32 consensusKey)`
- `registerAndStake(address reward, bytes32 consensusKey, uint256 amount)`
- `stake(uint256 amount)`
- `increaseStake(uint256 amount)`
- `beginUnbond(uint256 amount)`
- `finalizeUnbond()`
- `beginExit()`
- `finalizeExit()`
- optional: `setRewardAddress(address newReward)`
- optional: `setConsensusKey(bytes32 newConsensusKey)`

## Execution phases

### Phase 0 — keep current runtime green
- preserve frozen-mainnet0 hybrid exporter
- preserve verified manifest publish/live-proof/shadow-runner/diag/metrics lanes
- do not disturb current runtime consumers

### Phase 1 — lock upgraded truth ABI/readiness
- prove `ValidatorStakingV2` compiled ABI contains the required read and write surface
- keep this as a repo-side readiness proof

### Phase 2 — deploy upgrade-track truth stack
Deploy an upgrade-track validator truth stack that uses upgraded staking as the real source:
- `ValidatorStakingV2`
- `ValidatorSelectionAdapter`
- optional `ValidatorSelectionOrderedView`
- `ValidatorEpochSnapshot`
- `ValidatorEpochProposerSelector`
- `ValidatorEpochScheduleView`
- `ValidatorEpochCommitmentView`
- `ValidatorEpochCommitmentRegistry`
- `ValidatorEpochManifestView`

This deployment must be clearly separated from frozen Mainnet-0 bootstrap truth.

### Phase 3 — dual-run / shadow compare
- export verified manifests from the upgraded truth stack
- publish them to a dedicated verified manifest directory
- run the same live proof and shadow compare lanes against that directory
- compare upgraded-truth-derived manifests against current runtime truth surfaces
- observe only; do not cut over consensus/runtime yet

### Phase 4 — runtime cutover gate
Only allow runtime consumer cutover when all are true:
- upgraded truth source read surface is green
- verified manifest export/import lane is green
- live proof is green
- shadow compare mismatch count is zero across the intended window
- operator documentation / deployed address truth is recorded

## Acceptance gate for cutover

Before cutover:
- upgraded truth source must be on-chain readable
- consensus keys must be queryable from upgraded truth
- active validator set changes must be visible through read-only truth methods
- manifest export must be derived from upgraded truth, not frozen Mainnet-0 hybrid state
- shadow compare must remain zero-mismatch over the production window

## Immediate next lane

Build and run a repo-side preflight proving:
1. frozen Mainnet-0 current truth is still what we think it is
2. `ValidatorStakingV2` ABI contains the required truth/read + lifecycle surface
3. the repo is ready to start an upgrade-track deployment/proof lane without pretending the frozen contracts already provide it
