# hooks txroot setter heartbeat empty catch visibility v1

This lane closes the single literal empty catch body in `src/hooks/txroot_setter.ts`.

## Boundary

This does not change txroot setter/exporter behavior.

The heartbeat still increments the existing `G.__void_txroot_setter.heartbeat_total` counter every two seconds. If the heartbeat increment unexpectedly fails, the failure is now visible through a non-fatal warning marker instead of disappearing through `catch {}`.

## Required marker

`VOID_HOOKS_TXROOT_SETTER_HEARTBEAT_EMPTY_CATCH_VISIBILITY_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_hooks_txroot_setter_heartbeat_empty_catch_visibility.ts
```

Expected terminal marker:

`VOID_HOOKS_TXROOT_SETTER_HEARTBEAT_EMPTY_CATCH_VISIBILITY_V1_GREEN`
