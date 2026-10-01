# VOID Mainnet-0 Historical Cartography Extension V1

Marker: `VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_EXTENSION_V1`

## Purpose

This source-only layer extends the already accepted Mainnet-0 historical cartography beyond frozen height `1,951,058` without reparsing the full accepted `0..1,951,058` prefix.

The prior authority remains the merged V1.2 acceptance:

- acceptance ID: `voidm0accept1_0845069c3f20572f2fdf80a7aeb4bde0fc359192d1501a1f6221ba90523bf959`;
- accepted manifest ID: `voidm0map1_38f4dd05deae1a0dbc8b3d028ffd35bda7f1ba177f37a8b4fc37fb20e2bcc912`;
- accepted source ID: `voidm0src1_c87dfdfbbe3aa6099bef0f1f9eafab20a09fe0a8d67453e83828c3eb967090da`;
- frozen head: `1,951,058`;
- accepted complete-scan digest: `b4fe72e12e2ad709b4c3d6d4c210f8baa3463df2269d616ec9388badae7ed01c`;
- classification-semantics root: `ea40d5f61cc8e8da68445382e76dc000cebce4d3805132bee93269e73d57a5ad`; and
- accepted prefix root: `b9c0f187688790dc32e1fea7ea3294a4540bc410131303ec7806d3c811c67dde`.

The extension emits a **candidate** V1 cartography manifest and a content-addressed extension receipt. It does not extend runtime append authority or the current accepted projection in `src/chain/mainnet0_historical_cartography_projection_v1.ts`.

## Baseline admission

Before the scanner module is dynamically loaded, the planner:

1. rederives the content-addressed V1.2 acceptance ID;
2. rederives the accepted V1.1 manifest ID and source ID;
3. validates count/range/exception conservation over the accepted manifest;
4. rederives the independent-prefix root from all 196 accepted descriptors;
5. hashes the current scanner and manifest-schema bytes and requires the exact accepted classification-semantics root; and
6. requires the exact production acceptance/manifest/source/digest/prefix/checkpoint identities above.

The scanner and schema have no commits after the acceptance generation, but this runtime check makes future drift fail closed rather than relying on repository history.

The planner also closes the verify→execute boundary: it never imports the worktree scanner pathname after hashing it. The exact scanner bytes used to derive the accepted semantics root are copied into a private temporary directory, rehashed, made read-only, imported from that private materialization, and then the temporary pathname is removed after module evaluation. The exported proof reports `worktree_scanner_execution=false`.

## Prefix verification

The later frozen source must retain the exact accepted segment namespace.

For every previously closed segment, the current `blocks.bin` size and SHA-256 must exactly equal the accepted prefix descriptor. The accepted terminal segment `01950000` may grow, but its first `267927` bytes must still hash to:

`8bf4ea9fa5982ce4fa01d9f09948a5a4344a8d84f22ea524b991f62f4b711c9e`.

The planner reparses only that accepted terminal prefix to recover the exact block at height `1,951,058`. It does **not** recompute the historical classifications or historical complete-scan digest.

All accepted-prefix files are rechecked after suffix scanning. A size, inode/generation, accepted-prefix hash, or post-scan file hash change is terminal HOLD.

## Incremental suffix scan

Suffix parsing starts at the exact accepted terminal byte boundary and height `1,951,059`.

For each new frame the planner reuses the accepted V1.1 scanner's exact:

- frame-size ceiling;
- closed classification vocabulary;
- block-shape classifier;
- transition map;
- modern parent-hash rule;
- evidence-record encoding; and
- manifest builder.

Unknown or ambiguous shapes, skipped/duplicated heights, unreviewed transitions, parent-hash mismatch, malformed frames, nonempty WAL, inconsistent head markers, or source movement are terminal HOLD.

The new complete-scan digest is continued directly from the accepted 32-byte digest state:

`new_digest = SHA256(previous_digest_bytes || stable_json(new_record))`.

The accepted historical digest is never recomputed.

## Combined manifest

The accepted V1.1 manifest is committed in `public/mainnet0-historical-cartography-v1.json`, including its 361 ranges and 78 exceptions.

The extension therefore preserves every prior range/exception, reopens only the terminal compressed run, appends suffix classifications, and emits a normal V1.1 candidate manifest with:

- full combined class counts;
- full combined ranges/exceptions;
- full source-segment identity for the later frozen source;
- a continued complete-scan digest; and
- a normal `voidm0map1_...` manifest ID.

This candidate manifest is **not** accepted merely because it is complete. A separate independent acceptance/seal step is still required.

## Efficiency boundary

Normal work is proportional to:

- byte-hashing the already accepted prefix for integrity;
- reparsing only the accepted terminal segment prefix;
- scanning/classifying only newly finalized frames; and
- a post-scan generation recheck.

The ordinary extension path does not reparse blocks `0..1,950,999`.

## CLI

```bash
node tools/void-mainnet0-historical-cartography-extension-v1.mjs \
  --source-dir /absolute/path/to/later-frozen-segstore \
  --new-frozen-head <height-greater-than-1951058> \
  --source-label <reviewed-label> \
  --output /absolute/new/path/cartography-extension-v1.json
```

The output parent must already exist and must resolve outside the source tree. Output is create-only mode `0600`.

Expected green markers include:

```text
VOID_MAINNET0_HISTORICAL_CARTOGRAPHY_EXTENSION_V1_CANDIDATE_GREEN
accepted_prefix_modified=false
candidate_acceptance_required=true
append_authority=false
runtime_projection_modified=false
runtime_authority=false
```

## Deterministic proof

```bash
node scripts/prove_void_mainnet0_historical_cartography_extension_v1.mjs
```

The proof builds a two-segment synthetic accepted prefix through height `10,000`, appends three frames, and requires the incremental candidate manifest to be exactly equal to a fresh full V1.1 scan through height `10,003`.

It also falsifies:

- replacement of an accepted closed segment;
- mutation/garbage at the accepted terminal-prefix boundary;
- skipped suffix heights;
- unknown suffix shapes;
- nonempty WAL;
- head-marker disagreement;
- source generation movement during suffix scanning; and
- classification-semantics drift.

## Authority boundary

This layer grants no append, runtime, validator, checkpoint-publication, deployment, wallet/signer, Work Credit, transaction, treasury/liquidity, or funds authority.

It does not modify `src/node_core.ts`, SegStore, the accepted runtime projection, validators, services, network configuration, checkpoint publication, or live chain state.

A later extension may become authoritative only through a separately reviewed acceptance generation that binds the new candidate manifest and independent later-prefix evidence.
