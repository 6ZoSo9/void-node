# Mainnet-0 Historical Cartography V1

Marker: `VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_V1`

Status: **contract scaffold / worker implementation required / draft only**

## Purpose

Stop discovering immutable Mainnet-0 historical serialization shapes one block at
a time during clean-node catch-up.

The canonical historical bytes are authoritative evidence and must not be
normalized or rewritten merely to make current validators simpler. This lane
instead defines a read-only, exhaustive cartography pass over one frozen
canonical historical source, followed by a content-addressed compatibility map
that later bootstrap/compatibility work may consume after a separate review.

This is a correctness/reliability lane, not another repository-navigation or
`src/index.ts` coverage wave. It exists because fresh bootstrap has repeatedly
reached previously unenumerated historical shapes, including the short modern
island around `196019..196020`, the exact return to legacy-v2fs at `196021`, and
the historical old-writer `header.txRoot` object observed at `198196`.

The cause of those historical production choices is **not** part of the
cartography truth unless independently evidenced. The map records what canonical
bytes contain, not a guessed operational story.

## Worker assignment

This PR is assigned to the **existing VOID cartography worker lane** by explicit
Sovereign direction on 2026-08-27.

- Reuse the existing cartography worker and cartography tooling lineage.
- Do **not** create another cartography worker, scheduler slot, sibling
  implementation, or competing PR.
- Use this draft PR as the single source container for the historical-cartography
  implementation.
- Other workers may review/falsify the lane but should not duplicate its source
  implementation.
- Current moving-week source restrictions are explicitly lifted only for this
  named historical-cartography lane; all unrelated safe-mode restrictions remain.

## Current known evidence is sampled, not exhaustive

Existing historical-bootstrap documentation records observed evidence including:

- early minimal `{number,timestamp}` blocks through sampled heights;
- a long `proposer.commit-direct.v2fs` historical region through sampled heights;
- exact modern signed blocks `196019` and `196020`;
- exact return to legacy-v2fs beginning at `196021`;
- exact historical old-writer `header.txRoot` object form at `198196`.

Those observations are useful falsification anchors but are **not** permission to
infer the unscanned intervals. The cartography pass must derive every classified
height from the frozen canonical source itself.

## Phase 1 outcome

Build an offline/read-only scanner and evidence contract that can classify every
canonical block from genesis through one exact frozen scan head without changing
any chain byte.

The first implementation generation should remain additive around scanner,
proof, documentation, workflow, and generated manifest/evidence surfaces. It
must **not** refactor or weaken the current historical or modern append validators
merely to make the scan green.

In particular, Phase 1 must not change:

- `validateBlockForAppend()` modern consensus/append semantics;
- canonical block bytes;
- SegStore canonical history;
- live follower/runtime state;
- the current exact historical exception admission rules.

A later manifest-consumer/refactor generation is a separate security and
lifecycle gate after the exhaustive map is independently reviewed.

## Frozen source authority

The scanner must consume one immutable, independently identified canonical
historical source.

Before scanning, bind at minimum:

- network: `VOID Mainnet-0`;
- chain id: `2050`;
- exact source kind/location class;
- exact frozen head height;
- exact source generation/content identity sufficient to distinguish a later
  replacement from the reviewed scan source.

The scanner must not silently switch between live nodes, URLs, copies, or data
directories during a run. If the complete historical source cannot be bound or
read, emit `HOLD` rather than filling gaps from current documentation.

Where practical, a second independently materialized canonical copy should be
used as a byte/classification cross-check before the manifest is treated as a
complete historical map. Disagreement is `HOLD`, not majority vote.

## Read-only scan record

For every height from `0` through the frozen scan head, derive bounded evidence
from the exact stored bytes. At minimum the scan result must be able to establish:

- block height;
- exact raw-byte/content digest;
- closed historical shape classification;
- relevant top-level key/envelope shape;
- `_commit` marker when present;
- top-level `txRoot` shape/value class;
- `header.txRoot` shape/value class when present;
- transaction count / empty-vs-nonempty truth needed to distinguish reviewed
  historical forms;
- proposer/signature presence and shape where applicable;
- parent/adjacency continuity evidence appropriate to that historical format.

Do not log or persist private keys, credentials, runtime secrets, or unrelated
operator data.

## Closed classification vocabulary

Start from a deliberately small reviewed vocabulary. The scanner must never
coerce an unknown shape into the nearest known class.

Initial expected classes are:

- `MINIMAL_V1`
- `LEGACY_V2FS_V1`
- `MODERN_SIGNED_V1`
- `LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1`

