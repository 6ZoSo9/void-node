# runtime error visibility no silent swallowing guard v1

This lane adds a bounded runtime error visibility guard.

## Scope

This is an audit/proof guard only. It does not change runtime behavior.

The guard intentionally does **not** attempt to rewrite the whole repository. Current catch pressure is concentrated in historical `src/index.ts` shim/dev/runtime surfaces and must be handled later through bounded cleanup lanes.

This guard freezes the core boundary:

- `src/node_core.ts` remains at the reviewed catch-context baseline.
- `src/node_core.ts` has zero literal empty catch bodies.
- existing node-core visible failure markers remain present.
- the prior silent-catch terminal final seal and registry proofs remain present.
- repo-wide catch pressure is recorded in a deterministic report for later cleanup.

## Required marker

`VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_V1_GREEN`

## Proof

Run:

```bash
npx tsx scripts/prove_runtime_error_visibility_no_silent_swallowing_guard.ts
```

Expected terminal marker:

`VOID_RUNTIME_ERROR_VISIBILITY_NO_SILENT_SWALLOWING_GUARD_V1_GREEN`
