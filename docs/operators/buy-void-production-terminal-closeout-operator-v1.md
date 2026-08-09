# Buy VOID production terminal-closeout operator v1

Marker:

`VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_V1`

Tracks #1143.

## Purpose

Provide a narrow production operator CLI above the already-merged Buy VOID saga
terminal-closeout runtime.

The operator does not implement terminal closeout itself. It uses the existing
loopback-only parent Buy VOID runtime and leaves the merged terminal coordinator
responsible for canonical confirmed-state reconstruction, deterministic closeout
planning, immutable inventory consumption, public fulfilled projection, and saga
closure.

This lane is downstream of transaction execution and broadcast reconciliation.
It contains no transaction-submission authority.

## Fixed transport

The operator uses only:

```text
GET  http://127.0.0.1:<port>/__void/operator/buy-void-runtime-v1/status
POST http://127.0.0.1:<port>/__void/operator/buy-void-runtime-v1/command
```

The port is selected only by:

`VOID_BUY_VOID_PRODUCTION_TERMINAL_CLOSEOUT_OPERATOR_PORT`

Default: `4100`.

There is no caller host or arbitrary URL input. Redirects, URL credentials,
query strings, and fragments are rejected by the exact endpoint boundary.

## Closed operator surface

The only business selector is:

```text
--saga-id <voidbvfsg1_...>
```

The operator accepts no caller override for:

- Buy VOID runtime root;
- terminal request directory;
- inventory pool ID or inventory path;
- economic or terminal policy objects;
- canonical confirmed-state evidence;
- closeout plan content;
- wallet or signer;
- credential/private key/mnemonic;
- RPC URL or broadcaster;
- raw or signed transaction material; or
- public fulfillment mutation primitives.

The production pool and request directory remain server controlled through the
merged terminal server policy. The pool ID is inherited from the canonical
crash-consistent saga economic policy.

## Dry run

Default invocation is dry-run:

```bash
npx tsx scripts/buy_void_production_terminal_closeout_operator_v1.ts \
  --saga-id <exact-saga-id>
```

Before sending a command the operator validates the parent runtime and terminal
child status, including:

- exact parent/child marker and version;
- parent runtime enabled;
- exact parent status/command paths;
- terminal action present in the parent supported-action set;
- terminal runtime enabled;
- terminal server policy configured;
- valid terminal policy fingerprint;
- exact runtime and terminal confirmation strings; and
- the reviewed runtime/coordinator authority boundaries.

Dry run does not require the terminal apply gate to be enabled.

The command body is exactly:

```json
{
  "action": "run_saga_terminal_closeout",
  "saga_id": "<exact-saga-id>",
  "apply": false
}
```

The returned terminal plan remains server-derived. The operator binds only safe
identifiers into its deterministic operator plan fingerprint:

- saga ID;
- attempt ID;
- closeout ID;
- transaction hash;
- canonical confirmed-state ID;
- canonical confirmed-state fingerprint;
- terminal closeout plan fingerprint;
- terminal policy fingerprint; and
- exact runtime/coordinator/saga/action confirmations.

Nested inventory-consumption, public-event, base-closeout, saga-journal, and raw
server-path objects are not serialized by the operator.

Dry run performs no inventory consumption, public fulfillment projection, saga
closeout append, RPC call, credential access, signing, transaction broadcast, or
money movement.

## Already-closed truth

The underlying terminal runtime may return `duplicate` during a dry invocation
when the exact saga is already durably closed.

The operator preserves that as successful terminal truth:

```text
status=duplicate
already_closed=true
mutation_performed=false
inventory_consumption_performed=false
public_request_fulfilled=true
saga_closeout_appended=false
automatic_retry_allowed=false
```

It does not attempt another apply.

## Explicit apply

Apply requires all dry-run echoes:

