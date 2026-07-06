# Live canonical chain-state API response signer policy binding boundary v1

This audit proves that a live canonical chain-state API response is not accepted only because its signer key appears valid in isolation.
The response must also bind itself to the exact signer authority policy id and signer authority version expected by the consumer.

## Boundary

A response is accepted only when all of the following hold:

- the required signer policy id is present;
- the required signer authority version is present;
- the response signer key id is present;
- the response signer policy id equals the required signer policy id;
- the response signer authority version equals the required signer authority version;
- the signer key id is explicitly allowed by the bound policy;
- the signer key id is not revoked by the bound policy.

## Non-goals

This boundary does not perform network fetches, wallet actions, signer rotation, validator admission, ledger writes, or autonomous finality mutation.
It is a deterministic local acceptance boundary for signer policy binding only.

## Green marker

`VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_BINDING_BOUNDARY_AUDIT_V1_GREEN`
