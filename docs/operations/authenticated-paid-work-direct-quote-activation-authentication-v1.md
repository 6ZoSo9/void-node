# Authenticated paid-work direct quote activation authentication v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_V1`

Output marker:
`VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_PACKET_V1`

## Purpose

This source-only contract authenticates the canonical prepare-only packet created
by `authenticated_paid_work_quote_acceptance_payment_authority_v1.ts` without
substituting that direct accepted-submission lineage into the public-agent
service submission namespace.

The direct packet binds:

- prepared packet ID and canonical SHA-256 fingerprint;
- work-order ID;
- quote ID;
- acceptance ID;
- payment-intent ID;
- exact requester agent ID;
- exact provider ID;
- requester and provider Ed25519 SPKI key bindings;
- requester signature over the exact provider-authentication ID.

The contract emits direct authentication IDs with new namespaces:

- provider key binding: `voidadpkb1_...`;
- requester key binding: `voidadrkb1_...`;
- provider authentication: `voidadpa1_...`;
- requester authentication: `voidadra1_...`;
- direct authentication packet: `voidadauth1_...`.

It does not create or synthesize a `voidawsr1_...` public-agent-service
submission ID.

## Evidence modes

### `example_fixture`

The checked-in example uses public test evidence and returns `example_only`.
It is never eligible for atomic persistence.

### `operator_signed_direct_lineage`

This mode requires:

- a provider binding with status `operator_approved_snapshot` and scope
  `authenticated_paid_work_direct_quote_activate`;
- a requester binding with status `operator_approved_snapshot` and scope
  `agent_paid_work_accept`;
- canonical Ed25519 SPKI public keys and content-addressed binding IDs;
- provider and requester signatures over the exact prepared lineage;
- requester authentication that binds the exact provider-authentication ID;
- authentication windows contained within the prepared acceptance and payment
  intent expiry.

A valid external packet becomes
`direct_lineage_authenticated_for_atomic_activation`, but remains only an input
to a later persistence adapter.

## Activation boundary

This contract does not modify
`authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_v1.ts`.
A separate integration lane must teach the persistence layer to consume the new
direct requester/provider authentication IDs while preserving the existing
five-identity atomic transaction:

1. requester authentication ID;
2. provider authentication ID;
3. acceptance ID;
4. prepared packet ID;
5. payment-intent ID.

The direct authentication packet records all consumption requirements as true
and all consumption state as false.

## Authority boundary

Both example and operator-signed modes leave all effective authority false:

- quote acceptance;
- acceptance persistence;
- requester/provider replay writes;
- acceptance, prepared-packet, and payment-intent replay writes;
- payment authorization or execution;
- payment destination resolution;
- transaction construction, signing, or broadcast;
- payment receipt creation;
- work execution or dispatch;
- wallet or signer access;
- Work Credit writes;
- VOID settlement;
- HTTP submission;
- runtime mutation, restart, or deployment;
- money movement.

The source and proof generate no production key and perform no production
signing. The proof uses temporary in-memory Ed25519 keys only.

## Files

- adapter:
  `scripts/authenticated_paid_work_direct_quote_activation_authentication_v1.ts`
- proof:
  `scripts/prove_authenticated_paid_work_direct_quote_activation_authentication_v1.ts`
- schema:
  `schemas/authenticated-paid-work-direct-quote-activation-authentication-v1.schema.json`
- example:
  `examples/authenticated-paid-work-direct-quote-activation-authentication-v1.example.json`
- workflow:
  `.github/workflows/authenticated-paid-work-direct-quote-activation-authentication-v1.yml`

## CLI

Materialize:

```bash
./node_modules/.bin/tsx \
  scripts/authenticated_paid_work_direct_quote_activation_authentication_v1.ts \
  materialize \
  examples/authenticated-paid-work-direct-quote-activation-authentication-v1.example.json \
  /tmp/direct-authentication-packet.json
```

Verify:

```bash
./node_modules/.bin/tsx \
  scripts/authenticated_paid_work_direct_quote_activation_authentication_v1.ts \
  verify \
  examples/authenticated-paid-work-direct-quote-activation-authentication-v1.example.json \
  /tmp/direct-authentication-packet.json
```

Focused proof:

```bash
./node_modules/.bin/tsx \
  scripts/prove_authenticated_paid_work_direct_quote_activation_authentication_v1.ts
```

Expected terminal marker:

```text
VOID_AUTHENTICATED_PAID_WORK_DIRECT_QUOTE_ACTIVATION_AUTHENTICATION_V1_PROOF_GREEN=true
```
