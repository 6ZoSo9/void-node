# Authenticated paid-work production activation trusted-context reference metadata v1

This lane defines and semantically proves the non-secret
`trusted_context_reference_metadata` required by the authenticated paid-work
production activation-readiness HOLD decision.

It creates one source-controlled reference record. It does not copy or read the
operator-owned trusted-context bundle, disclose its absolute path, install an
environment variable, or authorize activation.

## Exact reference

The canonical source record is:

`config/activation-candidates/authenticated-paid-work-production-activation-trusted-context-reference-metadata-v1.json`

The record binds the previously verified trusted-context bundle by SHA-256:

`6bf506fa7637fca967a21dd70ba8be7e940194397fc6bf51077309bd7f755a96`

It separately binds the SHA-256 fingerprint of the normalized absolute
operator-owned path:

`606f2f3aaec35e0534d12ff5a28ee94301b8c24f370e949ec26e75e91963456a`

The private absolute path is intentionally absent from Git. A later confirmed
activation execution must receive it through the already merged environment
contract:

`VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH`

Before any bundle use, that later lane must verify that the normalized UTF-8
path hashes to the reviewed path fingerprint and that the file bytes hash to
the reviewed bundle digest. A digest or path mismatch fails closed.

## Existing provider contract

The metadata binds these merged sources:

- `src/http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.ts`;
- `schemas/public-agent-service-acceptance-persistence-trusted-context-provider-binding-v1.schema.json`.

The provider contract requires the bundle marker
`VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_BUNDLE_V1`,
version `1`, a maximum size of 24 MiB, an absolute normalized regular-file
path, no symlink components, no group or other write permission, and ownership
by the runtime user or root.

Provider installation captures and fingerprints the path but does not read the
bundle. Bundle reading remains deferred until provider invocation, and the
process-global provider cannot replace an existing provider.

## Secret boundary

The tracked record contains only markers, source paths, public contract names,
the bundle digest, the path fingerprint, validation rules, and negative
authority flags. It contains no catalog, work order, quote, credential, token,
authorization header, private key, mnemonic, wallet, signer, or absolute private
path.

The source proof reads only tracked repository files. It does not open the
operator-owned bundle and cannot prove that the private file still exists. File
existence, permissions, path fingerprint, byte digest, and freshness must be
revalidated in a separately confirmed activation-execution lane.

## Readiness effect

The reference record closes only `trusted_context_reference_metadata`. It binds
the already merged configuration schema, configuration instance, rollback plan,
and this trusted-context reference as known satisfied source requirements.

Five known activation requirements remain:

1. credential reference metadata;
2. bounded replay snapshot;
3. service unit design;
4. activation-execution confirmation;
5. live-canary scope.

Readiness remains **HOLD**. Publication does not authorize activation.

## Proof

Run:

```bash
node --check scripts/prove_authenticated_paid_work_production_activation_trusted_context_reference_metadata_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_trusted_context_reference_metadata_v1.mjs
```

The proof validates the closed schema and exact metadata digest, verifies the
bundle and path fingerprints, semantically binds the merged provider source and
schema, rejects private-path and secret-value leakage, and proves the complete
non-activation authority boundary.

## Authority boundary

This lane does not read or copy the trusted-context bundle, read credentials or
tokens, materialize authorization, write installed configuration, create
persistence, deploy, install or restart a service, create a listener, mount the
runtime, accept a quote, authorize or execute payment, construct or broadcast a
transaction, dispatch work, issue a ticket, write Work Credits, access a wallet
or signer, sign, settle VOID, or move funds. A separate operator-confirmed
activation-execution lane remains required.
