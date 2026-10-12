# Live canonical chain-state API response replay nonce boundary v1

Status: audit proof only.

This boundary hardens the signed/fresh live canonical chain-state API response path against replay. Signature verification proves who signed the response. Freshness proves the response is not outside the accepted time window. This boundary adds a deterministic local acceptance check so an old-but-still-valid response cannot be reused after it has already been accepted.

## Boundary

The helper added by this lane is:

- `evaluateLiveCanonicalChainStateApiResponseReplayNonceBoundaryV1`
- `assertLiveCanonicalChainStateApiResponseReplayNonceBoundaryGreenV1`

The policy is opt-in. When enabled, it can require:

- an already accepted API response signature;
- an already accepted freshness gate;
- monotonic `observedAtMs` against the last accepted response;
- non-regressing finalized height;
- a distinct response nonce that has not already been accepted.

## Non-goals

This proof does not fetch chain state from the network.

This proof does not mutate canonical chain state.

This proof does not admit validators.

This proof does not rotate finality API signers.

This proof does not write a ledger, sign a block, or authorize wallet activity.

This proof does not make a stale response valid. It only rejects candidates that violate local replay constraints when the policy is enabled.

## Expected marker

`VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_REPLAY_NONCE_BOUNDARY_AUDIT_V1_GREEN`
