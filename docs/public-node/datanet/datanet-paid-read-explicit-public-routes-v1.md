# VOID DataNet paid-read explicit public routes V1

Marker: `VOID_DATANET_PAID_READ_EXPLICIT_PUBLIC_ROUTES_V1`

## Purpose

Expose the sealed paid DataNet read-quote discovery documents through three
explicit, read-only node routes:

- `/public-node/datanet/index.json`
- `/public-node/datanet/paid-read-quote-v1.json`
- `/public-node/datanet/paid-read-quote-v1.schema.json`

The files are already sealed in `public/public-node/datanet/`. This change
connects those exact files to the live node HTTP surface.

## Narrow source boundary

The runtime change is contained in `src/http/datanet_routes.ts`, which is
already registered with the full Express application.

`src/index.ts` is not modified. This avoids active AI-agent and Buy VOID
integration branches that currently touch that file.

Tor tool source is not modified. The existing Tor public-node tool already
implements traversal-bounded, GET/HEAD-only serving from its worktree's
`public/` directory. Aligning that live onion worktree to the merged source is a
separate deployment operation after this source change is reviewed and merged.

## Route contract

Each route:

- is an exact absolute path;
- supports GET and HEAD;
- maps to one fixed filename;
- returns the exact sealed file bytes;
- sets JSON content type, a 60-second public cache header, content length, and
  `X-Content-Type-Options: nosniff`;
- does not accept a user-selected filesystem path;
- does not add a directory-wide static mount;
- does not add directory listing;
- does not expose arbitrary files.

POST, PUT, PATCH, and DELETE are not registered for these paths and remain
fail-closed under the existing application behavior.

## TypeScript baseline-delta policy

Current main has a pre-existing repository-wide TypeScript diagnostic baseline
in unrelated `src/index.ts` code. This change does not claim that baseline is
globally clean.

The proof archives the selected clean base commit, runs the exact repository
typecheck against that base and against the patched tree, parses every
`TS####` diagnostic, normalizes paths, and requires exact multiset equality.

The proof additionally requires zero diagnostics attributed to
`src/http/datanet_routes.ts`. A new diagnostic, removed baseline diagnostic,
changed compiler exit, or nonzero compiler failure without parseable TypeScript
diagnostics is a HOLD.

GitHub pull-request checks use the PR base SHA. Main-branch push checks use the
previous main SHA, with `HEAD^` as a guarded fallback.

## Safety boundary

This source change does not:

- fetch or mutate DataNet data;
- collect or confirm payment;
- authorize or execute paid work;
- access a wallet or signer;
- submit a transaction;
- write Work Credits;
- settle VOID;
- access treasury funds;
- move funds;
- restart or deploy a service;
- modify Tor identity or onion address.

## Verification

Run:

```bash
bash ops/mainnet0/void-datanet-paid-read-explicit-public-routes-v1-proof.sh
```

The proof performs the exact typecheck baseline-delta comparison and starts an
isolated Express server. It verifies exact GET and HEAD bytes, headers,
duplicate-registration protection, query-string stability, mutation-method
denial, and denial of arbitrary and traversal paths.
