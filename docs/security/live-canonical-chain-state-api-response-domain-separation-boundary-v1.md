# Live canonical chain-state API response domain separation boundary v1

Status: audit proof only.

This boundary hardens the signed/fresh/replay-safe live canonical chain-state API response path against cross-domain replay. A response that is valid for one network, route, purpose, or authority namespace must not be accepted as runtime truth for another.

## Boundary

The helper added by this lane is:

- `evaluateLiveCanonicalChainStateApiResponseDomainSeparationBoundaryV1`
- `assertLiveCanonicalChainStateApiResponseDomainSeparationBoundaryGreenV1`

The policy is opt-in. When enabled, it can require:

- an already accepted API response signature;
- an already accepted freshness gate;
- an already accepted replay nonce gate;
- an expected chain id;
- an expected network id;
- an expected response purpose;
- an expected route path;
- an expected authority domain.

## Non-goals

This proof does not fetch chain state from the network.

This proof does not mutate canonical chain state.

This proof does not admit validators.

This proof does not rotate finality API signers.

This proof does not write a ledger, sign a block, or authorize wallet activity.

This proof does not make a response valid by itself. It only rejects candidates that are not bound to the expected domain when the policy is enabled.

## Expected marker

`VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_DOMAIN_SEPARATION_BOUNDARY_AUDIT_V1_GREEN`
