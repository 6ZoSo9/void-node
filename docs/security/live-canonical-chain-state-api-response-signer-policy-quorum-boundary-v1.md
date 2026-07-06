# Live canonical chain-state API response signer policy quorum boundary v1

This audit proves that a live canonical chain-state API response cannot satisfy signer-policy authority by repeating one signer, using a revoked signer, or presenting fewer distinct live allowed signer key ids than the policy threshold requires.

## Boundary

A response is accepted only when all of the following hold:

- the response signer policy id, signer authority version, and signer policy sequence match the candidate signer policy;
- the signer policy declares a positive quorum threshold;
- the signer policy has enough live allowed signer key ids to satisfy the threshold after revocations are removed;
- the response includes distinct signer key ids;
- every response signer key id is allowed by policy and not revoked;
- the count of distinct accepted signer key ids is at least the policy quorum threshold.

## Non-goals

This boundary does not perform network fetches, wallet actions, signer rotation, validator admission, ledger writes, or autonomous finality mutation.
It is a deterministic local quorum acceptance guard for signed live canonical chain-state API responses only.

## Green marker

`VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_QUORUM_BOUNDARY_AUDIT_V1_GREEN`
