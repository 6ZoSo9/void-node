# VOID public bootstrap v2 static mirrors v1

Marker: `VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1`

## Purpose

Publish one exact content-addressed bootstrap-record v2 candidate and its exact
v1 manifest bytes through the existing public surfaces without creating another
key, mutable alias, or trust authority.

The candidate record is:

`voidpbr2_8e1a7fb974c7d47caa94149b5926dd77486e8059cf5a956e807c323d331258fe`

It binds manifest:

`voidpbm1_3896e80bc7520fe3fdca28a2f4a72a38014d8ba088e99d2c603407bff9b6aa93`

with SHA-256
`a5e59908768dbd2b462958526a24479b08197c148d3d8235661543b539762bc6`
and exact byte length `1166`.

## Mirrors

The record declares:

- `https://seed.nullfeed.org/void/bootstrap/v2`
- `https://nullfeed.org/void/bootstrap/v2`
- `http://r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion/void/bootstrap/v2`

The two HTTPS routes are wired through existing public HTTP components. The Tor
public-node server already serves the repository `public/` tree with bounded
path resolution, so no new Tor identity or private key is introduced.

These are real publication surfaces, but source labels are not proof of
independent infrastructure. Issue #1005 still requires live N-1 acceptance
across independent failure domains.

## Immutable paths

Only content-derived files are valid:

`/void/bootstrap/v2/manifests/<voidpbm1_id>.json`

`/void/bootstrap/v2/records/<voidpbr2_id>.json`

No `latest` alias exists. The HTTP helper checks the content-derived ID before
serving and sends immutable cache headers.

The v2 record expires exactly when the bound v1 manifest expires:
`2026-09-27T14:54:27.157Z`.

## Trust boundary

This publication does not authorize the record. The active Nimo release root
still requires an offline threshold-valid signature over this exact record ID.

This lane does not access the Nimo private key, generate a signature, publish a
signed-ID envelope, activate the UDP swarm, restart/deploy a service, access a
wallet or validator key, submit a transaction, or move funds.

## Proof

`node scripts/prove_void_public_bootstrap_v2_static_publication_v1.mjs`

Expected:

`VOID_PUBLIC_BOOTSTRAP_V2_STATIC_PUBLICATION_V1_PROOF_GREEN`
