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

`d5ad8c401b67832919eeabd95f26bdae513e68fe`

Hosted run: `38842795661`.

Cross-node artifacts:

- Node 22: `12021975652`;
- Node 24: `12022490250`;
- Node 26: `12022580213`.

Exact receipt:

- census ID:
  `voidbefv7c5_15bb0ac8cfebf0f70b20442dd80bb84ea4bef4e0b50eefff71363237a0bf6c47`;
- JSON bytes: `25356`;
- JSON SHA-256:
  `66f9a8e98cfa289117c58a661532b3fa6403f9c8d116c1c5c4462d66e1454057`;
- protected inventory SHA-256:
  `297399d8c5cd975e5bf9f96adc291aebae13ce6a83c26ca5a039668c7b32b0f2`;
- protected path count: `49`;
- intentional protected delta count: `2`;
- unchanged protected path count: `47`.

The candidate independently inspects the current 49-path enforcement inventory
and requires no protected path drift after exact #2872 head
`6080389131c3cdb80fa9935b5ff80f4e40f09938`.

This generation does **not** runtime-import the TypeScript deployment installer
to obtain that list. The current source tree contains source-relative `.js`
imports that are valid for the reviewed compiled/runtime path but are not
directly executable from the TypeScript source location on every hosted Node
major. V3 therefore authenticates the installer source blob first, parses the
exact frozen `VOID_BUY_VOID_CURRENT_ENFORCEMENT_TRACKED_SOURCE_PATHS_V1`
array with the locked TypeScript parser, requires exactly 49 unique sorted
string literals, and rederives every visible Git blob and executable mode
directly from the checkout. The resulting canonical inventory must equal the
accepted V5 census digest.

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
