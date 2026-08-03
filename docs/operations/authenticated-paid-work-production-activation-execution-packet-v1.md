# Authenticated paid-work production activation execution packet v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1`

## Purpose

This packet converts the completed source-readiness chain into one canonical,
non-secret handoff for a later operator execution lane. It removes ambiguity
about ordering and required evidence without authorizing activation.

The packet binds the reviewed activation configuration, rollback plan, service
unit design, credential reference metadata, bounded replay snapshot, dynamic-main
confirmation protocol, live canary scope, direct quote authentication, and atomic
activation-persistence integration.

## Current decision

`SOURCE_READY_EXECUTION_NOT_AUTHORIZED`

The source prerequisites are present. Runtime state is deliberately unresolved.
The packet contains no credential, token, trusted-context path, confirmation,
execution-plan digest, fresh quote, or permission to mutate a host.

## Required execution sequence

A later operator lane must perform the packet's fourteen gates in order. It must
capture current `origin/main`, privately revalidate trusted-context and credential
references, require a fresh quote, build a canonical execution-plan digest, and
obtain a fresh operation-bound confirmation from ZoSo only after all preflight
gates pass.

Any drift after the plan digest invalidates confirmation and stops before the
first mutation. The expired first-live quote must never be reused.

## Separation of authority

This source artifact does not authorize deployment, service start, credential
access, quote acceptance, payment authority, payment execution, work dispatch,
Work Credit writes, wallet or signer access, transaction broadcast, or movement
of funds.

A future execution lane must remain one-shot, evidence-producing, and bounded by
the already reviewed rollback and canary contracts. Post-execution readiness is
a separate decision and cannot be inferred from a successful source merge.

## Files

- packet: `config/activation-candidates/authenticated-paid-work-production-activation-execution-packet-v1.json`
- proof: `scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs`
- workflow: `.github/workflows/authenticated-paid-work-production-activation-execution-packet-v1.yml`

## Verification

```bash
node --check scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_execution_packet_v1.mjs
```

Expected marker:

```text
VOID_AUTHENTICATED_PAID_WORK_PRODUCTION_ACTIVATION_EXECUTION_PACKET_V1_PROOF_GREEN=true
```
