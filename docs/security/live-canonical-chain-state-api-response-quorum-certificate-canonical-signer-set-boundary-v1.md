# VOID live canonical chain-state API response quorum certificate canonical signer set boundary v1

This audit fixture proves the canonical signer-set boundary for live canonical chain-state API response quorum certificates.

The boundary is intentionally narrow:

- the signer set must be non-empty;
- the quorum threshold must be a positive safe integer;
- signer key ids must be canonical lowercase safe identifiers;
- duplicate signer key ids are rejected;
- signer key ids must already be in ascending canonical order;
- the threshold may not exceed the signer set size;
- an expected signer set, when provided, must match the canonical signer set exactly;
- the accepted signer set emits a deterministic binding payload.

This prevents quorum-certificate malleability caused by signer reordering, duplicate signer entries, invalid signer key ids, or threshold/set mismatch.

This is not a network fetch, wallet authority, ledger write, validator admission, signer rotation, or autonomous finality mutation boundary.
