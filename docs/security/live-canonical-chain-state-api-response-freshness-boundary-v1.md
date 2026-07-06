# Live canonical chain-state API response freshness boundary v1

## Status

Audit/proof boundary for anti-replay freshness on signed live canonical chain-state finality API responses.

Marker: `VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_FRESHNESS_BOUNDARY_AUDIT_V1_GREEN`

## Boundary

The validator runtime truth live-chain API epoch-root path may consume a finalized chain-state API response file. PR #441 added an opt-in Ed25519 response signature gate. This boundary adds an opt-in freshness gate so a previously valid signed response cannot be replayed indefinitely as the live canonical chain-state source.

## Authority rule

When `VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FRESHNESS_REQUIRED` or an accepted alias is enabled:

1. The API response signature gate must also be enabled.
2. The API response must include a parseable timestamp, such as `signed_at_ms`, `signedAtMs`, `timestamp_ms`, `timestamp`, `finalized_at`, or `observed_at`.
3. The timestamp is accepted only inside the configured freshness window.
4. The timestamp is part of the signed response body when the response signature gate is enabled, so timestamp tampering invalidates the signature before freshness is evaluated.

## Accepted freshness configuration

Freshness env aliases include:

- `VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FRESHNESS_REQUIRED`
- `VOID_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_FRESHNESS_REQUIRED`
- `VOID_REQUIRE_FRESH_LIVE_CHAIN_STATE_API_RESPONSE`
- `VOID_REQUIRE_LIVE_CHAIN_FINALITY_API_FRESHNESS`

Freshness window aliases include:

- `VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_MAX_AGE_MS`
- `VOID_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_MAX_AGE_MS`
- `VOID_LIVE_CHAIN_STATE_API_RESPONSE_MAX_AGE_MS`
- `VOID_CHAIN_FINALITY_API_RESPONSE_MAX_AGE_MS`
- matching `*_SECONDS` aliases

Future-skew aliases include matching `*_MAX_FUTURE_MS` and `*_MAX_FUTURE_SECONDS` forms.

Defaults: max age `120000` ms; max future skew `5000` ms.

## Rejection reasons sealed by the proof

- `live_validator_chain_state_api_response_freshness_requires_signature`
- `live_validator_chain_state_api_response_timestamp_missing`
- `live_validator_chain_state_api_response_timestamp_invalid`
- `live_validator_chain_state_api_response_max_age_invalid`
- `live_validator_chain_state_api_response_max_future_invalid`
- `live_validator_chain_state_api_response_from_future`
- `live_validator_chain_state_api_response_stale`
- existing signature rejection: `live_validator_chain_state_api_response_signature_invalid`

## Non-goals

This does not fetch network state, rotate signer keys, mutate chain state, admit validators, write ledgers, or make finality autonomous. It only proves local file-backed signed API response freshness before the response can supply validator runtime truth epoch roots.
