# Buy VOID custody reserve source plan V1

Marker: `VOID_BUY_VOID_CUSTODY_RESERVE_PLAN_V1`

Status: **source-only candidate / production HOLD**.

## Purpose

The public runtime must not gain direct write authority over the protected
allocation ledger or its monotonic high-water. The custody service must also
not trust an IPC caller's assertion that a payment, duplicate check, inventory
check, or launch gate is green.

This module stages the pure decision boundary required before those two domains
can be connected. It accepts observed bytes, independently classifies the
durable verified-payment history and the signed launch generation, and returns
the exact next canonical allocation ledger bytes. It performs no filesystem
read or write and does not enable the custody service.

Exact source Git blob:

`c8ce5546fbe9a801161adbd7218888500ce346c9`

Focused proof Git blob:

`1ab01cc6cb5ad9c1c5a748c09395c98cb882f9d5`

## Authority construction

The production entry accepts exactly seven own enumerable data properties:

- `request_id`;
- `requests_jsonl`;
- `operator_events_jsonl`;
- `allocation_jsonl`;
- `generation_journal_bytes`;
- `activation_receipt_bytes`; and
- `custody_high_water_bytes`.

The six byte values must be Buffers and are copied before use. `request_id`
must be a primitive string. Proxy objects, accessors, custom prototypes,
symbols, missing fields and extra fields HOLD before caller code can run.

The production entry never accepts:

- a caller-provided clock;
- a caller-provided launch decision;
- `verified_payment_gate_green`;
- duplicate/inventory/operator green booleans;
- filesystem paths; or
- allocation writer authority.

It invokes
`classifyBuyVoidCustodyLaunchAuthorityObservedBytesV2(...)` itself. That
classifier binds the current source composition, active generation journal,
dual-signed launch receipt, current time, and the protected custody launch
high-water.

## Payment and allocation binding

The plan reuses
`classifyBuyVoidVerifiedAllocationReplayBindingV1(...)` against the observed
request, operator-event and allocation bytes. It accepts only a canonical
already-present allocation or the exact
`verified_allocation_requires_protected_recovery` gap.

The durable request's launch-authority tuple is then rebound to the verified
activation receipt: launch ID, source composition, generation, generation tip,
receipt ID, receipt SHA-256, and expiry must all agree.

The global replay result must report no unrelated unpaid allocation obligation.
For a missing target allocation, the global unallocated verified amount must
equal exactly the target request's VOID quote. For an already-present target
allocation it must be zero. This prevents a later request from being allocated
while an older verified obligation remains unresolved.

Only after those checks does the module reuse
`planBuyVoidAllocationReservationV1(...)` to derive the exact next ledger
bytes. The canonical presale pool/rate, payment-event commitment, duplicate
binding, capacity binding and launch receipt reference are derived inside this
module rather than supplied as caller-green assertions.

## Explicit non-authority

This source does **not** prove that the byte inputs came from retained
descriptors. It does not import `node:fs`, does not call the crash-recoverable
publication writer, and never writes either allocation root.

The following remain false:

- `descriptor_bound_reads`;
- `filesystem_write`;
- `allocation_write`;
- `custody_reserve_method_enabled`;
- `custody_recover_method_enabled`;
- `service_mounted`;
- `runtime_integration`;
- `production_allocation_mutation_ready`;
- `presale_activation`; and
- `funds_movement`.

A later service successor must bind these pure semantics to server-configured,
descriptor-bound runtime/payment observations and the reviewed protected
allocation writer. Host UID/GID/ACL, executable-closure, socket, service
hardening and rollback-resistance qualification remain separate gates.

## Focused proof

The proof pins the exact source and dependency blobs, requires planned then
idempotent canonical allocation bytes, rejects launch-lineage mismatch and a
second unresolved verified obligation, exercises Proxy/accessor/extra-authority
inputs, and keeps all runtime/write/funds authority false.

Node 22, 24 and 26 must emit byte-identical proof receipts.

**PROTECT THE CORE.**
