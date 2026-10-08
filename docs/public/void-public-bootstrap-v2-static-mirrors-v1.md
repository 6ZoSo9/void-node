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

## Checked-in bootstrap manifest — October 8, 2026 source checkpoint

At reviewed GitHub commit `f7c894eb2ff8f378b2f0a906192cc1a0602e1d24`,
the merged [seed renewal #2623](https://github.com/6ZoSo9/void-node/pull/2623)
updated the **repository alias** `public/bootstrap/v1.json` to:

`voidpbm1_99ea562ea42bd3e833df7996066fffbd4e061ad7916a7d8f86431df11891e5f8`

Its corresponding immutable repository path is:

`/void/bootstrap/v2/manifests/voidpbm1_99ea562ea42bd3e833df7996066fffbd4e061ad7916a7d8f86431df11891e5f8.json`

Both files have exact Git blob
`55630ca2dfecff50b1ec026b294395472be0fd38`, are 1,166 bytes,
and were independently verified byte-for-byte equal to the freshly qualified
candidate (SHA-256
`b72071b42e0fbce7fa4079ce8000b6521377e4e55cdfba05ca610015c9e3ddd4`).
The manifest's declared expiry is `2026-10-11T16:57:07.610Z`.
The prior `voidpbm1_2f917e0ac9490c3e0e227afb94f5bacba8f130c02c22435750f2fca6551c04b5`
is **historical immutable evidence**, not the alias at this source checkpoint.

**Source merged is not externally served.** This dated checkpoint does not
establish that a public host currently serves either path, that its TLS/ingress
route is correct, or that the public node has advanced. Independently retrieve
the *served* v1 alias and v2 immutable object from the intended public origin,
verify their exact SHA-256 against the reviewed candidate, and check readiness
before asserting public bootstrap availability. A failed local DNS/HTTP probe
is inconclusive about remote availability unless its failure is classified.

On every later renewal, derive the current manifest ID and mirror path from
the **then-current tracked alias**; do not treat this historical prose as a
live freshness or publication oracle. The dynamic source invariant is checked
by `node scripts/prove_void_public_bootstrap_v2_static_publication_v1.mjs`.
Immutable v2 objects and signed historical records must never be overwritten
to make a stale checkpoint appear current.

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
