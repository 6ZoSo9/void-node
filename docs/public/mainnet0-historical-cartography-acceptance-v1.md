# VOID Mainnet-0 Historical Cartography Acceptance v1.2

## Purpose

This acceptance layer closes the Phase-1 authority gaps discovered during review of Mainnet-0 historical cartography PR #1450 without changing chain validation or the already-published exhaustive V1.1 map.

The V1.1 manifest remains the immutable scan record for heights `0..1951058`. V1.2 adds a separate content-addressed acceptance seal that is required before that map may be treated as canonical historical authority.

## Why a separate acceptance seal exists

The exhaustive V1.1 scan proved:

- every canonical frame on the scanned Precision materialization was classified;
- zero unknown blocks;
- zero ambiguous classifications;
- zero transition gaps;
- deterministic class counts and per-height digest;
- no validator, SegStore, follower, runtime, or canonical-byte mutation.

That did not by itself prove three distinct authority properties raised by review:

1. **Canonical source authority** — one self-consistent source copy must not certify itself as canonical.
2. **Schedule-independent scan generation coherence** — source-head, WAL, segment-namespace, checkpoint-descriptor, or segment-byte movement must not be silently composed into a successful scan/acceptance generation.
3. **Classification semantics identity** — later consumers must not reinterpret old class labels under changed classifier/schema predicates that reuse the same names, and the published semantics root must describe the classifier generation that actually executed.

V1.2 closes these as an acceptance layer rather than rewriting the V1.1 scan record.

## Acceptance inputs

The hardened acceptance sealer requires five independently checked inputs:

1. the complete V1.1 scan manifest;
2. a content-addressed independent-prefix authority receipt;
3. a verified blocks-only checkpoint directory containing exactly the frozen `0..frozen_head` canonical prefix;
4. a separately reviewed expected authority ID; and
5. a separately reviewed expected classification-semantics root for the exact executing repository generation.

The expected authority ID and expected semantics root are mandatory. They may not be omitted and then derived from the candidate object during the same acceptance call.

## Independent canonical-prefix authority

The reviewed real-source authority witness for frozen head `1951058` is based on two independent materializations: Precision and Alienware.

Both materializations are byte-prefix scanned through height `1951058`, with Alienware repeated twice. The authority-producing operation requires:

- `1951059` contiguous frames;
- `196` segment-prefix descriptors;
- `452333282` total prefix bytes;
- identical per-segment prefix SHA-256 commitments;
- identical genesis raw-frame SHA-256;
- identical frozen-head raw-frame SHA-256;
- a reproducible `prefix_root`;
- distinct primary/witness materialization identities; and
- no append, validator, or runtime authority.

For acceptance, every recorded primary/witness head-surface tuple is a closed three-element array of safe nonnegative integers and every element must equal `frozen_head`. Missing, malformed, drifting, or out-of-range head evidence HOLDs before acceptance publication.

The authority receipt is itself content-addressed, but self-addressing is not sufficient authority. The sealer additionally requires the exact reviewed `expected_authority_id`; a self-consistent substitute history that mints its own receipt therefore cannot certify itself by simply passing its freshly minted ID back into an unanchored acceptance call.

The private operational receipt remains an evidence source. The public acceptance seal includes only the content-addressed authority ID and the non-secret canonical prefix commitments required by future verification.

## Immutable snapshot re-scan

The sealer does not treat a mutable pathname as the final scan authority.

A blocks-only checkpoint packet is first captured and independently verified using the checkpoint tooling from PR #1454. The hardened sealer then:

1. reads every checkpoint `blocks.bin` as a stable regular-file generation;
2. validates exact frame sequencing through `frozen_head`;
3. captures those exact bytes plus the checkpoint descriptor into a private create-only snapshot generation;
4. recomputes the canonical prefix commitment from the captured bytes and requires exact equality with the reviewed authority receipt;
5. re-runs the V1.1 cartography scanner over the captured snapshot generation;
6. requires the re-scan `complete_scan_digest`, class counts, compressed ranges, exceptions, and anchors to exactly reproduce the original exhaustive V1.1 manifest; and
7. binds the acceptance seal to the captured checkpoint descriptor SHA-256 and immutable re-scan identity.

