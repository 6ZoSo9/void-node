# Canonical V5 protected enforcement candidate

## Purpose

Derive a new **unaccepted** V5 protected-enforcement candidate from the exact
accepted-lock + canonical V5 composition in Draft #3682.

Exact parent:

`a016ea761ccdba10352337ad97c05ba8b52ce6cf`

The parent preserves accepted V4 lock evidence from #3688 and advances exactly
one protected inventory row to canonical producer V5:

- `ops/run-void-node-live-v1.sh`
- V4 blob: `6fb040de128ce0df16e848d61ea5f4acb62794da`
- V5 blob: `bc6a17ccdf389299fb139db37e742f0b1ad9dc4e`
- mode remains `100755`.

The repaired range router is
`src/index.ts@a09661797aa4295371c036be36d82995e5233269`.

## Bound composition evidence

Hosted composition run `40092224628` is terminal SUCCESS on all three Node
majors. The parent workflow does not publish/cross-compare composition-receipt
artifacts, so this successor records `deterministic_receipt_verified=false`;
actual V5 candidate byte determinism is established only by this candidate
workflow's Node 22/24/26 artifacts and cross-node comparison:

- Node 22 job `120867064615`;
- Node 24 job `120867064444`;
- Node 26 job `120867064630`.

The candidate proof pins the exact composition evidence:

- proof `0f731f9932d043f6c0eaac8db6cc4eca7673f9c2`;
- document `221bd4b8d7b908b2f893e5301143600952545901`;
- workflow `21971621fae40fdce2d4bcd7f54e269c7fdf22b7`.

It also preserves:

- V4 candidate `ec00f0c552e600fff38e4998e4beb128c93b481d`;
- accepted V4 lock `4de9c2185a1359d2877b17958666f91497a91179`;
- accepted V4 enforcement set
  `00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a`.

## Candidate derivation

The proof derives the exact current 49-row protected inventory by preserving all
V4 rows except the single reviewed V4→V5 runner transition. It verifies every
current tree mode/blob, executes the canonical V5 source-generation dispatcher,
requires V5 observer behavior and obsolete-generation refusal, and emits a
content-addressed V5 candidate JSON.

The candidate remains deliberately unaccepted. Its proof now uses a bounded same-descriptor `maxBytes + 1` reader, revalidates descriptor and visible-path generation, and directly tests lstat→open regular replacement, symlink, FIFO substitution with `O_NONBLOCK|O_NOFOLLOW`, post-open growth, and oversize rejection.

The candidate remains deliberately unaccepted:

```text
complete_executable_closure_verified=true
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
deployment_receipt_reissue_required=true
public_presale_activation=false
funds_movement=false
```

The installed V4 deployment receipt is not promoted or reused as V5 authority.
After hosted byte-identical V5 candidate derivation, a separately versioned V5
acceptance lock is required before any V5 protected installation or runtime
cutover work.

## Scope and authority

Exactly three ADD-only source/CI paths:

- `.github/workflows/buy-void-enforcement-final-protected-v7-v2-candidate-v5.yml`;
- `docs/architecture/buy-void-enforcement-final-protected-v7-v2-candidate-v5.md`;
- `scripts/prove_buy_void_enforcement_final_protected_v7_v2_candidate_v5.mjs`.

No host apply, service/runtime mutation, provider RPC, credential/key/wallet
access, signing, transaction/payment acceptance, presale/WC activation,
treasury/liquidity action, or funds movement.

PROTECT THE CORE.

## Current proof identity

Hardened candidate proof Git blob: `26c2fd7f0650d42d413472c6a9d6e9361c88345e`.
