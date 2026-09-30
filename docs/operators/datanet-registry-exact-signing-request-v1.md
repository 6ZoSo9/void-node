# DataNet registry exact signing request v1

Marker: `VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_V1`

Status: source-only signing request. Signing remains unauthorized.

## Purpose

Freeze the exact reviewed DataNet registry deployment candidate into a
human-auditable signing request after:

- the unsigned EIP-1559 candidate exists;
- fresh live candidate/state revalidation is green;
- the dedicated Nimo deployer credential has been rebound after that
  revalidation; and
- the final signing review is green and still unexpired.

This gate does not read a key and does not sign.

## Exact request binding

The request independently rebuilds the final signing review and exact unsigned
candidate before it can be emitted.

It binds:

- candidate ID;
- final signing-review ID;
- candidate-revalidation ID;
- fresh Nimo credential-binding ID;
- exact unsigned transaction hash;
- exact transaction fingerprint;
- deployer address;
- chain ID;
- nonce;
- gas limit;
- max fee and max priority fee;
- deployment-data SHA-256 and Keccak-256;
- SHA-256 of the unsigned serialized EIP-1559 transaction; and
- predicted contract address.

The raw private key is never present. The request also does not need to embed
the full deployment calldata.

## Time boundary

The request must be generated after the final signing review was evaluated and
before both:

- the final-review expiry; and
- the candidate expiry.

The request inherits the earlier of those expirations and cannot create a
longer validity window.

## Authority boundary

A green request still records:

- source request only;
- RPC call false;
- credential/private-key access false;
- wallet/signer exposure false;
- transaction construction false;
- signing authorization false;
- transaction signing false;
- signed-transaction export false;
- transaction submission/broadcast false;
- deployment false;
- Chain-2050 mutation false;
- funds movement false; and
- automatic retry false.

The status remains:

`HOLD_PENDING_EXACT_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION`

## Required next confirmation

The only accepted next operation-bound confirmation is:

`authorizeDatanetRegistryDeploymentSigningV1`

A general source-work authorization, green CI, merged PR, prior credential
binding, or prior candidate-construction confirmation does **not** satisfy this
gate.

That later confirmation may authorize signing of exactly one reviewed unsigned
transaction. It must still not imply broadcast, deployment, or any additional
funds action.

## Precision compiler

The Precision compiler reads only public/evidence JSON artifacts, rebuilds the
request, and writes a mode-0600 request file.

It performs no RPC, credential access, Nimo access, signing, systemd, Docker, or
remote-host action.
