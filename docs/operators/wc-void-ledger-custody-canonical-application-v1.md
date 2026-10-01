# WC/VOID ledger/custody canonical application v1

Marker: `VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_V1`

Status: source-only prepare / verify-applied contract. It does not write
canonical repository files and does not activate WC/VOID.

## Purpose

Merged #2187 proves real ledger persistence plus quote-reserve custody and
prepares a coupled-candidate copy with:

```text
gates.wc_ledger_persistence_verified:
  false -> true

gates.quote_reserve_custody_verified:
  false -> true
```

The reviewed ledger import also permits those same two facts to bind into the
WC/VOID production candidate, while still reporting
`production_candidate_updated=false`.

Current canonical source keeps all four fields false. This contract supplies
the missing reviewed source-application lineage without combining later
bounded-canary or final coupled activation.

## Exact inputs

Prepare consumes exact bytes plus SHA-256 for:

- the reviewed ledger-persistence import input; and
- the exact #2187 promotion receipt.

It then reads the canonical candidates directly from one clean Git HEAD:

- `ops/mainnet0/wc-void-production-candidate-v1.json`;
- `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`; and
- `ops/mainnet0/economic-evm-successor-migration-candidate-v1.json`.

Git reads use `/usr/bin/git --no-replace-objects` with Git override
environment removed.

The #2187 promotion is re-executed against those exact current coupled and
successor bytes and the supplied ledger import input. Its complete result must
equal the supplied promotion receipt.

## Exact source delta

The prepared production target changes only:

```text
wc_ledger_persistence_verified:
  false -> true

quote_reserve_custody_verified:
  false -> true
```

The prepared coupled target changes only:

```text
gates.wc_ledger_persistence_verified:
  false -> true

gates.quote_reserve_custody_verified:
  false -> true
```

Resetting those four fields must reproduce the exact source candidates.

Both candidate statuses remain HOLD and both final activation fields remain
false.

## Classifier proof

Prepare runs both canonical classifiers before and after the delta.

The prestate must explicitly contain:

```text
wc_ledger_persistence_verification_required
quote_reserve_custody_verification_required
```

The poststate must equal the corresponding prestate missing-gate list with
exactly those two entries removed and every other gate retained in the same
order.

No other source-ready or activation transition is permitted.

## Content-addressed application plan

A successful prepare emits:

```text
marker=VOID_WC_VOID_LEDGER_CUSTODY_CANONICAL_APPLICATION_PLAN_V1
status=LEDGER_CUSTODY_CANONICAL_APPLICATION_PREPARED
wc_ledger_persistence_verified=true
quote_reserve_custody_verified=true
production_status_remains_hold=true
coupled_status_remains_hold=true
coupled_activation_ready=false
reviewed_git_commit_required=true
```

The plan binds:

- exact application-base HEAD and tree;
- exact application-tool, #2187 promotion-tool, import-tool and classifier Git
  blobs;
- exact source and target candidate Git blobs and file SHA-256 values;
- exact successor source identity;
- exact ledger import and promotion-receipt SHA-256 values;
- before/after classifier summaries; and
- exact target candidate objects.

The plan ID is:

```text
voidwclcca1_<sha256(canonical plan material)>
```

Plan validation re-reads the exact application-base commit and independently
re-proves the source identities, four-field delta and classifier transition.
Recomputing a forged plan ID around an unrelated target change is therefore
insufficient.

## Applying the plan

The actual source update is a separate reviewed Git commit or PR. It must apply
only the exact production and coupled target objects carried by the plan.

Do not combine this source transition with:

- durable opening claim/replay application;
- participant-control application;
- bounded-canary application;
- final `coupled_activation_ready`;
- runtime/service mutation;
- deployment or inventory funding; or
- public presale activation.

## Verify-applied

After the exact reviewed candidate commit lands, run verification from a clean
canonical `main` generation.

The verifier requires:

- application base remains an ancestor of current main;
- production and coupled HEAD blobs equal the exact target identities;
- successor candidate remains the exact prepared source identity;
- application tool, #2187 promotion tool, ledger import tool and both
  classifiers have not drifted from the prepared generation; and
- both current classifiers reproduce the prepared poststate.

A green applied receipt reports:

```text
status=LEDGER_CUSTODY_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD
exact_four_field_source_application_verified=true
wc_ledger_persistence_verified=true
quote_reserve_custody_verified=true
coupled_activation_ready=false
final_coupled_activation_required=true
```

That applied lineage is a prerequisite of issue #2200. It is not itself final
coupled activation.

## Authority boundary

```text
source_only_application=true
exact_ledger_import_input_required=true
exact_promotion_receipt_required=true
promotion_reexecution_required=true
canonical_head_candidate_bytes_required=true
reviewed_repository_generation_required=true
exact_four_field_source_delta=true
canonical_classifier_reexecution=true
reviewed_git_commit_required=true
filesystem_read=true

repository_source_write=false
filesystem_write=false
rpc_call=false
production_ledger_read=false
production_ledger_write=false
wc_balance_mutation=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
inventory_funding=false
liquidity_movement=false
coupled_activation=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

Focused proof:

```bash
node scripts/prove_void_wc_void_ledger_custody_canonical_application_v1.mjs
```
