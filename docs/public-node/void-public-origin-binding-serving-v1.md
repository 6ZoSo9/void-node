# VOID public-origin binding serving v1

Marker: `VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1`

Status: source-only optional serving boundary. No signed production binding is
created or published by this lane.

## Purpose

The public WC handoff verifies
`/.well-known/void-node-public-origin-binding-v1.json` before it emits public
copy-ready commands. The current public seed adapter previously had no exact
route for that artifact.

This boundary adds only the machinery required to serve an already-signed,
already-reviewed binding later. Without explicit configuration, both binding
aliases remain unavailable.

## Configuration

All three values are required together:

- `VOID_PUBLIC_ORIGIN_BINDING_FILE` — absolute path to the signed JSON file;
- `VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN` — exact canonical default-port
  public HTTPS DNS origin;
- `VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID` — exact 32-lowercase-hex node
  ID.

Zero configured values means disabled. Partial configuration fails startup
closed.

The binding file must be a direct regular file opened without symlink following
and must be no larger than 128 KiB. It must decode as strict UTF-8 JSON.

Before the adapter can serve it, the loader uses the existing fixed reviewed
node-identity trust registry and
`verifyReviewedVoidNodePublicOriginBindingV1`. Signature, origin, node ID,
fingerprint, network, surface, expiry, and zero-authority fields must all verify.

## Routes

Only these exact aliases are recognized:

```text
/.well-known/void-node-public-origin-binding-v1.json
/public-node/identity/public-origin-binding-v1.json
```

The aliases serve the same in-memory bytes loaded and verified at process
startup.

- `GET` returns those exact bytes.
- `HEAD` returns the same headers and content length with no body.
- Query strings are rejected.
- Other methods are rejected.
- No generic `/.well-known` prefix is exposed.
- The artifact is not proxied from another upstream.
- Disabled configuration returns `404 not_public` for the exact aliases.

The public seed adapter status surfaces may report only the public origin, node
ID, artifact digest, binding digest, expiry, paths, and read-only boundary.
They do not expose file paths or credentials.

## Authority boundary

This lane does not:

- read or accept a private key;
- access a wallet or signer;
- create a signature;
- write a signed binding;
- activate the production route by itself;
- mutate node runtime, Work Credits, validators, DNS, TLS, tunnels, or services;
- submit transactions; or
- move funds.

Merging source with the three configuration values absent leaves the routes
disabled.

## Proof

```bash
node --check ops/public/void-public-origin-binding-serving-v1.mjs
node --check ops/public/public-seed-adapter-v1.mjs
node --check scripts/prove_void_public_origin_binding_serving_v1.mjs
node scripts/prove_void_public_origin_binding_serving_v1.mjs
node scripts/prove_public_earn_gateway_v1.mjs
```

The focused proof uses an ephemeral Ed25519 key and a temporary signed binding.
It proves the loader/serving mechanics without possessing or simulating the
production node private key.

Expected marker:

```text
VOID_PUBLIC_ORIGIN_BINDING_SERVING_V1_PROOF_GREEN
```

## Next gate

A production route remains impossible until a real production
`VOID_NODE_PUBLIC_ORIGIN_BINDING_V1` has been created under separate signing
authorization, independently verified, and installed as the exact configured
file for the reviewed public origin and node ID.

A later runtime activation must separately prove both aliases are byte-identical
from outside the network and that the WC public-opportunity handoff accepts the
published binding before the participant page can claim public copy-ready state.
