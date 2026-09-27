# WC/VOID opening window policy v1

Marker: `VOID_WC_VOID_OPENING_WINDOW_POLICY_V1`

Status: source-only opening-window policy. It selects no arbitrary duration,
per-participant cap, concentration threshold, minimum WC depth, participant
eligibility rule, or market price.

## Policy

A production opening cohort must be bound to one content-addressed absolute
window before admission begins.

The window binds:

- the coupled launch ID;
- the time the policy was committed;
- one absolute opening timestamp; and
- one absolute closing timestamp.

The ordering is strict:

```text
policy_committed_at_ms < opens_at_ms < closes_at_ms
```

No duration is hardcoded by this module. The exact launch artifact must supply
the window. Changing any bound produces a different window ID.

## Deterministic close

Admission is allowed only on the half-open interval:

```text
opens_at_ms <= admitted_at_ms < closes_at_ms
```

The close instant is therefore unambiguous and exclusive. An admission at
exactly `closes_at_ms` is rejected.

The source never reads the wall clock. Phase classification receives an explicit
observation timestamp and deterministically returns `scheduled`, `open`, or
`closed`.

## Cohort membership

Every canonical WC opening commitment must have exactly one admission record.

Each admission binds:

- the exact window ID;
- coupled launch ID;
- commitment ID;
- participant ID;
- canonical WC account; and
- admission timestamp.

Duplicate admission IDs, duplicate admitted commitments, unknown commitments,
participant/account substitution, launch/window substitution, admissions before
open, and admissions at/after close fail closed.

Admission order does not change the resulting policy-state ID.

## What this closes

This source closes the **opening commitment window policy** requirement:

`opening_commitment_window_policy_ready=true`

It does not prove that a production participant is eligible, that a commitment
was durably persisted, or that a live clock/runtime enforced the window.
Those remain separate gates.

## Authority boundary

This policy performs no:

- wall-clock read;
- ledger write or WC balance mutation;
- wallet/signer/private-key access;
- transaction construction, signing, or broadcast;
- Chain-2050 write;
- inventory funding or liquidity movement;
- market or public-presale activation; or
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_opening_window_policy_v1.mjs
```
