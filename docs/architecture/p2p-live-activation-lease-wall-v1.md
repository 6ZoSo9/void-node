# P2P Live Activation Lease Wall v1

## Purpose

The authenticated edge wall proves peer identity. The signed trust-policy wall proves mesh membership. The node-bound activation-permit wall proves that one exact node may activate one exact policy and runtime profile once.

The live activation lease wall continuously enforces that complete authorization chain after startup. A connection supervisor must not continue running merely because authorization was valid at process start.

This wall consumes the exact signed activation permit, pins the resulting sealed generation, starts the signed trust-policy supervisor from those sealed files, and stops it fail-closed when any live binding is lost.

## Exact authority chain

Startup requires four independent enable gates and verifies:

1. the exact VOID network ID;
2. the Ed25519 edge identity derived from the configured certificate;
3. the threshold-signed membership policy and pinned public trust roots;
4. the canonical runtime-profile hash;
5. the threshold-signed node-bound activation permit;
6. the permit validity window and one-step sequence chain.

The permit is consumed through the existing create-exclusive activation state machine. The wall then pins all six immutable generation files:

- `permit-envelope.json`;
- `activation-permit-root-set.json`;
- `trust-policy-envelope.json`;
- `trust-root-set.json`;
- `runtime-profile.json`;
- `consumption.json`.

The original verified policy, roots, and runtime profile remain in memory through consumption. They are not reread from mutable operator paths between verification and sealing, closing that time-of-check/time-of-use window.

## Continuous lease enforcement

Each reconciliation cycle rechecks:

- permit and policy expiry, including a configured shutdown lead;
- the activation-state `current` symlink still names the exact consumed generation;
- all six sealed file paths and SHA-256 values remain unchanged;
- the sealed trust policy still verifies under the sealed public roots;
- the sealed activation permit still verifies under its sealed public roots;
- policy, root, profile, node, sequence, signer, threshold, and consumption bindings;
- the configured edge certificate still derives the exact permitted node ID;
- the local `revoke` marker remains absent.

Any failure stops the managed child and leaves the wall in `held`. An operator stop after a hold preserves the held state for diagnostics.

## No rotation and no automatic restart

A consumed permit authorizes one exact generation only. This wall does not rotate membership policy under an old permit. A successor policy requires a successor node-bound activation permit.

An unexpected managed-child exit is a hold. The child is never automatically restarted because the permit is one-shot. Starting the wall again requires a new process and, once a permit is consumed, a valid successor permit.

## Child boundary

The child is the signed trust-policy supervisor, not the raw edge process. The child receives only:

- the sealed policy and trust-root files;
- the signed runtime profile rendered into exact edge environment values;
- permissionless admission forced to `0`;
- the trust and edge enable gates.

Activation-permit, trust-policy, live-lease, and edge environment variables are scrubbed before exact values are assigned. The child receives no policy-signing or activation-signing private key.

## Local observability

The wall exposes a read-only status route on a loopback IP only:

`/__void/p2p-live-activation-lease-wall-v1/status`

Audit records are newline-delimited JSON, append-only with `O_NOFOLLOW`, mode `0600`, bounded in size, and fsynced. The status and audit surfaces report state and hashes, never private keys.

## Authority exclusions

This wall has no ledger, validator, account-store, wallet, transaction-signing, transaction-broadcast, settlement, economic activation, or money-movement authority. It imports no native execution modules and does not modify `src/index.ts`.

Its only authority is to consume one already-valid P2P activation permit, supervise the exact sealed generation, and start or stop the contained P2P child.

## Deployment boundary

This change does not deploy or enable the wall, install identities, issue policies or permits, alter firewall rules, expose a port, reconfigure the existing P2P backend, or restart a service. Every example gate is disabled by default.
