# Live canonical chain-state API response signer authority boundary v1

This audit proves that a live canonical chain-state finality API response is not accepted merely because it is signed, fresh, replay-nonce safe, and domain-separated.

The response signer must also be authorized for the live canonical chain-state API response authority namespace.

## Boundary

A response is accepted only when all of the following are true:

- the signer authority boundary is enabled;
- the API response signature boundary is already green;
- the API response domain separation boundary is already green;
- the response domain matches the required live canonical chain-state finality API domain;
- the signer key id is present;
- the signer public key is present;
- the signer key id is present in the explicit allowlist;
- the signer key id is not present in the revocation set;
- the allowlist itself is non-empty and unique.

## Non-goals

This boundary does not fetch from the network, rotate signer keys, write ledger state, admit validators, mutate finality, or grant wallet authority. It is a local deterministic authority gate for signed live canonical chain-state API response envelopes.

## Proof

Run:

```bash
npx tsx scripts/prove_live_canonical_chain_state_api_response_signer_authority_boundary.ts
```

Expected marker:

```text
VOID_LIVE_CANONICAL_CHAIN_STATE_API_RESPONSE_SIGNER_AUTHORITY_BOUNDARY_AUDIT_V1_GREEN
```

