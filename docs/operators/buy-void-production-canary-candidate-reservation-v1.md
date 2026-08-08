# Buy VOID production canary candidate reservation v1

Marker:

`VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1`

## Purpose

Provide one narrow operator CLI for creating the clean, already-claimed Buy VOID
reservation state required by the production live-canary preflight.

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

The HTTP destination is always numeric loopback:

```text
http://127.0.0.1:<port>/__void/operator/buy-void-runtime-v1/command
```

The port is local operator process configuration through
`VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_OPERATOR_PORT` and defaults to
`4100`. No host or URL override exists.

## Default planning mode

Planning is the default:

```bash
npx tsx scripts/buy_void_production_canary_candidate_reservation_v1.ts \
  --request-id <request-id>
```

The CLI sends one `apply=false` request to the existing crash-consistent saga
runtime and accepts only the following next stages:

- `reserve_inventory`;
- `reserve_execution_attempt`; or
- `prepare_transaction`.

`claim_payment` is not accepted by this operator. A canary candidate must
already have a durable verified-payment claim. The CLI never accepts a receipt
or payment observation to create that claim.

Any later, terminal, unknown, or malformed stage holds.

For a reservation stage, planning prints the exact server-derived:

- request ID;
- saga ID;
- next action;
- runtime confirmation;
- saga confirmation;
- action confirmation;
- delegated confirmation when the runtime requires one;
- stable server-policy fingerprint; and
- CLI plan fingerprint.

The plan fingerprint binds those values and the candidate snapshot fields used
by this operator. It must be echoed on an apply invocation, forcing a fresh
server dry run to match the reviewed plan before any reservation mutation.

## One-stage apply wall

Applying one reservation stage requires a separate invocation with exact echoes:

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

The CLI always re-runs planning first. Stale or altered plan fingerprints,
confirmations, policy fingerprints, or delegated confirmation values stop before
the apply request.

One invocation can apply at most one business stage. After `reserve_inventory`
succeeds, the CLI exits. The operator must run planning again before separately
authorizing `reserve_execution_attempt`.

The CLI never chains those two stages automatically.

## Candidate-ready boundary

When a fresh dry run reports:

```text
next_action=prepare_transaction
```

this CLI stops and returns `status=candidate_ready` only if the server-derived
snapshot contains one lowercase 64-hex execution attempt in clean `reserved` or
`prepared` state.

The returned `candidate_attempt_id` is the handoff to the production live-canary
preflight operator.

This CLI does **not** apply `prepare_transaction`, does not invoke the production
preflight itself, and does not start production private services.

## Authority boundary

The CLI adds no direct import of the inventory or execution-attempt journal
mutation functions. All allowed mutations remain delegated to the existing
crash-consistent saga runtime.

This operator cannot:

- claim a payment;
- call chain RPC;
- prepare or sign a transaction;
- access credentials or wallet material;
- submit or broadcast a transaction;
- decrement inventory;
- mark a public request fulfilled;
- start or stop private services;
- deploy or restart a node; or
- move funds.

A real inventory reservation or execution-attempt reservation remains a separate
operational authorization. A real read-only production preflight, private-service
activation, transaction preparation, signing, broadcast, receipt reconciliation,
and terminal closeout remain later separate gates.

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

The focused workflow also preserves the crash-consistent saga runtime and server
policy proofs, production live-canary preflight proof, repository typecheck,
build, and committed-range diff hygiene on Node.js 22, 24, and 26.

Refs #1119, #1118, #1115.
