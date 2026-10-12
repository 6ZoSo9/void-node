# Mainnet-0 Historical Cartography V1.1

Marker: `VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_V1`

Status: **draft / exhaustive V1.1 real-source rescan pending**

## Purpose

Map every immutable VOID Mainnet-0 canonical block from genesis through one
frozen historical head without normalizing or rewriting canonical bytes.

V1.1 is the evidence-driven successor to the first Phase-1 scanner generation.
The first real scan correctly returned HOLD after scanning all 1,951,059 frames,
but it exposed two scanner-contract defects:

1. seven canonical modern-signed envelopes were outside the four-class V1
   vocabulary because their serialized `header.txRoot` is the historical legacy
   empty root while their top-level modern empty roots are zero64;
2. the V1 anchor mismatch path incremented `unclassified_blocks` a second time
   at heights `196019` and `196020`, so nine HOLD entries represented seven
   physical unknown blocks.

Neither finding is evidence of canonical corruption.

## Frozen source

The reviewed source generation is:

- network: `VOID Mainnet-0`
- chain id: `2050`
- Precision source: `data_a`
- frozen head: `1951058`
- head surfaces: `(1951058,1951058,1951058)`
- contiguous raw segments: `196`
- raw frames: `1951059`
- `blocks.bin` bytes: `452333282`
- WAL bytes: `0`

The scanner reads `segments/<8digit>/blocks.bin` directly and must never import or
instantiate SegStore.

## V1 real-source HOLD evidence

V1 source identity:

`voidm0src1_c87dfdfbbe3aa6099bef0f1f9eafab20a09fe0a8d67453e83828c3eb967090da`

V1 complete scan digest:

`ed7e5f58b68775d6b3f48518c210373e11476cf6b56bbbb8b1b369964f891376`

The seven canonical heights discovered outside the V1 vocabulary are:

- `196019`
- `196020`
- `1833994`
- `1834071`
- `1834125`
- `1834145`
- `1834324`

Independent read-only raw-frame inspection proved all seven have exactly:

- the modern signed top-level envelope;
- `txs=[]`;
- `blobs=[]`;
- top-level `txRoot = 00..00`;
- top-level `blobRoot = 00..00`;
- serialized `header.txRoot = e3b0c442...b855`;
- 32-hex proposer shape;
- 128-hex signature shape;
- a `parentHash` matching the current `blockHash()` contract applied to the
  immediately preceding canonical block.

The raw SHA-256 anchors are embedded in the scanner and are falsification
evidence, not a substitute for scanning.

## Closed V1.1 vocabulary

V1.1 admits exactly five structural classes:

- `MINIMAL_V1`
- `LEGACY_V2FS_V1`
- `MODERN_SIGNED_V1`
- `LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1`
- `MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1`

`MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1` is intentionally historical and
narrow. It requires all of the following simultaneously:

- exact modern signed top-level keys;
- nonnegative safe integer `number`;
- positive safe integer `timestamp`;
- 64-hex `parentHash`;
- exact 32-hex proposer shape;
- exact 128-hex signature shape;
- exact `header={txRoot}`;
- `txs=[]`;
- `blobs=[]`;
- top-level `txRoot=00..00`;
- top-level `blobRoot=00..00`;
- `header.txRoot=e3b0c442...b855`.

It does not modify or weaken `validateBlockForAppend()`.

## Closed transition map

The frozen historical prefix is admitted only under this transition map:

- `0`: genesis `MINIMAL_V1`;
- `1..196018`: `MINIMAL_V1 -> MINIMAL_V1`;
- `196019`: `MINIMAL_V1 -> MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1`;
- `196020`: historical-modern -> historical-modern;
- `196021`: historical-modern -> `LEGACY_V2FS_V1`;
- later historical-modern singleton heights:
  `1833994`, `1834071`, `1834125`, `1834145`, `1834324`;
- at each later singleton: legacy-era -> historical-modern -> `LEGACY_V2FS_V1`;
- all other post-`196021` transitions must remain within the two reviewed
  legacy-era classes.

A strict `MODERN_SIGNED_V1` occurrence in this frozen prefix is a transition HOLD
unless separately reviewed. No generic legacy-to-modern transition is allowed.

For every modern/historical-modern occurrence the scanner also verifies
`candidate.parentHash === currentContractBlockHash(previousCanonicalBlock)`.

## Accounting correction

`unclassified_blocks` counts physical blocks whose classifier result is
`UNKNOWN` exactly once.

A known-anchor classification or raw-hash mismatch creates a bounded HOLD entry
but does **not** increment `unclassified_blocks` again. The deterministic proof
contains a synthetic falsifier for this exact V1 bug.

## Source immutability

A successful V1.1 scan requires:

- exact head-marker agreement;
- exact expected segment generation;
- empty WAL by default;
- no source/output path overlap;
- pre-scan stat identity for every `blocks.bin`;
- per-segment raw SHA-256;
- post-scan stat identity and full re-hash equality;
- exact frame-height continuity `0..frozen_head`.

Source movement or replacement is HOLD.

## Manifest

The manifest is content-addressed and binds:

- frozen source identity;
- all five class counts;
- complete per-height scan digest;
- compressed ranges plus singleton exceptions;
- known anchor classifications;
- seven independently established raw SHA-256 historical-modern anchors;
- zero canonical-byte mutation;
- zero modern-validator mutation.

The manifest grants no append, signer, validator, or runtime authority.

## Acceptance

Phase 1 remains draft until the exact V1.1 generation runs on the frozen
1,951,059-block source and produces:

```text
historical_blocks_scanned=1951059
unclassified_blocks=0
ambiguous_classifications=0
transition_gaps=0
canonical_bytes_modified=0
modern_validator_modified=false
manifest_reproducible=true
```

The resulting source ID, complete-scan digest, manifest ID, class counts,
ranges/exceptions, and anchors must then be independently reviewed before the PR
can leave draft.

## Authority boundary

This generation may change only scanner/proof/schema/documentation/focused-CI
surfaces. It must not change:

- `src/chain/block.ts`;
- `src/chain/seg_store.ts`;
- `src/chain/legacy_commit_direct_v2fs_v1.ts`;
- `src/chain/mainnet0_historical_compat_v1.ts`;
- `src/node_core.ts`;
- public seed gateway/client runtime code;
- canonical historical bytes.

No deployment, restart, live follower invocation, chain reset/reseed, wallet,
validator, Work Credit, transaction, treasury, liquidity, DNS, or network
mutation is authorized by this cartography phase.
