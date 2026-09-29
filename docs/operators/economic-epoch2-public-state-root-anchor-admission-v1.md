# Economic Epoch-2 public state-root canonical-truth admission v1

Marker:

`VOID_ECONOMIC_EPOCH2_PUBLIC_STATE_ROOT_ANCHOR_ADMISSION_V1`

Status: source-only composition candidate. This lane does not commit the anchor,
submit a transaction, import a real finalized artifact, or promote the migration
gate.

## Purpose

The Epoch-2 state-root anchor payload is already exact and content-addressed.
The repository also already has generic DataNet layers for:

1. finalized commitment-call admission;
2. exact `ContentCommitted` event membership; and
3. canonical Chain-2050 commitment-truth admission.

This composition binds those existing generic semantics to the exact Epoch-2
state-root anchor.

## Required input

The verifier accepts:

- the exact 3,203-byte public state-root anchor payload;
- one finalized-event-membership object accepted by the generic DataNet truth
  admission layer;
- the exact expected deployed commitment-registry address; and
- the exact expected publisher address.

It independently re-runs the generic canonical-truth admission and requires the
resulting commitment reference to match the state-root anchor exactly:

- Chain ID 2050;
- object ID
  `void:economic:epoch2:successor-state-root:v1`;
- object-ID SHA-256;
- payload SHA-256;
- byte length;
- accepted checkpoint policy
  `mainnet0-checkpoint-finality-v1`; and
- exact registry/publisher identity supplied by the reviewed deployment lane.

## Deliberate live/import boundary

A structurally valid composition returns:

```text
successor_state_root_public_void_anchor_candidate_ready=true
canonical_truth_admission_input_verified=true
real_finalized_membership_import_verified=false
successor_state_root_public_void_anchor_ready=false
public_balance_receipt_code_verification_ready=false
```

Hosted proof uses a synthetic finalized-membership fixture. It therefore proves
the composition contract, not that the real state-root anchor transaction has
occurred.

A later import/promotion lane must bind the real finalized event-membership
artifact before the migration candidate may set
`successor_state_root_public_void_anchor_ready=true`.

## Authority boundary

Source composition only. No filesystem write, RPC/network call, credential/key
or wallet access, transaction construction/signing/submission/broadcast,
Chain-2050 write, validator/governance/WC mutation, token/funds movement,
migration authorization, or public activation.

Verification:

```bash
node scripts/prove_void_economic_epoch2_public_state_root_anchor_admission_v1.mjs
```
