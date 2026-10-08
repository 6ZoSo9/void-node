# Buy VOID allocation custody writer V2 source qualification

## Purpose

Preserve allocation-custody qualification V1 as immutable historical evidence
while qualifying the exact writer source used by the durable payment/allocation
handoff.

This is **source requalification only**. It does not mint a new live custody
receipt, collect host evidence, authorize runtime integration, or prove
independent custody.

## Historical V1 identity

The V1 custody contract remains byte-exact:

- qualification source blob:
  `4adae871f2938840e2ec936e743d0b650b5f1a00`;
- qualification proof blob:
  `756cc52119e78150e6cc251454e1a79d75ade9f9`;
- qualification document blob:
  `b52f32ff343f7fd340c7782d0c68cde3bb54693d`;
- reviewed writer blob:
  `59b336eb82222bf0f5bcfe37060ec520c54e9b62`;
- reviewed writer SHA-256:
  `sha256:84ba3aa4fd77fdcf6cc12b8707014a9698a4f2b04808e3179a4d016435c9fd4b`.

V1 remains the historical contract for that exact writer. It is not repinned.

## Current writer identity

The durable-handoff source uses writer blob:

`b460963c25a87153551090ed97e9c716aad0b727`

with source SHA-256:

`sha256:41e4f975c7926ddd082fd26f5e1ee936de06a1fdbe081b308daa4849c069d06d`.

The V2 proof does not depend on the historical writer object being advertised
into a fresh Git clone. It removes exactly one reviewed additive source block
from the exact current writer, reconstructs the predecessor bytes locally, and
requires those bytes to match both the historical Git-blob SHA-1 and historical
source SHA-256.

The only added source block defines
`BuyVoidAllocationReservationPublicationSnapshotV1` and
`snapshotBuyVoidAllocationReservationPublicationWriterV1(...)`.

That block:

- enters the existing two-root writer lock domain through
  `withWriterRoots(...)`;
- permits recovery of an already-started publication through
  `recoverUnderLock(...)`;
- revalidates the exact current ledger/high-water binding;
- returns the exact descriptor-bound ledger bytes/summary;
- does not plan a new allocation;
- does not call the allocation persistence entrypoint; and
- keeps runtime integration, production readiness and funds movement false.

Recovery may complete an already-started writer publication; that behavior is
existing writer recovery authority, not a new allocation-planning authority.

## Runtime proof policy

The broad current-runtime proof loop must no longer execute the historical V1
qualification against changed writer bytes. V1 is preserved by its dedicated
historical workflow and by this V2 proof. The current runtime loop executes this
V2 successor instead.

This is not a waiver: V2 proves the exact predecessor bytes, exact new bytes,
and exact additive delta.

## Remaining HOLD

A new designated-host custody qualification/receipt for the current writer is
still required before operational promotion. In particular:

```text
live_host_qualification_performed=false
prior_receipt_external_trust_proven=false
independent_custody_proven=false
runtime_integration=false
production_gate_ready=false
funds_movement=false
```

No host/service/mount mutation, customer ledger access, wallet/key/signer,
transaction, Chain-2050/WC write, presale/market activation, treasury/liquidity
or funds action occurs in this lane.

**PROTECT THE CORE.**
