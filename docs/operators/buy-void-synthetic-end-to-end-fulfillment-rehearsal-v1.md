# Buy VOID synthetic end-to-end fulfillment rehearsal v1

Marker:

`VOID_BUY_VOID_SYNTHETIC_END_TO_END_FULFILLMENT_REHEARSAL_V1_GREEN`

## Purpose

Prove that the merged Buy VOID components can carry one exact synthetic saga
through the complete post-payment fulfillment shape without touching production
credentials, production RPC, live inventory, a live public fulfilled projection,
or real funds.

The rehearsal intentionally adds no new production runtime implementation. It
uses the existing merged components and proves their interface composition in
one process with private temporary state.

## One-saga sequence

The rehearsal drives one synthetic saga through:

1. generated test credential only;
2. merged credential-backed prepared-transaction custodian composition;
3. real private custodian Unix-socket IPC;
4. exactly one prepared transaction/signature;
5. merged submission-capable broadcaster activation with an injected synthetic
   chain transport;
6. merged execute-prepared-transaction runtime using its default private
   broadcaster IPC adapter;
7. one synthetic `submit_once` after durable broadcaster intent publication;
8. merged broadcast-reconciliation runtime using inspection only;
9. one synthetic confirmed receipt for chain `2050`; and
10. merged terminal-closeout runtime producing a synthetic closed result.

The same `saga_id`, `attempt_id`, transaction-plan fingerprint, custody identity,
and signed transaction hash remain bound across the stages that consume them.

## Real merged boundaries exercised

The rehearsal uses the real merged implementations for:

- fixed-credential wallet signer;
- prepared-transaction credential signer;
- credential-backed custodian composition;
- private custodian service and IPC adapter;
- submission-capable broadcaster activation;
- private broadcaster service and IPC adapter;
- execute-prepared-transaction runtime;
- broadcast-reconciliation runtime; and
- terminal-closeout runtime.

Only the saga coordinator decisions and chain transport are synthetic/injected.
Those dependencies are deliberately synthetic because the purpose of this lane
is interface composition, not live financial activation.

## Signing boundary

The credential is an in-test generated private key written only beneath the
private temporary proof root.

The rehearsal requires:

- composition performs no credential read or signing;
- first `prepare_once` reads the generated test credential and signs exactly
  once;
- the custodian IPC response never contains raw signed transaction bytes; and
- duplicate preparation returns the cached result without another credential
  read or signing call.

No production credential path is selected or read.

## Submission boundary

The broadcaster is started with `submission_enabled: true` only inside the
proof process and only with an injected synthetic transport.

Activation itself must perform zero submission calls.

The execute runtime then delegates through its normal private IPC adapter. The
broadcaster must publish its durable submission-intent record before the
synthetic transport receives the private raw signed transaction.

Exactly one synthetic submit call is allowed.

The raw signed transaction may cross only the private custodian/broadcaster
service boundary into the injected synthetic transport. It is never emitted by
application IPC or proof-visible runtime response bodies.

## Reconciliation boundary

The first synthetic submit returns `accepted`, not `confirmed`.

Confirmation therefore requires the separately merged
broadcast-reconciliation runtime. That runtime exposes only the broadcaster's
`inspect_submission` method and forbids `submit_once`.

The rehearsal requires:

- one synthetic submit call total;
- one synthetic inspection call total;
- zero reconciliation submit calls; and
- no automatic resubmission.

The synthetic inspection returns a closed-schema confirmed receipt bound to:

- chain ID `2050`;
- the exact signed transaction hash;
- the generated test wallet address;
- the exact synthetic delivery address; and
- the exact synthetic VOID amount.

## Terminal closeout boundary

After confirmation, the rehearsal invokes the merged terminal-closeout runtime
with a synthetic coordinator dependency that first requires the confirmed
receipt to exist.

The result models:

- inventory consumption;
- public fulfilled projection; and
- saga closeout.

Those are synthetic proof outcomes only. The proof does not point the terminal
coordinator at production inventory or the production public request tree.

Existing focused terminal-closeout proofs remain authoritative for durable
inventory/public-event/saga ordering and crash recovery.

## Workflow regression wall

The focused workflow runs the all-up rehearsal on Node.js 22, 24, and 26 and
also re-proves the individually merged boundaries:

- custodian credential composition;
- broadcaster submission activation;
- broadcaster inspection activation;
- broadcaster IPC;
- chain-2050 transport and composition;
- execute runtime and parent dispatch;
- broadcast-reconciliation runtime;
- terminal-closeout runtime and parent dispatch;
- confirmed-closeout behavior;
- crash-consistent saga runtime;
- parent Buy VOID Runtime Integration and guard;
- repository typecheck;
- production build; and
- diff hygiene.

## Expected truth

The proof emits at least:

```text
VOID_BUY_VOID_SYNTHETIC_END_TO_END_FULFILLMENT_REHEARSAL_V1_GREEN
generated_test_credential_only=true
production_credential_access=false
credential_sign_calls=1
duplicate_prepare_additional_sign_calls=0
custodian_private_ipc_used=true
raw_signed_transaction_application_visibility=false
submission_capable_broadcaster_started_synthetic=true
broadcaster_activation_submit_calls=0
durable_submission_intent_before_transport=true
synthetic_submit_calls=1
automatic_resubmission=false
reconciliation_inspection_calls=1
reconciliation_submit_calls=0
confirmed_receipt_chain_id=2050
confirmed_receipt_matches_synthetic_purchase=true
synthetic_terminal_closeout=true
synthetic_inventory_consumption=true
synthetic_public_fulfilled_projection=true
synthetic_saga_closed=true
real_rpc_calls=0
real_transaction_broadcast=false
real_inventory_mutation=false
real_public_fulfilled_closeout=false
real_money_movement=false
production_service_activation=false
```

## Authority boundary

This lane is proof, documentation, CI, branch publication, and draft PR only.

It does **not**:

- modify an existing production runtime source file;
- enable any production environment variable;
- start a production custodian or broadcaster service;
- access a production wallet credential or signer;
- configure or call production RPC;
- invoke real `eth_sendRawTransaction`;
- broadcast a real transaction;
- decrement production VOID inventory;
- append a live fulfilled purchase projection;
- deploy or restart services;
- mutate Work Credits or validator state; or
- move funds.

Production rehearsal, production service activation, production RPC binding,
real submission, and any live purchase canary remain separate explicit gates.
