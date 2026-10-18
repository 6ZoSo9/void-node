# Buy VOID presale source freeze candidate V2

Marker: `VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_CANDIDATE_V2`.

Status: **fixed source candidate for review only; not accepted release authority**.

## Purpose

V1 froze a reviewed V5 economic/Epoch-2 composition and intentionally refused to
auto-adopt later main commits. The delta census in #3429 proved that current
main is not a trivial byte-for-byte continuation of that snapshot.

V2 therefore does **not** replay the old V5 draft history. It freezes one exact
canonical-main tree as a new review candidate and records the remaining release
gaps explicitly.

Frozen source:

- commit `05614762b1b4638e05e539fd7d20cbf670e1570b`;
- tree `4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e`;
- freeze ID
  `voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1`.

Future main commits are not included automatically:

```text
exact_source_snapshot_fixed=true
auto_adopt_new_main_commits=false
later_main_changes_require_separate_review=true
```

## Current presale tuple V3

The freeze binds the exact current-main compatibility gate:

- `.github/workflows/buy-void-current-presale-source-tuple-v3.yml`
  Git blob `e7d73fb5cea73164909c99c5d8585acd48822155`;
- `.github/workflows/buy-void-runtime-integration-v1.yml`
  Git blob `780e4ecaf826cf1cc620d67a3c733470db48d714`;
- `package.json`
  Git blob `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`;
- `package-lock.json`
  Git blob `15b5c82ea36f13079a2f9e8863722f654eb3f201`.

Hosted V2 CI must independently rebuild on Node 22, 24 and 26 and execute the
current-positive tuple proofs for:

- payment/allocation hypothetical crash matrix V6;
- first-original handoff V4;
- operator verified-allocation dispatcher V5;
- dual-rail handoff V3.

The three normalized outputs must be byte-identical.

That current-positive tuple still explicitly reports:

```text
production_gate_ready=false
presale_activation=false
funds_moved=false
```

## Enforcement truth

Canonical main still carries accepted historical V7/V2 enforcement lock V2:

- lock path
  `ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v2.json`;
- Git blob
  `589845615654da8b688764377b34296267ac0063`;
- accepted enforcement set
  `05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852`;
- protected inventory canonical SHA-256
  `224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2`.

The lock proves its historical executable closure and source identity, but it
does **not** prove the current frozen tree is the same enforcement generation.

V2 therefore records:

```text
candidate_enforcement_identity_accepted=true
current_source_enforcement_successor_required=true
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

This distinction is intentional. Draft V5 enforcement compositions are not
silently promoted into canonical-main authority.

## Repaired Epoch-2 V6 bootstrap

The freeze also binds the current repaired Epoch-2 bootstrap acceptance:

- lock path
  `ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json`;
- lock Git blob
  `f2ce1364dd776bfbf1aa1ef59ce999cb46037b73`;
- lock ID
  `voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`;
- candidate ID
  `voidbuye2dormantbootstrapcand3_1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2`;
- accepted static binary SHA-256
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`.

Candidate/source identity is accepted. Protected install, live execution and
funds authority remain false.

## Coupled launch boundary

The freeze retains the project launch rule:

`BTC/VOID presale + WC/VOID pool are one coupled launch gate.`

V2 does not claim a fixed WC-to-VOID conversion ratio.

The freeze explicitly keeps false:

```text
source_freeze_accepted=false
current_enforcement_successor_required=true
host_install_qualified=false
live_runtime_evidence_qualified=false
customer_payment_acceptance_authorized=false
public_presale_activation=false
wc_void_activation=false
wallet_or_signing_authority=false
transaction_submission_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement=false
production_host_evidence_authority=false
```

## CI boundary

The focused workflow:

1. requires an exact four-file ADD-only V2 freeze diff;
2. verifies exact manifest/proof/doc blobs;
3. re-derives the content-addressed freeze ID;
4. binds every frozen anchor to exact Git objects at the frozen commit;
5. validates historical enforcement authority without presenting it as current;
6. validates repaired V6 bootstrap identity and false live/install authority;
7. refuses `--apply`;
8. re-executes the current presale tuple on Node 22/24/26;
9. requires byte-identical cross-node outputs.

No Precision/Nimo/Xiphos access, service/runtime mutation, credentials, keys,
wallets, signing, RPC submission, customer payment acceptance, Chain-2050/WC
mutation, treasury/liquidity action, presale activation, or funds movement
occurs.

A future freeze acceptance must be a separate reviewed gate and must not clear
`current_enforcement_successor_required` until the current frozen tree has an
accepted enforcement successor.

**PROTECT THE CORE.**
