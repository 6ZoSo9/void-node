# Buy VOID saga terminal closeout runtime v1

Marker:

`VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_V1`

Decision:

`SOURCE_ONLY_EXPLICITLY_GATED_SAGA_TERMINAL_CLOSEOUT_RUNTIME_MOUNT`

## Purpose

Mount the existing crash-consistent saga terminal-closeout coordinator through
the loopback-only parent Buy VOID runtime.

The underlying coordinator already owns the durable transition:

```text
receipt_confirmed
  -> closeout_confirmed_delivery
  -> closeout_committed
  -> closed
```

and already composes canonical confirmed-state evidence, immutable inventory
consumption, the append-only public fulfilled projection, and the terminal saga
event. This lane does not create a second closeout implementation.

This lane is intended to stack on the exact reviewed execute-runtime parent so
the application-side Buy VOID path can expose the next saga action without
weakening the separate runtime gates.

## Runtime action

The parent runtime gains:

`run_saga_terminal_closeout`

The caller may select only a canonical `saga_id`. The Buy VOID runtime root,
economic policy, pool ID, and public request directory remain server controlled.

## Independent default-off gates

The child runtime requires:

```text
VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_ENABLED=1
VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_RUNTIME_APPLY_ENABLED=1
```

The existing terminal coordinator separately requires its server policy gate:

```text
VOID_BUY_VOID_SAGA_TERMINAL_CLOSEOUT_ENABLED=1
```

and the existing server-controlled economic-policy/request-directory inputs.

The parent runtime retains its own independent gate:

```text
VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1
```

Source merge alone therefore cannot perform a terminal closeout.

## Dry-run boundary

Dry run calls the existing terminal coordinator with `apply=false`.

It returns the coordinator-derived exact requirements for a later apply:

- runtime confirmation;
- terminal-closeout confirmation;
- terminal server-policy fingerprint;
- saga confirmation; and
- exact `closeout_confirmed_delivery` action confirmation.

Dry run performs no inventory-consumption write, public fulfilled projection,
or saga closeout append.

If the saga is already closed, the runtime returns the coordinator's duplicate
truth without creating another closeout.

## Apply boundary

Apply requires all child and parent runtime gates plus exact echoes of every
dry-run confirmation.

The runtime then delegates to `runBuyVoidSagaTerminalCloseoutV1(...)`.

The coordinator retains all existing crash-consistency behavior:

1. persist deterministic terminal plan;
2. write immutable inventory-consumption evidence;
3. append one public fulfilled event and sidecar; and
4. append exactly one saga `closeout_committed` event.

No automatic retry is introduced. If the coordinator reports a held state
after any durable mutation, the runtime returns a server failure while
preserving the coordinator's mutation truth for explicit recovery.

## Authority boundary

This lane can make the existing inventory-consumption/public-fulfilled/saga
closeout mutations reachable only after explicit runtime apply gates and exact
confirmations.

It does not:

- access a wallet, signer, private key, mnemonic, or credentials;
- sign or submit a transaction;
- perform RPC calls or receipt polling;
- rebroadcast;
- mutate the immutable public base request;
- mutate the immutable reservation base record;
- run a background loop;
- deploy or restart a service; or
- move funds.

Transaction execution remains owned by the separately gated execute-prepared
transaction runtime. Terminal closeout is downstream accounting/projection
closure after canonical confirmed-state evidence already exists.

Ready-for-review, merge, runtime enablement, live invocation, and any production
financial activation remain separate authorization gates.
