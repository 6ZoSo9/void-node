# Index empty catch visibility window 27001-27900 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_27001_27900_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `27001-27900` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_27001_27900_V1_VISIBLE`
- Closed in window: `59`
- Window empty catch count before: `59`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `763`
- `src/index.ts` line-based empty catch count after: `704`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `89d57ae3247e66c75fa3d92625eed8c43fd7f7e50af1a5e4e44ebaf36a58759e`
