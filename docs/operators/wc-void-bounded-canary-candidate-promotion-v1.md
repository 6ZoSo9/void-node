# WC/VOID bounded-canary candidate promotion v1

Marker: `VOID_WC_VOID_BOUNDED_CANARY_CANDIDATE_PROMOTION_V1`

Status: source-only candidate preparation. This lane binds a reviewed semantic
bounded-canary receipt into candidate copies. It does not update canonical
candidate files and does not perform final coupled activation.

## Input boundary

The promotion consumes exact bytes plus SHA-256 for:

- a reviewed `VOID_WC_VOID_BOUNDED_CANARY_SEMANTIC_PROMOTION_V1` receipt;
- the WC/VOID production candidate;
- the coupled-economic candidate; and
- the economic-successor migration candidate.

It also requires the caller to bind the request to the current clean repository
HEAD and tree. The promotion records reviewed source commit
`c3ff2ce141fa88a53eafe7a28c3f6614cadaaa71` as the review-generation
anchor and independently pins the exact Git blobs reviewed at that generation
for the three candidate prestates and the complete transitive source dependency
closure used by semantic reverification and candidate classification. The
reviewed closure is 38 exact Git blobs and includes the canonical market-vault Solidity source, the semantic verifier
dependencies, coupled policy dependencies, participant/finality dependencies,
and `package.json` / `package-lock.json` for the imported `ethers` state.
Any drift in that closure fails closed. Repository reads use the absolute
reviewed `/usr/bin/git` executable, reject executable identity changes during
a read, and ignore ambient `PATH`, repository-selection, Git-config injection,
and Git program-override environment variables. This avoids depending on deep
Git history being present in a shallow CI checkout while still requiring exact
reviewed source bytes.

The three caller-supplied candidate byte strings must equal the corresponding
`git show HEAD:<path>` bytes exactly. A lookalike candidate with an unrelated
gate pre-flipped is rejected even when its caller-supplied SHA-256 is internally
consistent.

It does **not** accept an application timestamp as freshness authority.

The semantic receipt must prove that its own reviewed
`evaluation_time_utc` fell inside its composed observed/valid-until window.
That establishes that the canary was fresh when the semantic evidence was
verified. A later source-only candidate binding cannot manufacture or extend
that live freshness by supplying a new clock value.

Final/runtime activation must perform its own separately reviewed fresh
preflight; this candidate promotion is durable evidence that the bounded canary
was semantically green at its reviewed evaluation time.

## Semantic receipt verification

The receipt is checked for exact marker/version/network/pair/current launch,
reviewed policy ID, canary evidence ID, one participant, positive settled WC,
positive delivered VOID, positive finality, vault/runtime identity and every
content-addressed upstream evidence/file reference.

Its content identity is recomputed from the complete promotion material:

```text
semantic_evidence_id=sha256:<digest>
promotion_id=voidwcbcsp1_<same digest>
```

The receipt must prove:

```text
durable_claim_binding_verified=true
durable_replay_terminal_verified=true
upstream_evidence_semantically_verified=true
live_canary_evidence_verified=true
bounded_canary_green=true
production_candidate_binding_allowed=true

production_candidate_updated=false
coupled_candidate_updated=false
candidate_promotion_required=true
coupled_activation_ready=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

Its exact semantic-promotion authority contract must also match the reviewed
source constant.

## Candidate prestate

The production candidate must still declare:

```text
status=hold
bounded_canary_green=false
coupled_activation_ready=false
```

The coupled candidate must still declare:

```text
status=HOLD
gates.bounded_canary_green=false
gates.coupled_activation_ready=false
```

and its shared post-discovery reconciliation must use the same reviewed coupled
launch as the semantic canary.

Both canonical classifiers are run before any copy is modified. Their missing
gate lists must explicitly contain both:

```text
bounded_canary_required
coupled_activation_ready_required
```

Other independent HOLDs may still be present.

## Exact promotion delta

The source creates deep-frozen candidate copies and changes exactly:

```text
production.bounded_canary_green:
  false -> true

coupled.gates.bounded_canary_green:
  false -> true
```

No status change is permitted in this lane.

No final activation change is permitted in this lane.

Resetting those two fields to false must reproduce the exact input candidates.

The canonical classifiers are then rerun. The poststate missing-gate arrays must
equal the corresponding prestate arrays with exactly
`bounded_canary_required` removed. Every other missing gate must remain in the
same order.

Therefore the expected poststate is still HOLD, including
`coupled_activation_ready_required`.

## Output

The content-addressed promotion includes:

- exact repository HEAD/tree identity and the reviewed source commit;
- a deterministic SHA-256 manifest covering all 38 reviewed dependency/source blobs;
- exact Git blob identities for the top-level reviewed semantic/classifier sources;
- exact reviewed Git blob identities for all three canonical candidate prestates;
- the exact canonical `contracts/mainnet/WCVoidMarketVaultV2.sol` Git blob;
- exact `package.json` and `package-lock.json` Git blobs;
- the current candidate-promotion tool Git blob identity;
- exact source file SHA-256s;
- semantic promotion/evidence/policy/canary IDs;
- the reviewed coupled launch;
- exact promoted candidate copies and canonical SHA-256s;
- before/after classifier summaries; and
- the exact promoted field/gate lists.

It returns:

```text
bounded_canary_green=true
production_status_remains_hold=true
coupled_status_remains_hold=true
coupled_activation_ready=false
canonical_production_candidate_updated=false
canonical_coupled_candidate_updated=false
candidate_promotion_application_required=true
```

The output records:

```text
semantic_canary_fresh_at_reviewed_evaluation=true
application_time_authority=false
```

The promotion ID is:

```text
voidwcbccp1_<sha256>
```

## Relationship to final coupled activation

This is the required source boundary between semantic canary evidence and issue
#2200 final coupled activation.

The final activation lane should start from candidate source generations where
this bounded-canary delta has already been reviewed/applied. It must not
silently combine canary evidence admission with final activation.

The final source transition will separately need to prove the final
`coupled_activation_ready` and source-ready status declarations.

## Authority

```text
source_only_promotion=true
exact_semantic_promotion_bytes_required=true
exact_candidate_bytes_required=true
semantic_canary_fresh_at_reviewed_evaluation_required=true
canonical_classifier_reexecution=true
exact_two_gate_candidate_delta=true
git_repository_identity_read=true
clean_worktree_required=true
reviewed_source_generation_required=true
canonical_head_candidate_bytes_required=true
semantic_source_contract_generation_required=true
reviewed_dependency_closure_required=true
package_lock_generation_required=true
reviewed_git_executable_required=true
ambient_git_overrides_ignored=true

canonical_candidate_file_update=false
filesystem_read=true
filesystem_write=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
rpc_call=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
wc_ledger_write=false
wc_balance_mutation=false
token_movement=false
inventory_funding=false
liquidity_movement=false
coupled_activation=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

Verification:

```bash
node scripts/prove_void_wc_void_bounded_canary_candidate_promotion_v1.mjs
```
