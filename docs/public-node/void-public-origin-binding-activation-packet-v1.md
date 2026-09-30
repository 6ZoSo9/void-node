# VOID public-origin binding activation packet v1

Marker: `VOID_PUBLIC_ORIGIN_BINDING_ACTIVATION_PACKET_V1`

Status: source-only post-signing configuration packet compiler.

## Purpose

The merged serving boundary consumes three environment values:

```text
VOID_PUBLIC_ORIGIN_BINDING_FILE
VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_ORIGIN
VOID_PUBLIC_ORIGIN_BINDING_EXPECTED_NODE_ID
```

This tool derives those values from an already-signed, already-verified public
origin binding instead of asking an operator to type origin and node identity
again.

It does not install the environment values.

## Fixed production identity

The CLI is fixed to:

```text
origin=https://seed.nullfeed.org
node_id=9d89483769e469e0473b489dc50dba96
```

The signed binding must pass
`verifyReviewedVoidNodePublicOriginBindingV1`, which requires the reviewed
public-node fingerprint, signature, origin, node ID, expiry, network, surface,
and zero-authority profile.

There is no CLI option to override origin, node ID, trust registry, key or
signer.

## Packet

The create-only JSON packet records:

- canonical signed-binding file path;
- raw artifact SHA-256;
- canonical binding SHA-256;
- origin, node ID and public-key fingerprint;
- issued/expiry timestamps;
- the exact three serving environment values; and
- an explicit all-false activation authority boundary.

The binding file must be a canonical absolute regular non-symlink file and is
read with bounded generation checks.

## What this does not do

The packet compiler does not:

- write a systemd unit or drop-in;
- install environment variables;
- enable/start/restart a service;
- alter tunnel, DNS or TLS configuration;
- read a private key;
- sign anything;
- publish a binding by itself;
- mutate the node runtime, Work Credits, validators or transactions; or
- move funds.

A separate operator action must consume a reviewed packet if/when publication is
authorized.

## Proof

```bash
node --check tools/void-public-origin-binding-activation-packet-v1.mjs
node --check scripts/prove_void_public_origin_binding_activation_packet_v1.mjs
node scripts/prove_void_public_origin_binding_activation_packet_v1.mjs
```

The success-path proof uses an ephemeral Ed25519 binding through an injected
test verifier. The actual CLI keeps the reviewed production verifier and rejects
that unreviewed key. The proof also covers expiry, tampering, create-only output,
fixed environment values, and absence of systemd/private-key/signing authority.

## Next gate

After a real production signature exists, this compiler can produce the exact
environment packet. Applying that packet to the actual serving service remains
a separate explicit activation authorization and must be followed by external
byte-identity and WC handoff acceptance evidence.
