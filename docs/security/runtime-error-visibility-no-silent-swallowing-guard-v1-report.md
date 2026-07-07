# runtime error visibility no silent swallowing guard v1

- generated_at: 1970-01-01T00:00:00.000Z
- status: GREEN
- node_core_sha256: 24b1ff0bc65ac3e91b2101cdd31675b3de33c2323d08aacb98881b69b390a050
- repo_catch_context_count: 2786
- node_core_catch_context_count: 37
- node_core_literal_empty_catch_count: 0
- repo_literal_empty_catch_count: 963

## Scope

This guard is intentionally bounded: it freezes the core node_core zero-empty-catch and visible-failure boundary while recording repo-wide catch pressure for later bounded cleanup lanes.

## Top catch context files

- 2542: `src/index.ts`
- 37: `src/node_core.ts`
- 28: `src/chain/seg_store.ts`
- 20: `src/cli.ts`
- 20: `src/http/datanet_routes.ts`
- 13: `src/chain/block.ts`
- 11: `src/diag/fs_autoclose_guard_v1.ts`
- 11: `src/http/participant_wallet_native_v1.ts`
- 10: `src/diag/fs_autoclose_guard_v2.ts`
- 8: `scripts/check_store.ts`
- 7: `src/local-multibox-runtime-route-v1.ts`
- 6: `src/dev/dev_safe_bundle.ts`
- 5: `scripts/follower_once.ts`
- 5: `src/chain/auto_repair.ts`
- 4: `src/bootstrap/proto_scrub.ts`
- 4: `src/chain/receipts.ts`
- 4: `src/diag-identify.ts`
- 4: `src/http/routes/index_kidx_extras.ts`
- 4: `src/http/workcredits-devnet.ts`
- 4: `src/receipts.ts`

## Findings

- [PASS] repo-catch-inventory-baseline: repo catch context count=2786, expected=2786
- [PASS] node-core-catch-context-baseline: src/node_core.ts catch context count=37, expected=37
- [PASS] node-core-literal-empty-catch-zero: src/node_core.ts literal empty catch count=0, expected=0
- [PASS] repo-wide-literal-empty-catch-pressure-recorded: repo literal empty catch count=963, expected>0 as bounded future cleanup inventory
- [PASS] catch-inventory-baseline-src/index.ts: src/index.ts catch context count=2542, expected=2542
- [PASS] catch-inventory-baseline-src/node_core.ts: src/node_core.ts catch context count=37, expected=37
- [PASS] catch-inventory-baseline-src/chain/seg_store.ts: src/chain/seg_store.ts catch context count=28, expected=28
- [PASS] catch-inventory-baseline-src/http/datanet_routes.ts: src/http/datanet_routes.ts catch context count=20, expected=20
- [PASS] catch-inventory-baseline-src/cli.ts: src/cli.ts catch context count=20, expected=20
- [PASS] node-core-visibility-marker-VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_FAILURE_VISIBLE: marker present
- [PASS] node-core-visibility-marker-VOID_MEMPOOL_BEST_EFFORT_FAILURE_VISIBLE: marker present
- [PASS] node-core-visibility-marker-VOID_PEER_HEAD_PROBE_BEST_EFFORT_FAILURE_VISIBLE: marker present
- [PASS] node-core-visibility-marker-VOID_IMPORT_HEAD_ADVANCE_BEST_EFFORT_FAILURE_VISIBLE: marker present
- [PASS] node-core-visibility-marker-VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE: marker present
- [PASS] proof-present-scripts/prove_silent_catch_zero_terminal_final_seal.ts: proof present
- [PASS] proof-present-scripts/prove_remaining_runtime_best_effort_silent_catch_visibility.ts: proof present
- [PASS] proof-present-scripts/prove_silent_catch_classification_registry.ts: proof present
- [PASS] proof-present-scripts/prove_peer_import_side_effect_write_error_visibility_preflight.ts: proof present
- [PASS] proof-present-scripts/prove_peer_import_side_effect_write_error_visibility_closure.ts: proof present
