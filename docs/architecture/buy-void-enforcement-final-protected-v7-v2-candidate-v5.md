# Canonical V5 protected enforcement candidate

## Purpose

Derive a new **unaccepted** V5 protected-enforcement candidate from the exact
accepted-lock + canonical V5 composition in Draft #3682.

Exact parent:

`94a07497a1583ec990ac0ca665604bebf570b5e7`

The parent preserves accepted V4 lock evidence from #3688 and advances exactly
one protected inventory row to canonical producer V5:

- `ops/run-void-node-live-v1.sh`
- V4 blob: `6fb040de128ce0df16e848d61ea5f4acb62794da`
- V5 blob: `bc6a17ccdf389299fb139db37e742f0b1ad9dc4e`
- mode remains `100755`.

The repaired range router is
`src/index.ts@a09661797aa4295371c036be36d82995e5233269`.

## Bound composition evidence

Hosted composition run `39995907220` is terminal SUCCESS on all three Node
majors:

- Node 22 job `120559244919`;
- Node 24 job `120559244633`;
- Node 26 job `120559245016`.

The candidate proof pins the exact composition evidence:

- proof `1d76844acb0f09eeaef5df5803280dbc8830d7de`;
- document `e25a32fcc852f9feffc88920842a0a04de682195`;
- workflow `91803f0ccaca8840c5ddb227add74ae39dfa248a`.

It also preserves:

- V4 candidate `b8341906d9563739a50dac98ea184a1d93267531`;
- accepted V4 lock `416202f5a7ee4c55950d5db9d13a718c721fc801`;
- accepted V4 enforcement set
  `f28b445fe5f1e632d1265ead825ecf9338644a3ae2704fde83ba1cedaf6be695`.

## Candidate derivation

The proof derives the exact current 49-row protected inventory by preserving all
V4 rows except the single reviewed V4→V5 runner transition. It verifies every
current tree mode/blob, executes the canonical V5 source-generation dispatcher,
requires V5 observer behavior and obsolete-generation refusal, and emits a
content-addressed V5 candidate JSON.

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
