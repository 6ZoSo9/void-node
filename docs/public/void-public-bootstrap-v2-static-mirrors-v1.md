# VOID public bootstrap v2 static mirrors v1

Marker: `VOID_PUBLIC_BOOTSTRAP_V2_STATIC_V1`

## Purpose

Publish immutable, content-addressed copies of bootstrap manifest v1 bytes through
the existing public static surfaces without creating another mutable alias or
trust authority.

The mutable production alias remains:

`public/bootstrap/v1.json`

Every stable alias value must also exist byte-for-byte at:

`public/void/bootstrap/v2/manifests/<voidpbm1_id>.json`

Renewal adds a new immutable manifest object. Existing content-addressed
manifests and records are historical evidence and must not be rewritten.

## Current production manifest

Current manifest:

`voidpbm1_2f917e0ac9490c3e0e227afb94f5bacba8f130c02c22435750f2fca6551c04b5`

Immutable path:

`/void/bootstrap/v2/manifests/voidpbm1_2f917e0ac9490c3e0e227afb94f5bacba8f130c02c22435750f2fca6551c04b5.json`

The bytes at that path are required to equal `public/bootstrap/v1.json`
exactly.

## Historical record preservation

The previously published record remains immutable:

`voidpbr2_8e1a7fb974c7d47caa94149b5926dd77486e8059cf5a956e807c323d331258fe`

It remains bound to historical manifest:

`voidpbm1_3896e80bc7520fe3fdca28a2f4a72a38014d8ba088e99d2c603407bff9b6aa93`

That record and manifest are retained as historical artifacts even after their
lifecycle expiry. Rotating a signed bootstrap-record release root is a separate
reviewed action; renewing the current HTTPS v1 alias does not rewrite an
existing record ID.

## Mirrors

The historical record declares:

- `https://seed.nullfeed.org/void/bootstrap/v2`
- `https://nullfeed.org/void/bootstrap/v2`
- `http://r4r4rkuj522ildqsn6kvd7bkuclasm2qvlsolwg7xwizmuy6qohmhxid.onion/void/bootstrap/v2`

Source labels are not proof of independent infrastructure. Independent
failure-domain acceptance remains a separate runtime requirement.

## Immutable paths

Only content-derived files are valid:

`/void/bootstrap/v2/manifests/<voidpbm1_id>.json`

`/void/bootstrap/v2/records/<voidpbr2_id>.json`

No `latest` alias exists. The HTTP helper checks the content-derived ID before
serving and sends immutable cache headers.

## Renewal rule

A stable HTTPS bootstrap renewal may:

1. replace `public/bootstrap/v1.json` with fresh qualified builder output; and
2. add the exact same bytes at the new content-addressed manifest path.

It must not overwrite or delete an existing content-addressed manifest or
record. A new v2 record is optional and belongs to the separate signed-record
release-root lane.

## Trust boundary

Static publication does not authorize wallet, signer, validator, treasury,
Work Credit, transaction, or money-movement authority. It does not create or
rotate a private key.

## Proof

`node scripts/prove_void_public_bootstrap_v2_static_publication_v1.mjs`

Expected:

`VOID_PUBLIC_BOOTSTRAP_V2_STATIC_PUBLICATION_V1_PROOF_GREEN`
