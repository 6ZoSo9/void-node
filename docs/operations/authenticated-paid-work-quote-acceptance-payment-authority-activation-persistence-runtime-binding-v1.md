# Authenticated paid-work activation/persistence runtime binding v1

## Purpose

This contract binds the merged authenticated paid-work quote-acceptance and
bounded payment-authority activation/persistence adapter to a server-side
runtime surface. The runtime is **disabled by default**. It does not install an
HTTP route, listener, wallet, signer, payment rail, executor, or dispatcher.

The binding accepts only three requester-controlled evidence values:

1. the exact preparation input used to create the prepared packet;
2. the exact prepared quote-acceptance/payment-authority packet; and
3. requester-authentication evidence.

The requester command cannot contain a persistence root, replay snapshot,
expected revision, or underlying activation confirmation. In other words,
**requesters cannot supply a persistence root, replay state, or expected
revision**.

## Trusted server-side inputs

When enabled, a trusted-context provider is invoked exactly once and must
return the canonical provider catalog, work order, and quote. The preparation
input is canonically compared with the trusted work order and quote before the
store is inspected. The provider catalog is then passed to the merged
requester-authentication and acceptance-materialization chain.

The binding **loads both replay snapshots from the private server-side store**.
It reads the current immutable activation generation, verifies file and
directory permissions, validates both replay-state identifiers, and injects the
current revisions into the merged activation/persistence adapter. Client-side
state substitution and stale revision selection are therefore excluded from
the command surface.

## Confirmation and dry run

The binding validates the command shape and exact runtime confirmation before
calling the trusted-context provider or reading the store. Specifically,
**confirmation is validated before the trusted-context provider or store is
read**.

A dry run uses `apply=false` with an empty confirmation. It loads trusted
context and current server-side replay state, constructs and verifies the full
atomic transition, and returns `planned` without writing `current.json`, a
replay identifier, or an immutable generation.

An apply requires this exact runtime confirmation:

`activateAndPersistAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityRuntimeV1`

After that check succeeds, the runtime injects the separate underlying adapter
confirmation server-side. A successful apply may return `committed`,
`duplicate`, or `recovered`.

## Authority after persistence

A successful temporary or future production apply can make quote acceptance
and the bounded payment intent effective. It atomically persists consumption
of requester authentication, provider authentication, acceptance, prepared
packet, and payment-intent identities. It enforces one active acceptance per
quote and one active payment intent per acceptance.

This contract **does not authorize or execute payment**. It does not resolve a
payment destination, construct or broadcast a transaction, create a payment
receipt, authorize work execution, dispatch work, access a wallet or signer,
write Work Credits, settle VOID, restart a service, deploy code, or move money.
Payment execution remains a separate future authority gate.

## Environment configuration

The runtime is enabled only when
`VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ENABLED=1`.
When disabled, no root is required and the trusted provider and store are not
accessed. The CLI reads configuration first and returns the disabled result
without opening the command or trusted-context file paths. When enabled, the
CLI reads the command before constructing a lazy trusted-context provider, so
an invalid confirmation is rejected before the trusted-context file is opened.

When enabled, the absolute canonical private root is supplied through
`VOID_AUTHENTICATED_PAID_WORK_ACTIVATION_PERSISTENCE_RUNTIME_ROOT`.

Optional bounded settings control pointer bytes, generation-file bytes,
generation count, and exact orphan recovery. The configured root and all store
directories must be mode `0700`; pointer and generation files must be mode
`0600`.

## Proof boundary

The focused proof uses temporary private directories only. It executes the
real CLI with deliberately missing command and trusted-context paths to prove
disabled no-read behavior. It also runs an enabled command with an invalid
confirmation and a missing trusted-context path to prove confirmation-before-
trusted-context-file access. It further proves trusted context binding, dry-run
no-write behavior, server-side replay loading, first commit, deterministic
duplicate reuse, stale conflicting transition rejection, and exact orphan
recovery. No production activation or payment state is written by the proof or
by adding this source contract.
