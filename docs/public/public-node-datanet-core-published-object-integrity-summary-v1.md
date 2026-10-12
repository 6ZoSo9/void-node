# DataNet Core Published Object Integrity Summary v1

Marker: `VOID_DATANET_CORE_PUBLISHED_OBJECT_INTEGRITY_SUMMARY_DOC_V1`

This summary returns the lane from peer-pin closeout back to DataNet public verification.

The purpose is to record the currently sealed published-object integrity posture in a small static packet that is safe to read, safe to prove, and safe to resume from later.

This summary does not fetch objects, does not publish objects, does not mirror content, does not pin content, does not mutate public state, does not write ledger entries, and does not award Work Credits.

## Source checkpoints

### DataNet Published Object Fetch v1

- Head: `385d6d8`
- Cross-box tag: `ckpt-public-node-datanet-published-object-fetch-v1-live-rollup-green-20260617-000640`
- Focused proof marker: `VOID_DATANET_PUBLISHED_OBJECT_FETCH_PROOF_V1_GREEN`
- Live rollup line: `datanet_published_object_fetch_live_status_rollup_green=true`

Sealed integrity posture:

- `object_selected_from_manifest=true`
- `object_sha256_verified=true`
- `bytes_match_source=true`
- `raw_request_dataset_id_used_to_build_filesystem_path=false`
- `raw_request_sha256_used_to_build_filesystem_path=false`
- `malformed_sha_rejected=true`
- `missing_object_returns_404=true`
- `absolute_source_path_disclosed=false`
- `operator_home_path_disclosed=false`

### DataNet Published Retrieval Duplicate Guard Decision Boundary v1

- Head: `12d41ed1`
- Cross-box tag: `ckpt-public-node-datanet-published-retrieval-duplicate-guard-decision-boundary-v1-live-rollup-green-20260617-022702`
- Focused proof marker: `VOID_DATANET_PUBLISHED_RETRIEVAL_DUPLICATE_GUARD_DECISION_BOUNDARY_PROOF_V1_GREEN`
- Live rollup line: `datanet_published_retrieval_duplicate_guard_decision_boundary_live_status_rollup_green=true`

Sealed decision posture:

- `review_packet_valid=true`
- `duplicate_guard_required=true`
- `duplicate_guard_performed_now=true`
- `duplicate_found=false`
- `duplicate_record_written_now=false`
- `operator_approval_recorded_now=false`

## Current transition checkpoint

The immediately preceding lane was DataNet Core Peer Pin Lane Closeout Capsule v1.

- Head: `609d63ea`
- Cross-box tag: `ckpt-datanet-core-peer-pin-lane-closeout-capsule-v1-cross-box-green-20260617-223325`
- Proof marker: `VOID_DATANET_CORE_PEER_PIN_LANE_CLOSEOUT_CAPSULE_PROOF_V1_GREEN`
- Posture: `closed_held_resumable`
- Decision: `continue_hold`
- Requires explicit reopen: `true`

## Required summary status

- `datanet_core_published_object_integrity_summary_created_now=true`
- `datanet_core_published_object_integrity_summary_terminal_safe=true`
- `datanet_core_published_object_integrity_summary_static_only=true`
- `datanet_core_published_object_integrity_summary_runs_object_fetch=false`
- `datanet_core_published_object_integrity_summary_runs_duplicate_guard=false`
- `datanet_core_published_object_integrity_summary_runs_full_live_rollup=false`
- `datanet_core_published_object_integrity_summary_published_object_fetch_head=385d6d8`
- `datanet_core_published_object_integrity_summary_duplicate_guard_head=12d41ed1`
- `datanet_core_published_object_integrity_summary_peer_pin_closeout_head=609d63ea`
- `datanet_core_published_object_integrity_summary_object_selected_from_manifest=true`
- `datanet_core_published_object_integrity_summary_object_sha256_verified=true`
- `datanet_core_published_object_integrity_summary_bytes_match_source=true`
- `datanet_core_published_object_integrity_summary_raw_request_dataset_id_used_to_build_filesystem_path=false`
- `datanet_core_published_object_integrity_summary_raw_request_sha256_used_to_build_filesystem_path=false`
- `datanet_core_published_object_integrity_summary_malformed_sha_rejected=true`
- `datanet_core_published_object_integrity_summary_missing_object_returns_404=true`
- `datanet_core_published_object_integrity_summary_absolute_source_path_disclosed=false`
- `datanet_core_published_object_integrity_summary_operator_home_path_disclosed=false`
- `datanet_core_published_object_integrity_summary_duplicate_guard_required=true`
- `datanet_core_published_object_integrity_summary_duplicate_guard_performed_now=true`
- `datanet_core_published_object_integrity_summary_duplicate_found=false`
- `datanet_core_published_object_integrity_summary_duplicate_record_written_now=false`
- `datanet_core_published_object_integrity_summary_operator_approval_recorded_now=false`
- `peer_pin_lane_posture=closed_held_resumable`
- `peer_pin_current_decision=continue_hold`
- `peer_pin_lane_requires_explicit_reopen=true`
- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`

## Authority boundary

This summary adds no publish authority, no fetch execution authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.

It is a static verifier-facing orientation document only.
