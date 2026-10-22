# Canonical V5 protected enforcement candidate

## Purpose

Derive a new **unaccepted** V5 protected-enforcement candidate from the exact
accepted-lock + canonical V5 composition in Draft #3682.

Exact parent:

`0527288a18ebb16161579089427a70d6fa402368`

The parent preserves accepted V4 lock evidence from #3688 and advances exactly
one protected inventory row to canonical producer V5:

- `ops/run-void-node-live-v1.sh`
- V4 blob: `6fb040de128ce0df16e848d61ea5f4acb62794da`
- V5 blob: `d7d7aede7fcd764a6182bd31f12338c5d3674ecb`
- mode remains `100755`.

The range router remains
`src/index.ts@7df1f21c730b554c414c88c550a4475234485370`.

## Bound composition evidence

Hosted composition run `39746991178` is terminal SUCCESS on all three Node
majors:

- Node 22 job `119717811640`;
- Node 24 job `119717812023`;
- Node 26 job `119717812165`.

The candidate proof pins the exact composition evidence:

- proof `21d2e830c915e1a92daa6e837169b05bd75805d3`;
- document `089c8c88d5497df506798b38f2094463f4e57a91`;
- workflow `667e18699d70b61a1e01c7b04601aaca46b04286`.

It also preserves:

- V4 candidate `5893e300a78dc4ca7729ef47f95a8e3eea2043cf`;
- accepted V4 lock `854b9e39772e1e930c63b71e1099509df0f2dbf8`;
- accepted V4 enforcement set
  `ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2`.

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
