# VOID Official Network Authenticity Wall V1

`VOID_OFFICIAL_NETWORK_AUTHENTICITY_WALL_V1`

SPDX-License-Identifier: VCL-1.0

## Purpose

This wall makes the official VOID Network cryptographically distinguishable from
copied, renamed, modified, or independently operated networks.

It does not claim or create authority over computers, nodes, wallets, networks,
or infrastructure that VOID does not own or operate.

## V1 boundary

V1 is a static, fail-closed foundation. It adds:

- a canonical identity manifest bound to chain ID `2050`;
- a SHA-256 binding to the repository's exact `genesis.json`;
- a non-secret forensic fingerprint registry;
- a pure local identity verifier;
- an infringement-evidence format;
- a CI proof that rejects identity drift and prohibited control behavior.

V1 does not:

- sign or publish an official identity;
- edit `src/index.ts`;
- start, stop, restart, disable, or mutate any node;
- touch wallets, private keys, validators, Work Credits, Buy VOID, or treasury state;
- contact external services;
- submit legal or platform complaints;
- install a hidden command path, remote shutdown, self-destruct path, or backdoor.

## Status model

- `draft_unsealed`: identity content exists but has no trusted offline signature.
- `official`: local canonical facts match and a pinned trusted key verifies the signature.
- `unverified`: canonical facts match, but a trusted signature is absent or unavailable.
- `conflicting`: chain, genesis, fingerprint registry, key, or signature conflicts.
- `revoked`: the official authority has explicitly revoked this identity.

Only `official` may satisfy future official-service enablement gates.

## Official service boundary

Future integrations should require `official` before enabling VOID-controlled:

- Buy VOID fulfillment;
- Work Credit issuance or settlement;
- official agent credentials;
- official DataNet reputation;
- official release-channel promotion.

This protects official services and reputation. It does not damage or control a
third-party network.

## Next authorized phase

V2 should create an offline Ed25519 root-key ceremony, pin the public key in
independently distributed official clients, sign the canonical identity payload,
and add read-only verification surfaces. V2 must remain separate from runtime
enablement and economic mutation.
