# V7 deployment receipt V3 lock plan v1 — reader repair HOLD

Status: **source/CI-only, fail-closed planning boundary; no deployment authority**.

This successor updates PR #3661 in place. It merges the current V3-lock
base `9f610b351ad48b214fa04dc6b961e4a202049913`, hardens the production tracked-file readers, and preserves
the accepted V3 candidate and lock unchanged.

## Exact repaired identities

- production tool: `e0a682ea4038ca22e3a3b97da2cac29874096c46`
- production proof: `e634e666d3a190368ddb031f936ebbb6347b7196`
- Dispatch V3 proof: `3c710609632f9568ff93b26047df5d4c0a0f9711`
- Dispatch V3 document: `201855e799814a5b4fcf41ff6a92cd2607e73cbf`
- focused plan proof: `9385562cf7652507c3f162e47fdc85da2c1b668a`

The frozen V3 candidate still records the predecessor tool blob
`3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`. The planner must therefore exit 2 with:

`accepted_enforcement_candidate_current_source_inventory_mismatch:ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`

A separate V4 candidate and acceptance lock are required before the deployment
receipt planner may return `PLAN_GREEN` again. Dispatch V3 continues to expose
the established nonprotected-drift count of three for existing CI consumers.

## Non-authority

This lane does not install a receipt, mutate a service, access credentials or
wallets, sign or broadcast a transaction, mutate chain 2050, activate the
public presale, or move funds.
