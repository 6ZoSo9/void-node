# Buy VOID final protected V7/V2 census v5

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CENSUS_V5`.

## Purpose

This source-only census is the bounded successor required by the machine-readable
`/blocks/range` source generation.

Frozen candidate V2 protects 49 exact paths. The new canonical source generation
changes exactly two of them:

- `src/index.ts` — the reviewed bounded-range error contract;
- `ops/run-void-node-live-v1.sh` — the reviewed canonical-producer V5 selector
  required for that exact index generation.

The census does not rewrite or repin frozen candidate V2 or lock V2.

## Required invariants

The proof requires:

- exact ancestry from reviewed main `ccb1bd973a60875ecebf570905e6d8fc1c15ae3c`
  through range parent `6080389131c3cdb80fa9935b5ff80f4e40f09938`;
- zero drift under `src/economic`, package manifests, and build TypeScript config;
- all 28 economic artifacts and all 28 economic sources remain byte-identical to
  the accepted V4 census identities;
- the 49-path protected inventory differs from frozen V2 at exactly the two
  reviewed paths above;
- the other 47 protected rows remain exact;
- exact reviewed range, canonical-producer V5, and checkpoint V6 source/proof
  blobs are present on the candidate head;
- Node 22, 24, and 26 emit byte-identical census JSON.

## Authority boundary

This is census evidence only.

`candidate_enforcement_identity_accepted=false`,
`deployed_artifact_generation_verified=false`,
`runtime_mount_authority=false`,
`production_source_finality_authority_ready=false`,
`public_presale_activation=false`, and `funds_movement=false`.

A later candidate successor may consume terminal hosted V5 census evidence. It
must not infer acceptance from source existence alone.