If canonical history contains another materially distinct shape, report it as
`UNKNOWN`/`HOLD` with exact bounded evidence, then extend the vocabulary in a
reviewed source generation. An unknown class is a discovery result, not scanner
failure and not permission for permissive validation.

## Manifest contract

The committed compatibility map should be compact and content-addressed rather
than checking millions of redundant per-height JSON rows into the repository.
The worker may choose a run/range + exception representation, provided the proof
can reproduce it deterministically from the frozen scan evidence.

The manifest must bind at minimum:

- marker/version;
- `VOID Mainnet-0` / Chain 2050;
- frozen source identity;
- frozen head and exact scanned block count;
- the reviewed classification vocabulary/version;
- ordered non-overlapping classified ranges and exact singleton exceptions where
  needed;
- a digest that commits to the complete per-height scan result, not merely the
  compressed range summary;
- counts for every shape class;
- `unclassified_blocks`;
- `ambiguous_classifications`;
- `transition_gaps`.

The manifest itself grants **no append authority** in Phase 1. Consumption by
bootstrap/history validation requires a later explicit review.

## Required deterministic proof

The focused proof must establish, for one exact frozen source generation:

```text
historical_blocks_scanned=<frozen_head_plus_one>
unclassified_blocks=0
ambiguous_classifications=0
transition_gaps=0
canonical_bytes_modified=0
modern_validator_modified=false
manifest_reproducible=true
complete_scan_digest=<content_address>
```

Also prove:

1. every height `0..frozen_head` appears exactly once in the logical scan;
2. no range overlaps another range and no height is skipped;
3. range compression expands back to the exact per-height classifications;
4. known observed anchors (`196019`, `196020`, `196021`, `196022`, `198196`)
   emerge from the scan and agree with the existing compatibility evidence;
5. representative mutation of every admitted shape fails classification or
   digest/continuity verification rather than being normalized into success;
6. introducing an unknown top-level/header shape returns `HOLD`;
7. truncating or replacing the frozen source during the scan cannot yield a
   successful complete manifest;
8. source/proof execution makes zero canonical block writes and zero runtime
   mutation.

Node-based tooling must preserve the repository-supported Node 22/24/26 contract
where applicable. Focused CI must use immutable Action references and the shared
committed-range diff-hygiene contract.

## Acceptance

Phase 1 source/proof DoD is met only when one exact PR head demonstrates:

- complete scan over the declared frozen canonical source;
- zero unclassified or ambiguous heights;
- zero transition gaps;
- deterministic content-addressed manifest reproduction;
- known historical anchors match independently established evidence;
- no canonical-byte, modern-validator, runtime, service, network, wallet,
  validator, Work Credit, transaction, treasury, liquidity, or funds mutation;
- exact-head focused Node 22/24/26 evidence where applicable;
- fresh independent review of the source-generation and scan-authority boundary.

A scan that discovers a real additional historical class stays `HOLD` until that
class and its falsifiers are reviewed; it must not be hidden just to reach zero
unclassified blocks.

## Falsification

This lane is not complete if any of the following is true:

- any canonical height is inferred rather than scanned;
- a source generation can move during scan without terminal `HOLD`;
- two different per-height maps can produce the same accepted manifest identity;
- an unknown shape is accepted as an existing class;
- a historical byte is rewritten/normalized to satisfy current validation;
- modern validation is weakened to accommodate historical bytes;
- the map depends on guessed causes for historical producer behavior;
- a clean bootstrap can encounter a canonical historical shape outside the
  audited map for the same frozen historical prefix.

## Later gate — not authorized by this scaffold

After exhaustive cartography is independently green, a later reviewed change may
consider replacing hand-written historical singleton control flow with a narrow
manifest-backed compatibility consumer.

That later step must preserve closed-schema validators and exact historical
bytes. The manifest cannot become a generic "accept whatever was observed"
mechanism, cannot weaken modern validation, and cannot convert content evidence
into signer/consensus authority that the historical blocks never contained.

Do not combine that consumer/refactor with Phase 1 merely to reduce PR count.
First establish that we actually know the immutable history.

## Authority boundary

Source/docs/proof/CI and offline read-only historical evidence only.

No merge, ready transition, deployment, restart, live follower invocation,
canonical-chain mutation, block rewrite/reset/reseed, network/DNS/interface
mutation, credential/private-key access, wallet/signer use, validator or Work
Credit mutation, paid-work dispatch, transaction, production configuration,
treasury/liquidity action, inventory action, or funds movement is authorized.
