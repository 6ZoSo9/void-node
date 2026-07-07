# peer import side-effect write error visibility preflight v1

- generated_at: 1970-01-01T00:00:00.000Z
- status: STATIC_PREFLIGHT_WARNINGS
- blocker_failures: none
- warning_failures: side-effect-silent-catch-sites-discovered, import-side-effect-silent-catch-sites-discovered
- node_core_sha256: 2435c260eb28d03f36ddb55dd98e782ebf9231a303dcf57f706f1581012bed9b
- block_source_sha256: ba2c4bfd1f0fc16e2ca3fc11a788a78cd8f70882e5fe9c926e978c0f7c3fdc9f
- silent_catch_count: 3
- side_effect_silent_catch_count: 0
- import_side_effect_silent_catch_count: 0
- local_production_side_effect_silent_catch_count: 0

## Findings

- [PASS] node-core-present (blocker): src/node_core.ts readable
- [PASS] block-source-present (blocker): src/chain/block.ts readable
- [PASS] validateBlockForAppend-exported (blocker): validateBlockForAppend export visible in src/chain/block.ts
- [PASS] node-core-references-validateBlockForAppend (blocker): src/node_core.ts references validateBlockForAppend
- [PASS] silent-catch-sites-discovered (info): catch {} matches=3
- [FAIL] side-effect-silent-catch-sites-discovered (warn): txIndex/receipts/kidx catch contexts=0
- [FAIL] import-side-effect-silent-catch-sites-discovered (warn): import side-effect catch contexts=0
- [FAIL] local-production-side-effect-silent-catch-sites-discovered (info): local production side-effect catch contexts=0

## Side-effect silent catch contexts

No txIndex/receipts/kidx-adjacent silent `catch {}` contexts found.
## Boundary

Static/source preflight only. This workflow records silent side-effect write catches and does not patch runtime behavior or claim fork-choice, consensus-finality, wallet-authority, ledger-write, validator-admission, signer-rotation, or autonomous-mutation closure.
