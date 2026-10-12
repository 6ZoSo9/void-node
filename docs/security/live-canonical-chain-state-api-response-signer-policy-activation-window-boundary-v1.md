# Live canonical chain-state API response signer policy activation window boundary v1

This audit proves that a live canonical chain-state API response is not accepted only because its signer policy id and authority version match.
The response must be observed inside the explicit activation window of that signer policy.

## Boundary

A response is accepted only when all of the following hold:

- the response signer policy id is present and equals the policy signer policy id;
- the response signer authority version is present and equals the policy signer authority version;
- the observation timestamp is a finite non-negative epoch millisecond value;
- the signer policy activation timestamp is finite and non-negative;
- the observation time is not before the policy activation time;
- the optional policy expiry timestamp is valid, after activation, and not exceeded;
- the optional policy revocation timestamp is valid and has not been reached.

## Non-goals

This boundary does not perform network fetches, wallet actions, signer rotation, validator admission, ledger writes, or autonomous finality mutation.
It is a deterministic local acceptance boundary for signer policy activation windows only.

## Green marker

`VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_POLICY_ACTIVATION_WINDOW_BOUNDARY_AUDIT_V1_GREEN`