```text
--apply
--expected-plan-fingerprint-sha256 <exact operator plan fingerprint>
--confirm buyVoidRunSagaTerminalCloseoutRuntimeV1
--terminal-closeout-confirm buyVoidAdvanceSagaTerminalCloseoutV1
--policy-fingerprint-sha256 <exact terminal policy fingerprint>
--saga-confirm <exact saga confirmation>
--saga-action-confirm <exact closeout_confirmed_delivery confirmation>
```

Authority strings and fingerprints are byte-exact. Padding, case changes, or
substitution fail before the final apply POST.

Before apply, the operator performs:

1. initial status precheck;
2. initial dry plan;
3. exact operator/confirmation checks;
4. fresh apply-ready status precheck;
5. terminal-policy fingerprint continuity check; and
6. a fresh dry replan requiring the same operator plan fingerprint.

Only then may it send the exact nine-key apply command, including the exact server-derived terminal plan fingerprint.

## Mutation and crash truth

Successful `closed` or `recovered_partial` terminal outcomes require the runtime
and coordinator to agree that:

```text
mutation_performed=true
inventory_consumption_performed=true
public_request_fulfilled=true
saga_closeout_appended=true
automatic_retry_allowed=false
money_movement_performed=false
```

`recovered_partial` is preserved as the closeout outcome even though the final
operator status is terminally closed.

A held result after a durable mutation is never rewritten as a clean failure.
The operator preserves the exact known mutation flags and returns
`recovery_required=true`.

If the final applied POST may have been sent but its response is lost, malformed,
or internally contradictory, the operator cannot know which closeout artifacts
were persisted. It returns:

```text
status=closeout_unknown
side_effect_state_known=false
recovery_required=true
mutation_performed=null
inventory_consumption_performed=null
public_request_fulfilled=null
saga_closeout_appended=null
automatic_retry_allowed=false
```

The operator never automatically retries an ambiguous applied closeout.

## Financial authority boundary

Terminal closeout is accounting/projection closure after canonical confirmed
chain evidence already exists.

This operator never:

- calls RPC;
- accesses credentials, a wallet, or private key;
- signs a transaction;
- submits or rebroadcasts a transaction;
- accepts raw signed transaction input;
- changes the immutable public request base record;
- changes the immutable reservation base record;
- runs a background loop;
- starts/restarts a private service; or
- moves money.

A source merge, PR review transition, or CI run performs no live terminal
closeout. A real production `--apply` remains a separate explicit accounting and
state-mutation authorization after canonical confirmed-chain evidence exists.


## Post-append verification truth

A rare final verification-read mismatch can occur after the saga supervisor has already durably appended `closeout_committed`. In that case the terminal-closeout runtime reports a held/recovery-required result with `saga_closeout_appended=true`; the production operator preserves that exact persisted-effect flag rather than relabeling the closeout as not appended. Automatic retry remains disabled.


## Server-enforced terminal plan binding

The final apply request echoes the exact `terminal_plan_fingerprint_sha256` from the fresh reviewed dry run. The loopback runtime requires that fingerprint and passes it to the terminal-closeout core as `expected_plan_fingerprint_sha256`.

The core independently reconstructs the current terminal plan and rejects any mismatch before inventory consumption, public fulfilled projection, or saga append. The artifact apply path acquires the exact per-request terminal-closeout lock, reconstructs the plan again while holding that lock, compares its fingerprint to the reviewed plan, and only then persists or applies terminal artifacts.

Every checked-in writer of `operator-events.jsonl` uses that same per-request lock, including manual operator marks, legacy confirmed closeout, and saga terminal closeout. An operator-status change therefore cannot enter between the final plan comparison and the terminal public projection. A change observed after the reviewed dry run is held as `terminal_closeout_plan_changed_during_apply` before terminal accounting mutation.

A plan mismatch or an inner reconstruction drift is a held closeout-plan decision with automatic retry disabled and all terminal accounting mutation flags false. The fingerprint is an execution/accounting binding, not additional wallet, RPC, signing, transaction-broadcast, or money-movement authority.
