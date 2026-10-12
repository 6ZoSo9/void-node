# remaining runtime best-effort silent catch visibility v1

This audit closes the final runtime best-effort literal `catch {}` sites without changing consensus behavior.

## Boundary

This lane does not change block validity, import validity, peer selection, or consensus validation semantics.

The following best-effort paths remain non-fatal, but failures no longer disappear through silent `catch {}` blocks:

- LAN IP discovery fallback
- `sendRaw` socket write
- follower periodic pull wrapper

## Required marker

`VOID_REMAINING_RUNTIME_BEST_EFFORT_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_remaining_runtime_best_effort_silent_catch_visibility.ts
```

Expected terminal marker:

`VOID_REMAINING_RUNTIME_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN`
