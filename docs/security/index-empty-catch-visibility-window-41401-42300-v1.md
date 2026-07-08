# Index empty catch visibility window 41401-42300 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_41401_42300_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `41401-42300` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_41401_42300_V1_VISIBLE`
- Closed in window: `16`
- Window empty catch count before: `16`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `372`
- `src/index.ts` line-based empty catch count after: `356`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `6c1e3366f1259361a180472b418b6f8d7fa735d88d979f24bebc0d742bc36b2e`
