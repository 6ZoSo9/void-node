# Buy VOID observe-and-claim candidate readiness CLI V1

## Purpose

This one-shot operator CLI reads server-owned Buy VOID request and journal
state, derives the bounded orchestrator dry-run decision, evaluates the
disabled activation-plan surface, and explains whether there are zero, exactly
one, or multiple requests eligible for the `observe_and_claim` stage.

It does not arm the fixture canary gate and does not perform any state
transition.

## Runtime-root authority

A canonical public request can only be evaluated against an authoritative Buy
VOID runtime-integration journal root. The CLI no longer silently falls back to
`data/buy_void_v1/runtime-integration-v1` when the running node actually uses a
different data directory.

Runtime-root resolution is ordered and fail-closed:

1. `--runtime-root PATH` when supplied;
2. `VOID_BUY_VOID_RUNTIME_DIR` when configured;
3. `DATA_DIR` when configured;
4. `VOID_DATA_DIR` when configured;
5. exactly one existing repo-local `*/buy_void_v1/runtime-integration-v1`
   directory.

If canonical request records exist and no runtime root can be established, the
CLI exits with `runtime_root_authority_required`. If more than one repo-local
runtime root exists without an explicit authority source, it exits with
`runtime_root_ambiguous:<count>` rather than guessing.

When there are no canonical request records, no runtime journal read is needed,
so the report records `runtime_root=null` and
`runtime_root_source=not_required_no_canonical_requests`.

Every successful report records both `runtime_root` and
`runtime_root_source`, making the journal source auditable by operators and
scheduled wrappers.

## Run

From the canonical repository, an explicit runtime root is the strongest
operator form:

```bash
npx tsx \
  scripts/buy_void_observe_and_claim_candidate_readiness_v1.ts \
  --repo-root "$PWD" \
  --runtime-root "$PWD/data_a/buy_void_v1/runtime-integration-v1" \
  --output "$HOME/void-precision-smoke/buy-void-candidate-readiness.json"
```

A deployment that already exports `VOID_BUY_VOID_RUNTIME_DIR`, `DATA_DIR`, or
`VOID_DATA_DIR` may omit `--runtime-root`. If none is configured, the CLI may
use one and only one discoverable repo-local runtime root.

To make the shell signal whether exactly one candidate exists:

```bash
npx tsx \
  scripts/buy_void_observe_and_claim_candidate_readiness_v1.ts \
  --repo-root "$PWD" \
  --runtime-root "$PWD/data_a/buy_void_v1/runtime-integration-v1" \
  --require-exact-one
```

Exit codes in `--require-exact-one` mode:

- `0`: exactly one eligible candidate
- `3`: no eligible candidate
- `4`: multiple eligible candidates
- `2`: invalid arguments, runtime-root authority failure, or a probe failure

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
- Explicit about runtime-root provenance
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
