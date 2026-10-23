# Buy VOID custody host namespace receipt cross-check V1

Marker: `VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_CROSSCHECK_V1`.

Status: **read-only receipt consistency verification only**.

This gate compares two separately collected same-boot namespace candidate
receipts:

1. the designated-host candidate collector from Draft #3762; and
2. the current process-census-bound operator observation from Draft #3779.

It does not collect host state itself and does not convert either receipt into
namespace lease authority.

## Bound source identities

The verifier records the expected source identities:

- designated-host candidate collector Git blob:
  `ce6e416f5cccd79d421e9404f6f4fa12a416fc6a`;
- process-bound observation collector Git blob:
  `08094872d5a8aca720ae0a9f710866890d8132e7`;
- current V3 process-reference census Git blob:
  `ded737a228a627a241a84131113db6d3521f635c`;
- Precision designated-host policy Git blob:
  `4234379cb7e283e03c654e10d0d7fe8986e99897`.

These are expected identities only. Receipt origin is not cryptographically
authenticated by this verifier.

## Candidate receipt requirements

The #3762 receipt must retain the exact designated-host anchors:

```text
hostname=zoso-Precision-Tower-7810
operator=zoso
operator_uid=1000
machine_id_sha256=11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2
designated_host_identity_verified=true
```

It must also retain candidate-only/no-authority semantics:

```text
namespace_values_candidate_only=true
host_initial_pid_namespace_verified=false
host_initial_mount_namespace_verified=false
host_initial_namespace_authority_proven=false
namespace_lease_external_review_completed=false
namespace_lease_is_install_authority=false
automatic_process_census_feed_authorized=false
process_census_consumption_authorized=false
replacement_apply_authorized=false
```

The receipt's `namespace_candidate_id` is recomputed from its complete
canonical body.

## Observation receipt requirements

The #3779 receipt must bind the exact current process-census source and retain:

```text
operator_observation_only=true
operator_must_independently_know_host_context=true
independent_host_context_attested=false
lease_authority=false
automatic_process_census_composition_authorized=false
replacement_apply_authorized=false
```

Its `observation_id` is recomputed from its complete canonical body.

## Cross-check requirements

The following must match exactly between the two receipts:

- PID namespace candidate `dev:ino`;
- mount namespace candidate `dev:ino`;
- kernel boot-ID SHA-256;
- procfs root device and inode;
- procfs mount ID;
- procfs mount options;
- procfs superblock options;
- operator effective UID.

The verifier also rejects any receipt that promotes authority beyond the
candidate-only source contracts.

The exact input-file SHA-256 values are included in the canonical cross-check
body before `crosscheck_id` is derived. The output therefore commits to the
actual two receipt files, not only their parsed JSON.

## Critical trust boundary

A successful cross-check means only:

```text
namespace_candidates_match=true
boot_id_match=true
procfs_identity_match=true
proc_mount_contract_match=true
operator_uid_match=true
receipts_internally_consistent=true
```

It **does not** mean the receipt origins or physical-host context are
authenticated. Successful output always retains:

```text
collector_source_provenance_authenticated=false
receipt_origin_authenticated=false
independent_host_context_attested=false
external_reviewer_approval_required=true
external_reviewer_approval_present=false
lease_authority=false
process_census_consumption_authorized=false
automatic_process_census_feed_authorized=false
replacement_apply_authorized=false
```

The next gate is an explicit reviewer decision over the real Precision
receipts. This verifier must not auto-feed namespace values into #3752.

## Invocation

Isolated no-bytecode Python is mandatory:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_host_namespace_crosscheck_v1.py \
  --crosscheck \
  --candidate-receipt /ABSOLUTE/PATH/namespace-candidate.json \
  --observation-receipt /ABSOLUTE/PATH/namespace-observation.json
```

The verifier reads the two regular files descriptor-bound and writes no output
file; the JSON result is emitted on stdout.

## Authority boundary

```text
read_only=true
production_filesystem_write=false
collector_source_provenance_authenticated=false
receipt_origin_authenticated=false
independent_host_context_attested=false
external_reviewer_approval_required=true
external_reviewer_approval_present=false
lease_authority=false
process_census_consumption_authorized=false
automatic_process_census_feed_authorized=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

**PROTECT THE CORE.**
