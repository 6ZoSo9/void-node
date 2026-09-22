# DataNet Content Commitment Sovereign Single-Transaction Authorization v1

Marker: `VOID_DATANET_CONTENT_COMMITMENT_SOVEREIGN_SINGLE_TRANSACTION_AUTHORIZATION_V1`

Status: source-only Sovereign authorization request construction and Ed25519 signature verification. No private key is read, no signer object is created, no transaction is signed, no transaction is broadcast, and Chain-2050 is not mutated.

## Purpose

The merged final-signing review preflight deliberately stops before signing authority.

This gate lets the Sovereign explicitly authorize **one exact unsigned transaction candidate** after reviewing the final fresh evidence.

The signed authorization binds:

- the exact final-signing-review preflight ID;
- the exact fresh pre-sign revalidation ID;
- the exact fresh credential-binding ID;
- the exact unsigned-transaction candidate fingerprint;
- publisher and registry addresses;
- nonce;
- gas limit;
- max fee and priority fee;
- zero native value;
- SHA-256 of exact calldata;
- a short authorization validity window;
- single-use semantics; and
- the pinned production Sovereign Ed25519 identity.

## Authorization window

The signed body must use canonical UTC second timestamps.

The maximum interval from issue to expiry is 600 seconds.

This source-only verifier checks the signed interval shape and maximum width. It does **not** claim that the authorization is unexpired at a future signing instant.

The downstream signing gate must re-check wall-clock expiry immediately before signing.

## Single-use boundary

The authorization states `single_use=true`.

This verifier is pure and therefore **cannot enforce consumption or replay prevention**. It reports:

`authorization_consumed=false`

`consumption_record_present=false`

`replay_prevention_enforced_by_this_verifier=false`

The downstream signer must durably and atomically consume the exact authorization ID before accessing the transaction signer. A consumed authorization must never sign again.

## Sovereign signature

The signing domain is:

`void.datanet.content-commitment.sovereign-single-transaction-signing-authorization.v1`

The production wrapper pins the existing Phase-0 Sovereign primary Ed25519 DER fingerprint. A different public key fails closed before authorization is accepted.

The source module verifies signatures only. It has no private-key creation, import, storage, or signing API.

## Authority boundary

A verified artifact proves that the Sovereign approved signing exactly the bound candidate.

It still performs no signer access and no signing.

It grants **no broadcast authorization** and **no Chain-2050 write authorization**.

Broadcast remains a later, separately reviewed gate.

## Next gate

`durable_single_use_authorization_consumption_before_exact_transaction_signing_v1`

That gate must atomically consume the authorization, re-check expiry, independently rederive the exact transaction fingerprint, bind the exact publisher signer, and only then may it sign. It must not broadcast.
