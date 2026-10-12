# Authenticated paid-work runtime revalidation trusted-context binding v1

Marker:
`VOID_AUTHENTICATED_PAID_WORK_RUNTIME_REVALIDATION_TRUSTED_CONTEXT_BINDING_V1`

## Purpose

The base runtime-revalidation receipt records that the trusted-context reference
was verified, but a boolean alone does not prove which trusted-context metadata,
bundle identity, digest, or private path fingerprint was checked.

This companion guard closes that ambiguity. Registry-facing review must verify
the base receipt together with this content-addressed binding before treating
the trusted-context portion of runtime revalidation as satisfied.

## Exact trusted-context source binding

The binding is closed to merged source commit
`ac074d53ab937d302c69b6bff54f02d064e37d57` and requires:

- metadata marker
  `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_TRUSTED_CONTEXT_REFERENCE_METADATA_V1`;
- metadata status `source_reference_only_activation_forbidden`;
- reference ID
  `void-authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1`;
- bundle marker
  `VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_V1`;
- bundle contract version `1`;
- bundle SHA-256
  `6bf506fa7637fca967a21dd70ba8be7e940194397fc6bf51077309bd7f755a96`;
- private path fingerprint SHA-256
  `606f2f3aaec35e0534d12ff5a28ee94301b8c24f370e949ec26e75e91963456a`;
- maximum bundle size `25165824` bytes.

A later metadata, bundle, path-fingerprint, or contract change requires a
separately reviewed source update.

## Receipt linkage

The binding contains:

- the exact `voidapwrr1_` runtime-revalidation receipt ID; and
- the same evaluated observation timestamp.

`verifyAuthenticatedPaidWorkRuntimeRevalidationWithTrustedContextV1(...)`
first validates the complete base receipt, then validates this binding, and
finally requires both links to match exactly.

The lower-level base receipt validator remains useful as a receipt-shape and
runtime-state primitive. It is not, by itself, proof of the exact
trusted-context identity.

## Private evidence boundary

A valid binding records that a separately authorized private survey:

- verified the source metadata and provider-binding contract;
- read the private bundle to verify its exact SHA-256;
- verified the private path fingerprint without publishing the path; and
- disclosed neither the path, bundle contents, nor secret material.

The checked-in fixture is synthetic. It does not read a host, private path, or
bundle and does not establish current runtime state.

## Authority boundary

Every authority field remains false. This guard does not authorize activation,
deployment, restart, authentication, signing, payment, work dispatch, Work
Credit writes, wallet or signer access, transaction construction or broadcast,
or fund movement.

The binding ID is an unkeyed content address. It proves exact record bytes, not
the producer's identity or truthfulness. A separately reviewed operator
signature or attestation may be added later without weakening this contract.
