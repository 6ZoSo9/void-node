# Index empty catch visibility window 15301-16200 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_15301_16200_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `15301-16200` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_15301_16200_V1_VISIBLE`
- Closed in window: `7`
- Window empty catch count before: `7`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `993`
- `src/index.ts` line-based empty catch count after: `986`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `b3ec7e54fcc3f6e50be4d7bf8a3304eaf9bc5a70e95f07fa18a50b87fc922727`
