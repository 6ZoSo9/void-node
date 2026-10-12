# Index empty catch visibility window 32401-33300 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_32401_33300_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `32401-33300` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_32401_33300_V1_VISIBLE`
- Closed in window: `32`
- Window empty catch count before: `32`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `605`
- `src/index.ts` line-based empty catch count after: `573`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `f0c6facb6ada12039b52359b86e5ac5f83d176488eb93dbcb7da33db72e871b6`
