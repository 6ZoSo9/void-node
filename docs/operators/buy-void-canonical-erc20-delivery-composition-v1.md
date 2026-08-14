# Buy VOID canonical ERC-20 delivery composition v1

Marker: `VOID_BUY_VOID_CANONICAL_ERC20_DELIVERY_COMPOSITION_V1`

## Decision

The canonical Buy VOID parent must align fulfillment with the Mainnet-0
`VoidToken` ERC-20 asset on Chain 2050.

This source change does not activate fulfillment, fund a wallet, sign or
broadcast a transaction, restart a service, or move VOID.

## Asset correction

The premine is held as `VoidToken` custody, while the earlier bounded canary
delivery stack used native Chain-2050 value.

The repository therefore retains both the canonical ERC-20
`VoidToken.transfer(...)` implementation and the earlier native-value canary
implementation. The native implementation is not the canonical parent delivery
path.

## Canonical parent composition: retained but unmounted

The canonical ERC-20 delivery implementation is retained in:

```text
src/economic/buy_void_delivery_runtime_integration_v1.ts
```

The parent deliberately does **not** import or mount that runtime yet.

Current parent truth is:

```text
canonical_delivery_asset=void_token_erc20
delivery_runtime_source_retained=true
delivery_runtime_parent_mounted=false
canonical_delivery_runtime_parent_mounted=false
canonical_delivery_execution_ready=false
canonical_delivery_execution_held=true
presale_inventory_funding_ready=false
```

Accordingly, the parent exposes neither the canonical delivery status route nor
the canonical delivery command route. Operators must not treat the ERC-20
runtime as mounted before the readiness gates are closed.

The parent also does not mount native delivery, native receipt, native
execution, bounded auto-fulfillment, native transaction preparation, or opaque
prepared-transaction execution.

## Legacy canary reservation

The legacy production canary candidate-reservation CLI depended on the parent
`run_crash_consistent_saga_stage` action and crash-saga status projection.

That parent action is intentionally absent from the canonical composition.
Rather than reconnecting a native-canary mutation path, the reservation CLI is
explicitly retired/held for the canonical ERC-20 transition.

## Remaining canonical gates

Before canonical ERC-20 execution can be mounted, the parent still needs a
server-controlled, exact-green canonical signer/broadcaster dependency bootstrap.

The ERC-20 transaction-preparation source gate is now closed. The merged planner
constructs exact `VoidToken.transfer(...)` calldata with transaction value zero,
uses a pending nonce, bounds gas and fee planning, accounts for native balance as
gas-only, and uses read-only loopback RPC with both inactivity and total
wall-clock deadlines. It remains parent-unmounted and has no wallet, signing,
broadcast, or money-movement authority.

Closed source gates now include exact 6-decimal fulfillment-unit to 18-decimal
token-atom scaling, the standalone ERC-20 transaction-preparation planner, and a
standalone read-only ERC-20 receipt reconciler that requires the exact confirmed
`VoidToken.Transfer` event. The planner and reconciler remain parent-unmounted,
and the reconciler performs no terminal closeout.

## Funding HOLD

`presale_inventory_funding_ready=false` remains the source of truth.

No presale inventory should be funded into an execution path until the
remaining canonical dependency-bootstrap and runtime-activation gates are
separately reviewed and authorized. The preparation and reconciliation source
gates being closed does not authorize funding or execution.

## Authority boundary

No production environment variable, wallet credential, private key, signer,
broadcaster, transaction, treasury balance, presale inventory balance, validator
stake, BTC reserve, or runtime process is mutated by this composition change.

`PROTECT THE CORE`
