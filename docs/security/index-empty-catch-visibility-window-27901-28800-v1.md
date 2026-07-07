# Index empty catch visibility window 27901-28800 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_27901_28800_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `27901-28800` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_27901_28800_V1_VISIBLE`
- Closed in window: `34`
- Window empty catch count before: `34`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `704`
- `src/index.ts` line-based empty catch count after: `670`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `c5e2b6bfef9e722eb6b2b20691928140f670f0bdd0e94bfb9ec4b9422e878234`
