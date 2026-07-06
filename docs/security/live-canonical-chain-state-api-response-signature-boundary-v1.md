# Live canonical chain-state API response signature boundary v1

## Status

Audit/proof boundary for signed live canonical chain-state finality API responses.

Marker: `VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNATURE_BOUNDARY_AUDIT_V1_GREEN`

## Boundary

The validator runtime truth live-chain API epoch-root path may consume a finalized chain-state API response file. This boundary adds an explicit opt-in signature gate for that API response before the response is allowed to supply the validator runtime truth epoch root.

## Authority rule

When `VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNATURE_REQUIRED` or an accepted alias is enabled:

1. The API response must include an Ed25519 signature block.
2. The response signer public key must match the trusted signer configured by env or trusted signer PEM file.
3. The signature must verify over a stable JSON body with response signature fields removed.
4. Only after the response is authenticated may finalized epoch-root extraction proceed.

## Accepted signer configuration

Trusted signer env/file aliases include:

- `VOID_BLOCK_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY`
- `VOID_VALIDATOR_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY`
- `VOID_LIVE_CHAIN_STATE_API_RESPONSE_SIGNER_PUBKEY`
- `VOID_CHAIN_FINALITY_API_RESPONSE_SIGNER_PUBKEY`
- matching `*_FILE` aliases for PEM files

## Rejection reasons sealed by the proof

- `live_validator_chain_state_api_response_signature_missing`
- `live_validator_chain_state_api_response_signature_alg_unsupported`
- `live_validator_chain_state_api_response_signature_shape_invalid`
- `live_validator_chain_state_api_response_signer_pubkey_missing`
- `missing_live_validator_chain_state_api_response_trusted_signer`
- `live_validator_chain_state_api_response_signer_mismatch`
- `invalid_live_validator_chain_state_api_response_trusted_signer`
- `live_validator_chain_state_api_response_signature_invalid`

## Non-goals

This does not enable network fetching, remote trust discovery, automatic signer rotation, validator admission, wallet authority, ledger writes, or autonomous finality mutation. It only proves the local file-backed API response authentication boundary.
