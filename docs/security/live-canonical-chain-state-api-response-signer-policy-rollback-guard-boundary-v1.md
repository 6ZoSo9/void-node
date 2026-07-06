# Live canonical chain-state API response signer policy rollback guard boundary v1

This audit proves that a live canonical chain-state API response cannot be accepted under a signer policy sequence that rolls back behind the last accepted signer policy sequence.

## Boundary

A response is accepted only when all of the following hold:

- the response signer policy id, signer authority version, and signer policy sequence are present;
- the response signer policy id, authority version, and sequence equal the candidate signer policy;
- the candidate signer policy sequence is a finite non-negative integer;
- when a last accepted signer policy sequence is known, the candidate sequence does not regress;
- when the candidate sequence equals the last accepted sequence, the policy id and signer authority version cannot silently change at the same sequence number.

## Non-goals

This boundary does not perform network fetches, wallet actions, signer rotation, validator admission, ledger writes, or autonomous finality mutation.
It is a deterministic local rollback guard for signer policy acceptance only.

## Green marker

`VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_ROLLBACK_GUARD_BOUNDARY_AUDIT_V1_GREEN`
