# Index empty catch visibility window 38701-39600 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_38701_39600_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `38701-39600` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_38701_39600_V1_VISIBLE`
- Closed in window: `22`
- Window empty catch count before: `22`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `431`
- `src/index.ts` line-based empty catch count after: `409`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `a4b318fb07e6180d35bac1fbe1197a9453bf52162e9e227038383ef0953fbbaa`
