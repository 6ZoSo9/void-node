# VOID node public-origin binding production request v1

Marker: `VOID_NODE_PUBLIC_ORIGIN_BINDING_PRODUCTION_REQUEST_V1`

Status: source-only unsigned production-request compiler.

## Purpose

The generic signing-request contract already validates an origin, node ID and
public key against the reviewed trust registry. This compiler removes the
remaining free-form identity/origin choices for the canonical clearweb seed.

It always builds for:

```text
origin=https://seed.nullfeed.org
node_id=9d89483769e469e0473b489dc50dba96
public_key_fingerprint_sha256=2f52b928cb00bf309510d1edef299554277fba6d52bfd1ddb52b9b015397c50b
```

The node public key is loaded from the committed, signed
`VOID_NODE_ONION_BINDING_V1` evidence and that evidence signature is verified
before request construction. The generic signing-request builder then requires
the same key fingerprint and node ID to match the fixed reviewed public-node
identity trust registry.

## Operator inputs

Only these values are operator-selected:

- canonical `expires_at`; and
- absolute create-only output path.

The production CLI derives `issued_at` from its own current UTC clock and
explicitly rejects `--issued-at`. The pure builder keeps an explicit
`issuedAt` input only for deterministic source proofs; that does not create an
operator backdating surface.

There is no CLI argument for origin, node ID, public key, trust registry, private
key, signer, wallet, publication route, service, or production issuance time.

The generic binding contract continues to enforce the maximum validity interval.

## Output

The output is exactly one
`VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_REQUEST_V1` JSON object.

It contains:

- `signature.value=null`;
- content-derived request ID;
- exact domain-separated signing bytes in base64;
- payload SHA-256;
- reviewed trust-registry SHA-256; and
- zero signing/publication/runtime authority.

Output creation is exclusive and refuses overwrite.

## Authority boundary

This compiler:

- never reads a private key;
- never accesses a wallet or signer;
- never creates a signature;
- never publishes a binding;
- never activates a route;
- never restarts or mutates runtime;
- never mutates Work Credits or validators;
- never submits a transaction; and
- never moves funds.

It prepares input for the separately gated manual signing execution tool only.

## Proof

```bash
node --check tools/void-node-public-origin-binding-production-request-v1.mjs
node --check scripts/prove_void_node_public_origin_binding_production_request_v1.mjs
node scripts/prove_void_node_public_origin_binding_signing_request_v1.mjs
node scripts/prove_void_node_public_origin_binding_production_request_v1.mjs
```

The proof requires deterministic pure-builder output for fixed timestamps,
verifies the committed signed node identity evidence, rejects arbitrary origin
selection, rejects noncanonical/reversed timestamps, proves the production CLI
derives issuance from its current clock and rejects `--issued-at`, refuses
overwrite, and proves there is no private-key/signing path.

## Next gate

After source acceptance, an exact current request may be generated with reviewed
timestamps. Production signing remains a separate explicit authorization scoped
to that generated request ID and payload SHA-256, the machine/key access, and
the intended create-only signed output.
