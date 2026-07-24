# VOID Official Network Authenticity Root V2

`VOID_OFFICIAL_NETWORK_AUTHENTICITY_ROOT_V2`

SPDX-License-Identifier: VCL-1.0

## Purpose

V2 provides deterministic tooling for an offline Ed25519 authenticity-root
ceremony. The resulting public key and signature can later distinguish the
official VOID Network identity from copied or impersonating networks.

This lane does not create authority over third-party machines or networks.

## Separation

1. An online preparation host creates a public canonical signing payload.
2. Only that public payload is transferred to an offline ceremony host.
3. The offline host generates a fresh Ed25519 keypair and signs the payload.
4. The private key remains in the ceremony host's private directory.
5. Only the public directory may return to an online host.
6. Publication and service integration require separate reviewed lanes.

## Private-key boundary

The private key must never be committed, uploaded, emailed, copied into the
repository, transferred with the public output, or loaded by a running node.

## Authority boundary

V2 provides authenticity evidence only. It has no runtime, wallet, validator,
treasury, Work Credit, Buy VOID, release-promotion, or third-party shutdown
authority.
