# Buy VOID payment-keyed execution composition v1

Marker: `VOID_BUY_VOID_PAYMENT_KEYED_EXECUTION_COMPOSITION_V1`

Status: source-only composition. No runtime route is mounted by this module.

## Purpose

Compose the already merged payment-keyed execution primitives without falling
back to the legacy ERC-20 transfer path:

1. read-only Chain-2050 transaction preparation;
2. canonical payment-keyed unsigned transaction;
3. canonical calldata-bearing custodian request;
4. independent signer dry-run revalidation;
5. explicitly confirmed injected signing; and
6. durably guarded, explicitly confirmed payment-keyed broadcast.

The composition stops at broadcast acceptance. Receipt verification, saga
projection, inventory mutation, public fulfilled closeout, and terminal
accounting remain separate downstream gates.

## Dry run

Dry run requires only the existing transaction-preparation policy and optional
injected preparation transport. It performs the planner's bounded read-only RPC
surface and then constructs/revalidates the unsigned transaction and custodian
request through the signer dry-run boundary.

Dry run does not access a signer, claim the durable submission guard, invoke a
broadcaster, return raw signed bytes, or move funds.

## Apply gate

Apply is rejected before any RPC call unless both exact confirmations are
present:

- `buyVoidSignPaymentKeyedCustodianTransactionV1`
- `buyVoidBroadcastPaymentKeyedCustodianTransactionV1`

Apply also requires injected:

- signer;
- durable submission guard; and
- broadcaster.

The composition never accepts caller-supplied raw signed transaction bytes.
Raw bytes exist only inside the merged signer → broadcast handoff and are not
returned or persisted by this layer.

## Planning authority

The existing transaction-preparation module remains the sole source for nonce,
gas limit, max fee, and priority fee. It uses only:

- `eth_chainId`
- `eth_getTransactionCount`
- `eth_gasPrice`
- `eth_estimateGas`
- `eth_getBalance`

The resulting plan is revalidated by the canonical unsigned-transaction builder
and then bound into the custodian request.

## Broadcast ambiguity

The existing durable submission guard and broadcast handoff retain authority for
submission ambiguity. A refused durable claim prevents broadcaster access.
Broadcaster exceptions or ambiguous results require reconciliation and forbid
automatic retry. Definitive no-submission can release only through the existing
retry-safe guard rules.

## Explicit non-authority

This composition does not:

- mount the public or operator runtime;
- deploy or restart a service;
- select a saga from caller input on an HTTP route;
- persist raw signed transaction bytes;
- wait for or accept a receipt;
- mutate inventory;
- close a public Buy VOID request;
- perform terminal saga/accounting projection;
- mutate Work Credits or validators.

Source merge therefore does not activate Buy VOID execution. A later reviewed
runtime adapter must derive saga and plan-reservation identity from server-owned
durable state and deliberately mount this composition behind default-off
operator gates.
