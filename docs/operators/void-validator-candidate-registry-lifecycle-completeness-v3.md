# VOID validator candidate registry lifecycle completeness v3

Marker:

`VOID_VALIDATOR_CANDIDATE_REGISTRY_LIFECYCLE_COMPLETENESS_V3`

Decision:

`HOLD_PENDING_REGENERATED_COMPILER_OUTPUTS_SEMANTIC_REVIEW_AND_NEW_UNSIGNED_PACKET`

## Purpose

The stake-safety V2 repair prevents native VOID from becoming permanently trapped and prevents Active-origin exits from releasing stake or capacity before explicit active-set removal confirmation.

This V3 lane closes the remaining participant lifecycle gaps before a public registry deployment is reconsidered:

- one consensus key cannot be claimed by multiple candidate owners;
- a candidate can rotate reward, consensus-key, and metadata commitments while still in Candidate state;
- a Waiting participant can voluntarily return to Candidate without beginning unbonding;
- a fully exited and fully withdrawn owner can register another lifecycle without duplicating enumeration or unique-owner accounting;
- withdrawal releases the retired consensus key for later reuse;
- a failed stake transfer rolls back stake accounting and consensus-key release atomically;
- every state-changing external entry point shares one reentrancy barrier; and
- the historical `activationChurnLimit()` getter is explicitly identified as a per-call batch ceiling rather than a temporal churn guarantee.

The contract remains undeployed. This source lane does not accept bytecode or authorize a transaction.

## Registration cycles

The first successful `registerCandidate(...)` call sets:

```text
registrationCycle[owner] = 1
candidateCount += 1
candidateOwners.push(owner)
```

After the candidate reaches `Unbonded` and withdraws the complete recorded stake, the same owner may call:

```text
reregisterCandidate(reward, consensusKeyHash, metadataHash)
```

A re-registration requires:

- an existing record owned by the caller;
- exact `Unbonded` state;
- `stakeAmount == 0`, proving the prior stake was completely withdrawn;
- a nonzero reward address;
- a nonzero consensus-key hash not owned by another candidate; and
- at least the immutable minimum stake.

A successful re-registration:

- increments only `registrationCycle[owner]`;
- preserves `candidateCount` as the unique-owner count;
- does not append the owner to `candidateOwners` again;
- resets the record to Candidate;
- resets exit and active-set-removal evidence for the new cycle; and
- adds the complete new stake to `totalStaked`.

## Consensus-key ownership

`consensusKeyOwner(bytes32)` binds every live candidate consensus-key hash to exactly one candidate owner.

The registry rejects a second owner attempting to register or update to an occupied key. Candidate-state key rotation releases the old key and atomically claims the new key. Final stake withdrawal releases the retired key. A failed withdrawal reverts the key release together with all stake-accounting effects.

The mapping is an identity-collision guard, not proof that the underlying secret key is controlled by the candidate. Proof of possession remains a separate onboarding and runtime requirement.

## Profile updates

`updateCandidateProfile(...)` is candidate-owner-controlled and permitted only in Candidate state. It may update:

- reward address;
- consensus-key hash; and
- metadata hash.

Zero reward addresses, zero consensus keys, another candidate's key, and no-op updates are rejected.

Waiting, Active, Exiting, Jailed, and Unbonded records cannot change profile commitments. A Waiting participant may first call `returnToCandidate()`, which decrements `waitingCount` exactly once and preserves stake custody.

## Honest activation batch semantics

The three-argument constructor and legacy getter remain compatible:

```text
constructor(uint256 minValidatorStake, uint256 maxActiveValidators, uint256 activationChurnLimit)
activationChurnLimit() -> uint256
```

The same immutable value is also exposed through:

```text
maxActivationBatchSize() -> uint256
```

This is an honest semantic alias. The contract enforces a maximum number of validators per `markActiveBatch(...)` call. It does not claim to enforce a time-window or epoch churn rate. External epoch admission policy and runtime proof remain responsible for temporal churn control.

## Global mutation reentrancy boundary

The stake-safety V2 withdrawal used checks-effects-interactions and rejected a second withdrawal. V3 applies the same `nonReentrant` status gate to every state-changing external registry entry point.

During a recipient callback, the recipient cannot re-register, rotate profile data, move state, confirm removal, mutate ownership, or call any other registry mutation. View calls remain available.

## Adversarial proof

The isolated Solidity 0.8.20 / Paris Foundry suite proves:

- legacy activation getter and honest batch-size alias match;
- duplicate consensus-key registration is rejected;
- a fully withdrawn key becomes reusable;
- Candidate profile rotation atomically moves key ownership;
- no-op and non-Candidate profile updates are rejected;
- Waiting can return to Candidate with exact counter accounting;
- re-registration before complete withdrawal is rejected;
- successful re-registration does not duplicate candidate enumeration;
- registration cycles increment exactly;
- historical active-exit flags are cleared for a new cycle;
- another candidate's key cannot be taken through profile update;
- a rejecting withdrawal recipient preserves the participant stake, total stake accounting, and consensus-key ownership; and
- a withdrawal recipient cannot re-enter `reregisterCandidate(...)` or another mutation.

The source proof also requires all V2 custody and Active-exit protections to remain present.

Expected marker:

```text
VOID_VALIDATOR_CANDIDATE_REGISTRY_LIFECYCLE_COMPLETENESS_V3_PROOF_GREEN
```

## Obsolete packet boundary

Every unsigned packet, compiler hash, runtime hash, predicted address, nonce snapshot, and transaction hash produced for the pre-V2 contract is obsolete. The V2 and V3 source changes necessarily produce new bytecode.

Nothing from the historical packet may be signed, broadcast, extended, or treated as deployment approval.

## Authority boundary

This lane changes source, tests, documentation, and CI only. It does not access live RPC, credentials, private keys, wallets, or signers; construct, sign, or broadcast a transaction; deploy a contract; publish a registry pointer; register or mutate a live validator; restart a service; issue or settle Work Credits; or move funds.

After merge, compiler input, independent compiler outputs, semantic review, stable chain-2050 state, deployer/owner binding, predicted address, and a new unsigned packet must be regenerated. Signing, broadcast, deployment, publication, and validator operations remain separate explicit gates.
