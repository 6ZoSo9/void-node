# VALIDATOR STAKING UPGRADE ONBOARDING POLICY

Status: operator policy for onboarding additional validators onto the upgrade-track staking/runtime path.

## Purpose

This policy defines when a new validator may be onboarded to the upgrade-track validator staking stack, what inputs are required, and what proof must be captured before the onboarding is considered valid.

This is the path to use after:
- upgrade-track validator truth became the selected default-read source
- validator2 onboarding was proven
- multivalidator readiness gate went green

## Scope

This policy applies to the upgrade-track validator stack only.

It does not:
- mutate frozen Mainnet-0 validator contracts
- remove the frozen rollback path
- claim that participant/UI staking is ready on frozen contracts

## Minimum validator onboarding requirements

A candidate validator must have:

- a unique reward address
- a unique consensus key
- enough native gas for:
  - token approve
  - registerAndStake
  - activate
- enough VOID to satisfy minimum stake
- a known operator identity / name in the local wallet bundle or equivalent secure source

## Funding model

Current proven onboarding path is:

1. gas-funder sends native gas to required EOAs
2. VoidTreasury sends stake amount to OpsTreasury
3. OpsTreasury spends stake amount to validator candidate EOA
4. validator candidate approves staking contract
5. validator candidate calls registerAndStake(...)
6. validator candidate calls activate()
7. deployer/admin captures next epoch and publishes target window
8. manifest is exported, verified, imported, and live-published

## Required proof after onboarding

A validator onboarding is only considered successful if all of the following are true:

- candidate address appears in active validator set
- next epoch manifest verifies successfully
- next epoch validator count increases as expected
- next epoch total power increases as expected
- published / publishedMatch are true for the next epoch
- runtime live routes load the new epoch successfully
- shadow mismatch count remains zero
- multivalidator readiness gate remains green

## Rollback / failure policy

If onboarding partially succeeds but proof fails:

- do not continue onboarding more validators
- inspect active validator set
- inspect latest epoch manifest
- inspect shadow latest and diag/all
- prefer halting further onboarding over piling on more state changes

If the validator appears active but runtime proof fails, treat that as a serious operational mismatch and resolve it before proceeding.

## Current minimum stake assumption

Current proofs use:
- `1000 VOID` minimum stake per validator

This remains the current Mainnet-0 validator minimum unless superseded by a later locked policy.

## Current operator posture

Until broader public staking exists, onboarding remains an operator-run controlled sequence using the secure local key material and treasury funding path already proven in this repo.

## Machine gate

Before onboarding any additional validator, run:

- `ops/mainnet/validator-staking-upgrade-multivalidator-readiness.sh`
- `ops/mainnet/validator-staking-upgrade-onboarding-runbook-gate.sh`

If either fails, do not onboard the next validator.

## Next practical lane after this doc

If the runbook gate is green, next likely step is:
- validator3 onboarding proof
or
- turning this operator flow into a cleaner admin/runbook UX
