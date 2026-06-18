# DataNet Core Public Verification Static Manifest v1

Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_STATIC_MANIFEST_DOC_V1`

This manifest records the canonical static public verification bundle after the Proof Bundle Index v1 checkpoint.

Current base:

- Head: `f746179f`
- Cross-box tag: `ckpt-datanet-core-public-verification-proof-bundle-index-v1-cross-box-green-20260618-072025`
- Proof bundle index marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_PROOF_BUNDLE_INDEX_PROOF_V1_GREEN`

Manifest entries:

1. Proof Bundle Index v1
   - Document: `docs/public/public-node-datanet-core-public-verification-proof-bundle-index-v1.md`
   - Proof: `ops/mainnet0/datanet-core-public-verification-proof-bundle-index-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_PROOF_BUNDLE_INDEX_PROOF_V1_GREEN`

2. Reviewer Packet v1
   - Document: `docs/public/public-node-datanet-core-public-verification-reviewer-packet-v1.md`
   - Proof: `ops/mainnet0/datanet-core-public-verification-reviewer-packet-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_REVIEWER_PACKET_PROOF_V1_GREEN`

3. Surface Map v1
   - Document: `docs/public/public-node-datanet-core-public-verification-surface-map-v1.md`
   - Proof: `ops/mainnet0/datanet-core-public-verification-surface-map-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_SURFACE_MAP_PROOF_V1_GREEN`

4. Entry Point v1
   - Document: `docs/public/public-node-datanet-core-public-verification-entry-point-v1.md`
   - Proof: `ops/mainnet0/datanet-core-public-verification-entry-point-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_ENTRY_POINT_PROOF_V1_GREEN`

5. Handoff v1
   - Document: `docs/public/public-node-datanet-core-public-verification-handoff-v1.md`
   - Proof: `ops/mainnet0/datanet-core-public-verification-handoff-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_HANDOFF_PROOF_V1_GREEN`

6. Route Safety Index v1
   - Document: `docs/public/public-node-datanet-core-route-safety-index-v1.md`
   - Proof: `ops/mainnet0/datanet-core-route-safety-index-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_ROUTE_SAFETY_INDEX_PROOF_V1_GREEN`

7. Published Object Integrity Summary v1
   - Document: `docs/public/public-node-datanet-core-published-object-integrity-summary-v1.md`
   - Proof: `ops/mainnet0/datanet-core-published-object-integrity-summary-v1-proof.sh`
   - Marker: `VOID_DATANET_CORE_PUBLISHED_OBJECT_INTEGRITY_SUMMARY_PROOF_V1_GREEN`

Required static manifest status:

- `datanet_core_public_verification_static_manifest_created_now=true`
- `datanet_core_public_verification_static_manifest_terminal_safe=true`
- `datanet_core_public_verification_static_manifest_static_only=true`
- `datanet_core_public_verification_static_manifest_base_head=f746179f`
- `datanet_core_public_verification_static_manifest_proof_bundle_index_cross_box_green=true`
- `datanet_core_public_verification_static_manifest_manifest_entries_documented=true`
- `datanet_core_public_verification_static_manifest_runs_proof_chain=false`
- `datanet_core_public_verification_static_manifest_runs_route_calls=false`
- `datanet_core_public_verification_static_manifest_runs_object_fetch=false`
- `datanet_core_public_verification_static_manifest_runs_duplicate_guard=false`
- `datanet_core_public_verification_static_manifest_runs_full_live_rollup=false`
- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`

Authority boundary:

This static manifest does not reveal private commands, print private commands, disclose command strings, execute commands, run the proof chain, call routes, fetch objects, run duplicate guard, run the full live rollup, mutate public state, write ledger entries, or award Work Credits.

This static manifest adds no proof execution authority, no route execution authority, no fetch authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.
