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
canonical_delivery_dependency_bootstrap_ready=true
erc20_transaction_preparation_execution_state_ready=false
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

The canonical signer/broadcaster dependency-bootstrap **source** gate is now
closed. The parent imports only a pure metadata integration gate and reports
`canonical_delivery_dependency_bootstrap_ready=true`.

The parent does not import, instantiate, or invoke the value-bearing bootstrap,
signer, broadcaster, transport, or delivery runtime. The canonical delivery
runtime remains parent-unmounted, signer and broadcaster configuration remain
absent, and execution remains held.

The dependency composition being source-ready does not make transaction
preparation execution-state-ready. Current source selects the fulfillment-wallet
nonce from `pending`, estimates gas without an explicit reviewed pending-state
tag, and checks native gas spendability against `latest`. A preceding pending
transaction can therefore invalidate the selected pending queue position.

Canonical status consequently retains:

```text
erc20_transaction_preparation_execution_state_ready=false
funding_blockers=[
  erc20_transaction_preparation_execution_state_not_ready,
  canonical_delivery_runtime_activation_not_ready
]
```

Curly's separately owned P0 planner lane must establish one coherent pending
execution-state perspective before this blocker may be removed. Runtime
activation and production configuration remain later gates.

## Funding HOLD

`presale_inventory_funding_ready=false` remains the source of truth.

No presale inventory should be funded into an execution path until the
planner execution-state defect is repaired and the later runtime-activation and
production-configuration gates are separately reviewed and authorized. Closing
the dependency source gate does not authorize funding or execution.

## Authority boundary

No production environment variable, wallet credential, private key, signer,
broadcaster, transaction, treasury balance, presale inventory balance, validator
stake, BTC reserve, or runtime process is mutated by this composition change.

`PROTECT THE CORE`
