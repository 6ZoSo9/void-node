# VOID AI Agent First Contact Runtime V1

Marker: `VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1`

## Purpose

Expose the already-merged First Contact JSON contract and human-readable join
page through the live VOID public-node runtime.

The source assets are:

- `public/public-node/agents/first-contact-v1.json`
- `public/public-node/agents/join-v1.html`

The runtime routes are:

- `GET|HEAD /public-node/agents/first-contact-v1.json`
- `GET|HEAD /public-node/agents/join-v1.html`

## Runtime behavior

The routes serve the exact repository assets from the node working directory.
They are read-only and do not accept request bodies, credentials, wallets,
transactions, paid work, Work Credit awards, or mutation authority.

The JSON and HTML content types are inferred from their file extensions by the
existing Express response implementation. The routes use a short public cache
header while preserving the exact committed file bodies.

## Honesty boundary

The First Contact manifest identifies VOID Mainnet-0 and chain ID 2050. It does
not promise paid work or Work Credit earning and grants no mutation authority.

The client remains a GET-only compatibility and discovery tool. Runtime
integration does not activate payments, Work Credit mutation, validator
mutation, wallets, signers, transactions, or autonomous economic execution.

## Verification

```bash
node scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs
npm run build
git diff --check
```

Live deployment is a separate step after merge. This source lane does not
restart Precision, Nimo, or Alienware.

## Index-size baseline fixture

This runtime integration increases `src/index.ts` from `3835145` to
`3848158` bytes, an intentional increase of `13013` bytes.

The shared guard reads the integer field `baseline_bytes` from:

`fixtures/ops/guard-baselines/index-ts-size-v1.json`

The field is advanced to the exact reviewed size. The repaired source lane
therefore changes exactly five files: the runtime workflow, this document, the
runtime proof, `src/index.ts`, and the baseline fixture.

The shared guard implementation remains unchanged. The fixture update records
the reviewed size of the already-proven GET/HEAD route integration and grants
no additional runtime authority.
