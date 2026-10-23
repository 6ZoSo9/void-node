# V7 deployment receipt V3 lock plan v1 — reader repair HOLD

Status: **source/CI-only, fail-closed planning boundary; no deployment authority**.

This successor updates PR #3661 in place. It merges the current V3-lock
base `e6336075802680577f4d3e82ab7384b5c212bb4c`, hardens the production tracked-file readers, and preserves
the accepted V3 candidate and lock unchanged.

## Exact repaired identities

- production tool: `e0a682ea4038ca22e3a3b97da2cac29874096c46`
- production proof: `e634e666d3a190368ddb031f936ebbb6347b7196`
- Dispatch V3 proof: `fd4dc893171a666b8abba83873a63261466d36fd`
- Dispatch V3 document: `03bb9e47b9d10f8fc36ab74277c75d9fc5d607c8`
- focused plan proof: `d3bc8810f0a1dc5152020e25f7598ab3a18a28e2`

The frozen V3 candidate still records the predecessor tool blob
`3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`. The planner must therefore exit 2 with:

`accepted_enforcement_candidate_current_source_inventory_mismatch:ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`

A separate V4 candidate and acceptance lock are required before the deployment
receipt planner may return `PLAN_GREEN` again. Dispatch V3 continues to expose
the established nonprotected-drift count of three and frozen-V4-census proof
preservation field for existing CI consumers.

## Non-authority

This lane does not install a receipt, mutate a service, access credentials or
wallets, sign or broadcast a transaction, mutate chain 2050, activate the
public presale, or move funds.

Current accepted V3 candidate/lock: `5301c32f53c2a82435152e38b36486507a73f906` / `e530390e505d447ca0ad9e2a098ec6a819ae3e6c`.
Current reader-repaired protected inventory SHA-256: `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`.
