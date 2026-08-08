# Buy VOID production candidate reservation operator v1

Marker:

`VOID_BUY_VOID_PRODUCTION_CANDIDATE_RESERVATION_OPERATOR_V1`

Issue: #1119

## Purpose

Add the missing narrow production operator surface between a payment that already has a durable Buy VOID claim and the existing production live-canary preflight.

The operator drives only the existing loopback Buy VOID runtime action:

```text
run_crash_consistent_saga_stage
```

It does not create a second reservation journal, policy parser, orchestration engine, transaction-preparation path, signer path, or broadcaster path.

## Only business selector

The CLI accepts exactly one business selector:

```text
--request-id <request-id>
```

It does not accept a runtime root, request directory, payment observation, receipt, payment policy, inventory policy, execution policy, wallet, RPC URL, signer, broadcaster, private socket, attempt ID, raw transaction, or signed transaction.

The loopback listener is located only from local process configuration: `HTTP_PORT`, with the existing node default of `4100`. The host is fixed to `127.0.0.1` and the path is fixed to:

```text
/__void/operator/buy-void-runtime-v1/command
```

## Candidate-reservation ceiling

Every operator request sends:

```json
{
  "action": "run_crash_consistent_saga_stage",
  "request_id": "<request-id>",
  "candidate_reservation_only": true
}
```

`candidate_reservation_only` is a safety ceiling on the existing runtime action, not a new action.

For an unclaimed request, the runtime can report a source-derived `claim_payment` dry hold without requiring caller payment/receipt material.

For an already claimed saga, normal server-owned reconstruction determines the next action. The operator may apply only:

1. `reserve_inventory`
2. `reserve_execution_attempt`

When the next action is `prepare_transaction`, the ceiling returns before the preparation enable gate and before the prepared-transaction coordinator. Therefore candidate inspection performs no nonce/fee RPC planning, constructs no custodian, signs nothing, and cannot prepare or broadcast a transaction.

The ordinary crash-consistent runtime behavior is unchanged for callers that do not set `candidate_reservation_only=true`.

## Default planning

The default CLI mode performs exactly one runtime request with `apply=false`.

For a reservation stage it emits the exact review/apply material returned by the server runtime:

- request ID;
- saga ID;
- next action;
- runtime confirmation;
- saga confirmation;
- action confirmation;
- delegated confirmation when required;
- server-policy fingerprint;
- SHA-256 of the server-derived snapshot;
- SHA-256 of the server-derived snapshot evidence;
- the server-derived snapshot; and
- the server-derived evidence projection.

The snapshot/evidence digests are recomputed by the CLI before the plan is accepted.

Planning performs no journal write, RPC call, credential access, signing, transaction broadcast, inventory decrement, public fulfilled closeout, or money movement.

## One-stage apply wall

Apply requires explicit `--apply` plus byte-exact echoes from the immediately re-derived dry run:

```text
--saga-id <exact saga id>
--runtime-confirm <exact runtime confirmation>
--saga-confirm <exact saga confirmation>
--action-confirm <exact action confirmation>
--policy-fingerprint-sha256 <exact server-policy fingerprint>
--delegated-confirm <exact delegated confirmation, only when required>
```

The CLI always performs the dry run again first. Any stale or altered saga ID, runtime confirmation, saga confirmation, action confirmation, delegated confirmation, or policy fingerprint holds before an apply request is sent.

A successful apply sends one request for one already-selected reservation stage and returns `applied_one_stage` with `rerun_required=true`. It does not automatically inspect or apply the next stage.

This means inventory reservation and execution-attempt reservation require separate operator invocations and separate confirmation echoes.

## Claim boundary

The operator never accepts receipt/payment-observation input and never applies `claim_payment`.

If the server reports `claim_payment`, the operator returns:

```text
candidate_reservation_requires_existing_claim
```

No apply request follows.

## Candidate ready

After the execution-attempt reservation has been separately applied, rerun the default planning command.

Candidate ready requires all of the following server-derived facts:

- next action exactly `prepare_transaction`;
- request ID matches the selected request;
- claim status exactly `claimed`;
- one execution attempt exists;
- selected attempt number is exactly `1`;
- attempt status exactly `reserved`;
- attempt ID is exact lowercase 64-hex;
- broadcast status is `none`;
- no confirmed state exists; and
- the runtime candidate ceiling reports that preparation and RPC were not invoked.

The CLI then emits `candidate_ready`, the exact execution-attempt ID, the snapshot/evidence digests, and a deterministic candidate evidence ID.

It does **not** invoke the production live-canary preflight. That preflight remains a separate review/authorization step and retains its own read-only chain planning boundary.

## Example sequence

Plan the current reservation stage:

```bash
npx tsx scripts/buy_void_production_candidate_reservation_operator_v1.ts \
  --request-id <request-id>
```

If the result is `planned`, review it and separately invoke apply with the exact emitted values. After `applied_one_stage`, run the planning command again instead of chaining automatically.

The expected progression for an already claimed request is therefore:

```text
reserve_inventory plan
-> explicit reserve_inventory apply
-> rerun
-> reserve_execution_attempt plan
-> explicit reserve_execution_attempt apply
-> rerun
-> candidate_ready at prepare_transaction
```

## Proof and CI

Focused proofs cover:

- request-ID-only CLI selection and rejection of unsafe selector/material flags;
- loopback-only runtime transport construction;
- claim-stage hold with no apply request;
- exact reservation dry requirements;
- stale saga/policy echo rejection before apply;
- one-stage-only inventory and attempt applies;
- separate attempt reservation invocation;
- exact clean attempt ID extraction only from the server snapshot;
- candidate-ready hard stop before preparation;
- candidate ceiling behavior even when the preparation gate is disabled;
- attempted `apply=true` at `prepare_transaction` still returning dry candidate evidence;
- zero prepared-transaction coordinator/custodian/saga-supervisor calls at the ceiling; and
- zero RPC, signing, broadcast, inventory decrement, public closeout, or money movement authority.

Hosted CI runs these proofs on Node.js 22, 24, and 26 and preserves the existing crash-consistent runtime/server-policy proof, production live-canary preflight proof, repository typecheck/build, and committed-range diff hygiene.

## Authority boundary

This lane changes source, proof, documentation, and CI only.

It does not activate a production runtime, obtain payment evidence, claim payment, deploy or restart a service, read a production credential, call a production RPC endpoint, prepare or sign a transaction, submit or rebroadcast a transaction, decrement inventory, mark a buyer fulfilled, invoke the live-canary preflight, mutate Work Credits or validator state, or move funds.
