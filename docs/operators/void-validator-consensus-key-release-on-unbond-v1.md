# VOID validator consensus-key release on unbond v1

Marker:

`VOID_VALIDATOR_CONSENSUS_KEY_RELEASE_ON_UNBOND_V1`

Decision:

`SOURCE_ONLY_LIVENESS_REPAIR_READY_DEPLOYMENT_NOT_AUTHORIZED`

## Problem

The merged lifecycle V3 source reserved a consensus-key hash at registration but
released it only during stake withdrawal. Because proof of possession remains a
separate admission gate, a malicious registrant could claim another validator's
key, be administratively unbonded, refuse to withdraw, and keep the legitimate
validator blocked indefinitely.

Stake custody and consensus-key liveness are separate concerns. Retaining stake
until the participant withdraws must not retain an identity reservation after
that participant has left every live validator lifecycle state.

## Repair

Consensus-key release occurs when the record enters `Unbonded` through either:

- participant-controlled `finalizeExit()` after the fixed delay and any required
  active-set removal confirmation; or
- owner-controlled `markUnbonded()` from an allowed non-Active state.

A single `_releaseConsensusKey(...)` helper deletes and emits only when the
mapping still belongs to that candidate owner.

`withdrawStake(...)` calls the same helper defensively, but the owner check means
an old participant's later withdrawal cannot delete a newer claimant.

## Liveness and custody properties

The repair proves that:

- administrative unbonding releases the key before stake withdrawal;
- participant exit finalization releases the key before stake withdrawal;
- Active-origin finalization still requires explicit removal confirmation;
- another candidate may claim the released key while the old participant
  refuses to withdraw;
- the old participant can later withdraw without deleting the new claim;
- a rejecting withdrawal recipient preserves both stake accounting and the
  newer candidate's claim; and
- stake remains fully withdrawable by the original owner.

Proof of possession remains a separate admission gate. This repair prevents a
missing proof-of-possession check at registration from becoming a permanent
consensus-key denial of service.

## Authority boundary

This lane changes source, test, proof, documentation, and CI only. It does not
access live RPC, credentials, wallets, private keys, or signers; construct,
sign, or broadcast a transaction; deploy the registry; publish a registry
pointer; register or activate a live validator; restart a service; write Work
Credits; or move funds.

The contract source changes creation and runtime bytecode. All compiler outputs,
predicted addresses, nonce snapshots, and unsigned deployment packets derived
from the prior source are obsolete. No historical unsigned packet may be signed
or broadcast.
