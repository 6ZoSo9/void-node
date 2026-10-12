# Public Agent Service Trusted Requester Acceptance Verification V1

## Purpose

This contract composes a requester-signed acceptance intent with the exact
trusted provider chain established by the provider trust-registry snapshot and
provider quote-response authentication contracts.

It proves that the requester authentication references the same provider
authentication ID, provider binding, provider key, response, quote, quote
handoff, work order, provider, and catalog fingerprint as the exact trusted
provider chain.

## Critical trust boundary

The existing requester authentication contract verifies a requester signature
against a supplied requester key binding. It does not prove where that requester
binding came from.

This composition therefore reports:

- `requester_binding_provenance_verified=false`; and
- `eligible_for_acceptance_materialization=false`.

A live packet means the requester intent is cryptographically bound to the
exact trusted provider chain. It does not mean the requester key binding has
been independently authorized by a signed requester registry.

## Inputs

The input contains:

- one trusted provider quote-response verification input; and
- one requester acceptance-authentication input.

The requester handoff's nested provider authentication input must be
canonically identical to the provider authentication input inside the trusted
provider verification.

## Result

An external composition may produce:

```text
trusted_provider_requester_acceptance_intent_verified
```

That status verifies the composed evidence chain but remains blocked from
acceptance materialization until requester binding provenance and replay
consumers are separately verified.

## Downstream requirements

A later lane must provide:

- requester binding provenance;
- requester authentication replay protection;
- requester authentication ID consumption;
- provider authentication ID consumption;
- acceptance replay protection;
- acceptance ID consumption; and
- single-active-acceptance enforcement per quote.

This contract does not accept a quote; authentication IDs are not consumed.

## Authority boundary

This adapter has no payment authority, no work dispatch authority, and no Work
Credit authority.

It also grants no authority for requester registry reads or writes, requester
approval, requester key creation, rotation, or revocation, replay writes,
authentication ID consumption, acceptance ID consumption, acceptance creation,
quote acceptance, provider selection, quote publication, payment-rail
resolution, payment-destination resolution, payment authorization, payment
execution, work execution authorization, WC settlement, wallet or signer
access, transaction broadcast, HTTP submission, credential changes,
deployment, service restart, runtime mutation, or money movement.

## Verification

Run:

```bash
npx tsx scripts/prove_public_agent_service_trusted_requester_acceptance_verification_v1.ts
```

Expected terminal marker:

```text
VOID_PUBLIC_AGENT_SERVICE_TRUSTED_REQUESTER_ACCEPTANCE_VERIFICATION_V1_EXACT_GREEN
```
