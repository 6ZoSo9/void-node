# VOID Mainnet-0 validator active-exit safety V1

Marker: `VOID_VALIDATOR_ACTIVE_EXIT_SAFETY_V1`

## Problem

`VoidValidatorCandidateRegistry` does not itself control the separate runtime
validator set. A registry record can therefore enter `Exiting` before the
external consensus active set has actually removed that validator.

A seven-day timer alone is not enough. Without an explicit removal boundary, an
Active participant could finish unbonding and withdraw stake while the runtime
still treated the same validator as active. The registry could also free an
active-cap slot too early and admit a replacement before removal was proven.

## Source repair

The repaired contract keeps participant-controlled exit initiation while adding
an explicit active-set removal boundary:

- an Active participant may still call `requestExit()` without owner
  cooperation;
- the Active counter moves into `pendingActiveExitCount` instead of freeing the
  operational cap;
- `markActiveBatch(...)` counts both current Active records and pending Active
  exits against `maxActiveValidators`;
- `finalizeExit()` rejects an Active-origin exit until registry authority records
  a nonzero sanitized active-set removal evidence hash;
- the evidence commitment is public and contains no secret runtime material;
- duplicate removal confirmation is rejected;
- direct administrative `markUnbonded(...)` from Active is rejected; and
- owner `jail(...)` remains the explicit registry-side emergency-removal action,
  records a nonzero deterministic evidence commitment, and preserves participant
  ownership of the complete stake.

Candidate, Waiting, and never-active Jailed exits retain the existing custody
semantics. Active-origin removal evidence remains bound after Jailing so the
participant can still use the normal delayed exit path.

## State and cap accounting

For an Active-origin participant exit:

1. `requestExit()` decrements `activeCount` exactly once;
2. `pendingActiveExitCount` increments exactly once;
3. the sum of Active plus pending Active exits continues to consume the reviewed
   Mainnet-0 cap;
4. `confirmActiveSetRemoval(...)` requires a nonzero evidence hash and decrements
   `pendingActiveExitCount` exactly once; and
5. `finalizeExit()` requires both the seven-day delay and completed removal
   confirmation.

This prevents replacement admission from racing ahead of external removal while
preserving a clear, auditable separation between participant intent and operator
runtime evidence.

## Focused proof

The Foundry regression proves:

- delayed Active exit cannot finalize before removal confirmation;
- only registry authority may confirm removal;
- zero evidence hashes are rejected;
- duplicate confirmation is rejected;
- pending Active exits continue to consume the active cap;
- direct administrative Active unbond is rejected;
- owner Jailing records removal confirmation and preserves stake ownership; and
- a Jailed Active participant can still complete the delayed participant exit.

The source proof also requires the active-exit state, evidence, cap-accounting,
and authority markers and rejects wallet, signer, broadcast, deployment, and
fund-movement behavior.

Expected marker:

```text
VOID_VALIDATOR_CANDIDATE_REGISTRY_ACTIVE_EXIT_SAFETY_V1_PROOF_GREEN
```

## README decision

`README.md` is not changed in this repair. The root current-state documentation
is already owned by open draft PR #997. This change tightens an undeployed
source contract and does not claim a live registry, public validator admission,
or a new operator command.

## Authority boundary

This lane changes source, tests, documentation, and CI only. It does not inspect
a runtime host, access a wallet or signer, sign or broadcast a transaction,
deploy the registry, publish an address, register or activate a validator,
confirm a live removal, withdraw live stake, restart a service, or move funds.

The old compiler outputs, bytecode hashes, predicted address, and unsigned packet
remain rejected. Fresh compiler evidence, semantic review, packet construction,
signing, broadcast, deployment, registry publication, runtime removal evidence,
and all validator or fund mutations remain separate explicit gates.
