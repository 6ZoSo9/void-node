# WC/VOID opening replay-protection source transition v1

Marker: `VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1`

Status: source-only pure replay-state transition. It does not persist replay
state, write the WC ledger, transfer/refund value, access a signer, submit a
transaction, activate a market/presale, or move funds.

## Purpose

The existing opening settlement and claim-binding source rejects duplicates
inside one evaluated set. That is not durable replay protection across separate
executions.

This source mechanism defines the missing transition contract without claiming
that any replay state has been persisted yet.

## Replay state

Each coupled launch has one content-addressed state containing sorted unique
consumed IDs for:

- claim-binding IDs;
- opening commitment IDs;
- WC settlement IDs; and
- transfer/refund disposition IDs.

The state also carries a monotonic revision and content-addressed state ID.

The transition re-derives the exact canonical claim/refund binding from the
opening commitments, WC ledger debits, mode, and dispositions. The caller cannot
supply an independently trusted binding ID.

## Fail-closed transition

Before deriving the next state, the transition rejects:

- a previously consumed binding ID;
- any previously consumed commitment ID;
- any previously consumed settlement ID;
- any previously consumed disposition ID;
- replay state from another coupled launch;
- malformed, unsorted, duplicate, or non-content-addressed consumed ID sets; and
- replay state whose state ID does not match its exact contents.

A finalized cohort therefore cannot be finalized twice. The same commitments
also cannot later be replayed through the alternate abort/refund outcome.

## Deliberate persistence boundary

A successful transition reports:

```text
duplicate_replay_protection_source_ready=true
duplicate_replay_protection_proven=false
durable_replay_state_persistence_verified=false
replay_state_write_performed=false
```

The production gate must remain false until a separately reviewed persistence
consumer durably commits the before→after transition atomically and proves the
persisted state cannot be rolled back or forked.

## Authority boundary

The transition is pure and keeps all filesystem, ledger, wallet/signer, RPC,
transaction, chain-write, funding, activation, and funds-movement authorities
false.

Verification:

```bash
node scripts/prove_void_wc_void_opening_replay_protection_v1.mjs
```
