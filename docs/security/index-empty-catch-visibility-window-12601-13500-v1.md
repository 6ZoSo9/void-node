# Index empty catch visibility window 12601-13500 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_12601_13500_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `12601-13500` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_12601_13500_V1_VISIBLE`
- Closed in window: `6`
- Window empty catch count before: `6`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `1013`
- `src/index.ts` line-based empty catch count after: `1007`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `b595fa4b8a58b1711ec9e16882335f7fc70e528259d6d7472960e5c603db4c5e`
