# peer head probe best-effort silent catch visibility v1

This audit closes peer-head probe fallback silent catches without changing import or consensus behavior.

## Boundary

This lane does not change block validity, import validity, peer selection, or consensus validation semantics.

Peer-head probe failures remain non-fatal, but failures from these fallback probes no longer disappear through silent `catch {}` blocks:

- `/blocks/latest/number2.json`
- `/head`
- `/__void/demo/summary.json`
- `/api/health`

## Required marker

`VOID_PEER_HEAD_PROBE_BEST_EFFORT_FAILURE_VISIBLE`

## Proof

Run:

```bash
npx tsx scripts/prove_peer_head_probe_best_effort_silent_catch_visibility.ts

Expected terminal marker:

VOID_PEER_HEAD_PROBE_BEST_EFFORT_SILENT_CATCH_VISIBILITY_V1_GREEN
