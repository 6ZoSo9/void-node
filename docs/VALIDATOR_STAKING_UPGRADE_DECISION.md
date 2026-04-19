# VALIDATOR STAKING UPGRADE DECISION

## Decision
Future validator onboarding should use a new canonical staking contract surface instead of pretending the frozen Mainnet-0 `ValidatorSet` already supports self-serve staking.

Chosen direction:
- deploy a new validator staking / registry contract for post-Mainnet-0
- make that new contract the canonical validator truth
- do not build a long-lived participant flow around the frozen `ValidatorSet.setValidatorPower(address,uint256)` admin path
- do not fake participant staking UI against the frozen chain

## Why this decision was made
Current frozen Mainnet-0 truth:
- `ValidatorSet` write ABI only exposes:
  - `setAdmin(address)`
  - `setValidatorPower(address,uint256)`
- `VoidToken` write ABI only exposes:
  - `approve(address,uint256)`
  - `mint(address,uint256)`
  - `transfer(address,uint256)`
  - `transferFrom(address,address,uint256)`

That means:
- no real `stake`
- no real `registerValidator`
- no real `activate`
- no real user-callable onboarding path

## Chosen architecture
Add a new contract layer:
- preferred name: `ValidatorStakingV2`
- interface file: `IValidatorStakingV2.sol`

This new contract becomes the source of truth for:
- validator registration
- bonded VOID stake
- activation state
- consensus key visibility
- unbond / exit state

## Explicit non-decision
Do NOT commit to a long-lived mirror from `ValidatorStakingV2` into old `ValidatorSet.setValidatorPower(...)`.

Reason:
- mirror logic becomes fragile operator glue
- it preserves the wrong canonical source
- it complicates proofs and participant UX
- it encourages fake compatibility instead of a clean upgrade boundary

## Temporary compatibility allowance
A one-time migration shim is allowed only if needed to bridge historical bootstrap state into the upgraded validator truth.

That shim must be:
- additive
- short-lived
- explicitly documented
- not treated as the permanent onboarding path

## What the participant page should target after upgrade
The participant page should only expose real staking once the upgraded contract is live.

Minimum target UX:
- connect execution wallet
- enter / confirm reward address
- enter / confirm consensus key
- enter stake amount
- enforce 1000 VOID minimum
- approve VOID
- register and stake
- activate
- show readable validator state directly from chain

## Required invariant
A validator is not active unless:
- registered
- has non-zero valid consensus key
- bonded stake >= 1000 VOID
- not exited
- not jailed

## Required chain-readable state
The upgraded contract must expose:
- reward address
- controller/operator address
- consensus key
- bonded stake
- active flag
- pending exit / unbond state

## Immediate next implementation lane
1. keep frozen Mainnet-0 contracts unchanged
2. use `IValidatorStakingV2.sol` as the contract surface target
3. implement the real contract behind that interface later
4. only then build participant-page staking UX
