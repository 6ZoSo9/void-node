# VOID two-box product/participant explicit target v1

Marker: `VOID_TWO_BOX_PRODUCT_PARTICIPANT_EXPLICIT_TARGET_V1`

Status: source-only fail-closed operator hardening. This lane does not execute a
two-box product flow, submit a job, publish DataNet state, change WC state,
restart a service, access a wallet/signer, submit a transaction, or move funds.

## Problem

A second legacy family of product, participant, WC, DataNet, and cross-machine
proof scripts still silently selected the retired Alienware Tailnet coordinate.

This was not only stale naming. Some scripts embedded direct HTTP mutation or
job-submission URLs to `100.122.79.39:4100`, bypassing their own configurable
remote-origin variables.

The active fleet is heterogeneous. A proof must not infer that a remote machine
uses Alienware's historical HTTP/helper/relayer ports.

## Contract

Every guarded script now validates its required remote coordinates before the
first network, output-directory, or mutation-capable operation.

Depending on the proof, explicit inputs include:

- `ALIEN`
- `REMOTE_NODE_BASE`
- `REMOTE_HELPER_BASE`
- `REMOTE_RELAYER_BASE`
- `REMOTE_BASE`
- `LOCAL_NODE_BASE`
- `PUBLIC_LOCAL_NODE_BASE`
- `PRECISION_TAILNET`

The old Alienware IP/Funnel/name family is rejected even when explicitly
supplied.

## Critical route corrections

`two-box-participant-golden-path-proof.sh` now submits jobs through
`$REMOTE_NODE_BASE/jobs/submit`; it no longer bypasses its configured origin
with a hard-coded retired IP.

`two-box-remote-verify-redundancy-product-proof.sh` now routes job submission,
worker diagnostics, and WC-runner config/set/status/tick calls through the
explicit `REMOTE_NODE_BASE`.

Parent product wrappers export their explicit coordinates to child proofs rather
than relying on historical defaults.

## CI boundary

The focused proof invokes each guarded script only in terminal fail-closed
cases:

1. required target variables are missing; and
2. the retired Alienware SSH target is supplied.

Both cases must exit with code `2` and the marker above before any live
network or mutation path executes. No positive/live product proof is run in CI.
