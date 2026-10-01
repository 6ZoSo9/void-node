# Epoch-2 public verification composition v1

## Purpose

This source-only composition closes the two remaining public-verification gates
for the canonical Epoch-2 migration candidate without mutating canonical source
or weakening either reviewed promotion contract.

It composes:

1. fresh public-read runtime evidence through
   `promoteVoidEconomicEpoch2PublicReadRuntimeV1(...)`; and
2. finalized public state-root membership through the canonical
   `promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1(...)`.

The final derived migration candidate must classify `SOURCE_READY`.

## Canonical source binding

Before any authority-bearing promotion module is loaded, the composition:

- requires a clean repository worktree;
- requires reviewed main anchor
  `2dcf6544f373f828347434fd0c6d434334af1658` to be an ancestor of the
  evaluated HEAD;
- requires `origin` to identify canonical `6ZoSo9/void-node`;
- verifies exact `HEAD:<path>` Git blobs for the canonical migration
  candidate, loopback policy, both promotion sources, the migration classifier,
  state-root admission, anchor verifier, and canonical-truth dependencies;
- records exact HEAD/tree, composition-tool blob, dependency blobs, and
  canonical source file SHA-256 values in the receipt; and
- rechecks the source binding after composition so source drift during the run
  cannot be silently accepted.

The composition tool itself is not pinned to its pre-merge blob. Its exact
current canonical blob is recorded in every receipt so squash-merged and later
reviewed generations remain usable while dependency semantics stay pinned.

## Inputs

The function accepts exactly:

- fresh public-read evidence bytes;
- independent SHA-256 for those bytes;
- reviewed public-read evidence ID;
- explicit evaluation time;
- finalized state-root membership bytes;
- independent SHA-256 for membership bytes;
- expected registry address;
- expected publisher address; and
- the canonical state-root import review confirmation.

External membership is bounded to 1 MiB, matching the canonical importer.

## Public-read branch

The exact canonical loopback policy and migration candidate are read from the
reviewed Git generation and passed to
`promoteVoidEconomicEpoch2PublicReadRuntimeV1(...)`.

The result must:

- set only the reviewed public-read verification fields;
- leave the state-root anchor gate false;
- remain HOLD with exactly
  `successor_state_root_public_void_anchor_required`; and
- keep all migration/public/funds authority false.

The tool resets the public-read delta and requires byte-semantic equality with
the canonical migration prestate.

## State-root branch

The composition calls the canonical
`promoteVoidEconomicEpoch2PublicStateRootAnchorImportV1(...)` directly.

This intentionally inherits the importer's complete reviewed contract,
including:

- the 1 MiB membership ceiling;
- exact reviewed membership SHA-256;
- explicit review confirmation;
- canonical Git-bound anchor and migration source;
- canonical-truth admission;
- exact registry/publisher binding; and
- its reviewed state-root dependency closure.

The importer must report:

```text
real_finalized_membership_import_verified=true
successor_state_root_public_void_anchor_ready=true
migration_classifier_status=HOLD
remaining_migration_gates=["public_economic_verification_path_required"]
```

The composition resets that one state-root delta and requires exact equality
with the same canonical migration prestate used by the public-read branch.

## Exact merge

The final candidate starts from the public-read-promoted candidate and applies
only:

```text
successor_state_root_public_void_anchor_ready=false -> true
```

The independently state-root-promoted candidate is then given only the reviewed
public-read fields. Both independently derived paths must become exactly
identical.

The canonical migration classifier is rerun and must return:

```text
ok=true
status=SOURCE_READY
migration_authorized=false
public_activation_authorized=false
money_movement_authorized=false
```

No canonical candidate file is modified.

## Output

The returned receipt is content-addressed as
`voide2pvc1_<sha256>` and binds:

- exact repository HEAD/tree and canonical remote;
- exact composition/dependency Git blobs;
- canonical migration/loopback file SHA-256 values;
- public-read evidence SHA-256, ID, and evaluation time;
- state-root membership SHA-256, promotion ID, membership ID, registry, and
  publisher;
- final migration candidate SHA-256; and
- final classifier status.

The CLI writes only two create-only private files in a new directory outside
the repository:

- `economic-epoch2-public-verification-composition-v1.json`;
- `economic-evm-successor-migration-candidate-v1.json`.

## Authority boundary

```text
source_only_composition=true
canonical_git_source_binding_required=true
exact_dependency_git_blobs_required=true
public_read_promotion_reexecuted=true
canonical_state_root_import_promotion_reexecuted=true
migration_classifier_reexecuted=true
exact_scoped_candidate_merge_required=true
create_only_private_output=true

canonical_candidate_mutation=false
service_mutation=false
production_rpc_contact=false
network_call=false
credential_content_access=false
wallet_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
validator_mutation=false
governance_mutation=false
work_credit_mutation=false
migration_activation=false
public_activation=false
token_movement=false
funds_movement=false
```

## Verification

```bash
node scripts/prove_void_economic_epoch2_public_verification_composition_v1.mjs
```
