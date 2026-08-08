# Buy VOID crash-consistent saga runtime v1

Marker:

`VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1`

Decision:

`SOURCE_ONLY_PREPARED_TRANSACTION_RUNTIME_DELEGATION_MOUNTED_BROADCAST_UNMOUNTED`

## Purpose

The crash-consistent Buy VOID runtime already mounts the first three durable saga stages: payment claim, inventory reservation, and one execution-attempt reservation. After those stages the saga reaches `attempt_reserved`, whose next action is `prepare_transaction`.

Transaction preparation already has a reviewed crash-consistent implementation in `buy_void_saga_prepared_transaction_coordinator_v1.ts`, and the application-side opaque Unix-socket custodian boundary is implemented by `buy_void_prepared_transaction_custodian_ipc_v1.ts`. This lane mounts that existing preparation coordinator into the saga runtime by delegation. It does not reimplement nonce allocation, fee planning, custody, execution-journal preparation, or the saga `transaction_prepared` append.

Broadcast remains outside this runtime boundary.

## Runtime surface

The existing loopback-only action remains:

```text
run_crash_consistent_saga_stage
```

through:

```text
GET  /__void/operator/buy-void-runtime-v1/status
POST /__void/operator/buy-void-runtime-v1/command
```

The parent Buy VOID runtime and the crash-consistent saga runtime remain disabled by default.

## Separate transaction-preparation gate

Enabling the existing saga runtime does **not** enable transaction preparation.