The V1.1 scanner itself also terminally revalidates head markers, empty-WAL generation, exact numeric segment namespace, checkpoint descriptor identity, and every inventoried `blocks.bin` stat/hash generation before reporting success.

Output and evidence publication use a pinned external parent directory object with no-follow/create-only semantics. A symlink alias or replaced parent that resolves into the source/checkpoint tree HOLDs before a source-tree namespace mutation.

## Classification semantics root

V1.2 computes:

`classification_semantics.root = sha256(stable-json(file-digest-set))`

over exactly:

- `scripts/mainnet0_historical_cartography_v1.mjs`
- `public/mainnet0-historical-cartography-v1.schema.json`

The root is derived from the exact checkout containing the classifier module that executes the seal. A caller-selected alternate repository tree may not supply the published semantics identity.

The acceptance seal records the exact per-file SHA-256 values and aggregate root. The separately reviewed expected semantics root is mandatory. Any classifier or schema change, including a changed predicate under the same visible class names/version, changes this root and an old reviewed root HOLDs.

Future consumers must require the reviewed semantics root associated with the accepted seal rather than accepting class names alone.

## Numeric/count conservation

Before sealing, V1.2 revalidates:

- `historical_blocks_scanned === frozen_head + 1`;
- every class count is a nonnegative safe integer;
- `sum(class_counts) === historical_blocks_scanned`;
- the scan is complete with zero HOLDs, unknowns, ambiguities, and transition gaps;
- the scan manifest content address recomputes exactly.

The immutable re-scan then independently reproduces the same summary and per-height digest.

## Deterministic falsification wall

The Node 22/24/26 focused proof requires, among other cases:

- missing reviewed authority ID -> HOLD;
- a self-consistent substitute history under the wrong reviewed authority ID -> HOLD;
- malformed or drifting authority head surfaces -> HOLD;
- missing reviewed semantics root -> HOLD;
- caller-selected alternate semantics tree -> HOLD;
- changed classifier predicate under unchanged visible labels -> different semantics root;
- checkpoint-prefix mutation -> HOLD;
- post-preflight WAL mutation -> HOLD;
- post-preflight head movement -> HOLD;
- post-inventory segment-namespace movement -> HOLD;
- checkpoint-descriptor movement -> HOLD;
- output/evidence symlink alias into the frozen source -> HOLD before source mutation; and
- safe external create-only publication -> success.

Hermetic proof success does not substitute for the real Precision/Alienware authority receipt and real immutable checkpoint acceptance run.

## Acceptance identity

`acceptance_id` is:

`voidm0accept1_<sha256(stable-json(acceptance-without-acceptance_id))>`

The seal binds:

- original V1.1 manifest ID;
- original source ID;
- frozen head and block count;
- complete scan digest and class counts;
- independently witnessed canonical-prefix authority ID and root;
- all 196 public prefix descriptors;
- immutable checkpoint descriptor SHA-256;
- immutable checkpoint source/manifest identities;
- exact executing classifier/schema semantics root; and
- the Phase-1 no-authority contract.

## Fail-closed conditions

The sealer HOLDs on, among other things:

- scan manifest content-ID mismatch;
- scan count conservation mismatch;
- unresolved scan HOLD state;
- authority receipt content-ID mismatch;
- malformed/missing/drifting authority head surfaces;
- missing or mismatched reviewed authority ID;
- authority prefix-root mismatch;
- checkpoint/authority byte-prefix mismatch;
- immutable checkpoint re-scan digest mismatch;
- classification map mismatch;
- checkpoint descriptor mismatch;
- caller-selected semantics repository generation;
- missing or mismatched reviewed classification-semantics root; or
- publication parent alias/replacement into a forbidden source tree.

## Authority boundary

This acceptance seal is historical evidence only. It grants no:

- append authority;
- validator authority;
- runtime authority;
- deployment/restart authority;
- canonical-chain rewrite/reset/reseed authority;
- wallet/signer/treasury/Work Credit authority;
- transaction authority; or
- funds movement authority.

A later incremental cartography consumer must explicitly require the accepted V1.2 seal before extending the historical prefix.
