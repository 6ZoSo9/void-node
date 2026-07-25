# Buy VOID observe-and-claim candidate watch V1

## Purpose

This lane converts the merged one-shot candidate-readiness CLI into a bounded
operator watch workflow. The watch remains one-shot: an external scheduler may
run it periodically, but the worker itself has no loop.

Each run:

1. Executes the read-only candidate-readiness CLI.
2. Reads the resulting server-derived readiness report.
3. Emits no alert when there is no eligible candidate.
4. Holds when there are multiple eligible candidates.
5. Emits one operator-local alert packet when exactly one new candidate exists.
6. Suppresses duplicate alerts for the same exact candidate and plan.

The alert packet is advisory evidence for a separate reviewed arming lane. It
does not arm the fixture canary or perform `observe_and_claim`.

## Manual one-shot run

```bash
npx tsx \
  scripts/buy_void_observe_and_claim_candidate_watch_v1.ts \
  --repo-root "$PWD" \
  --state-dir \
    "$HOME/.local/state/void-buy-void-observe-and-claim-candidate-watch-v1" \
  --output \
    "$HOME/void-precision-smoke/buy-void-candidate-watch-latest.json"
```

## Operator-local outputs

The state directory may contain:

- `current-state.json`: the last exact alert fingerprint and report hash.
- `alerts/<fingerprint>.json`: an append-once exact-one alert packet.

These are operator-local files. They are not Buy VOID request, claim, attempt,
broadcast, confirmation, inventory, or fulfillment journals.

## Alert packet

An exact-one alert binds:

- Exact request ID
- Exact server-derived activation-plan fingerprint
- Exact readiness-report SHA-256
- Required orchestrator confirmation
- Required delegated confirmation
- Required `observe_and_claim` stage confirmation
- Deterministic alert fingerprint

The required operator action is:

`review_exact_one_candidate_for_separate_arming_lane`

## Multiple-candidate behavior

A multiple-candidate state exits held. The watch never selects a request by
ordering, amount, arrival time, or any other hidden policy.

## systemd examples

The example service is `Type=oneshot`. The example timer invokes it every two
minutes with a small randomized delay.

The examples are not installed or enabled by this source lane. Enabling them
requires a separate explicit operator action after merge.

## Authority boundary

Allowed:

- Read server-owned Buy VOID request and journal state.
- Write operator-local watch state and exact-one alert receipts.
- Suppress duplicate exact-one alerts.

Forbidden:

- Network-state writes
- Runtime mounting
- Gate arming
- Apply requests
- Inventory reservation
- Execution-attempt reservation
- Wallet or credential access
- Signing
- Transaction broadcast
- RPC mutation
- Money movement
- Internal background loops
- Startup execution by repository import
