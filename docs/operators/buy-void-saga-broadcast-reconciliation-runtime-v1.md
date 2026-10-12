# Buy VOID saga broadcast reconciliation runtime v1

Marker:

`VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_V1`

Decision:

`SOURCE_ONLY_RECONCILIATION_ONLY_RUNTIME_BRIDGE_SUBMIT_ONCE_UNMOUNTED`

## Purpose

The crash-consistent Buy VOID broadcast/reconciliation coordinator and the
private prepared-transaction broadcaster IPC now exist on `main`, but the
operator runtime does not yet compose them.

This lane mounts only the recovery side of that boundary through the existing
loopback-only Buy VOID operator command route.

It does **not** mount `execute_prepared_transaction`.

## Runtime action

The existing parent route gains:

`run_saga_broadcast_reconciliation`

The caller may select only a canonical `saga_id`. The root directory and
broadcaster Unix socket are server controlled.

Dry run requires neither a broadcaster socket nor external inspection. It
reconstructs current saga/journal state and returns the exact coordinator,
policy, saga, and action confirmations required for a later reconciliation.

## Apply boundary

Apply requires both:

- `VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_ENABLED=1`
- `VOID_BUY_VOID_SAGA_BROADCAST_RECONCILIATION_RUNTIME_APPLY_ENABLED=1`

The private socket path comes only from:

`VOID_BUY_VOID_PREPARED_TRANSACTION_BROADCASTER_SOCKET`

The status surface reports only whether the path is configured plus a SHA-256
fingerprint. It does not return the raw socket path.

Apply is accepted only when the reconstructed next action is exactly:

`reconcile_possible_broadcast`

If the next action is `execute_prepared_transaction`, the runtime holds before
creating the broadcaster dependency.

## Hard no-submit wrapper

The runtime does not pass the full IPC broadcaster directly into the
coordinator.

It constructs a reconciliation-only wrapper:

- `inspect_submission` delegates to the private IPC broadcaster;
- `submit_once` always throws
  `runtime_reconciliation_only_submit_once_forbidden`.

Therefore a future coordinator regression cannot turn this runtime action into
a transaction-submission path.

The existing coordinator proof remains part of the focused workflow and
continues to prove reconciliation itself never calls `submit_once`.

## Exact confirmations

Apply requires exact echoes of:

- runtime confirmation;
- coordinator confirmation;
- stable server-policy fingerprint;
- saga confirmation; and
- saga-action confirmation.

No caller-supplied root, socket path, policy, broadcaster, dependency object,
custody handle, signed transaction, wallet, signer, RPC URL, or private
material is accepted by this runtime action.

## Authority

This lane can inspect/reconcile an already existing possible submission when
the private broadcaster service is separately available.

It cannot initiate a submission.

It does not:

- expose raw signed transaction bytes;
- access application wallet/private-key material;
- call `submit_once`;
- enable automatic resubmission;
- decrement inventory;
- perform public fulfilled closeout;
- deploy or restart a service;
- activate a background loop;
- broadcast a transaction; or
- move funds.

A future lane that mounts `execute_prepared_transaction` must change this
authority boundary explicitly and requires separate review and authorization.
