# Authenticated paid-work fresh direct quote signing handoff v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_SIGNING_HANDOFF_V1`

## Purpose

This contract closes the source gap between a fresh prepared paid-work quote and
the direct provider/requester authentication packet accepted by the atomic
activation-persistence adapter.

The existing direct authenticator verifies complete signatures, but operators
previously had to reconstruct the exact provider and requester signing bodies by
hand. That is error-prone and especially dangerous because the requester must
bind the verified provider authentication ID.

This helper produces the signing bytes deterministically without reading or
receiving a private key.

## Three-stage flow

### 1. Provider handoff

`prepare` validates and materializes the canonical quote-acceptance and payment-
authority packet from `prepared_input`. It verifies the provider and requester
public-key binding drafts and emits:

- the complete provider authentication body;
- canonical provider signing bytes as base64;
- the SHA-256 of those exact bytes;
- the computed provider and requester binding IDs;
- a content-addressed provider handoff ID.

The requester signing body does not exist yet. Provider-first sequencing is a
contract requirement, not an operator convention.

### 2. Requester handoff

The provider signs the exported bytes outside this helper. `advance` accepts
only a structured Ed25519 signature record bound to the expected role, key ID,
and signing-bytes digest. It verifies the signature with the approved provider
public key, derives the provider authentication ID, and only then emits the
requester signing body.

The requester body binds the verified provider authentication ID and the exact
prepared acceptance nonce.

### 3. Final authentication handoff

The requester signs its exported bytes outside this helper. `finalize` verifies
the requester signature, constructs the canonical direct-authentication input,
and invokes the existing reviewed direct authenticator.

Successful finalization produces:

- status `direct_quote_authenticated_for_atomic_persistence`;
- the complete direct authentication input;
- a verified direct authentication packet eligible for the existing
  `direct_authentication_packet` persistence mode;
- content-addressed provider, requester, and final handoff IDs.

Finalization does not persist acceptance or payment authority. Fresh replay
snapshots, the persistence configuration, and a fresh operation-bound
confirmation remain required by the existing atomic persistence adapter.

## Input contract

The top-level input contains:

- `prepared_input`: the canonical input accepted by
  `authenticated_paid_work_quote_acceptance_payment_authority_v1.ts`;
- an operator-approved provider public-key binding draft;
- an operator-approved requester public-key binding draft;
- bounded provider and requester authentication plans;
- all required fail-closed controls set to `true`.

Authentication windows must stay within both key-binding windows and the
prepared acceptance/payment-intent expiry. Requester authentication must begin
no earlier than provider authentication and cannot outlive it.

## External signature record

Both signer roles return the same closed record shape:

```json
{
  "marker": "VOID_AUTHENTICATED_PAID_WORK_FRESH_DIRECT_QUOTE_EXTERNAL_SIGNATURE_V1",
  "version": 1,
  "signer_role": "provider",
  "key_id": "ed25519:<64 lowercase hex>",
  "signing_bytes_sha256": "<64 lowercase hex>",
  "signature_base64": "<canonical 64-byte Ed25519 signature>"
}
```

For the requester record, `signer_role` is `requester`.

A signature is rejected if its role, key ID, signing-bytes digest, encoding, or
cryptographic verification differs from the handoff.

## CLI

```bash
npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  prepare input.json provider-handoff.json

npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  advance input.json provider-handoff.json provider-signature.json \
  requester-handoff.json

npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  finalize input.json provider-handoff.json provider-signature.json \
  requester-handoff.json requester-signature.json final-handoff.json

npx tsx scripts/authenticated_paid_work_fresh_direct_quote_signing_handoff_v1.ts \
  verify-final input.json provider-handoff.json provider-signature.json \
  requester-handoff.json requester-signature.json final-handoff.json
```

All output files are create-only with mode `0600`. Existing output paths,
symlink inputs, oversized JSON, non-canonical signatures, stale handoffs, and
secret-bearing inputs fail closed.

## Secret boundary

This helper accepts public keys and external signatures only. It rejects private
key PEM material and explicit private-key, mnemonic, seed-phrase, password,
token, and authorization-header fields.

Private keys remain in their separately controlled signing environment. The
helper never creates, reads, prints, copies, writes, or rotates one.

## Authority boundary

This source lane and its helper do not:

- create a live quote or submit paid work over HTTP;
- persist effective quote acceptance or payment authority;
- consume production replay IDs;
- authorize or execute payment;
- resolve a payment destination;
- construct, sign, or broadcast a transaction;
- authorize or dispatch work;
- write Work Credits or settle WC to VOID;
- access a wallet, signer, credential, or private key;
- restart a service, deploy code, or mutate runtime state;
- move funds.

The next gate is the already reviewed atomic persistence adapter in
`direct_authentication_packet` mode, with separately reviewed runtime evidence
and fresh ZoSo confirmation.
