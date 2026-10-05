# Buy VOID allocation custody external witness v1

Marker:

`VOID_BUY_VOID_ALLOCATION_CUSTODY_EXTERNAL_WITNESS_V1`

Status: **source-only deterministic verifier/planner; production HOLD**.

## Purpose

This contract formalizes the external monotonic high-water witness required by
the designated-host allocation-custody gate.

The protected allocation high-water lives on a dedicated physical Precision
storage domain, but both local disks remain inside one host administrator
failure domain. A separately retained append-only witness on another host can
make a coordinated local rollback observable.

The source contract deliberately does not claim that the witness bytes came
from Nimo, that a remote transport is authenticated, or that the remote file is
durably protected. Those remain deployment/runtime gates.

Every validation or advance also consumes the exact current canonical allocation
ledger JSONL and high-water JSON. The contract reuses the merged #2442 binding
classifier to require those bytes to agree exactly, then rederives record count,
tip, ledger digest/length, high-water digest/length, pool, reserved and remaining
VOID before comparing them with supplied host evidence. Caller-supplied digest
fields alone are never witness authority.

## Event chain

The witness is newline-terminated JSONL. Every event binds:

- one-based `sequence`;
- `previous_event_sha256`;
- exact source host/machine identity;
- exact Precision ledger and custody disk WWNs;
- exact custody filesystem UUID;
- reviewed deployment head, writer blob, and custody-service source SHA-256;
- ledger SHA-256 and byte count;
- high-water SHA-256 and byte count;
- allocation record count and allocation tip;
- pool, reserved, and remaining VOID totals in the canonical allocation-ledger
  amount format (integer or up to six fractional decimal places, i.e. micro-VOID);
- witness host/machine and witness root-disk identity; and
- `event_sha256`.

`event_sha256` is SHA-256 over recursively key-sorted canonical JSON of the
event body excluding `event_sha256`.

The first event must be exact genesis:

- sequence `1`;
- previous event `null`;
- record count `0`;
- ledger bytes `0`;
- SHA-256 of the empty ledger;
- zero allocation tip;
- reserved total `0`; and
- remaining VOID equal to the pool total.

Every later event must be exactly one allocation record ahead. Before planning
that event, the canonical current ledger must contain the witnessed prior ledger
as an exact byte prefix whose SHA-256 equals the witness tip's `ledger_sha256`.
The full current ledger/high-water pair must independently pass #2442 binding.
This rejects an alternate valid ledger branch that merely has record count
`tip + 1`. Ledger bytes, reserved VOID and the allocation tip must advance;
remaining VOID must decrease. Immutable source/host/storage identities may not
drift within one journal.

## Current-state classification

`classifyBuyVoidAllocationCustodyExternalWitnessV1(...)` returns `matched` only
when the supplied exact current ledger/high-water bytes pass canonical #2442
binding and the rederived current allocation state exactly equals the external
witness tip.

It HOLDs when:

- the local record count is behind the witness tip: rollback detected;
- the local record count is ahead of the witness tip **and** the exact witness
  tip ledger is a byte prefix of the canonical local ledger: external witness
  update required before the new local state may be treated as anchored;
- any local-ahead canonical ledger that does not contain the exact witnessed
  tip ledger bytes as its prefix: local history conflict;
- supplied state metadata disagrees with the canonical current ledger/high-water
  bytes: current-authority mismatch;
- the record counts match but ledger/high-water/inventory bytes differ;
- source, disk, machine, custody UUID, or witness-host policy identity differs;
- the journal is truncated, malformed, tampered, noncanonical or not a valid
  hash chain; or
- a witness transition skips more than one allocation.

`planBuyVoidAllocationCustodyExternalWitnessAdvanceV1(...)` is pure. It returns
only the exact next event/JSONL bytes for a one-record canonical local advance
whose prior ledger prefix is exactly the witnessed ledger. It performs no
filesystem or network action.

## Live genesis evidence bound by the focused proof

The focused proof binds the operator-qualified Nimo genesis witness, rederives
the canonical genesis high-water from the merged allocation contracts, builds
real canonical allocation ledgers for subsequent states, and includes an
alternate valid ledger branch that must be rejected. The first positive
post-genesis allocation is exactly `0.000001 VOID`, proving fractional
micro-VOID inventory survives canonical ledger -> high-water -> witness binding:

- genesis event SHA-256:
  `sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654`;
- genesis witness-file SHA-256:
  `sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a`;
- source host: `zoso-Precision-Tower-7810`;
- witness host: `Nimo`;
- Precision custody UUID:
  `c61906ed-0b7e-441b-a44a-a97730198a18`.

These are evidence fixtures for the pure source proof. They are not remote
transport authority.

## Remaining production gate

This source contract intentionally reports:

```text
external_transport_authenticated=false
external_witness_storage_proven=false
runtime_integration=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
```

A later deployment/runtime lane must provide a noninteractive, narrowly
authorized Nimo append/read transport whose remote endpoint rejects rollback or
conflicting witness updates, then make the verified external witness a
fail-closed prerequisite of allocation admission.

An operator SSH password prompt is suitable for qualification ceremonies but is
not a production runtime transport.

## Authority boundary

This file and its focused proof do not:

- read or write either authority filesystem;
- open SSH or any network connection;
- create or modify a Nimo witness;
- install or start services;
- access wallets, signers, keys, or credentials;
- accept a payment;
- reserve inventory;
- activate the presale or WC/VOID market;
- construct, sign or broadcast a transaction; or
- move funds.

## Focused verification

```bash
npx tsx scripts/prove_buy_void_allocation_custody_external_witness_v1.ts
npm run typecheck
git diff --check
```
