# VALIDATOR STAKING UPGRADE ACTIVATION PLAN

Status: next-step plan after validator-truth upgrade-track default-read readiness went green.

## Current truth

The validator-truth lane is now mature enough that:
- frozen Mainnet-0 bridge source exists
- upgrade-track on-chain validator truth source exists
- frozen-vs-upgrade compare is green on core runtime truth
- guarded cutover + rollback proof is green
- default-read readiness gate says upgrade is eligible and live as the selected source

That means the next real build lane is not more validator-truth plumbing.
It is validator-staking upgrade activation.

## Goal

Prove that the upgrade-track staking stack can support actual validator onboarding flow beyond the initial seeded validator.

## Non-goals

- Do not fake participant staking against frozen Mainnet-0 contracts.
- Do not remove the frozen rollback path.
- Do not cut consensus behavior based only on docs or assumptions.
- Do not guess contract call shapes; inspect exact ABI and deployed artifacts first.

## Next concrete proof target

Second-validator onboarding proof on the upgrade-track stack:
1. identify a candidate reward/controller/consensus identity
2. fund the candidate with required native gas + VOID stake
3. register/stake the validator on upgrade-track staking
4. capture a new epoch snapshot
5. export and verify the resulting manifest
6. compare resulting runtime truth against expected changes

## Activation readiness gate

Before attempting second-validator onboarding, all must be true:
- validator-truth default-read readiness is green
- upgrade-track deployed artifact exists
- all deployed upgrade-track contracts have live code
- ValidatorStakingV2 ABI exposes the minimum onboarding/read surface
- compare core mismatch count remains zero
- shadow mismatch count remains zero

## Minimum ABI surface to inspect

Read surface:
- getActiveValidators
- getValidatorTruth
- effectivePowerOf

Onboarding/write surface:
- registerAndStake
- stake / increaseStake
- any activation-related method present in the compiled ABI

## Deliverables of this lane

- machine-readable preflight report
- explicit yes/no readiness answer for validator2 onboarding proof
- locked plan for the next live test script

## Immediate next step

Run:
- ops/mainnet/validator-staking-upgrade-activation-preflight.sh

If green, the next code lane is:
- add second-validator onboarding proof against the existing upgrade-track deployment.
