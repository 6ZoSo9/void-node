# Buy VOID observe-and-claim candidate readiness CLI V1

## Purpose

This one-shot operator CLI reads server-owned Buy VOID request and journal
state, derives the bounded orchestrator dry-run decision, evaluates the
disabled activation-plan surface, and explains whether there are zero, exactly
one, or multiple requests eligible for the `observe_and_claim` stage.

It does not arm the fixture canary gate and does not perform any state
transition.

## Run

From the canonical repository:

```bash
npx tsx \
  scripts/buy_void_observe_and_claim_candidate_readiness_v1.ts \
  --repo-root "$PWD" \
  --output "$HOME/void-precision-smoke/buy-void-candidate-readiness.json"
```

To make the shell signal whether exactly one candidate exists:

```bash
npx tsx \
  scripts/buy_void_observe_and_claim_candidate_readiness_v1.ts \
  --repo-root "$PWD" \
  --require-exact-one
```

Exit codes in `--require-exact-one` mode:

- `0`: exactly one eligible candidate
- `3`: no eligible candidate
- `4`: multiple eligible candidates
- `2`: invalid arguments or a probe failure

## Exact-one output

When exactly one candidate exists, the report includes:

- Exact request ID
- Server-derived activation-plan fingerprint
- Required orchestrator confirmation
- Required delegated confirmation
- Required `observe_and_claim` stage confirmation

This output is advisory evidence for a future, separate one-request arming
lane. It does not constitute operator approval and cannot mutate the network.

## Authority boundary

The CLI is:

- Read-only
- One-shot
- Server-derived
- Exact-request-ID based
- Unmounted from the runtime
- Dry-run only
- Free of background loops and startup execution

It cannot:

- Arm the fixture canary
- Reserve inventory
- Reserve an execution attempt
- Access wallet credentials
- Sign a transaction
- Broadcast a transaction
- Mutate the private RPC
- Move money

The optional `--output` path writes only the generated operator report. It
does not write to Buy VOID request, claim, attempt, broadcast, confirmation,
inventory, or fulfillment journals.
