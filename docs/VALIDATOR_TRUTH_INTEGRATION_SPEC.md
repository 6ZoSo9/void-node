# VALIDATOR TRUTH INTEGRATION SPEC

## Purpose
Define how future VOID validator selection should consume validator truth from the upgraded staking path instead of preserving the frozen Mainnet-0 admin/power model as the long-term source of truth.

## Current boundary
Frozen Mainnet-0 remains unchanged.
The existing live ValidatorSet is historical/bootstrap truth only for Mainnet-0.
It is not the target long-term participant onboarding surface.

## Decision
Future validator truth should come from the upgraded staking contract family.

Chosen direction:
- `ValidatorStakingV2` (or equivalent upgraded contract) becomes the canonical validator truth source
- runtime / consensus / selection code should read active validator state from a read-only validator truth interface
- avoid a permanent mirror into old `ValidatorSet.setValidatorPower(address,uint256)`

## Why mirror is the wrong long-term model
A permanent mirror from `ValidatorStakingV2` into frozen `ValidatorSet` would:
- preserve the wrong canonical source
- add brittle operator glue
- complicate proofs
- create divergence risk between staking truth and power truth
- make participant UX and on-chain inspection harder to reason about

## Acceptable temporary compatibility
A one-time or short-lived migration shim is acceptable only if required to transition from frozen Mainnet-0 validator truth into upgraded validator truth.

That shim must be:
- additive
- explicitly documented
- bounded in scope
- removable after integration
- not treated as the permanent selection path

## Target architecture

### Canonical truth layer
A read-only validator truth source interface should expose:
- active validator list
- stake/power values
- consensus keys
- controller/reward addresses
- validator flags relevant to selection

This truth source should be queryable directly by runtime / consensus logic.

### Staking layer
`ValidatorStakingV2` manages:
- registration
- bonded VOID
- activation state
- unbond / exit state
- consensus key updates

### Selection layer
Future runtime/consensus should consume a read-only interface, not mutate validator truth.
Selection should ask:
- who is active?
- what is each validator's stake/power?
- what consensus key should be used?
- is validator eligible right now?

## Required read-only surface
At minimum, runtime needs a stable interface that can answer:

- total active validator count
- active validator at index
- full validator info by reward or validator id
- effective power / stake
- consensus key
- active / jailed / pending-exit state

## Recommended integration interface
Use a dedicated read-only interface:
- `IValidatorTruthSource`

This allows runtime to depend on stable read methods even if the underlying staking contract evolves.

## Proposed selection rules
For v1 integration:
- only `active == true` validators are eligible
- effective power derives from bonded stake or explicitly computed effective stake
- validators in pending exit or jailed state are not eligible
- consensus key must be non-zero
- minimum stake remains 1000 VOID

## Mapping from staking state to selection state
A validator is selectable only if:
- registered
- active
- not jailed
- not pending exit
- stake >= minimum
- consensus key != zero

## Runtime migration path
Recommended sequence:
1. keep frozen Mainnet-0 unchanged
2. finish `ValidatorStakingV2`
3. expose `IValidatorTruthSource` read methods
4. update future runtime / selection code to consume `IValidatorTruthSource`
5. add proofs for runtime reading upgraded validator truth
6. only then build participant-facing staking UI against the upgraded contract

## Proof requirements after integration
Need proof lanes for:
- upgraded contract returns active validator truth through `IValidatorTruthSource`
- runtime/selection consumes that truth correctly
- active validator set changes after activate / exit
- consensus key is chain-readable and selection-visible
- no dependence on legacy `setValidatorPower(...)` for steady-state operation

## Explicit non-goal
Do not design a future where user onboarding still depends on operator calls into the frozen Mainnet-0 `ValidatorSet`.

## Immediate next implementation lane
1. lock the read-only validator truth interface
2. make `ValidatorStakingV2` implement it
3. extend tests to prove active-set queries and truth-source semantics
4. later connect runtime/selection to that interface
