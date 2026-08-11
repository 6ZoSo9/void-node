# Buy VOID production broadcast-reconciliation operator v1

Marker:

`VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1`

Tracks #1138.

## Purpose

Provide the missing production operator CLI above the existing loopback-only
Buy VOID saga broadcast-reconciliation runtime without creating a second
reconciliation engine or exposing the private broadcaster directly.

The underlying child runtime already enforces a hard reconciliation-only
boundary. It can inspect an already-possible submission through the private
broadcaster IPC, but its `submit_once` adapter always throws. This operator keeps
that authority unchanged and removes the need to hand-build parent-runtime JSON.

## Runtime reused

The CLI uses only the existing parent Buy VOID operator routes:

```text
GET  /__void/operator/buy-void-runtime-v1/status
POST /__void/operator/buy-void-runtime-v1/command
```

The child action is fixed to:

```text
run_saga_broadcast_reconciliation
```

The HTTP destination is numeric loopback `127.0.0.1`. Only the local port may
be selected through:

```text
VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_PORT
```

The default port is `4100`.

The CLI rejects non-loopback hosts, alternate paths, userinfo, redirects, query
strings, fragments, invalid ports, oversized responses, and non-JSON responses.

## Closed selector

The only business selector is:

```text
--saga-id <voidbvfsg1_ + 64 lowercase hex characters>
```

Dry-run example:

```bash
npx tsx scripts/buy_void_production_broadcast_reconciliation_operator_v1.ts \
  --saga-id <saga-id>
```

The CLI has no caller input for:

- runtime root;
- broadcaster socket path;
- policy object;
- broadcaster or dependency object;
- custody handle;
- wallet or signer;
- private key, mnemonic, or seed;
- RPC URL;
- raw or signed transaction material; or
- terminal-closeout authority.

## Status precheck

Before any command, the operator validates the parent status boundary:

- parent marker/version and `ok=true`;
- parent runtime enabled;
- exact status and command routes;
- reconciliation action listed as supported;
- child reconciliation marker/version/action;
- child reconciliation runtime enabled;
- exact runtime confirmation
  `buyVoidRunSagaBroadcastReconciliationRuntimeV1`;
- apply action exactly `reconcile_possible_broadcast`;
- `execute_prepared_transaction_mounted=false`; and
- the child no-submit authority object.

Dry run does not require the child apply gate or broadcaster socket to be ready.

A later apply performs a fresh status precheck and additionally requires:

- `apply_enabled=true`;
- broadcaster socket configured; and
- a valid SHA-256 fingerprint for the server-owned broadcaster socket.

The raw socket path is never returned or accepted.

## Dry run

The dry command body is exactly:

```json
{
  "action": "run_saga_broadcast_reconciliation",
  "saga_id": "<exact saga id>",
  "apply": false
}
```

The operator accepts only the reviewed child runtime dry-run envelope and its
nested coordinator dry-run decision. The envelope's
`reconcile_possible_broadcast_apply_supported` flag must exactly agree with the
reported `next_action`. When the next action is reconciliation, the nested dry
decision must also carry `required_broadcast_confirmation=null`; a reconciliation
plan can never inherit transaction-submission authority.

The dry boundary requires:

- zero mutation;
- zero broadcaster calls;
- zero submission calls;
- zero transaction broadcast;
- zero money movement;
- no signed-payload persistence or output; and
- `automatic_retry_allowed=false`.

The operator then creates a deterministic plan fingerprint binding:

- exact saga ID;
- exact execution-attempt ID;
- exact next action;
- exact runtime confirmation;
- exact coordinator confirmation;
- exact stable policy fingerprint;
- exact saga confirmation;
- exact saga-action confirmation; and
- the fixed no-submit/no-money child authority markers.

The operator does not recreate journal reconstruction or broadcast evidence
logic client-side.

## Replan before apply

Apply requires all of the following caller-supplied values:

```text
--apply
--expected-plan-fingerprint-sha256 <exact dry-run operator plan>
--confirm buyVoidRunSagaBroadcastReconciliationRuntimeV1
--coordinator-confirm <exact coordinator confirmation>
--policy-fingerprint-sha256 <exact stable policy fingerprint>
--saga-confirm <exact saga confirmation>
--saga-action-confirm <exact saga-action confirmation>
```

