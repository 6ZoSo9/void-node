# Index empty catch visibility window 40501-41400 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_40501_41400_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `40501-41400` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_40501_41400_V1_VISIBLE`
- Closed in window: `26`
- Window empty catch count before: `26`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `398`
- `src/index.ts` line-based empty catch count after: `372`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `c0a69e4a6c48b1b1b45ce59bc9fee3b5fc6bb87ddcee30a0381db90785f910bc`
