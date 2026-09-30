# VOID node public-origin binding signing request v1

Marker: `VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1`

Status: source-only unsigned request construction. This lane creates exact
signable bytes for the existing
`VOID_NODE_PUBLIC_ORIGIN_BINDING_V1` contract without accessing a private key,
creating a production signature, publishing a route, or changing runtime state.

## Purpose

The public participant handoff already knows how to verify a signed public-origin
binding against the reviewed node-identity trust registry. What is still missing
is the operator boundary that turns reviewed public facts into one exact payload
that can later be signed under separate authorization.

This request layer closes only that preparation gap.

## Input

The builder accepts exactly:

```json
{
  "origin": "https://seed.nullfeed.org",
  "node_id": "9d89483769e469e0473b489dc50dba96",
  "public_key_pem": "<existing public Ed25519 node key PEM>",
  "issued_at": "<canonical ISO-8601 timestamp>",
  "expires_at": "<canonical ISO-8601 timestamp>"
}
```

Unknown fields are rejected. In particular, private-key material is not an
accepted input.

The production-origin request is stricter than the generic binding verifier:
the origin must already be a canonical default-port public HTTPS DNS origin.
Development/private HTTP remains outside this production signing-request lane.

## Independent identity binding

The builder loads the fixed reviewed
`config/void-public-node-identity-trust-v1.json` registry through its existing
content-addressed verifier. The requested node ID must exist there and the
derived Ed25519 SPKI-DER fingerprint of the supplied public key must exactly
match the reviewed fingerprint.

The request records the exact reviewed trust-registry SHA-256 alongside the
node ID and fingerprint.

## Exact signing payload

The existing public-origin library now exports its already-used unsigned binding
constructor. The production signer path and the request builder therefore derive
the same binding fields rather than maintaining two implementations.

The request contains:

- the complete unsigned binding with `signature.value=null`;
- domain, algorithm, encoding, canonicalization and key ID;
- exact signing payload bytes as base64;
- payload SHA-256; and
- request ID `voidnpobsr1_<request-identity-sha256>`.

The request identity digest binds the signing-payload SHA-256 together with the
exact reviewed trust-registry marker/SHA-256, node ID, fingerprint, request
schema/status, and generation timestamp. A trust-registry generation change
therefore cannot reuse an old request ID merely because the signable node
binding bytes happen to remain the same.

Verification reconstructs the whole request from its public inputs and requires
canonical byte-equivalent content. Origin, node key, trust registry, dates,
authority flags, payload bytes, or request-ID drift fails closed.

## Authority boundary

This tool can only construct or verify an unsigned request. It does not:

- read, accept, discover, copy, or expose a private key;
- access a wallet or signer;
- create an Ed25519 signature;
- create a production signed binding;
- publish either public-origin binding route;
- activate a route or restart a service;
- mutate the VOID node runtime or Work Credits;
- submit a transaction;
- mutate validators;
- authorize payment; or
- move funds.

The proof uses the already-public Precision node public key and reviewed
fingerprint. It never possesses the matching private key.

## Commands

```bash
node tools/void-node-public-origin-binding-signing-request-v1.mjs \
  build input.json signing-request.json

node tools/void-node-public-origin-binding-signing-request-v1.mjs \
  verify signing-request.json
```

Output creation is exclusive and refuses overwrite.

## Verification

```bash
node --check tools/lib/void-node-public-origin-binding-v1.mjs
node --check tools/void-node-public-origin-binding-signing-request-v1.mjs
node --check scripts/prove_void_node_public_origin_binding_signing_request_v1.mjs
node scripts/prove_void_node_public_origin_binding_v1.mjs
node scripts/prove_void_node_public_origin_binding_signing_request_v1.mjs
```

Expected marker:

```text
VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1_PROOF_GREEN
```

## Next gate

After source acceptance, a current exact request may be generated from reviewed
public inputs. Access to the production node identity private key and signing of
that exact payload remain a separate explicit operator authorization.

After signing, the completed binding still requires independent verification,
byte-identical publication at the reviewed binding paths, and outside-participant
acceptance evidence before the public participant page may claim
`public_copy_ready=true`.
