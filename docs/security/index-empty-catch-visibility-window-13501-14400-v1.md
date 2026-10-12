# Index empty catch visibility window 13501-14400 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_13501_14400_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `13501-14400` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_13501_14400_V1_VISIBLE`
- Closed in window: `5`
- Window empty catch count before: `5`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `1007`
- `src/index.ts` line-based empty catch count after: `1002`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `890e59d6468aa9ebf98320ffa83f29da8a5ee187ab2b2dfe01280f86a88801bc`
