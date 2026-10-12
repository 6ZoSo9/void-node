# Authenticated paid-work quote acceptance and payment-authority activation persistence V1

Marker: `VOID_AUTHENTICATED_PAID_WORK_QUOTE_ACCEPTANCE_PAYMENT_AUTHORITY_ACTIVATION_PERSISTENCE_V1`.

This contract closes the prepare-only gate introduced by the canonical quote-acceptance/payment-authority packet. It verifies the content-addressed prepared packet, requires external requester evidence backed by the existing provider-authenticated handoff, plans the canonical acceptance replay transition, adds payment-intent replay state, and publishes both transitions as one immutable generation.

## Atomic activation

A successful apply consumes exactly five identities in one transaction:

1. requester authentication ID;
2. provider authentication ID;
3. acceptance ID;
4. prepared packet ID;
5. payment-intent ID.

The same generation also enforces one active acceptance per quote and one active payment intent per acceptance. The store uses compare-and-swap state revisions, a private lock, private staging and generation directories, immutable generation files, fsync boundaries, and an atomic current-pointer publication. An exact repeated transaction returns `duplicate`; an exact orphaned generation may return `recovered`; stale or conflicting state is rejected.

After the immutable generation and pointer are verified, `quote_acceptance=true`, `acceptance_persistence=true`, and `payment_authorization=true`. This payment authority is bounded to the exact work order, quote, acceptance, payment intent, amount, asset, fee ceiling, rail, requester, provider, and expiry already committed by the prepared packet.

## Authority boundary

Activation does **not** grant or perform payment execution. It does not resolve a payment destination, construct or sign a transaction, broadcast a transaction, create a payment receipt, authorize work execution, dispatch work, access a wallet or signer, write Work Credits, settle VOID, submit HTTP, restart a service, deploy code, or move money.

A later payment-execution lane must separately verify an allowlisted destination and rail, construct a bounded execution authorization, execute payment, and persist independent confirmation before work execution can be authorized.

## Modes

`example_fixture` verifies only the prepared packet and returns `example_only`; requester evidence must be `null`, no store is opened, and all authority remains false.

`external_requester_evidence` invokes the canonical requester-authentication and acceptance replay-planning dependencies. With `enabled=false` it returns `disabled`; with `apply=false` it returns `planned`; with `apply=true` it requires the exact confirmation `activateAndPersistAuthenticatedPaidWorkQuoteAcceptancePaymentAuthorityV1`.

The caller creates the allowed root in advance as a canonical non-symlink directory with mode `0700`. Generation files and the current pointer use `0600`; generated directories use `0700`.

## Files

- adapter: `scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts`
- proof: `scripts/prove_authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts`
- schema: `schemas/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.schema.json`
- example: `examples/authenticated-paid-work-quote-acceptance-payment-authority-activation-persistence-v1.example.json`

The checked-in example is deliberately prepare-only and cannot activate authority. The proof constructs isolated external-mode dependency evidence and a private temporary store; it never touches production state.

## Direct authentication packet mode

`direct_authentication_packet` consumes the source-only direct authentication
packet produced by
`authenticated_paid_work_direct_quote_activation_authentication_v1.ts`.

This mode never creates or substitutes a `voidawsr1_...` public-service
submission ID. It verifies the exact prepared-packet SHA-256 binding, requires
the direct packet to remain authority-free before persistence, checks the
provider and requester authentication windows and key-binding revocation state
at the activation command timestamp, and consumes these namespaces atomically:

- direct requester authentication: `voidadra1_...`;
- direct provider authentication: `voidadpa1_...`;
- acceptance: `voidawa1_...`;
- prepared packet: `voidawqapa1_...`;
- payment intent: `voidawpi1_...`.

The existing `external_requester_evidence` public-service mode remains
supported. Both modes use the same five-identity atomic transaction, replay
state, immutable generation, compare-and-swap revisions, and exact
confirmation. Direct mode does not broaden payment execution, work dispatch,
wallet, signing, Work Credit, deployment, or money-movement authority.

The direct integration proof uses ephemeral in-memory Ed25519 keys and private
temporary directories only. It does not authenticate or activate the expired
first-live quote. A fresh quote and separately approved production evidence are
still required for any future live activation.
