# Index empty catch visibility window 17101-18000 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_17101_18000_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `17101-18000` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_17101_18000_V1_VISIBLE`
- Closed in window: `6`
- Window empty catch count before: `6`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `965`
- `src/index.ts` line-based empty catch count after: `959`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `9a04938c42838523dba514161a7cec84e8787a9d451531db58328ed25680cfb3`
