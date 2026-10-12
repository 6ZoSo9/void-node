# Buy VOID payment/allocation preappend hardening v1

## Purpose

Close two source-level gaps in the verified-payment → allocation handoff before
any production activation:

1. an invalid buyer/original-request lineage could be discovered only after the
   irreversible `payment_verified` JSONL fsync; and
2. an existing payment sidecar was pathname-stat checked and then consumed with
   unbounded `readFileSync(path)`, leaving growth and same-size replacement
   races.

This lane is stacked on the unmounted durable-handoff Draft. It changes no live
service, customer ledger, wallet, signer, Chain-2050/WC state, presale or funds.

## Pre-fsync original buyer lineage

The replay-binding module now exports a pure
`classifyBuyVoidPreappendVerifiedPaymentLineageV1(...)` classifier.

It constructs the exact hypothetical event line which the writer would append,
runs the existing strict canonical replay classifier against that in-memory
history, and requires the expected `verified_allocation_missing` state and
exact event digest. It then reuses the replay module's own canonical request
history state—rather than selecting a merely latest JSON row—to bind the
separate caller request to the durable chronology:

- request ID;
- source-chain plus any present aliases;
- payment transaction;
- buyer/delivery wallet;
- canonical receiver;
- native-USDC contract;
- VOID quote;
- USDC amount; and
- the exact nine-field coupled-launch authority tuple.

The real handoff invokes this classifier while the existing capacity/request
serialization and launch-authority guards are held, after the request ledger
identity recheck and prior-allocation completeness snapshot, but **before**
`appendPaymentVerifiedEventDurableV1(...)`.

A HOLD therefore occurs before the operator JSONL fsync.

## Existing-sidecar descriptor boundary

Existing sidecars are now opened with `O_RDONLY|O_NOFOLLOW` and
`O_NONBLOCK` where available. The verifier requires the visible file and
retained descriptor to identify the same regular owned file with the exact
expected size and safe mode.

Consumption is bounded to the expected size plus one sentinel byte. Concurrent
growth therefore HOLDS without buffering the growth. After the read, fd and
visible pathname identity are rebound before bytes are trusted.

Crash recovery may leave the create-only temporary hardlink. Extra links are
accepted only when every extra link is an owned temp-prefix name referencing
the exact verified inode. Those links are removed, the directory is fsynced,
and the final descriptor/visible path is required to be single-link and
identity-consistent before reporting `existing`.

## Focused proof

The Node 22/24/26 OS-temp proof exercises:

- one valid payment through real durable payment append, allocation publication,
  replay classification and sidecar creation;
- forged receipt buyer rejected before payment fsync with operator/allocation
  ledgers unchanged;
- altered caller buyer rejected before payment fsync;
- +2 MiB growth injected after the sidecar read begins, with total consumption
  bounded to the expected bytes + 1 sentinel; and
- same-size visible-path replacement after descriptor read, which must HOLD.

No production filesystem path or real customer record is used.

## Remaining HOLD

This closes neither deployed runtime identity nor protected external high-water
custody by itself. Operator route authentication, exact current source/artifact
attestations, deployment qualification and exactly-once recovery remain
separate gates. `production_gate_ready=false` and funds movement remain HOLD.

**PROTECT THE CORE.**
