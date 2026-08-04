# Buy VOID bounded automatic-fulfillment orchestrator V1

## Purpose

This lane defines a bounded five-stage state machine over the existing Buy VOID
claim, reservation, execution, broadcast-outcome, confirmation, and
confirmed-closeout modules.

The operator runtime now mounts source support for applying exactly two
non-money stages. It remains disabled by default and requires a separately
configured server policy plus a fresh server-derived plan and exact
confirmations. This source change does not enable the runtime on any host.

## Five stages

1. `observe_and_claim`
2. `reserve_inventory_and_attempt`
3. `execute_reserved_plan`
4. `reconcile_possible_broadcast`
5. `closeout_confirmed_delivery`

Only one request and one stage transition are permitted per invocation.

## Runtime apply boundary

The mounted non-money apply bridge can invoke only:

- `observe_and_claim`
- `reserve_inventory_and_attempt`

The bridge cannot invoke:

- `execute_reserved_plan`
- `reconcile_possible_broadcast`
- `closeout_confirmed_delivery`

The hard-forbidden stages remain unavailable even if they are placed in a
server environment allowlist.

Each apply invocation requires:

- loopback operator access;
- the parent Buy VOID runtime enabled;
- the bounded orchestrator runtime enabled;
- a valid server-controlled non-money apply policy;
- one server-derived request snapshot;
- one successful dry-run decision;
- an exact SHA-256 plan fingerprint echo;
- the exact orchestrator confirmation;
- the exact delegated-stage confirmation;
- the exact stage confirmation;
- one request and one stage transition only.

## Server-controlled environment policy

Planning/runtime flag:

`VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_RUNTIME_ENABLED`

Hard request cap:

`VOID_BUY_VOID_BOUNDED_AUTO_FULFILLMENT_ORCHESTRATOR_MAX_REQUESTS_PER_RUN=1`

Apply gate:

`VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ENABLED`

Comma-separated allowlist:

`VOID_BUY_VOID_BOUNDED_ORCHESTRATOR_APPLY_ALLOWED_STAGES`

The allowlist accepts only `observe_and_claim` and
`reserve_inventory_and_attempt`. The gate is ineffective unless the apply flag
is true and at least one valid stage is configured. Invalid or money-moving
stage tokens fail closed.

Clients cannot provide or override the policy, paths, lifecycle snapshot, or
enabled stages.

## Safety contract

- Exact canonical payment identity remains delegated to the verified-payment
  and fulfillment-claim modules.
- Claim must exist before reservation.
- A durable reservation and execution attempt must exist before native
  execution.
- No automatic retry is permitted.
- Raw signed transactions are never persisted or returned.
- Background loops and startup execution are forbidden.
- Wallet access, signing, transaction broadcast, native delivery, and confirmed
  closeout remain separately gated and unavailable through this runtime bridge.
- A source commit or merged pull request does not set environment variables,
  invoke apply, deploy code, restart services, or move funds.

## Runtime surface

The loopback-only parent routes remain:

- Status: `/__void/operator/buy-void-runtime-v1/status`
- Command: `/__void/operator/buy-void-runtime-v1/command`
- Action: `run_bounded_auto_fulfillment_stage`

A dry request returns `apply_activation.plan.plan_fingerprint_sha256` and all
required confirmations. An apply request is accepted only when the server
policy authorizes the selected non-money stage and every plan binding matches.

## Remaining activation gate

A separate operator action is still required to configure any environment
policy, deploy the reviewed source, and invoke a specific request. No runtime
configuration or stage invocation is part of this source lane.
