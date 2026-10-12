# VOID AI Agent First Contact Runtime Control-Flow Repair V1

## Problem

The First Contact JSON and HTML handlers existed in `src/index.ts`, but both
were nested under:

```text
process.env.VOID_EARLY_MINIMAL_BOOT === "1"
```

Precision uses normal boot. The node was healthy and ready while both routes
returned HTTP 404.

## Repair

This change moves the existing shared six-line First Contact route statement
immediately before the early-minimal boot branch. It does not change the route
strings, source assets, response bodies, or the exact route-statement contract.

The exact captured source SHA and line ranges are verified before editing. The
TypeScript build must remain green after the move, which holds the lane if the
statement depends on any branch-local declaration.

## Exact source base

```text
b78f34f089ca5bd39411a1ba8d2aa0f5c939474d
```

## Safety boundary

Exactly five files change:

- `.github/workflows/void-ai-agent-first-contact-runtime-control-flow-repair-v1.yml`
- `docs/public/ai-agent-first-contact-runtime-control-flow-repair-v1.md`
- `scripts/prove_void_ai_agent_first_contact_runtime_control_flow_repair_v1.mjs`
- `scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs`
- `src/index.ts`

No Buy VOID, Paid DataNet, Work Credit, validator, wallet, signer, service
configuration, transaction, or economic behavior changes are included.

Deployment and service restart remain separate gated steps.

The original runtime proof now validates route literals and asset-path expressions against the complete `src/index.ts` source rather than only the early-minimal runtime marker block.
