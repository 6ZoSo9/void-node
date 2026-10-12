# Wave 2.1 Readiness Honesty

**Base:** `eaa96e6b946a8516e3d4a75292980ce75c36d915`
**Branch:** `fix/void-ui-wave2-1-readiness-honesty-v1`
**Scope:** Home summary semantics only

## Problem

The Wave 2 adapter originally treated an HTTP 200 response from
`/__void/ready.json` as operational readiness. Nimo and Alienware returned
HTTP 200 with a canonical `ready: true`, while also exposing
`txroot_live: 0` and `reasons: ["txroot_live!=1"]`.

That made the Home summary more optimistic than its raw evidence.

## Corrected rule

The Home summary reports `healthy` and `ready: true` only when all four
fixed source routes return HTTP 200 and the raw readiness body satisfies:

- `ready === true`
- `txroot_live === 1`
- `reasons` is empty

Otherwise the summary reports `degraded` and `ready: false` while keeping
the complete raw source payload available in the adapter response.

## Boundaries

- No source route was added or removed.
- No account or balance discovery was added.
- No wallet, ledger, fulfillment, settlement, validator, operator, or
  money-movement authority was added.
- `/participant` and `/public-node` remain unchanged.

## Visual approval

**Approved:** 2026-07-14
**Approved by:** ZoSo
**Decision:** Approved for staging and PR preparation

The Nimo-backed degraded-state preview was manually reviewed at
`/app/#/home`. The user confirmed that it “looks good.”

The approved view showed:

- `Network: DEGRADED`
- `Readiness: Not ready`
- chain head `1,856,587`
- peers `2 / 2`
- honest no-account-selected and unavailable-balance states

Runtime evidence:

- Receipt: `/home/zoso/void-precision-smoke/void-ui-wave2-home-visual-20260714T204351Z.txt`
- Final receipt SHA-256: `6386c4c84838a0a4a5baab67362fd3bb146e0e3c8ff2810c3e357fe39581d3c2`
- Live Precision PID remained `1696771`
- Restart count remained `0`
- Existing Work Credit ledger hashes remained unchanged
- No wallet send, ledger write, fulfillment, WC-to-VOID, validator
  mutation, operator mutation, or money movement occurred
