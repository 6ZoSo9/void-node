# Public agent service acceptance-persistence trusted-context bundle builder V1

## Purpose

This source-only operator CLI turns one validated public-agent service catalog, one canonical paid-work order, and its bound canonical quote into the exact trusted-context JSON bundle consumed by the merged acceptance-persistence provider binding.

The lane does not create a production bundle, configure the provider, activate the HTTP route, persist an acceptance, write replay state, authorize or execute payment, dispatch work, restart a service, or deploy anything.

## Modes

All paths must be absolute and normalized.

Plan validates the three inputs and output parent, computes the exact bundle bytes and receipt, and does not write:

```sh
node_modules/.bin/tsx \
  scripts/public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts \
  plan \
  --catalog /operator/private/catalog.json \
  --work-order /operator/private/work-order.json \
  --quote /operator/private/quote.json \
  --output /operator/private/trusted-context-bundle.json
```

Build performs the same plan and requires the exact confirmation:

```text
buildAcceptancePersistenceTrustedContextBundleV1
```

```sh
node_modules/.bin/tsx \
  scripts/public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts \
  build \
  --catalog /operator/private/catalog.json \
  --work-order /operator/private/work-order.json \
  --quote /operator/private/quote.json \
  --output /operator/private/trusted-context-bundle.json \
  --confirmation buildAcceptancePersistenceTrustedContextBundleV1
```

Verify independently revalidates a built bundle, its exact canonical encoding, its `0600` mode, and compatibility with the merged provider reader:

```sh
node_modules/.bin/tsx \
  scripts/public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts \
  verify \
  --bundle /operator/private/trusted-context-bundle.json
```

Receipts report only the SHA-256 fingerprint of the bundle path. They do not disclose the operator path.

## Input contract

The builder refuses an input unless all of these remain true:

- the path is absolute, normalized, and resolves to itself without a symlink;
- the opened object is a regular file owned by the current user or root;
- the file is not group- or other-writable;
- its identity, size, modification time, and change time stay stable during the read;
- its JSON is at most 24 MiB and satisfies the merged envelope validators;
- the catalog fingerprint is reproducible after removing only `catalog_fingerprint_sha256`;
- exactly one contract-only `verifiable_work` catalog service matches the work-order capability;
- the quote is bound to the work order, stays within its budget and execution limits, requires separate acceptance and prepayment, and grants no execution authority.

## Output contract

The output path must be a new absolute normalized `.json` path, distinct from every input. Its real parent must be an existing trusted directory that is neither group- nor other-writable.

The document contains exactly:

1. `marker`
2. `version`
3. `catalog`
4. `work_order`
5. `quote`

Objects are recursively key-sorted, encoded as two-space pretty JSON, and terminated by one newline. Build creates a same-directory `0600` temporary file, flushes it, hard-links it to the final path without replacement, removes the temporary name, flushes the parent directory, then revalidates the output with the merged provider reader. Existing outputs are always refused.

This is local artifact-construction authority only. The builder does not accept a runtime configuration path, provider enablement flag, network target, payment credential, wallet, signing key, dispatcher, or deployment target.

## Source-only posture

The committed example is marked `source_only_no_bundle_created`. CI exercises build and verify only inside a private temporary directory and deletes it. Nothing in this lane changes `src/index.ts`, installs provider environment variables, opens a listener, or creates a durable runtime artifact.

The source base for this contract is `b119357c60f15a4c0150d99c5081f1e84b1ee39e`.

## Proof

Run:

```sh
node_modules/.bin/tsc --noEmit \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --strict \
  --esModuleInterop \
  --skipLibCheck \
  --types node \
  scripts/public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts \
  scripts/prove_public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts

node_modules/.bin/tsx \
  scripts/prove_public_agent_service_acceptance_persistence_trusted_context_bundle_builder_v1.ts
```

The proof covers plan-without-write, exact confirmation, deterministic bytes, atomic no-overwrite creation, `0600` mode, provider-reader compatibility, independent verification, catalog and envelope tampering, symlink and unsafe-permission rejection, unsafe output-parent rejection, CLI behavior, contract assets, and deletion of every temporary proof artifact.
