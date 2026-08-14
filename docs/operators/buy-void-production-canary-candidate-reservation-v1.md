# Buy VOID production canary candidate reservation v1

Marker:

`VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1`

## Status: retired / held

This legacy reservation operator is intentionally retired during the canonical
ERC-20 Buy VOID transition.

The old operator delegated `claim_payment`, `reserve_inventory`, and
`reserve_execution_attempt` to the parent
`run_crash_consistent_saga_stage` action. The canonical parent no longer mounts
or dispatches that crash-saga action because it belongs to the earlier
native-value canary composition.

Reconnecting the operator to that parent action would reopen a path toward the
wrong asset family. The compatibility command therefore fails closed instead.

Every valid invocation returns:

```text
status=held
reason=candidate_reservation_retired_for_canonical_erc20_transition
retired=true
canonical_delivery_asset=void_token_erc20
legacy_parent_runtime_action_reachable=false
runtime_http_get_performed=false
runtime_http_post_performed=false
stage_transition_count=0
```

## No runtime I/O

The module performs no HTTP GET or POST request. The legacy loopback endpoint
helpers remain exported only so existing imports do not break while the lane is
retired.

The default HTTP helper exports return a local synthetic `410` retirement
decision and do not call `fetch`.

No invocation can reserve inventory, reserve an execution attempt, invoke
transaction preparation, call RPC, access wallet credentials, sign, broadcast,
close out fulfillment, restart a service, or move funds.

`allowed_apply_stages` is empty.

## CLI compatibility

Historical CLI arguments are still parsed so old automation receives a
structured retirement decision rather than silently reaching a different
runtime path.

```bash
npx tsx scripts/buy_void_production_canary_candidate_reservation_v1.ts \
  --request-id <request-id>
```

The command exits held. `--apply` and legacy confirmation fields cannot restore
authority.

## Historical recovery

The separate candidate-recovery reader remains available only to recover
read-only evidence for an already-durable legacy `reserved` or `prepared`
execution attempt. It is not a replacement reservation engine.

## Replacement path

New production reservation/admission work must be built on the canonical
`VoidToken` ERC-20 composition after its remaining dependency, preparation, and
receipt-reconciliation gates are exact-green.

Presale inventory funding and automatic execution remain separate held gates.

## Verification

```bash
npx --no-install tsx \
  scripts/prove_buy_void_production_canary_candidate_reservation_v1.ts
```

Expected marker:

```text
VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1_PROOF_GREEN
```

`PROTECT THE CORE`
