# MAINNET-0 STAKE BLOCKER AND UPGRADE PATH

## Current truth
The currently frozen Mainnet-0 contracts do not support participant self-stake validator onboarding.

Observed live write ABI:
- ValidatorSet:
  - setAdmin(address)
  - setValidatorPower(address,uint256)
- VoidToken:
  - approve(address,uint256)
  - mint(address,uint256)
  - transfer(address,uint256)
  - transferFrom(address,address,uint256)

Readable validator ABI currently proves:
- validator reward address list
- validator stake/power list
- validator admin
- AdminGate master key

Readable validator ABI does NOT expose:
- consensusKey as an on-chain readable field

## Consequence
A participant-page "Stake VOID" flow would be fake on the current frozen contracts.
There is no real user-callable stake/register/activate method to wire into the participant wallet.

## Current operational model
Current validator activation is operator/admin-controlled.
The practical activation lever appears to be ValidatorSet.setValidatorPower(address,uint256), not participant self-stake.

## Required future contract surface for true self-stake
Minimum viable upgrade path should add a real validator onboarding/staking API, for example:

- registerValidator(address reward, bytes32 consensusKey)
- stake(uint256 amount)
- registerAndStake(address reward, bytes32 consensusKey, uint256 amount)
- increaseStake(uint256 amount)
- decreaseStake(uint256 amount) or beginUnbond(uint256 amount)
- finalizeUnbond()
- setRewardAddress(address newReward) (optional)
- setConsensusKey(bytes32 newConsensusKey) (optional)
- minStake()(uint256)
- getValidator(address reward) returns:
  - reward
  - consensusKey
  - stakeVOID
  - active
  - admin/controller if applicable

## Product requirement to preserve
Target participant UX remains:
- Stake VOID from participant page
- 1000 VOID minimum for validator activation
- clear status showing:
  - execution wallet
  - reward address
  - consensus key
  - current stake
  - activation state

## What should NOT be done
- Do not fake a stake button against the frozen contracts
- Do not pretend approve/transfer is validator staking
- Do not hide the fact that consensusKey is not queryable from the current readable ABI

## Next build lane
1. Keep current frozen Mainnet-0 contracts and proofs unchanged
2. Design the validator-staking upgrade contract/API
3. After contract surface is real, wire participant-page Stake VOID flow to that real API
