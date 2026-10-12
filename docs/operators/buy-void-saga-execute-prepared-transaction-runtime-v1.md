# Buy VOID saga execute prepared transaction runtime v1

Marker:

`VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_V1`

Decision:

`SOURCE_ONLY_EXPLICITLY_GATED_EXECUTE_PREPARED_TRANSACTION_RUNTIME_MOUNT`

## Purpose

Mount the existing `execute_prepared_transaction` saga action through the
loopback-only Buy VOID operator runtime without creating a second transaction
sender.

The runtime delegates the dangerous operation to the already reviewed
`buy_void_saga_broadcast_reconciliation_coordinator_v1.ts` and the existing
private prepared-transaction broadcaster IPC.

The private broadcaster service remains separately operated and is not started
by this source lane.

## Runtime action

The parent runtime gains:

`run_saga_execute_prepared_transaction`

The caller may select only a canonical `saga_id`. Root directory and private
broadcaster socket remain server controlled.

Dry run reconstructs the exact saga/journal state and returns the coordinator,
policy, saga, action, and broadcast confirmations required for a later apply.
Dry run requires no broadcaster socket and performs no submission.

## Three independent default-off gates

Execution requires all three server-controlled gates:

- `VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_ENABLED=1`
- `VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_APPLY_ENABLED=1`
- `VOID_BUY_VOID_SAGA_EXECUTE_PREPARED_TRANSACTION_RUNTIME_SUBMISSION_ENABLED=1`

The private socket path comes only from:

`VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SOCKET`

Source merge alone therefore does not enable execution or submission.

## Exact confirmation boundary

Apply requires exact echoes of:

- execution-runtime confirmation;
- broadcast/reconciliation coordinator confirmation;
- stable server-policy fingerprint;
- saga confirmation;
- exact saga-action confirmation; and
- `buyVoidSubmitPreparedTransactionFromOpaqueCustodyV1` broadcast confirmation.

The coordinator must reconstruct the current next action as exactly
`execute_prepared_transaction`.

If the current action is `reconcile_possible_broadcast`, this runtime holds and
directs the operator to the reconciliation runtime. It does not automatically
retry or resubmit.

## Submission architecture

This runtime does not sign, receive signed bytes, or send chain RPC directly.

It creates the existing metadata-only Unix-socket broadcaster IPC and passes
that broadcaster to the existing crash-consistent broadcast coordinator. The
coordinator retains the durable write-ahead broadcast-intent, evidence,
projection, saga append, and ambiguity/reconciliation rules.

The application process still has no private-key access, wallet access,
signing, raw signed transaction input/output, or custody handle input/output.

When all explicit gates and confirmations are satisfied and the separately
operated private broadcaster service is available, a submission can occur and
can move native VOID. That capability is explicit in this runtime's authority
metadata.

## Parent runtime authority

The parent runtime still performs no direct RPC, signing, or direct broadcast.
Its existing `transaction_broadcast: false` and `money_movement: false` fields
describe the parent adapter itself.

This lane adds parent metadata stating that delegated submission and money
movement are possible only through the separately gated execution child.

## Proof boundary

The focused proof uses dependency injection only. It simulates exactly one
`submit_once` call after all default-off gates and confirmations are satisfied.

The proof starts no broadcaster service, makes no RPC call, broadcasts no real
transaction, and moves no funds.

## Authority boundary

This source packet does not enable any runtime environment variable, start the
private broadcaster service, configure production RPC, access credentials or
signer material, deploy or restart a service, submit a real transaction,
decrement inventory, perform public fulfilled closeout, mutate Work Credits or
validators, or move funds.

Publication, ready-for-review, merge, runtime enablement, private broadcaster
service activation, production RPC/signer access, real submission, receipt
acceptance, terminal fulfillment, and money movement remain separate gates.
