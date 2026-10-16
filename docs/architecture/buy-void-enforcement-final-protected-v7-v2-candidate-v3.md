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

Because the accepted #3242 repair is workflow-only, V3 also pins the repaired
census workflow Git blob
`96583f38c1727e82bae23bb24c37e23959421db7` and requires the hosted census
evidence to name that same workflow generation. A child-side workflow drift
therefore cannot inherit the accepted census receipt silently.

V3 also re-executes the exact pinned #3242 census proof on the candidate head.
That current-head revalidation must reproduce the accepted protected inventory,
economic artifact/source inventories, exact two-path protected delta, zero
economic/build-source drift, frozen-candidate/lock nonmutation, and all
authority-false fields. The new revalidation census ID plus candidate-head/tree
are included in the content-addressed V3 candidate. This prevents changes to
range proofs, canonical-producer/checkpoint evidence, frozen V2 evidence, or
other census inputs from inheriting stale parent evidence.

The V3 workflow trigger set deliberately covers the complete source classes
consumed by this revalidation (`ops/**`, `runtime/**`, `scripts/**`,
`src/**`, `tools/**`, package/build files and the exact pinned workflow
inputs), in addition to its exact dependency paths.

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

V3's direct runtime/build-source ancestry check is intentionally anchored at
reviewed range-era base
`ccb1bd973a60875ecebf570905e6d8fc1c15ae3c`, not the historical V2 branch
parent. The old parent is no longer a valid current-generation ancestry
boundary. This does not substitute a new economic closure: the V5 census and
V3's independent inventory derivation must still reproduce the frozen accepted
28 economic artifact/source hashes exactly, while Git proves zero
`src/economic` / package / build-config drift from the reviewed current base
through the V3 head.

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

## Provider-closure successor semantics

The historical provider-closure lock proof is branch-scoped to its original
candidate ancestry and is preserved as immutable evidence; V3 does not execute
that historical proof on the range-generation branch.

Instead V3 pins the accepted provider evidence JSON and lock-proof blob, then
requalifies current content directly:
- every accepted provider source path must have the same Git blob as the
  accepted provider generation;
- package.json and package-lock.json must retain the accepted blobs;
- every accepted provider runtime artifact plus server/consumer/adapter
  boundary artifact must match the accepted byte length, SHA-256 and Git-blob
  identity after the current build;
- the accepted provider semantic digest must rederive exactly.

The V3 receipt therefore states
`historical_lock_proof_reexecuted=false` and
`current_content_semantics_requalified=true` rather than claiming ancestry
that does not exist.
