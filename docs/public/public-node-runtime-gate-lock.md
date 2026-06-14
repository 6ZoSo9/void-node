# Public Node Runtime Gate Lock v1

Marker: `VOID_RUNTIME_GATE_LOCK_DOC_V1`

Route: `/public-node/runtime-gate-lock.json`

Proof: `ops/mainnet0/public-node-runtime-gate-lock-proof.sh`

## Purpose

Runtime Gate Lock v1 is the public mutation death proof for the guarded VOID Mainnet-0 public node.

It proves the current public-node surface is read-only while public mutation, public earning, WC credit awards, WC-to-VOID swaps, validator mutation, and money movement remain closed.

## Principle

Public read is allowed.

Public mutation is presumed hostile and dead unless a future signed capability explicitly unlocks it.

## Current phase

`guarded_mainnet_0_bootstrap`

## v1 green requirements

Runtime Gate Lock v1 is green only when:

- public read routes still resolve
- `/public-node/runtime-gate-lock.json` returns marker `VOID_RUNTIME_GATE_LOCK_V1`
- `public_mutation_open=false`
- `public_earning_open=false`
- `wc_credit_award_open=false`
- `wc_to_void_swap_open=false`
- `validator_mutation_open=false`
- `money_movement_open=false`
- unauthenticated `POST`, `PUT`, `PATCH`, and `DELETE` probes fail closed
- unknown mutating fuzz routes fail closed
- private mutation evidence stays operator-local

## Approved fail-closed statuses

The v1 proof accepts these mutation rejection statuses:

- `401`
- `403`
- `404`
- `405`

Any mutating probe returning a non-fail-closed status is a red violation.

## Private evidence policy

The proof may write operator-local evidence under `/tmp`.

Public surfaces must not expose payloads, internal secrets, exploit details, or raw probe bodies.

## Safety claim

Runtime Gate Lock v1 proves public mutation is currently closed on the tested public-node HTTP surface.

It does not prove Sybil resistance, DDoS resistance, cryptographic identity, replay protection, resource isolation, public earning readiness, or production launch readiness.

Those belong to later gates.

## Live rollup guard

Runtime Gate Lock v1 is included in the public-node live status rollup when the rollup emits:

`runtime_gate_lock_live_status_rollup_green=true`