Preparation requires the additional server-controlled gate:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_PREPARATION_ENABLED=1
```

When the saga reaches `prepare_transaction` while that gate is disabled, the runtime returns a fail-closed `503` hold and does not invoke the prepared-transaction coordinator or construct a custodian IPC client.

This separate gate prevents a configuration that previously enabled only claim/inventory/attempt reservation from silently gaining signing-capable behavior after a software update.

## Server-controlled custodian transport

Preparation apply also requires:

```text
VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_IPC_SOCKET_PATH=<absolute private Unix socket path>
VOID_BUY_VOID_PREPARED_TRANSACTION_CUSTODIAN_SIGNER_FINGERPRINT_SHA256=<64 lowercase hex>
```

These values are read only from server configuration. The caller cannot supply or override the socket path, signer fingerprint, custodian, signer, RPC URL, transaction plan, raw transaction, signed transaction, wallet secret, private key, mnemonic, seed, or keystore.

Runtime status reports whether the preparation gate and custodian configuration are present, plus the relevant environment-variable names. It never returns the raw socket path or signer fingerprint.

The actual IPC adapter revalidates the private socket path and expected signer fingerprint before a request and returns only the opaque #1014 public custody projection. Raw signed transaction bytes never enter the application runtime.

## Preparation policy

The delegated coordinator retains authority over its existing server-side preparation policy:

```text
VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL
VOID_BUY_VOID_NATIVE_EXECUTION_GAS_LIMIT
VOID_BUY_VOID_NATIVE_DELIVERY_MAX_GAS_LIMIT
VOID_BUY_VOID_NATIVE_DELIVERY_MAX_FEE_PER_GAS_WEI
VOID_BUY_VOID_NATIVE_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI
VOID_BUY_VOID_NATIVE_EXECUTION_FEE_MULTIPLIER_BPS
```

The RPC origin must remain numeric loopback HTTP. Preparation uses only the coordinator's read-only chain ID, pending nonce, gas-price, and balance planning before any external custody request. The application itself never receives a private key or signs.

## Mounted saga stages

The runtime now recognizes four stages:

1. `claim_payment`
2. `reserve_inventory`
3. `reserve_execution_attempt`
4. `prepare_transaction`

The first three retain their existing restart-reconciliation and fencing behavior. The fourth delegates to the existing prepared-transaction coordinator.

Each invocation advances at most one business stage. Automatic retry remains false.

## Preparation dry run

When `prepare_transaction` is next and the preparation gate is enabled, a dry run delegates only to the coordinator's dry-run path. It does not construct the IPC client and cannot sign.

The runtime validates that the delegated result is bound to the same:

- attempt ID;
- saga ID;
- economic/server-policy fingerprint;
- saga confirmation; and
- saga action confirmation.

The dry response then exposes the exact confirmations required for an apply:

- outer runtime confirmation;
- saga confirmation;
- `prepare_transaction` action confirmation;
- prepared-transaction coordinator confirmation;
- economic-policy fingerprint;
- preparation-policy fingerprint;
- custody confirmation; and
- execution-journal preparation confirmation.

The caller must echo every one exactly on apply.

## Preparation apply

After all confirmations and fingerprints match, the runtime constructs the #1053 IPC custodian only from the server-controlled socket/fingerprint configuration and delegates to `runBuyVoidSagaPreparedTransactionCoordinatorV1(...)`.

That coordinator remains responsible for the established crash-consistent sequence:

1. canonical claim/inventory/attempt/saga reconstruction;
2. read-only live nonce/fee/balance planning;
3. durable local transaction-plan/nonce reservation;
4. live pre-sign revalidation;
5. opaque idempotent external custody preparation;
6. private local custody metadata persistence;
7. canonical execution-attempt `prepare_execution` persistence; and
8. exactly one saga `transaction_prepared` append.

The runtime's public successful response exposes only the attempt ID, signed transaction hash, locally reserved nonce, and truthful external-custodian-signing flag. It does not return a custody handle or raw signed bytes.

## Authority truth

For this mounted preparation boundary:

- application private-key access: false;
- application wallet access: false;
- application signing: false;
- external custodian signing: possible only during separately enabled and exactly confirmed preparation apply;
- read-only loopback RPC planning: possible during preparation;
- transaction broadcast: false;
- inventory decrement: false;
- public fulfilled closeout: false;
- background/startup execution: false; and
- money movement by this runtime: false.

A prepared transaction hash is evidence of externally held signed bytes, not evidence that the network has broadcast or delivered the transaction.

## Hard stop before broadcast

After successful preparation the saga reaches `transaction_prepared`. Its next action is `execute_prepared_transaction`.

That action is deliberately not mounted here. A later invocation fails closed with:

```text
next_stage_outside_prepared_transaction_runtime_boundary
```

The runtime does not construct a broadcaster, submit the signed payload, reconcile possible broadcast, accept a receipt, decrement inventory, or close fulfillment in this lane.

Broadcast custody/reconciliation and terminal closeout remain separate components and separate activation/authority gates.

## Caller input and restart safety

The existing caller-policy and execution-material rejection remains in force. The caller cannot supply durable policy, binding, intent, request snapshot, filesystem roots, transport identity, RPC URL, wallet/signer material, or transaction material.

The first three stages preserve their real-filesystem restart behavior: after an injected failure immediately following a durable claim, inventory reservation, or execution-attempt write, a fresh invocation reconstructs that projection and appends the missing saga event without duplicating the business mutation.

For preparation, restart and idempotency are delegated to the already-reviewed coordinator and custodian contracts rather than duplicated inside the HTTP runtime.

## Focused proof

The runtime proof advances the real saga through the three existing stages with injected failures and recovery, then verifies the new boundary:

- `prepare_transaction` is reached only after exactly one attempt reservation;
- the second preparation enable gate holds with zero coordinator/IPC calls;
- dry run cannot construct the custodian or report signing;
- caller-supplied socket/fingerprint material is rejected;
- missing server custodian configuration holds before IPC construction;
- mismatched preparation-policy confirmation holds before IPC construction;
- an injected coordinator fixture can complete the canonical execution-attempt and saga `transaction_prepared` projections without any broadcast action;
- the public response contains no custody handle or raw signed transaction;
- external-custodian signing truth is kept separate from application signing truth; and
- the next runtime invocation after `transaction_prepared` holds before `execute_prepared_transaction`.

The focused Node.js 22/24/26 workflow also reruns the real prepared-transaction coordinator proof and the #1053 custodian IPC/store-read-confinement proofs so this composition cannot silently drift from those contracts.

Expected runtime marker remains:

```text
VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RUNTIME_V1_PROOF_GREEN
```

## Authority boundary

This lane changes source, proof, documentation, and CI only. It does not enable the runtime or preparation gate, start or connect to a production custodian socket, access a production signer/key/wallet/credential, perform live signing, submit to live RPC, broadcast or rebroadcast, decrement inventory, mark fulfillment, deploy or restart a service, mutate Work Credits or validators, or move funds.

Runtime enablement, production custodian/signer composition, any live operator apply, broadcast custody/reconciliation, receipt acceptance, terminal closeout, deployment, and money movement remain separate explicit gates.
