# Index empty catch visibility window 36901-37800 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_36901_37800_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `36901-37800` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_36901_37800_V1_VISIBLE`
- Closed in window: `49`
- Window empty catch count before: `49`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `501`
- `src/index.ts` line-based empty catch count after: `452`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `c231fc7e641f1a4f05e68be085d7640b1e4fbb50934e461b8eff70246eb6b25e`
