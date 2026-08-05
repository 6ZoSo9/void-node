# VOID validator candidate registry stake safety v2

Marker:

`VOID_VALIDATOR_CANDIDATE_REGISTRY_STAKE_SAFETY_V2`

Decision:

`HOLD_PENDING_REGENERATED_COMPILER_OUTPUTS_SEMANTIC_REVIEW_AND_NEW_UNSIGNED_PACKET`

## Why this repair is required

The first unsigned deployment packet proved deterministic compilation and stable
chain-2050 transaction construction, but semantic review found a deployment-
blocking custody defect: the prior registry accepted native VOID and recorded a
candidate's stake without any function that could return that stake.

The old `markUnbonded(...)` function changed only an enum value. It did not pay
the participant. Because the contract was not upgradeable, signing that packet
would have made every registered stake—including any amount above the minimum—
permanently inaccessible.

The old contract also used immediate one-step ownership transfer and accepted
state transitions that were broader than required.

## Rejected historical packet

The following packet is retained only as evidence that the review process caught
the defect before signing:

```text
packet_id=voidvcrudpt1_18c8e237f07c66cbf9f3d647ea2f6d43f2543e9a68102f42c586686709a327b4
packet_file_sha256=b1c50ea6129758b57bd72f79d4e79cb65b369a7640556755684a08cac40f349b
unsigned_transaction_hash=0x09216225ea11ed7150a4a1df6c12308ade9e4fbabd4d17d1f973d1c59dc17e02
predicted_contract_address=0xab7Da9E55E07995A671D96f19CDB965304035064
```

It must not be signed, broadcast, extended, or reused. Its creation bytecode,
runtime template, simulated runtime, deployment data, nonce, predicted address,
and unsigned transaction are all superseded by this source change.

## Repaired custody model

### Registration

`registerCandidate(...)` continues to:

- require at least 10,000 VOID under the locked Mainnet-0 policy;
- permit additional stake;
- begin in Candidate state; and
- leave Waiting and Active counts unchanged.

The complete attached value is stored in `stakeAmount` and included in
`totalStaked`.

### Participant-controlled exit

A participant may call `requestExit()` from:

- Candidate;
- Waiting;
- Active; or
- Jailed.

The call does not require registry-owner cooperation. Waiting or Active counters
are reduced exactly once, the state becomes Exiting, and the request timestamp
is recorded.

The participant may call `finalizeExit()` only after the fixed seven-day
unbonding delay. The state then becomes Unbonded.

The owner cannot use `markUnbonded(...)` to bypass a participant exit that is
already Exiting.

### Administrative removal

The registry owner may call `markUnbonded(...)` only from Candidate, Waiting,
Active, or Jailed. This provides a bounded administrative ejection path while
preserving the participant's ownership of the recorded stake.

The operation cannot be repeated and cannot target Exiting or already Unbonded
records.

### Withdrawal

Only the candidate owner may call withdrawStake(...) for that candidate.
Withdrawal requires:

- Unbonded state;
- a nonzero recipient;
- a nonzero recorded stake; and
- the non-reentrant withdrawal guard.

The implementation zeros `stakeAmount` and decreases `totalStaked` before the
external transfer. A failed transfer reverts and restores all accounting.

The complete recorded amount is returned. The contract does not retain the
portion above the 10,000-VOID minimum.

## Jailing boundary

`jail(...)` accepts only Candidate, Waiting, or Active. It decrements a Waiting
or Active counter exactly once and never transfers or destroys stake.

A jailed participant remains able to request the delayed exit path. Jailing is
therefore a status and admission control, not an indefinite custody mechanism.

## Ownership boundary

Registry ownership now uses:

1. `transferOwnership(newOwner)` to set one pending owner;
2. optional `cancelOwnershipTransfer()` by the current owner; and
3. `acceptOwnership()` by the exact pending owner.

A pending transfer cannot be overwritten. A zero address and the current owner
are invalid targets. Registry authority changes only when the pending owner
accepts.

## Constructor safety

Deployment rejects:

- zero minimum stake;
- zero active-validator cap;
- zero activation churn limit; and
- a churn limit greater than the active cap.

The constructor remains:

```text
constructor(uint256 minValidatorStake,uint256 maxActiveValidators,uint256 activationChurnLimit)
```

The repaired source therefore preserves the public candidate tuple and the
three-argument deployment interface while changing the bytecode and all derived
hashes.

## Focused adversarial proof

The self-contained Forge suite covers:

- zero and inconsistent constructor policy;
- exact minimum-stake enforcement;
- complete additional-stake accounting;
- registration without activation;
- owner-only Waiting and Active admission;
- churn and active-cap enforcement;
- participant exit from Candidate, Waiting, Active, and Jailed;
- the seven-day delay;
- exact Waiting and Active counter changes;
- owner inability to bypass an already-started exit delay;
- complete withdrawal and double-withdrawal rejection;
- withdrawal by the wrong account;
- zero-recipient rejection;
- failed-recipient accounting rollback;
- reentrant withdrawal rejection;
- invalid state transitions;
- bounded administrative unbonding; and
- two-step, cancelable ownership transfer.

The test file carries its own minimal Foundry cheatcode interface and does not
depend on an untracked `forge-std` checkout.

## Compiler and deployment invalidation

A green source test does not authorize deployment and does not accept the
bytecode for deployment. After this PR merges, the required sequence is:

1. regenerate the locked Paris Standard JSON compiler input from the repaired
   source;
2. run native solc 0.8.20 and solc-js 0.8.20 independently;
3. require exact creation/runtime/ABI/metadata/storage-layout agreement;
4. perform a fresh semantic review of the repaired bytecode and ABI;
5. generate a new stable read-only chain-2050 snapshot;
6. construct a new unsigned deployment packet with a fresh nonce and predicted
   address;
7. obtain separate ZoSo signing and broadcast authorization; and
8. prove deployed runtime, immutable policy, owner, counters, and withdrawal
   behavior before publishing the registry address.

## Authority boundary

This source lane does not:

- access credentials, private keys, wallets, or signers;
- sign or broadcast a transaction;
- deploy a contract;
- write a registry pointer;
- register, move, jail, unbond, withdraw, or activate a live validator;
- install or restart a service;
- issue or settle Work Credits; or
- move funds.

The prior unsigned packet remains rejected. Signing and deployment remain on
hold even after this source repair is exact-green.
