# WC/VOID opening replay terminal persistence v1

Marker: `VOID_WC_VOID_OPENING_REPLAY_PERSISTENCE_V1`

Status: source mechanism for explicit, create-once persistence of the terminal
WC/VOID opening replay state. This document and source do not persist production
state by themselves.

## Purpose

`VOID_WC_VOID_OPENING_REPLAY_PROTECTION_V1` defines the pure replay transition
for one cohort-atomic opening outcome. V1 allows exactly one terminal outcome per
coupled launch:

- finalize the full cohort to deterministic VoidToken transfer claims; or
- abort the full cohort to exact WC refund claims.

Because V1 is terminal and cohort-atomic, durable replay state does not require a
mutable generation log. It can be represented by one create-once capsule per
coupled launch.

## Canonical path

Given `coupled_launch_id=sha256:<64 lowercase hex>`, the terminal capsule is:

```text
<data_dir>/wc_v1/opening-replay-terminal-v1/<64 lowercase hex>.json
```

The capsule is content-addressed and binds:

- coupled launch ID;
- finalize/abort mode;
- replay transition ID;
- claim-binding ID;
- before-state ID;
- after-state ID;
- terminal revision; and
- the exact next replay state.

## Explicit confirmation

Persistence requires the exact confirmation:

`persistWcVoidOpeningReplayTerminalState`

The confirmation is checked before filesystem access.

## Publication semantics

The persistence function:

1. independently re-derives the replay transition from the opening inputs;
2. requires the exact initial replay state, so V1 cannot append a second outcome;
3. requires direct private `data_dir` and `wc_v1` custody;
4. creates a private `opening-replay-terminal-v1` directory when absent;
5. rejects unresolved `.pending-*` artifacts for operator review;
6. writes the complete capsule to an exclusive `0600` pending file and fsyncs it;
7. publishes the complete file with a create-only hardlink, never overwrite;
8. fsyncs the store directory;
9. removes the pending link and fsyncs again;
10. reopens and verifies the exact published bytes; and
11. revalidates data/WC/store directory identity, owner, and mode before success.

An exact retry returns `status=duplicate` without replacing the terminal inode.
A different terminal outcome for the same launch fails closed with
`WC_VOID_OPENING_REPLAY_TERMINAL_ALREADY_COMMITTED`.

A stale pending artifact is not automatically deleted. It requires operator
review.

## Deliberate production boundary

A successful invocation may prove that one exact terminal replay capsule was
persisted for the supplied launch on the inspected filesystem.

This source lane does **not** change the checked-in production candidate and does
not claim that Mainnet-0 has executed this persistence path. The durable
production `duplicate_replay_protection_proven` gate remains separate until an
authorized launch execution produces and independently verifies its real
terminal capsule.

## Authority boundary

The exported persistence capability has narrowly scoped filesystem read/write and
terminal replay-state persistence authority behind the explicit confirmation.

It has no authority for:

- credentials or wallet/signers;
- RPC;
- transaction construction/signing/broadcast;
- Chain-2050 writes;
- WC-ledger writes or balance mutation;
- VoidToken transfer or WC refund execution;
- inventory funding or liquidity movement;
- market/presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_replay_persistence_v1.mjs
```
