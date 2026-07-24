# Buy VOID bounded automatic-fulfillment orchestrator V1

## Purpose

This lane introduces a bounded five-stage state machine over the existing Buy
VOID claim, reservation, execution, broadcast-outcome, confirmation, and
confirmed-closeout modules.

V1 does **not** enable unattended fulfillment. It creates the composition
contract and a disabled, loopback-only planning surface so the proven modules
can be joined without weakening payment, inventory, signing, or retry
boundaries.

## Five stages

1. `observe_and_claim`
2. `reserve_inventory_and_attempt`
3. `execute_reserved_plan`
4. `reconcile_possible_broadcast`
5. `closeout_confirmed_delivery`

Only one request and one stage transition are permitted per invocation.

## Safety contract

- Exact canonical payment identity remains delegated to the verified-payment
  and fulfillment-claim modules.
- Claim must exist before inventory or execution reservation.
- A durable reservation and execution attempt must exist before execution.
- Broadcast-unknown and broadcast-accepted states require reconciliation.
- No automatic retry is permitted after a broadcast may have occurred.
- Closeout requires confirmed delivery.
- Raw signed transactions are never persisted or returned.
- Background loops and startup execution are forbidden.
- The orchestrator runtime is disabled by default and dry-run-only in V1.
- The existing pipeline runtime remains the parent loopback route, but its
  no-wallet/no-signing/no-broadcast authority is unchanged.
- Delivery, native-execution, and confirmed-closeout runtimes remain separately
  gated and are not enabled by this lane.

## Runtime surface

The V1 planning command is integrated under the existing loopback-only pipeline
runtime:

- Status: `/__void/operator/buy-void-runtime-v1/status`
- Command: `/__void/operator/buy-void-runtime-v1/command`
- Action: `run_bounded_auto_fulfillment_stage`

Environment flag:

`VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ENABLED`

Hard cap:

`VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_MAX_REQUESTS_PER_RUN=1`

Even when the V1 flag is enabled, `apply=true` is held with
`runtime_apply_not_enabled_v1`. Live stage application remains available only
through direct trusted composition and is not mounted by this PR.

## Next activation milestone

A later, separately reviewed lane may configure a dedicated apply runtime.
That lane must retain exact per-stage confirmations, server-controlled
policies and paths, durable pre-broadcast control, no retry after uncertainty,
confirmed-only closeout, and a kill switch.
