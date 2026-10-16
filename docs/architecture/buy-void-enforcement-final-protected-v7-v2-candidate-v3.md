# Buy VOID final protected V7/V2 enforcement candidate v3

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_CANDIDATE_V3`.

Status: **source/CI candidate only; candidate identity unaccepted**.

## Purpose

V3 is the enforcement-candidate successor to accepted protected-source census
#3241.

The economic execution implementation and its hosted V4 artifact/source census
are unchanged. PR #2872 intentionally advances only two members of the
49-path protected source inventory:

- `ops/run-void-node-live-v1.sh`;
- `src/index.ts`.

V3 preserves the accepted V2 executable-closure derivation and replaces only
the protected-census/current-protected-inventory generation.

## Protected census evidence

Accepted V5 census head:

`c6313934b30e8bde185338455ed9125e5a91bc93`

Hosted run: `38841448450`.

Cross-node artifacts:

- Node 22: `12021607073`;
- Node 24: `12020628741`;
- Node 26: `12021029890`.

Exact receipt:

- census ID:
  `voidbefpv7v2c5_545a64602c017363aa83cdc64cafce7d73c1eadb14b1a9e8dde054006fc4daf1`;
- JSON bytes: `12338`;
- JSON SHA-256:
  `7798c61fbc25bcbcf552a56bbe79160d306168a3abed4ef3064dd1c1ce54e4ac`;
- protected inventory SHA-256:
  `297399d8c5cd975e5bf9f96adc291aebae13ce6a83c26ca5a039668c7b32b0f2`;
- protected path count: `49`;
- intentional protected delta count: `2`;
- unchanged protected path count: `47`.

The candidate independently inspects the current 49-path enforcement inventory
and requires no protected path drift after exact #2872 head
`6080389131c3cdb80fa9935b5ff80f4e40f09938`.

## Preserved executable closure

V3 retains V2's accepted derivation logic for:

- the 28-member economic source/artifact census;
- reviewed Node package-runtime identity;
- dependency-provider closure;
- six-module V7 executable delta;
- V2 live-process static edge;
- crash-consistent saga dynamic edge;
- complete executable-closure classification.

The historical V2 enforcement lock remains immutable predecessor evidence. V3
does not repin or modify it.

## Hosted qualification

Node 22, 24 and 26 each install the exact lockfile dependencies, typecheck/build
the reviewed source, run V3 self-test, and emit a complete candidate JSON.
Cross-node comparison requires all three candidate JSON files to be byte
identical.

A separate later lock must consume the exact accepted hosted V3 bytes before
any candidate identity can become accepted.

## Authority

Even GREEN keeps:

- `candidate_enforcement_identity_accepted=false`;
- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

No protected install, Precision runtime/service action, payment acceptance,
transaction, WC/VOID activation, treasury/liquidity action or funds movement is
authorized.

PROTECT THE CORE.
