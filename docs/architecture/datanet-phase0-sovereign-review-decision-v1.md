# DataNet Phase-0 Sovereign Review Decision v1

Marker: `VOID_DATANET_PHASE0_SOVEREIGN_REVIEW_DECISION_DOC_V1`

Status: source-only high-assurance review contract. It does not read the Sovereign private key, construct/sign/broadcast a Chain-2050 transaction, mutate DataNet, activate validators, award Work Credits, restart services, or move funds.

## Purpose

The merged promotion packet deliberately ends at `PHASE0_OPERATOR_REVIEW_ONLY`.

This gate makes that human bottleneck explicit and auditable.

In Phase 0, a promotion packet may advance beyond review only after an explicit signed Sovereign decision over the **exact packet assembly and candidate**.

Machine evidence, CI, model consensus, ranking, attester count, packet completeness, or backlog pressure cannot create this decision.

## High-assurance signer

V1 uses the existing Sovereign Primary governance-attestation role and the reviewed production Ed25519 DER SHA-256 fingerprint from the Sovereign key-role registry.

The production verifier pins:

`23e2d92ebeb1d4b025eeb2a76f65b7f8ff6e6cc091f542e202569c9d5abbbd30`

The private key remains offline and outside Git/model/CI context.

The proof uses an ephemeral test key only and verifies that the production wrapper rejects it.

## Packet re-verification

Before evaluating a review decision, the verifier rechecks the exact five-file promotion packet:

- assembly manifest;
- external evidence;
- source bundle;
- evidence map;
- promotion candidate.

It verifies the assembly ID, file hashes, candidate ID/hash, Phase-0 authority mode, operator-review-only disposition, and all no-write/no-auto-promotion boundaries.

A changed packet cannot reuse an old signed decision.

## Decision chain

Each assembly begins in `PENDING_REVIEW`.

Decisions are monotonic and predecessor-bound:

- sequence `0` binds the all-zero predecessor;
- each later decision is previous sequence + 1;
- each later decision binds the exact previous decision SHA-256.

Allowed decisions:

- `HOLD`
- `APPROVE_FOR_SEPARATE_CANONICAL_PREPARATION`
- `REJECT`

A HOLD is nonterminal and may be followed by another signed decision.

Approval and rejection are terminal for that exact assembly.

## Approval meaning

Approval means only:

`APPROVED_FOR_SEPARATE_CANONICAL_PREPARATION`

It sets:

`separate_canonical_preparation_eligible=true`

It does **not** set any mutation authority.

Even after approval, these remain false:

- Chain-2050 write;
- transaction construction;
- transaction signing;
- transaction broadcast;
- validator authority;
- governance mutation;
- automatic promotion;
- runtime/service action;
- funds action.

A later separately reviewed preparation lane must consume the exact signed approval and preserve these distinctions.

## Future phases

This contract is Phase-0 only.

It does not require a fresh Sovereign decision for every ordinary canonical admission in any future phase where a separately valid constitutional/protocol transition has activated validator admission authority.

It also does not authorize such a phase transition.

## Files

- verifier/state machine: `scripts/datanet_phase0_sovereign_review_decision_v1.ts`
- proof: `scripts/prove_datanet_phase0_sovereign_review_decision_v1.ts`
- schema: `schemas/datanet-phase0-sovereign-review-decision-v1.schema.json`
- upstream packet: `scripts/datanet_promotion_packet_assembly_v1.ts`
