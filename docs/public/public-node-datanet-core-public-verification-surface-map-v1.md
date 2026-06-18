# DataNet Core Public Verification Surface Map v1

Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_SURFACE_MAP_DOC_V1`

This map records the first public verification surfaces available after the DataNet Core Public Verification Entry Point v1 checkpoint.

Current base:

- Head: `10459755`
- Cross-box tag: `ckpt-datanet-core-public-verification-entry-point-v1-cross-box-green-20260617-235937`
- Entry point proof marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_ENTRY_POINT_PROOF_V1_GREEN`

Mapped public verification surfaces:

1. Entry point
   - Document: `docs/public/public-node-datanet-core-public-verification-entry-point-v1.md`
   - Proof: `ops/mainnet0/datanet-core-public-verification-entry-point-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_ENTRY_POINT_PROOF_V1_GREEN`

2. Handoff
   - Document: `docs/public/public-node-datanet-core-public-verification-handoff-v1.md`
   - Proof: `ops/mainnet0/datanet-core-public-verification-handoff-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_HANDOFF_PROOF_V1_GREEN`

3. Route safety index
   - Document: `docs/public/public-node-datanet-core-route-safety-index-v1.md`
   - Proof: `ops/mainnet0/datanet-core-route-safety-index-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_ROUTE_SAFETY_INDEX_PROOF_V1_GREEN`

4. Published object integrity summary
   - Document: `docs/public/public-node-datanet-core-published-object-integrity-summary-v1.md`
   - Proof: `ops/mainnet0/datanet-core-published-object-integrity-summary-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLISHED_OBJECT_INTEGRITY_SUMMARY_PROOF_V1_GREEN`

Required surface map status:

- `datanet_core_public_verification_surface_map_created_now=true`
- `datanet_core_public_verification_surface_map_terminal_safe=true`
- `datanet_core_public_verification_surface_map_static_only=true`
- `datanet_core_public_verification_surface_map_base_head=10459755`
- `datanet_core_public_verification_surface_map_entry_point_cross_box_green=true`
- `datanet_core_public_verification_surface_map_handoff_indexed=true`
- `datanet_core_public_verification_surface_map_route_safety_index_indexed=true`
- `datanet_core_public_verification_surface_map_object_integrity_summary_indexed=true`
- `datanet_core_public_verification_surface_map_runs_route_calls=false`
- `datanet_core_public_verification_surface_map_runs_object_fetch=false`
- `datanet_core_public_verification_surface_map_runs_duplicate_guard=false`
- `datanet_core_public_verification_surface_map_runs_full_live_rollup=false`
- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`

Authority boundary:

This surface map does not reveal private commands, print private commands, disclose command strings, execute commands, call routes, fetch objects, run duplicate guard, run the full live rollup, mutate public state, write ledger entries, or award Work Credits.

This surface map adds no route execution authority, no fetch authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.
