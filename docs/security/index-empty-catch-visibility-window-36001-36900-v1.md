# Index empty catch visibility window 36001-36900 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_36001_36900_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `36001-36900` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_36001_36900_V1_VISIBLE`
- Closed in window: `22`
- Window empty catch count before: `22`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `523`
- `src/index.ts` line-based empty catch count after: `501`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `1daa48d7ccd4748c4c00367acab08a7df4289e3d4a667eb54a67ede75d1943b8`
