# DataNet Promotion Evidence Map + Generator v1

Marker: `VOID_DATANET_PROMOTION_EVIDENCE_MAP_GENERATOR_DOC_V1`

Status: source-only, read-only evidence transformation. This design does not read credentials, access a wallet or signer, mutate DataNet, mutate validators, write Chain-2050, award Work Credits, restart services, or move funds.

Parent candidate contract: `VOID_DATANET_CHAIN_PROMOTION_CANDIDATE_V1`

Parent doctrine: `VOID_DATANET_CHAIN_TRUTH_MEMBRANE_WC_EXCHANGE_V1_20260921`

## Purpose

This layer closes the gap between existing DataNet object evidence and the typed promotion-candidate envelope.

The path is:

```text
DataNet object evidence
  -> exact per-object source binding
  -> evidence map
  -> Phase-0 promotion candidate
  -> operator review
```

There is no implicit hop after operator review.

## Evidence dimensions

V1 requires eight dimensions:

1. integrity
2. provenance
3. freshness
4. availability
5. uniqueness
6. suspicion clearance
7. corroboration
8. reproducibility

Each passing v1 dimension receives exactly `10000` basis points.

V1 deliberately does **not** invent middle scores. A required source is either sufficient for this promotion class or the generator HOLDS. More granular ranking can be added later under a separately reviewed scoring policy.

The network baseline remains the minimum dimension score.

## Exact source map

### Integrity

Requires:

- weighted-record `verification_state=verified`;
- object proof bound to the same object/content identity;
- manifest and object proof byte lengths equal the candidate byte length; and
- exact bytes verified.

### Provenance

Requires:

- non-empty weighted-record `source_id`;
- manifest receipt marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1`; and
- `receipt_valid_for_current_object=true`.

### Freshness

Requires weighted-record `freshness_state=fresh`.

### Availability

Requires:

- at least one verified replica; and
- exact bytes verified by the availability evidence.

### Uniqueness

Uniqueness does not pretend the current weighted record always carries a healthy duplicate state.

V1 therefore requires a separate object/content-bound dedupe evidence record with `duplicate_detected=false`.

### Suspicion clearance

Requires:

- `suspicion_state=clean`;
- `tombstone_state=active`; and
- `promotion_eligible=true`.

### Corroboration

Requires an explicit evidence record bound to the same object/content identity with:

- at least two independent sources; and
- `conflict_detected=false`.

No corroboration score is synthesized when this evidence is absent.

### Reproducibility

Requires an explicit evidence record bound to the same object/content identity with:

- at least one independent verifier; and
- `replay_verified=true`.

No reproducibility score is synthesized when this evidence is absent.

## Source locator boundary

Every evidence binding carries both:

- a canonical SHA-256 of the exact source generation; and
- a bounded source locator.

V1 permits public-node route locators and `evidence://` locators. Local filesystem paths and `file://` locators are not accepted into the promotion evidence map.

For existing Local Data Drop evidence, the canonical locators are:

- weighted record: `/public-node/local-data-drop/weighted.json`
- manifest: `/public-node/local-data-drop/manifest.json`
- object proof: `/public-node/local-data-drop/proof/:sha256.json`

External dedupe, availability, corroboration, and reproducibility evidence must name their exact bounded evidence locator instead of being treated as anonymous claims.

## Evidence generation binding

Evidence-generation hashes are content-derived, not caller-chosen labels.

For dedupe, availability, corroboration, and reproducibility evidence, `evidence_sha256` must equal SHA-256 of the canonical evidence record with the `evidence_sha256` field removed.

Changing a bound signal without recomputing the exact evidence-generation hash therefore HOLDS, and a fabricated but well-formed 64-character digest is insufficient.

Input objects are also closed: extra fields, including hidden authority fields, HOLD rather than being ignored.

## HOLD boundary

The generator writes neither an evidence map nor a promotion candidate if any required signal is missing, stale, duplicated, suspicious, tombstoned, contradictory, partially verified, under-corroborated, unreproduced, identity-mismatched, or authority-escalating.

The HOLD marker is:

`VOID_DATANET_PROMOTION_EVIDENCE_HOLD_V1`

The generator exits with status `3` for an evidence HOLD.

Malformed JSON or invalid invocation is an input/tool error and exits with status `2`.

## Phase boundary

V1 generation is intentionally restricted to Phase 0.

Required phase state:

- `phase=0`
- `authority_mode=PHASE0_OPERATOR_ROOTED`
- `validator_admission_authority_active=false`

A non-Phase-0 input HOLDS. This generator does not infer or activate later validator authority.

The generated candidate disposition is:

`PHASE0_OPERATOR_REVIEW_ONLY`

## Authority boundary

The input source scope must explicitly prove:

- source-only;
- public/read-only;
- no Chain-2050 write authority;
- no validator mutation;
- no governance mutation;
- no signer/wallet access;
- no Work Credit award;
- no runtime/service action; and
- no funds action.

The generated evidence map and promotion candidate preserve those negative authority statements.

Ranking remains evidence, not authority.

## Files

- input schema: `schemas/datanet-promotion-evidence-source-v1.schema.json`
- map schema: `schemas/datanet-promotion-evidence-map-v1.schema.json`
- green fixture: `fixtures/architecture/datanet-promotion-evidence-source-v1.green.json`
- generator: `scripts/datanet_promotion_candidate_generate_v1.mjs`
- adversarial proof: `scripts/prove_datanet_promotion_evidence_map_generator_v1.mjs`
- candidate schema: `schemas/datanet-chain-promotion-candidate-v1.schema.json`

## Adversarial cases

The proof requires HOLD with no output artifacts for:

- missing corroboration;
- object/content contradiction;
- byte-length contradiction;
- stale data;
- duplicate evidence;
- suspicious data;
- partial verification;
- corroboration conflict;
- missing independent reproducer;
- non-Phase-0 authority escalation;
- Chain-2050 write-authority escalation; and
- invalid requester weight totals;
- tampered evidence-generation hashes; and
- hidden/extra authority fields; and
- local filesystem evidence locators.