Apply-only authority arguments are rejected when `--apply` is absent.

The operator never synthesizes these confirmation values for the caller.

After the exact echoes pass, the operator:

1. performs a fresh apply-ready status check;
2. repeats the child runtime dry run;
3. recomputes the operator plan fingerprint; and
4. refuses apply if any plan material changed.

Only then may it send the applied command.

## Applied command

The applied command contains exactly eight keys:

```json
{
  "action": "run_saga_broadcast_reconciliation",
  "saga_id": "<exact saga id>",
  "apply": true,
  "confirmation": "<exact runtime confirmation>",
  "coordinator_confirmation": "<exact coordinator confirmation>",
  "policy_fingerprint_sha256": "<exact stable policy fingerprint>",
  "saga_confirmation": "<exact saga confirmation>",
  "saga_action_confirmation": "<exact action confirmation>"
}
```

No submit/broadcast confirmation exists on this CLI.

## Reconciliation outcomes

The underlying coordinator may resolve an already-possible submission to:

```text
not_submitted
unknown
accepted
confirmed
reverted
```

The operator preserves those distinctions in a sanitized result. It does not
serialize the coordinator's full journal/evidence objects. The applied runtime
envelope's top-level `ok` value must exactly match the nested coordinator
decision; contradictory envelopes are treated as unknown side-effect state and
require reinspection.

It preserves:

- whether reconciliation mutated durable evidence/projection state;
- whether broadcaster inspection occurred;
- whether further reconciliation is required; and
- `automatic_retry_allowed=false`.

Even a successful operator result always requires:

```text
transaction_broadcast_performed=false
money_movement_performed=false
terminal_closeout_performed=false
```

## Apply transport ambiguity

A reconciliation apply may perform an external broadcaster inspection and then
write durable reconciliation evidence.

Therefore if the apply POST is sent but the response is lost, times out, is
malformed, or fails the final response boundary, the operator cannot safely
claim nothing happened.

It returns:

```text
status=reconciliation_unknown
side_effect_state_known=false
reconciliation_required=true
automatic_retry_allowed=false
```

The next action is explicit operator reinspection/reconciliation. There is no
automatic retry.

## Hard no-submit boundary

The child runtime remains the authority owner. Its broadcaster wrapper exposes
only `inspect_submission`; `submit_once` is a throwing forbidden path.

The operator additionally rejects any applied result that claims:

- a submission call;
- transaction broadcast; or
- money movement.

Such a contradiction is treated as an authority-boundary failure and remains
reconciliation-required.

## Terminal closeout remains separate

This operator does not consume inventory or publish customer fulfillment.

A `confirmed` reconciliation result only means canonical broadcast/receipt
evidence has reached the confirmed state owned by the existing saga machinery.
The separately gated terminal-closeout runtime remains responsible for immutable
inventory consumption, public fulfilled projection, and saga closure.

That later authority requires its own operator lane and separate authorization.

## Verification

Focused proof:

```bash
npx --no-install tsx \
  scripts/prove_buy_void_production_broadcast_reconciliation_operator_v1.ts
```

Expected marker:

```text
VOID_BUY_VOID_PRODUCTION_BROADCAST_RECONCILIATION_OPERATOR_V1_PROOF_GREEN
```

The permanent workflow runs Node.js 22, 24, and 26 and preserves:

- saga broadcast-reconciliation coordinator;
- saga broadcast-reconciliation runtime;
- private broadcaster IPC;
- prepared-transaction chain-2050 transport;
- parent Buy VOID runtime integration;
- saga terminal-closeout coordinator/runtime regressions;
- repository typecheck/build; and
- committed-range diff hygiene.

## Authority boundary

Source, proof, documentation, and CI only.

Publication or merge performs no production journal mutation, broadcaster
inspection, RPC call, credential/private-key access, signing, transaction
submission/broadcast, inventory consumption, public closeout, service
activation/restart, Work Credit/validator mutation, or fund movement.

A future real dry run is separate read-only operator activity. A future real
reconciliation `--apply` may inspect and reconcile an already-existing possible
submission, but it still cannot submit a transaction or move funds.

Refs #1138, #1136, #1135, #1128, #1118.
