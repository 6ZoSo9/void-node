# AI Agent First Contact Runtime: Unconditional Registration V2

## Live failure

Precision restarted successfully with health and readiness exact green, but
both First Contact routes returned Express 404 locally and over Tailnet.

The registration diagnosis proved all four handlers were registered only
inside:

```text
process.env.VOID_EARLY_MINIMAL_BOOT === "1"
```

The live normal-boot service did not define that variable.

## Current-origin semantic reapply

A previous uncommitted repair correctly moved the registrations outside the
branch, but `origin/main` later changed both `src/index.ts` and the original
runtime proof. The overlap gate stopped the stale text patch.

This lane starts from the current pinned `origin/main` and reapplies the repair
semantically:

- locate the exact four current-origin GET/HEAD registrations;
- prove they share one early-minimal ancestor;
- preserve the already-unconditional marker;
- close over only declarations inside the branch referenced by the handlers;
- move that bounded closure into one unconditional block immediately before
  early-minimal boot;
- preserve handler statement text and route literal counts.

## Proof rebuild

The current-origin original proof is rebuilt semantically:

- update its exact `src/index.ts` byte-size expectation;
- migrate implementation-presence checks from the now-empty BEGIN/END marker
  block to its existing complete-source variable;
- extend both exact pre-commit companion filters;
- add AST assertions proving exactly four handlers, none with an early-minimal
  ancestor, all before the branch.

## Exact source lane

Exactly six files change:

- `.github/workflows/void-ai-agent-first-contact-runtime-unconditional-registration-v2.yml`
- `docs/public/ai-agent-first-contact-runtime-unconditional-registration-v2.md`
- `scripts/prove_void_ai_agent_first_contact_runtime_unconditional_registration_v2.mjs`
- `scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs`
- `fixtures/ops/guard-baselines/index-ts-size-v1.json`
- `src/index.ts`

No service restart or deployment occurs in this source lane.
