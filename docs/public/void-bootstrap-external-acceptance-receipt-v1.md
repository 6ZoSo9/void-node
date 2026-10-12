# VOID bootstrap external acceptance receipt v1

## Purpose

Issue #1005 defines a specific final acceptance proof for plug-and-play public
bootstrap. This contract defines the sanitized, content-addressed receipt shape
for that future live run.

The contract does **not** perform the live run and does not claim issue #1005
closure. Its job is to make the future evidence machine-checkable before any
outside-machine acceptance attempt is treated as green.

## Current diagnostic vocabulary

The receipt uses the existing runtime readiness vocabulary rather than creating
parallel status names:

- `head` must be greater than zero;
- `gap` must equal `0`; and
- `txroot_live` must equal `1`.

The live collector may bind the sanitized SHA-256 of the exact readiness JSON
used for each observation.

Peer evidence is represented by cryptographic VOID node IDs only. The live
collector may bind the sanitized SHA-256 of the exact `/p2p/peers` snapshot
without publishing private addresses.

## Eligible paths before first synchronization

The receipt requires at least two eligible paths before first sync and at least
two distinct introduction failure domains.

Each path contains:

- record distribution transport and failure domain;
- introduction transport and failure domain;
- target VOID peer ID; and
- `eligible=true`.

Record distribution supports:

- `https_record_mirror`
- `tor_record_mirror`

Introduction supports:

- `direct_ipv6_seed`
- `direct_ipv4_seed`
- `relay`
- `tor_sync_seed`

Record-distribution and introduction failure domains in one path must differ.

## First fresh node

The first node must prove:

- it is outside the operator Tailnet;
- the selected path was present in the eligible pre-sync set;
- first contact authenticated the exact target VOID node ID;
- `head > 0`;
- `gap=0`;
- `txroot_live=1`;
- at least one additional verified peer was learned after first contact;
- one component of the exact first-contact path was intentionally removed;
- connectivity continued after that removal; and
- continued connectivity included a verified peer other than the original
  first-contact peer.

## Second fresh node

A different fresh machine must then prove:

- it is outside the operator Tailnet;
- a different bootstrap component is intentionally unavailable;
- that unavailable component actually exists in the declared eligible
  topology;
- the selected second-node path does not depend on the unavailable component;
- first contact authenticates the exact target peer ID;
- `head > 0`;
- `gap=0`;
- `txroot_live=1`;
- at least one additional verified peer is learned; and
- the second selected path uses a different introduction failure domain from
  the first selected path.

## Forbidden dependencies

The receipt is invalid if any of these are required:

- Tailscale;
- private Tailnet dependency;
- manually copying operator addresses;
- contacting the operator;
- a particular commercial cloud provider;
- a particular DNS provider;
- a particular tunnel provider; or
- a certificate authority as VOID network identity.

## Evidence hashing

The receipt binds SHA-256 values for sanitized source observations:

- eligible paths before first sync;
- first-node ready state after sync;
- first-node peers after sync;
- first-node ready state after first-contact removal;
- first-node peers after first-contact removal;
- second-node ready state; and
- second-node peers.

The contract deliberately stores hashes instead of addresses or raw operator
environment data.

## Authority boundary

All private/economic authority flags must be false.

This source contract performs no:

- network calls;
- outside-machine actions;
- relay activation;
- bootstrap publication;
- runtime changes;
- deployment or service restart;
- firewall/router/DNS mutation;
- credential access;
- wallet/signer/validator/treasury/Work Credit action;
- transaction broadcast; or
- money movement.

## Evidence mode

`synthetic_test_fixture` is used only by the contract proof.

A real sanitized acceptance run must use:

`external_machine_observation`

Changing evidence mode changes the content-addressed receipt ID.

### External observation verification boundary

The `external_machine_observation` label is not itself evidence.

The generic builder and validator therefore fail closed for that mode unless the
caller injects a separately reviewed external-evidence verifier. That verifier
is responsible for checking the source observations bound by the receipt's
SHA-256 fields before returning `true`.

This prevents a synthetic fixture from being relabeled as an external-machine
acceptance receipt merely by changing `evidence_mode` and recomputing
`receipt_id`. The source contract does not implement network collection or
choose an external trust authority.
