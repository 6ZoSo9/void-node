# Buy VOID production canary candidate reservation v1

Marker:

`VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1`

## Purpose

Provide one narrow operator CLI for advancing an already-verified Buy VOID
payment into the clean reservation state required by the production live-canary
preflight.

The CLI does not implement a new reservation engine. It talks only to the
existing loopback Buy VOID runtime action `run_crash_consistent_saga_stage`,
which remains the source of truth for server-owned policy, request/journal
projection, saga fencing, inventory reservation, and execution-attempt
reservation.

This lane is source/proof/docs/CI only. Publication or merge performs no live
reservation and no production I/O.

## Business selector

The only business selector is:

```text
--request-id <request-id>
```

The runtime root, public request directory, payment policy, inventory policy,
execution policy, fulfillment wallet, RPC URL, signer, broadcaster, receipt,
private-service paths, and transaction material cannot be supplied through the
CLI.

The HTTP destinations are always numeric loopback on the same local port:

```text
GET  http://127.0.0.1:<port>/__void/operator/buy-void-runtime-v1/status
POST http://127.0.0.1:<port>/__void/operator/buy-void-runtime-v1/command
```

The port is local operator process configuration through
`VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT` and defaults to
`4100`. No host or arbitrary URL override exists.

## Hard preparation-off precondition

Before every planning or apply sequence, the CLI reads the parent runtime status
and requires all of the following:

- the parent Buy VOID runtime is enabled;
- the crash-consistent saga runtime is enabled; and
- `VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED` remains disabled.

If transaction preparation is enabled, this CLI holds before sending a saga
command.

This boundary is deliberate. The crash-consistent saga runtime's
`prepare_transaction` path can invoke the separately reviewed read-only
chain-2050 nonce/fee/balance planner. Candidate reservation must remain below
that authority. Therefore this operator never enters transaction preparation and
has zero RPC authority.

## Already-claimed saga reconciliation

A durable fulfillment claim can predate its crash-consistent saga projection.
In that legitimate state the server runtime reports `next_action=claim_payment`
even though the fulfillment claim already exists.

This CLI permits that action only when the same server-derived snapshot reports:

```text
claim_status=claimed
```

The CLI has no receipt argument and never supplies payment evidence. Therefore
it cannot use this path to manufacture a new claim. The existing runtime must
find the already-durable claim before it can apply the stage; otherwise the
request fails closed before the saga mutation.

For a successful reconciliation the CLI additionally requires the returned saga
state to be:

```text
state=claimed
next_action=reserve_inventory
```

and reports:

```text
claim_projection_reconciled=true
claim_journal_write_performed=false
```

This stage only anchors an existing verified claim into the saga event chain.
It does not authorize or perform another payment claim.

## Default planning mode

Planning is the default:

```bash
npx tsx scripts/buy_void_production_canary_candidate_reservation_v1.ts \
  --request-id <request-id>
```

After the status precheck, the CLI sends one `apply=false` request to the
existing crash-consistent saga runtime. It accepts only these server-derived
stages, and only while the snapshot proves an existing claim:

- `claim_payment` — existing-claim saga reconciliation only;
- `reserve_inventory`;
- `reserve_execution_attempt`.

Any unclaimed snapshot, malformed response, later stage, or unknown stage holds.

If the request was already advanced through execution-attempt reservation, the
preparation-disabled runtime hold is translated to:

```text
candidate_already_reserved_use_prior_candidate_receipt
```

The operator should retain the successful candidate receipt produced by the
execution-attempt reservation invocation and use its attempt ID for the
production preflight.

For an allowed stage, planning prints the exact server-derived:

- request ID;
- saga ID;
- next action;
- runtime confirmation;
- saga confirmation;
- action confirmation;
- delegated confirmation when the runtime requires one;
- stable server-policy fingerprint; and
- CLI plan fingerprint.

The plan fingerprint binds those values. It must be echoed on an apply
invocation, forcing a fresh status check and server dry run to match the reviewed
plan before any mutation.

## One-stage apply wall

Applying one stage requires a separate invocation with exact echoes:

```bash
npx tsx scripts/buy_void_production_canary_candidate_reservation_v1.ts \
  --request-id <request-id> \
  --apply \
  --expected-plan-fingerprint-sha256 <exact-plan-sha256> \
  --confirm <exact-runtime-confirmation> \
  --saga-confirm <exact-saga-confirmation> \
  --action-confirm <exact-action-confirmation> \
  --policy-fingerprint-sha256 <exact-server-policy-sha256>
```

When the runtime plan includes a delegated confirmation, also supply:

```text
--delegated-confirm <exact-delegated-confirmation>
```

The CLI always re-runs the status precheck and planning first. Stale or altered
plan fingerprints, confirmations, policy fingerprints, or delegated
confirmation values stop before the apply request.

One invocation can apply at most one business stage. The CLI never chains
claim projection, inventory reservation, and execution-attempt reservation.
Each successful stage must be followed by a fresh planning invocation before a
later stage can be separately authorized.

## Candidate-ready boundary

Candidate readiness is established by the **successful
`reserve_execution_attempt` apply response itself**. The CLI validates that the
existing saga runtime reports:

```text
action=reserve_execution_attempt
state=attempt_reserved
attempt_number=1
next_action=prepare_transaction
```

and that `attempt_id` is one exact lowercase 64-hex identifier.

Only then does the CLI return:

```text
status=candidate_ready
candidate_attempt_id=<exact attempt id>
candidate_handoff=production_live_canary_preflight
runtime_preparation_enabled=false
```

This is the handoff to the production live-canary preflight operator. No
`prepare_transaction` dry run is needed, so candidate creation performs no RPC
planning and never approaches signing or custody.

## Authority boundary

The CLI adds no direct import of fulfillment-claim, inventory, or
execution-attempt journal mutation functions. All permitted saga mutations
remain delegated to the existing crash-consistent saga runtime.

This operator cannot:

- create a payment claim;
- accept a payment receipt or payment observation;
- invoke transaction preparation;
- call chain RPC;
- prepare or sign a transaction;
- access credentials or wallet material;
- submit or broadcast a transaction;
- decrement inventory;
- mark a public request fulfilled;
- start or stop private services;
- deploy or restart a node; or
- move funds.

A real existing-claim saga reconciliation, inventory reservation, or
execution-attempt reservation remains a separate operational authorization. A
real read-only production preflight, private-service activation, transaction
preparation, signing, broadcast, receipt reconciliation, and terminal closeout
remain later separate gates.

## Verification

Focused proof:

```bash
npx --no-install tsx \
  scripts/prove_buy_void_production_canary_candidate_reservation_v1.ts
```

Expected marker:

```text
VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1_PROOF_GREEN
```

The proof establishes the preparation-off status precondition, zero-RPC
candidate lane, request-ID-only selection, fixed loopback routing, rejection of
receipt/policy/execution-material inputs, existing-claim-only saga
reconciliation with zero claim-journal write, exact stage confirmations,
stale-plan rejection, separate one-stage inventory and attempt reservation,
candidate attempt-ID extraction from the attempt-reservation apply receipt, and
zero `prepare_transaction` invocations.

The focused workflow also preserves the crash-consistent saga runtime and server
policy proofs, production live-canary preflight proof, repository typecheck,
build, and committed-range diff hygiene on Node.js 22, 24, and 26.

Refs #1119, #1118, #1115.
