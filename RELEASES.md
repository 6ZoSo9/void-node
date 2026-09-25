# VOID Releases

Reviewed: **September 25, 2026**

This file is the current release-state index for VOID Network. It is not an immutable checkpoint receipt; historical release/checkpoint artifacts remain evidence of the state at the time they were created.

## Current node release state

- Source package version: `0.1.0`.
- Public-documentation refresh baseline: `main@1b310e6555ef7e3eca6d74eac1cf2f6ce4196358` (PR #1832).
- That SHA is a documentation-refresh anchor, not a rolling `main` pointer. Live repository truth must be read from the current `main` ref.
- Official `release-v0.1.0` tag: **not published**.
- Official stable VOID node GitHub Release: **not published**.
- Stable-channel promotion: **not completed**.

The repository contains substantial deterministic build, installer, update, qualification, immutable-publication, canary, promotion, freeze, revocation, and rollback infrastructure. Those controls are prerequisites for a stable release; they are not themselves a stable release.

## Published GitHub Release inventory

The GitHub Releases page currently contains one immutable published release:

### VOID External-Agent Credential Request Packet V1

- Published: **July 27, 2026**.
- Tag: `ckpt-external-agent-credential-request-packet-v1-post-merge-exact-green-20260727T204226Z`.
- Source commit: `ce9e82181445b9491f2992abf5fa0742a94eb496`.
- Contents: external-agent credential request packet plus SHA-256 sidecar.
- Classification: **historical external-agent packet; not a stable VOID node distribution**.

[Open the published packet release](https://github.com/6ZoSo9/void-node/releases/tag/ckpt-external-agent-credential-request-packet-v1-post-merge-exact-green-20260727T204226Z).

## Current unreleased Mainnet-0 source highlights

Current `main` includes, among other changes:

- public Mainnet-0 canonical runtime and public evidence surfaces;
- the participant application, DataNet, bounded Work Credit earning, and operator evidence workflows;
- source-pinned direct IPv4 + Tor v3 public P2P introductions with exact node-identity binding and live N-1 acceptance;
- the coupled presale + WC/VOID launch policy;
- a fail-closed production WC/VOID readiness classifier whose checked-in candidate is intentionally `HOLD`;
- the merged WC/VOID coupled-opening settlement source gate from PR #1824, while production funding/deployment/activation remain separately gated;
- current-stack BTC/VOID atomic-settlement components; and
- deterministic node release/install/update/publication infrastructure.

A merged source capability is not automatically a deployed capability, an economic activation, or a stable release.

## Economic release boundary

Public presale intake and production WC/VOID activation are coupled:

- neither may open alone;
- WC/VOID uses `10,000,000 VOID` protocol-side opening inventory and `0 WC` protocol seed;
- WC/VOID has no fixed conversion or administrator-set opening price;
- the fixed presale price does not set or peg WC/VOID;
- the current WC/VOID production candidate is `HOLD`;
- canonical `VoidToken` market/presale inventory is distinct from the shared
  executor's Chain-2050 native gas balance;
- coupled activation requires cross-lane gas-liability reservation, nonce
  serialization, fresh fee-cap admission, finality-controlled gas release, and
  a sustainable native-gas capacity/replenishment model; and
- current WC/VOID opening work must not be described as a complete two-sided
  market until the reverse VOID→WC settlement path is separately ready.

BTC/VOID and ETH/VOID remain separate post-presale markets behind their own gates.
Open BTC/VOID and coupled-gas hardening PRs are source proposals until merged;
they are not current runtime or activation truth.

## Not released or generally activated

The following must not be inferred from the current source/release inventory:

- public presale intake;
- production WC/VOID market activation;
- automatic Buy VOID fulfillment;
- permissionless WC issuance or settlement;
- public active-validator admission;
- public signer/wallet custody;
- public treasury control; or
- an official stable node distribution.

## First official node release path

The first official node release must follow the repository's release chain:

1. Freeze an exact clean `main` commit and semantic version.
2. Produce deterministic assets and checksum manifests.
3. Produce the required SPDX SBOM and provenance/attestation evidence.
4. Pass the full release qualification matrix.
5. Satisfy the required independent-review path or the explicitly weaker documented solo time-lock path.
6. Publish an immutable GitHub Release and publication receipt.
7. Run the isolated release canary and record its receipt.
8. Promote candidate/stable channel state through the reviewed promotion path.

Publication is not deployment and must not silently restart nodes, generate keys, mutate chain state, activate economic lanes, admit validators, or move treasury assets.

## Release references

- [Public branch and release policy](docs/public/branch-release-policy.md)
- [Release process v1](docs/public/release-process-v1.md)
- [Release publication and promotion v1](docs/public/release-publication-promotion-v1.md)
- [Release qualification v1](docs/public/release-qualification-v1.md)
- [First official release launch gate v1](docs/public/first-official-release-launch-gate-v1.md)
- [Current public status](docs/public/mainnet0-current-public-status.md)
- [Current capability matrix](docs/public/current-capability-matrix.md)
