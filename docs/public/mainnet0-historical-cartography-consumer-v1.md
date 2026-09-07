# VOID Mainnet-0 Historical Cartography Consumer v1 — Phase 2A

## Purpose

Phase 2A makes the historical compatibility path consume the accepted Mainnet-0 cartography for the exact frozen prefix `0..1951058` instead of inferring minimal-versus-legacy persistence mode from envelope shape alone.

The authority root is the committed V1.2 acceptance seal:

- acceptance ID: `voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959`
- manifest ID: `voidm0map1_38f4dd05deae1a0dbc8b3d028ffd35bda7f1ba177f37a8b4fc37fb20e2bcc912`
- independent authority ID: `voidm0auth1_cdec2cadd6615cdf6c3d64765bcdca3823ff0e8c855c6316bda39c707387b8a8`
- prefix root: `b9c0f187688790dc32e1fea7ea3294a4540bc410131303ec7806d3c811c67dde`
- classification-semantics root: `ea40d5f61cc8e8da68445382e76dc000cebce4d3805132bee93269e73d57a5ad`
- complete scan digest: `b4fe72e12e2ad709b4c3d6d4c210f8baa3463df2269d616ec9388badae7ed01c`

Those identities are pinned in `src/chain/mainnet0_historical_cartography_authority_v1.ts` and are checked against the committed acceptance and manifest by the focused proof.

## Accepted persistence-mode projection

The exhaustive five-class scan is projected into three historical consumer modes:

- `MINIMAL_V1` -> `genesis-minimal-v1`
- `LEGACY_V2FS_V1` -> `legacy-v2fs`
- `LEGACY_V2FS_EMPTY_HEADER_ROOT_OBJECT_V1` -> `legacy-v2fs`
- `MODERN_SIGNED_LEGACY_EMPTY_HEADER_ROOT_V1` -> `historical-modern-v1`
- `MODERN_SIGNED_V1` -> no entries in the accepted prefix

The seven historical-modern heights remain exactly:

`196019`, `196020`, `1833994`, `1834071`, `1834125`, `1834145`, `1834324`.

Phase 2A uses those heights as negative authority for the minimal/legacy append paths: they may not be persisted through either historical minimal or historical legacy mode.

## Historical compatibility gate

`validateMainnet0HistoricalTransitionV1()` now requires a candidate block number and, for candidates within `0..1951058`, requires the requested historical persistence mode to equal the accepted cartography projection before the existing parent-era transition rules run.

The existing exact `196020 -> 196021` modern-to-legacy bridge remains unchanged and still requires its full canonical parent/candidate fixture.

No change is made to `validateBlockForAppend()` or ordinary modern validator semantics.

## Deliberate frozen-prefix boundary

The V1.2 acceptance seal proves only `0..1951058`. Phase 2A therefore does **not** claim that its projection governs later heights.

For candidate heights above `1951058`, `validateMainnet0HistoricalTransitionV1()` retains the pre-Phase-2 transition behavior. This avoids silently breaking clean-node catch-up if post-freeze canonical blocks still use the legacy envelope.

Removing that fallback requires an independently reviewed incremental cartography extension rooted in the accepted V1.2 seal.

## Historical-modern routing is not activated

Phase 2A identifies the seven accepted historical-modern heights but does not add a new SegStore persistence method and does not alter the follower's ordinary modern import path.

A later Phase 2B generation must prove the exact historical-modern import semantics, including the five late historical-modern exceptions, before wiring that lane into follower persistence.

## Deterministic proof

`scripts/prove_mainnet0_historical_cartography_consumer_v1.mjs`:

1. requires the exact acceptance, manifest, authority, prefix, semantics, and scan-digest anchors;
2. requires the acceptance no-append/no-validator/no-runtime contract;
3. reconstructs the full accepted mode projection from every committed range and exception;
4. checks every height `0..1951058` against the source projection;
5. checks exact projected counts and the seven historical-modern heights;
6. proves minimal and legacy mode mismatches fail closed inside the accepted prefix;
7. proves the exact `196020 -> 196021` bridge remains valid; and
8. proves Phase 2A claims no authority above the frozen head.

## Authority boundary

This generation is source/docs/proof/CI only. It grants no deployment, restart, service mutation, canonical-chain rewrite/reset/reseed, validator mutation, wallet/signer/treasury/Work Credit authority, transaction authority, or funds movement authority.
