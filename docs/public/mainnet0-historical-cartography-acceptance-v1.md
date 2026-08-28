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
2. **Schedule-independent scan generation coherence** — an A→B→A rewrite during a live scan must not synthesize a mixed-generation map that later hashes back to the original source bytes.
3. **Classification semantics identity** — later consumers must not reinterpret old class labels under changed classifier/schema predicates that reuse the same names.

V1.2 closes these as an acceptance layer rather than rewriting the V1.1 scan record.

## Acceptance inputs

The acceptance sealer requires four inputs:

1. the complete V1.1 scan manifest;
2. a content-addressed independent-prefix authority receipt;
3. a verified blocks-only checkpoint directory containing exactly the frozen `0..frozen_head` canonical prefix; and
4. the exact reviewed repository generation containing the V1.1 scanner and schema.

## Independent canonical-prefix authority

The reviewed real-source authority witness for the frozen head `1951058` is based on two independent materializations: Precision and Alienware.

Both materializations were read-only scanned over the exact byte prefix through height `1951058`. Alienware repeated the same scan twice. Acceptance requires:

- `1951059` contiguous frames;
- `196` segment-prefix descriptors;
- `452333282` total prefix bytes;
- identical per-segment prefix SHA-256 commitments;
- identical genesis raw-frame SHA-256;
- identical frozen-head raw-frame SHA-256;
- a reproducible `prefix_root`;
- distinct primary/witness materialization identities; and
- no append, validator, or runtime authority.

The private operational receipt remains an evidence source. The public acceptance seal includes only the content-addressed authority ID and the non-secret canonical prefix commitments required by future verification.

## Immutable snapshot re-scan

The sealer does not trust a live mutable data directory for final authority.

A blocks-only checkpoint packet is first captured and independently verified using the already-reviewed checkpoint tooling from PR #1454. The sealer then:

1. hashes every checkpoint `blocks.bin` prefix;
2. recomputes the same prefix-root contract used by the independent authority witness;
3. requires exact equality with that independently witnessed prefix root;
4. re-runs the V1.1 cartography scanner over the immutable checkpoint packet;
5. requires the immutable re-scan `complete_scan_digest`, class counts, compressed ranges, exceptions, and anchors to exactly reproduce the original exhaustive V1.1 manifest; and
6. binds the acceptance seal to the checkpoint descriptor SHA-256 and immutable re-scan manifest identity.

Therefore a transient A→B→A rewrite on the live source cannot earn Phase-1 acceptance unless the resulting immutable authority-verified checkpoint independently reproduces the same complete per-height map.

## Classification semantics root

V1.2 computes:

`classification_semantics.root = sha256(stable-json(file-digest-set))`

over exactly:

- `scripts/mainnet0_historical_cartography_v1.mjs`
- `public/mainnet0-historical-cartography-v1.schema.json`

The acceptance seal records the exact per-file SHA-256 values and aggregate root.

Any classifier or schema change, including a changed predicate under the same visible class names/version, changes this root. Future consumers must require the reviewed semantics root associated with the accepted seal rather than accepting class names alone.

## Numeric/count conservation

Before sealing, V1.2 revalidates:

- `historical_blocks_scanned === frozen_head + 1`;
- every class count is a nonnegative safe integer;
- `sum(class_counts) === historical_blocks_scanned`;
- the scan is complete with zero HOLDs, unknowns, ambiguities, and transition gaps;
- the scan manifest content address recomputes exactly.

The immutable re-scan then independently reproduces the same summary and per-height digest.

## Acceptance identity

`acceptance_id` is:

`voidm0accept1_<sha256(stable-json(acceptance-without-acceptance_id))>`

The seal binds:

- original V1.1 manifest ID;
- original source ID;
- frozen head and block count;
- complete scan digest and class counts;
- independent canonical-prefix authority ID and root;
- all 196 public prefix descriptors;
- immutable checkpoint descriptor SHA-256;
- immutable checkpoint source/manifest identities;
- exact classifier/schema semantics root; and
- the Phase-1 no-authority contract.

## Fail-closed conditions

The sealer HOLDs on, among other things:

- scan manifest content-ID mismatch;
- scan count conservation mismatch;
- unresolved scan HOLD state;
- authority receipt content-ID mismatch;
- same-machine witness substitution;
- authority prefix-root mismatch;
- checkpoint/authority byte-prefix mismatch;
- immutable checkpoint re-scan digest mismatch;
- classification map mismatch;
- checkpoint descriptor mismatch;
- expected authority-ID mismatch; or
- expected classification-semantics-root mismatch.

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
