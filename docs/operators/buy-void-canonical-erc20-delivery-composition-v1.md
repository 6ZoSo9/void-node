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

## Canonical parent composition: mounted but disabled

The canonical ERC-20 delivery implementation is retained in:

```text
src/economic/buy_void_delivery_runtime_integration_v1.ts
```

The parent now imports the canonical delivery runtime so its loopback-only status/command routes are present, while production keeps the delivery enable flag at `0` and no signer/broadcaster dependencies are injected.

Current parent truth is:

```text
canonical_delivery_asset=void_token_erc20
delivery_runtime_source_retained=true
delivery_runtime_parent_mounted=true
canonical_delivery_runtime_parent_mounted=true
canonical_delivery_dependency_bootstrap_ready=true
erc20_transaction_preparation_execution_state_ready=true
canonical_delivery_execution_ready=false
canonical_delivery_execution_held=true
presale_inventory_funding_ready=false
```

Accordingly, the parent exposes the canonical delivery status/command routes only on the existing loopback operator surface. With `VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED=0` and no dependency injection, the mounted child reports no RPC/signing/broadcast/money authority.

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

The parent still does not import, instantiate, or invoke the value-bearing bootstrap, signer, broadcaster, or transport. Only the already-reviewed delivery runtime is parent-mounted; signer and broadcaster configuration remain absent, the production enable flag remains `0`, and execution remains held.

Merged PR #1282 closes the transaction-preparation execution-state gate.
Both queue-sensitive planners now bind nonce selection and spendability to
`pending`, and ERC-20 gas estimation is explicitly evaluated against `pending`.
The merged adversarial evidence also preserves total-deadline, response-error,
and exact JSON media-type containment.

Canonical status therefore reports:

```text
erc20_transaction_preparation_execution_state_ready=true
funding_blockers=[
  canonical_delivery_runtime_activation_not_ready
]
```

Canonical Precision/Mainnet-0 credential binding evidence is now recorded in redacted source evidence without inferring clone-local binding. Dormant dependency injection is fail-closed to delivery enable exact `0` and requires the configured delivery wallet to match the evidence-bound wallet. Runtime enablement and inventory funding remain later independent gates.

## Funding HOLD

`presale_inventory_funding_ready=false` remains the source of truth.

No presale inventory should be funded into an execution path until the
remaining runtime-activation and production-configuration gates are separately
reviewed and authorized. Closing the planner and dependency source gates does
not authorize funding or execution.

## Authority boundary

No production environment variable, wallet credential, private key, signer,
broadcaster, transaction, treasury balance, presale inventory balance, validator
stake, BTC reserve, or runtime process is mutated by this composition change.

`PROTECT THE CORE`
