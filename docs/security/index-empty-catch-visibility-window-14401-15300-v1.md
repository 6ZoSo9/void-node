# Index empty catch visibility window 14401-15300 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_14401_15300_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `14401-15300` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_14401_15300_V1_VISIBLE`
- Closed in window: `9`
- Window empty catch count before: `9`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `1002`
- `src/index.ts` line-based empty catch count after: `993`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `ccf3c49238ed5303683b372aef21bc2b015788f2bcf8e161e459ea3d14a38166`
