# VOID node public-origin binding signing execution v1

Marker: `VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_EXECUTION_V1`

Status: manual source capability. Merging this tool performs no signing and does
not authorize production private-key access.

## Purpose

The unsigned-request contract on current `main` defines exactly what a future
public-origin binding must sign. This tool provides the separate manual execution
boundary without adding a new key type, a caller-selectable key loader, or a
publication side effect.

## Required input

The command requires four explicit arguments:

```bash
node tools/void-node-public-origin-binding-signing-execution-v1.mjs sign \
  --request /absolute/signing-request.json \
  --key-file /absolute/existing-void-node-private-key \
  --output /absolute/signed-binding.json \
  --confirmation 'sign-void-node-public-origin-binding-v1:<request_id>:<payload_sha256>'
```

There is no environment-variable key-path fallback and no
`--keypair-module` override.

## Ordering

Before any private-key access the tool:

1. opens the request as a bounded direct regular file;
2. runs the complete current reviewed signing-request verifier;
3. derives the exact request-ID + payload-SHA confirmation literal;
4. requires byte-exact confirmation equality; and
5. proves the output path is create-only and currently absent.

Only after those gates does it inspect the node key path.

## Existing key only

The private-key file must:

- be an absolute canonical path;
- not traverse symlinks or aliases;
- be a regular file;
- be owned by the current user;
- have no group/world permissions; and
- remain the same inode/generation across key loading.

The tool then uses the repository-pinned `src/crypto/keypair.js` through the
existing `loadExistingVoidNodeKeypairV1` boundary. A caller cannot substitute a
different key loader.

The loaded key must reproduce the exact request node ID, public-key PEM and
SPKI-DER SHA-256 fingerprint.

## Exact signature

The command decodes the request's already-verified payload bytes and rederives
the same domain-separated bytes from `unsigned_binding`. Both byte sequences
and SHA-256 values must match.

Exactly one Ed25519 signature is created. Only `signature.value` is populated.
The completed binding is immediately verified against the fixed reviewed public
node identity trust registry, exact origin and exact node ID before output.

## Output

The output is create-only, refuses overwrite, and is written mode `0600`.
The command prints public IDs and digests only. It does not print private-key
bytes or contents.

The command does **not**:

- publish the signed binding;
- activate either binding route;
- restart a service;
- mutate node runtime;
- mutate Work Credits or validators;
- submit a transaction;
- authorize payment; or
- move funds.

Publication remains the separate #2135 serving/configuration boundary.

## Proof

```bash
node --check tools/void-node-public-origin-binding-signing-execution-v1.mjs
node --check scripts/prove_void_node_public_origin_binding_signing_execution_v1.mjs
node scripts/prove_void_node_public_origin_binding_signing_request_v1.mjs
node scripts/prove_void_node_public_origin_binding_signing_execution_v1.mjs
```

The proof's successful signature uses a fresh ephemeral Ed25519 key. It never
loads the production node private key. It also proves that a wrong confirmation
or occupied output fails before a nonexistent key path is inspected.

## Production gate

Source acceptance of this tool is not production signing authorization.

A production run must separately identify the exact request ID and payload
SHA-256 being authorized, the machine on which the existing node key may be
accessed, and the intended create-only output. After signing, the resulting JSON
must still pass independent verification and the #2135 publication gate before
outside handoff acceptance can be claimed.
