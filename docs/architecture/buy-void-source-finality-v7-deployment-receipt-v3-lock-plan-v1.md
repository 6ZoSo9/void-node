# Buy VOID V7 deployment-receipt V3-lock plan V1

Status: **source/CI-only deployment-plan qualification; no receipt apply, runtime mount, payment, activation or funds authority**.

## Purpose

Prove that the existing reviewed V7 deployment-receipt installer can consume the exact accepted V3 enforcement lock from #3660 without changing deployment/runtime source code.

Base generation:

`87b423bb910a6356cde6c0b269b10d2ce4bb8434`

This successor adds only:
- `scripts/prove_buy_void_source_finality_v7_deployment_receipt_v3_lock_plan_v1.mjs`;
- `docs/architecture/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.md`;
- `.github/workflows/buy-void-source-finality-v7-deployment-receipt-v3-lock-plan-v1.yml`.

## Bound V3 generation

Accepted lock:
- path `ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json`;
- Git blob `245ce93ebfb53478211fab765489e88d8fa23c4a`;
- candidate enforcement-set SHA-256 `95a11602e5f2639d33b378293b92863ea7f9f37020ad18dec49d3d4ac6289fd4`.

Accepted candidate:
- path `ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v3.json`;
- Git blob `79998af4763b6afca84ffe4e8d14d9a6ff535dfd`;
- current tracked-source inventory SHA-256 `c0a56b378215feafacc089e9f59a9f966d57f11e5582e4a13afcd6351d2447bb`.

Deployment planner remains the existing V1 tool:
- `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`;
- Git blob `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`;
- proof blob `c755e5f4e0484486b49193a8381fa09a9e6cb9f1`;
- generation-provenance V7 blob `390ff1a2ff0437cd8c8693e7807c12275df42573`.

The planner is deliberately lock-version agnostic. It validates the exact tracked lock and candidate bytes, accepted source identity, complete executable closure, false deployment/runtime/economic authority, and candidate current-source inventory against the current checkout.

## Hosted qualification

The focused workflow runs Node 22, 24, and 26.

Each node:
1. binds the exact three-file successor over #3660;
2. typechecks/builds the unchanged repository;
3. runs the static successor proof;
4. runs V1 deployment-receipt `--plan` with the V3 lock and requires exit 0 / `status=PLAN_GREEN`;
5. verifies the exact V3 lock blob/SHA and accepted enforcement-set in plan output;
6. runs the same planner with historical V2 lock and requires the existing fail-closed
   `accepted_enforcement_candidate_current_source_inventory_mismatch:src/index.ts` HOLD;
7. performs no receipt apply or persistent mutation.

A cross-node job requires the V3 PLAN_GREEN output and historical V2 HOLD output to be byte-identical across Node 22/24/26.

## Authority

This proves only that the existing source-finality deployment planner accepts the reviewed V3 lock for this source generation.

It does **not**:
- run `--apply`;
- create `/var/lib/void-source-finality-v7/deployment-receipt.json`;
- establish deployed artifact generation;
- establish runtime mount authority;
- establish production source-finality authority;
- activate public presale/WC;
- access credentials/signers;
- broadcast a transaction;
- move treasury/liquidity or funds.

Keep Draft pending exact-head CI and review.

PROTECT THE CORE.
