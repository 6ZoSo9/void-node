# peer import side-effect write error visibility closure v1

This audit closes the warning class exposed by `peer-import-side-effect-write-error-visibility-preflight-v1`.

## Boundary

Consensus validation semantics are not changed by this closure.

The closure only changes side-effect write failure visibility for:

- local production tx index writes
- local production kidx rebuilds
- local production receipt writes
- peer import tx index writes
- peer import receipt writes

These side-effect failures remain non-fatal to block production/import, but they no longer disappear through silent `catch {}` blocks.

## Required marker

`VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_peer_import_side_effect_write_error_visibility_closure.ts
```

Expected terminal marker:

`VOID_PEER_IMPORT_SIDE_EFFECT_WRITE_ERROR_VISIBILITY_CLOSURE_V1_GREEN`
