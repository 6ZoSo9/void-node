# Index empty catch visibility window 31501-32400 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_31501_32400_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `31501-32400` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_31501_32400_V1_VISIBLE`
- Closed in window: `27`
- Window empty catch count before: `27`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `632`
- `src/index.ts` line-based empty catch count after: `605`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `6d979bafcfb2e07205cfa419efee426ac6a1189bc46ba2c2e59d211d944b8a93`
