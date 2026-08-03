# Authenticated paid-work production activation execution packet v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1`

## Purpose

This is the canonical non-secret handoff from completed source readiness into a
later, separately authorized operator execution lane.

The predecessor draft PR #947 remains preserved at
`031279b4bbb73cde6c5ee39c2ca31aca1a41c629`. This successor is recomposed on current `main`
`32cd4883b95354ab979d12640ffd2e2ac1279e57`.

## Current decision

`SOURCE_READY_EXECUTION_NOT_AUTHORIZED`

Source readiness is complete. Runtime state, fresh private references, external
signatures, the execution-plan digest, ZoSo confirmation, and execution
authority remain deliberately absent.

## Fresh direct-authentication preparation

The execution packet now requires the merged canonical preparation contract:

- commit: `a371372213782e8b55d678d28dc5291559ad02ee`
- source:
  `scripts/authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.ts`

That contract materializes a fresh work order, fresh quote, prepared
acceptance/payment-intent candidates, provider signing request, requester
signing request, and a verified direct-authentication preparation packet while
keeping private keys and production signatures external.

The packet does not require the stale draft signing-handoff PR. The merged
preparation contract is the canonical source dependency.

## Required execution sequence

A later operator lane must perform all fifteen gates in order. Before the
execution-plan digest and ZoSo confirmation, it must materialize and verify a
fresh direct-authentication preparation packet using externally supplied,
verified provider and requester signatures.

The packet itself contains no quote, signature, credential, token, private
reference, execution-plan digest, confirmation, or host-mutation authority.

## Separation of authority

This source does not authorize execution, deployment, service start, credential
access, quote acceptance, payment authority, payment execution, work dispatch,
Work Credit writes, wallet or signer access, transaction broadcast, or fund
movement.

A future execution remains one-shot, fail-closed, evidence-producing, and
subject to a separate post-execution readiness decision.

## Files

- packet: `config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json`
- proof: `scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs`
- workflow: `.github/workflows/authenticated-paid-work-production-activation-execution-packet-v1.yml`

## Verification

```bash
python3 -m json.tool config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json
npx tsx scripts/prove_authenticated_paid_work_fresh_direct_quote_authentication_preparation_v1.ts
node --check scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true
```
