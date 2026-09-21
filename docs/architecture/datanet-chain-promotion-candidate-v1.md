# DataNet → Chain Promotion Candidate v1

Marker: `VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_DOC_V1`

Status: source-only candidate contract. No runtime, validator, signer, wallet, Chain-2050 write, Work Credit award, service, treasury, or funds authority is activated.

Parent doctrine: `VOID_DATANET_CHAIN_TRUTH_MEMBRANE_WC_EXCHANGE_V1_20260921`

Related anchor boundary: `docs/architecture/chain2050-datanet-anchor-boundary-v1.md`

## Purpose

This envelope is the typed handoff between broad DataNet information and a later Chain-2050 admission decision.

It does not decide truth and it does not write the chain. It packages enough inspectable evidence for the next authority layer to review the candidate under the standing constitutional phase and protocol.

**Ranking is evidence, not authority.**

## Network baseline ranking

The network baseline is a bottleneck score, not an average. The required v1 dimensions are:

- integrity
- provenance
- freshness
- availability
- uniqueness
- suspicion clearance
- corroboration
- reproducibility

Each component is represented in basis points from `0` through `10000`.

`baseline_floor_bps` is exactly the minimum component score.

This deliberately prevents a strong score in one dimension from hiding a weak score in another. The component vector remains inspectable and the aggregate does not erase the reason for a weak dimension.

## Requester/task overlay

A requester may apply explicit task-specific weights to the same baseline vector.

The eight weights must sum to `10000` basis points. `overlay_score_bps` is the integer weighted average:

`floor(sum(component_score_bps × weight_bps) / 10000)`

The overlay may change attention, retrieval order, or review priority. It may not change baseline evidence, bypass a hard gate, cast a validator decision, or grant authority.

## Hard gates

A candidate that claims `qualified_for_consideration=true` must have every required v1 hard gate at `PASS`:

- exact object identity
- byte integrity
- manifest integrity
- provenance binding
- replay resistance
- authorization scope
- ranking vector completeness
- phase-authority compatibility

A failed required hard gate cannot be averaged away by ranking.

## Phase boundary

The example fixture is explicitly Phase 0.

Phase 0 remains operator-rooted. Validator admission authority is inactive, validator consideration is not permitted by this envelope, and the disposition is `PHASE0_OPERATOR_REVIEW_ONLY`.

The schema can describe later constitutional phases, but it does not activate them. A future quorum-governed phase still requires the separately valid constitutional and protocol activation of that validator function.

## Authority boundary

The envelope carries explicit false authority bits for Chain-2050 writes, validator votes/quorum, validator mutation, governance mutation, Sovereign protocol mutation, Sovereign chain-stop authority, signer/wallet access, WC awards, runtime/service action, and funds action.

`canonical_write_authorized=false` and `automatic_promotion=false` are mandatory.

Qualified means **eligible for the applicable human/validator consideration path**, not accepted canonical truth.

## Relationship to the existing anchor boundary

The existing Chain-2050/DataNet anchor boundary distinguishes canonical commitments from byte availability and finality.

This candidate envelope sits earlier in the membrane. It packages ranked DataNet evidence before a canonical commitment/admission decision. It does not replace the anchor boundary, finality checks, validator rules, or constitutional authority.
