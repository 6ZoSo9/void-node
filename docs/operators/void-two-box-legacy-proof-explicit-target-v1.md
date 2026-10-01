# VOID two-box legacy proof explicit target v1

Marker: `VOID_TWO_BOX_LEGACY_PROOF_EXPLICIT_TARGET_V1`

Status: source-only fail-closed operator hardening. This lane does not execute a
two-box proof, connect to an operator machine, submit a job, publish DataNet
state, restart a service, access a wallet/signer, submit a transaction, or move
funds.

## Problem

A remaining legacy family of two-box proof scripts still silently selected the
retired Alienware Tailnet coordinate `zoso@100.122.79.39`. Several of these
proofs contain SSH, HTTP POST, job-submission, DataNet, or product-flow actions.

The current fleet is heterogeneous: Nimo and Xiphos do not share Alienware's old
port assumptions. A legacy proof therefore must not choose either a host or a
remote HTTP origin implicitly.

## Contract

The guarded scripts require explicit remote coordinates before the first
network, filesystem-output, or mutation-capable operation.

Most scripts require:

- `ALIEN`: explicit SSH target; and
- `REMOTE_NODE_BASE`: explicit remote HTTP origin.

`two-box-remote-product-proof.sh` additionally requires explicit helper and
relayer origins.

`two-box-peer-proof-suite.sh` requires explicit `ALIEN` and
`REMOTE_BASE`; its old remote-base guessing fallback remains unreachable under
the admission wall and is retained only to minimize unrelated historical
rewrites.

All supplied target strings are screened for the retired Alienware family:

- `100.122.79.39`;
- `zoso-alienware-aurora-r7.taila47fd.ts.net`; and
- the token `alienware`, case-insensitively.

A rejected or missing target exits with code `2` and the marker above.

## Guarded scripts

- `ops/two-box-remote-product-proof.sh`
- `ops/two-box-remote-participant-js-parse-proof.sh`
- `ops/two-box-remote-participant-copy-actions-proof.sh`
- `ops/two-box-datanet-tab-proof.sh`
- `ops/two-box-datanet-proof.sh`
- `ops/two-box-datanet-canonical-proof.sh`
- `ops/two-box-bidirectional-open-proof.sh`
- `ops/two-box-datanet-workloop-proof.sh`
- `ops/two-box-receipt-result-fetch-proof.sh`
- `ops/two-box-reverse-bidirectional-open-proof.sh`
- `ops/two-box-datanet-peer-path-proof.sh`
- `ops/two-box-full-useful-work-loop-proof.sh`
- `ops/two-box-ui-share-open-both-ways-proof.sh`
- `ops/two-box-remote-verify-redundancy-proof.sh`
- `ops/two-box-ui-share-open-both-ways-no-seed-proof.sh`
- `ops/two-box-peer-proof-suite.sh`

## CI boundary

The focused proof never supplies a live accepted target. It invokes every script
only in two terminal cases:

1. required target variables are absent; and
2. the SSH target is the retired Alienware address.

Both cases must terminate before network or mutation execution.
