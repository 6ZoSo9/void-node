# DataNet Core Public Verification Entry Point v1

Marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_ENTRY_POINT_DOC_V1`

This entry point records where a public verifier should begin after the DataNet core public verification handoff.

Current base:

- Head: `b91255c9`
- Cross-box tag: `ckpt-datanet-core-public-verification-handoff-v1-cross-box-green-20260617-235128`
- Handoff proof marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_HANDOFF_PROOF_V1_GREEN`

Safe verification starting surfaces:

1. Peer-pin lane closeout
   - Posture: `closed_held_resumable`
   - Exact command reveal remains held.
   - No command reveal, no command print, no command disclosure, no command execution.

2. Published object integrity summary
   - Proof marker: `VOID_DATANET_CORE_PUBLISHED_OBJECT_INTEGRITY_SUMMARY_PROOF_V1_GREEN`
   - Records object-fetch safety posture without running object fetch.

3. Route safety index
   - Proof marker: `VOID_DATANET_CORE_ROUTE_SAFETY_INDEX_PROOF_V1_GREEN`
   - Records safe DataNet route posture without calling public routes.

4. Public verification handoff
   - Proof marker: `VOID_DATANET_CORE_PUBLIC_VERIFICATION_HANDOFF_PROOF_V1_GREEN`
   - Records safe restart point at `b91255c9`.

Required entry point status:

- `datanet_core_public_verification_entry_point_created_now=true`
- `datanet_core_public_verification_entry_point_terminal_safe=true`
- `datanet_core_public_verification_entry_point_static_only=true`
- `datanet_core_public_verification_entry_point_base_head=b91255c9`
- `datanet_core_public_verification_entry_point_handoff_cross_box_green=true`
- `datanet_core_public_verification_entry_point_peer_pin_closed=true`
- `datanet_core_public_verification_entry_point_object_integrity_summary_available=true`
- `datanet_core_public_verification_entry_point_route_safety_index_available=true`
- `datanet_core_public_verification_entry_point_public_start_documented=true`
- `datanet_core_public_verification_entry_point_runs_route_calls=false`
- `datanet_core_public_verification_entry_point_runs_object_fetch=false`
- `datanet_core_public_verification_entry_point_runs_duplicate_guard=false`
- `datanet_core_public_verification_entry_point_runs_full_live_rollup=false`
- `public_mutation=false`
- `ledger_write=false`
- `wc_credit_award=false`

Authority boundary:

This entry point does not reveal private commands, print private commands, disclose command strings, execute commands, call routes, fetch objects, run duplicate guard, run the full live rollup, mutate public state, write ledger entries, or award Work Credits.

This entry point adds no route execution authority, no fetch authority, no mirror authority, no pin authority, no public mutation authority, no ledger authority, and no Work Credit authority.
