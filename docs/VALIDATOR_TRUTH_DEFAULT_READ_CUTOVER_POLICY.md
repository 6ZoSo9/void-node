# VALIDATOR TRUTH DEFAULT-READ CUTOVER POLICY

Status: guarded policy for when the live node may treat upgrade-track validator truth manifests as the default read source.

## Scope

This policy governs the live node path that reads validator runtime truth from the `verified-current` manifest directory while `VOID_VALIDATOR_RUNTIME_TRUTH_MODE=verified_epoch_manifests`.

It does **not** mutate frozen Mainnet-0 bootstrap contracts.
It does **not** remove the frozen-mainnet0 bridge lane.
It only governs which verified manifest source is selected as the default read source.

## Candidate sources

Two verified manifest sources currently exist:

1. Frozen Mainnet-0 hybrid bridge source
2. Upgrade-track on-chain validator truth source

Both sources are publishable into `verified-current` through the canonical publisher and cutover switch.

## Cutover rule

The default read source may be set to the **upgrade-track** source when all of the following are true:

- frozen-vs-upgrade compare latest report is readable
- `coreMismatchCount == 0`
- runtime shadow latest report is readable
- `mismatchCount == 0`
- `/__void/runtime/validator-truth/diag/all` returns `ok == true`
- guarded cutover proof has passed frozen -> upgrade with rollback capability
- current selected source is known and machine-identifiable

If any of those fail, the default must remain frozen or be rolled back to frozen.

## Expected differences that do NOT block cutover

The following are expected to differ between frozen and upgrade-track manifests and do not block cutover:

- `published`
- `publishedMatch`
- commitment fields:
  - `validatorSetCommitment`
  - `scheduleWindowCommitment`
  - `epochWindowCommitment`
  - `publishedValidatorSetCommitment`
  - `publishedScheduleWindowCommitment`
  - `publishedEpochWindowCommitment`

These differ because the upgrade-track stack has real on-chain publication/commitment state while the frozen bridge path does not.

## Rollback rule

Rollback to frozen is mandatory if:

- compare `coreMismatchCount > 0`
- runtime shadow `mismatchCount > 0`
- live truth routes stop loading expected epochs
- live proof fails on the currently selected source
- current source cannot be determined from `verified-current`

Rollback action:
- use `ops/mainnet/validator-truth-cutover-switch.sh frozen`
- rerun live proof
- rerun shadow refresh/publish
- verify `/__void/runtime/validator-truth/diag/all` is green again

## Current preferred posture

Preferred posture is:

- keep both sources healthy
- keep compare latest and shadow latest fresh
- prefer upgrade-track as default only when the readiness gate says eligible
- preserve frozen rollback path indefinitely until upgrade-track is battle-tested enough to retire the bridge path

## Source of truth for operational decision

The machine-readable readiness decision is produced by:

- `ops/mainnet/validator-truth-default-read-cutover-readiness.sh`

That script is the canonical gate for whether upgrade-track is eligible to be the default read source.
