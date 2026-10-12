# Live canonical chain-state API response quorum certificate binding boundary v1

This audit proves that a live canonical chain-state API response quorum result must be bound into a deterministic certificate before that quorum can be reused as authority.

## Boundary

A quorum certificate is accepted only when all of the following hold:

- the source response still satisfies the signer-policy quorum boundary;
- the source response carries domain, response nonce, finalized height, finalized block hash, and epoch root;
- the certificate purpose is the live canonical chain-state API response quorum-certificate purpose;
- the certificate policy id, authority version, policy sequence, quorum threshold, domain, response nonce, finalized height, finalized block hash, and epoch root match the source response and active policy;
- the certificate signer set is distinct, sorted, and exactly equal to the accepted quorum signer set;
- the certificate binding payload exactly matches the deterministic payload rebuilt from those fields.

## Non-goals

This boundary does not perform network fetches, wallet actions, signer rotation, validator admission, ledger writes, or autonomous finality mutation.
It is a deterministic local binding guard for quorum certificates derived from signed live canonical chain-state API responses only.

## Green marker

`VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_QUORUM_CERTIFICATE_BINDING_BOUNDARY_AUDIT_V1_GREEN`
