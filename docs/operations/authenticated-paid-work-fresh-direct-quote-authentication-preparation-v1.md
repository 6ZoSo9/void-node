# Authenticated paid-work fresh direct quote authentication preparation v1

## Purpose

This source-only contract prepares a new paid-work quote and direct provider/requester authentication lineage after the direct activation-persistence integration merged in PR #944.

It does not activate a quote. It does not persist acceptance or payment authority. It does not accept private keys or perform production signing.

The contract is intentionally split into three stages so that each signing key remains external:

1. materialize the fresh work order, quote, acceptance candidate, payment-intent candidate, key bindings, and provider signing request;
2. verify an externally supplied provider signature and produce the requester signing request bound to the provider authentication ID;
3. verify an externally supplied requester signature and materialize the direct authentication packet.

The final packet remains a preparation artifact. Atomic persistence still requires a separate reviewed plan and a fresh operation-bound authorization.

## Source inputs

The preparation input contains:

- a paid-work order draft;
- a quote plan without a precomputed `work_order_id` or `quote_id`;
- acceptance and payment-intent preparation windows;
- provider and requester **public** key-binding plans;
- provider and requester authentication windows and nonces;
- a lineage guard containing the terminally retired quote ID and protected first-live identifiers;
- exact prepare-only controls.

The source materializes the work-order and quote IDs through the canonical existing materializers. A caller cannot inject those IDs.

## Three-stage API

### Provider request

`prepareAuthenticatedPaidWorkFreshDirectProviderSigningRequestV1(...)`

This stage:

- materializes a fresh work-order envelope;
- materializes a fresh quote envelope;
- materializes and verifies the prepared acceptance/payment-intent packet;
- derives public-key binding IDs;
- builds the direct provider authentication body;
- returns canonical provider signing bytes and their SHA-256 digest.

Status:

```text
fresh_quote_prepared_provider_signature_required
```

No signature is created.

### Requester request

`prepareAuthenticatedPaidWorkFreshDirectRequesterSigningRequestV1(...)`

This stage:

- recomputes the provider request from the original preparation input;
- rejects any altered provider request packet;
- verifies the externally supplied Ed25519 provider signature;
- derives the provider authentication ID;
- creates the requester authentication body bound to that provider authentication ID;
- returns canonical requester signing bytes and their SHA-256 digest.

Status:

```text
provider_authenticated_requester_signature_required
```

No requester signature is created.

### Final preparation

`finalizeAuthenticatedPaidWorkFreshDirectAuthenticationPreparationV1(...)`

This stage:

- recomputes both prior request packets;
- verifies the externally supplied requester signature;
- materializes and verifies the canonical direct authentication packet;
- confirms that no `voidawsr1_...` public-service submission ID was created;
- confirms that effective quote acceptance and payment authorization remain false;
- returns a fresh direct authentication preparation packet.

Operator-snapshot status:

```text
direct_authentication_prepared_requires_separate_atomic_persistence_authorization
```

Example-fixture status:

```text
example_only
```

## Freshness and lineage rules

Creation times must be ordered as follows:

```text
work order
quote
acceptance plan
payment-intent plan
provider authentication
requester authentication
preparation recorded time
```

Every artifact must still be unexpired at `preparation_recorded_at_utc`.

Expiry windows must be nested so that authentication evidence cannot outlive the quote, acceptance candidate, or payment-intent candidate.

The preparation input must include the terminally retired quote:

```text
voidawq1_c262368c3c51819ff7b8b831d9ec0cfddbf4ccadfba9cdaffbcd16cf361ce86a
```

The generated fresh quote ID must differ from every retired quote ID.

The expired quote remains permanently retired.

The lineage guard must also include the protected first-live canary and submission identifiers. Generated artifacts are rejected if they contain those identifiers.

The direct lineage never creates or substitutes a `voidawsr1_...` public-service submission ID.

## Key boundary

The production source accepts only canonical Ed25519 SPKI public keys.

The source:

- contains no private-key field;
- rejects extra key-binding fields;
- never calls `crypto.sign`;
- never generates a key pair;
- never reads a private key;
- never accesses a wallet or signer.

The proof uses temporary in-memory Ed25519 key pairs only.

## Authority boundary

All returned packets report false for:

- live quote publication;
- effective quote acceptance;
- acceptance persistence;
- replay-state writes;
- payment authorization;
- payment execution;
- destination resolution;
- transaction construction or broadcast;
- work authorization or dispatch;
- private-key access;
- production signing;
- wallet access;
- Work Credit writes;
- settlement;
- HTTP submission;
- runtime mutation;
- service restart;
- deployment;
- money movement.

This source does not import or invoke:

```text
executeAuthenticatedPaidWorkActivationPersistenceV1
```

## What this lane does not do

This lane does not:

- publish a live quote;
- reuse the expired quote;
- reuse the protected live submission credential or canary;
- invoke production keys;
- create production signatures;
- consume replay IDs;
- write a persistence generation;
- activate acceptance;
- grant payment authority;
- authorize or execute payment;
- authorize or dispatch work;
- write Work Credits;
- access a wallet;
- restart a service;
- deploy code;
- move money.

## Next gate

After this source contract is merged, a separately authorized operator run may supply:

1. a real fresh work-order and quote plan;
2. reviewed provider and requester public-key snapshots;
3. external provider and requester signatures.

That run may produce a fresh direct authentication packet, but it still must not persist or activate it.

A later gate must review the exact packet, current replay state, current `main`, live-canary scope, execution plan, and a fresh operation-bound confirmation before atomic persistence can be considered.
