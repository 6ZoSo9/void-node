# Index empty catch visibility window 37801-38700 v1

Status: GREEN once `scripts/prove_index_empty_catch_visibility_window_37801_38700_v1.ts` passes.

This bounded audit closes exact empty catch blocks in `src/index.ts` line window `37801-38700` by replacing silent swallow bodies with a visible best-effort marker.

- Marker: `VOID_INDEX_EMPTY_CATCH_VISIBILITY_WINDOW_37801_38700_V1_VISIBLE`
- Closed in window: `21`
- Window empty catch count before: `21`
- Window empty catch count after: `0`
- `src/index.ts` line-based empty catch count before: `452`
- `src/index.ts` line-based empty catch count after: `431`
- `src/index.ts` measured catch context count: `2563`
- SHA256: `46907f168fa2e335582774b2a8f23a2bab2e3d36b9fede18ebd09e23422481f0`
