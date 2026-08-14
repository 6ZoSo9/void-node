# Buy VOID ERC-20 delivery runtime activation configuration contract v1

Marker: `VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1`

## Purpose

Define the exact source contract that a later canonical Buy VOID ERC-20 delivery
runtime activation must satisfy without activating, mounting, configuring, or
executing the runtime in this lane.

Merged source already establishes:

- `canonical_delivery_dependency_bootstrap_ready=true`;
- `erc20_transaction_preparation_execution_state_ready=true`;
- canonical asset `void_token_erc20` on Chain 2050; and
- canonical delivery runtime still parent-unmounted and execution-held.

This contract is the next source boundary. It does **not** claim that production
configuration values or credentials are currently present.

## Exact server-controlled runtime configuration contract

A later activation must use the existing delivery runtime and its existing
server-owned configuration surface:

- enable flag: `VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED=1`;
- runtime root: `VOID_BUY_VOID_RUNTIME_DIR`;
- policy:
  - `VOID_BUY_VOID_DELIVERY_CHAIN_ID`;
  - `VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS`;
  - `VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS`;
  - `VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS`;
  - `VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT`;
  - `VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI`;
  - `VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI`;
- injected dependency object:
  `__void_buy_void_delivery_runtime_dependencies_v1`; and
- fixed signer credential identity:
  `buy-void-native-fulfillment-wallet-v1`.

The existing runtime requires enablement, complete policy configuration, and
injected signer/broadcaster dependencies before its effective signing,
broadcast, or money-movement authority becomes true.

## Preserved runtime safety contract

The activation contract preserves the existing controls:

- loopback operator surface only;
- root directory and policy remain server controlled;
- prepared attempts come from the server journal;
- exact per-action confirmation is required;
- durable submission guard is required;
- signer and broadcaster are injected rather than supplied by a request;
- no private key, mnemonic, RPC URL, policy object, root directory, or raw
  signed transaction is accepted from request input;
- no automatic retry;
- no background loop; and
- no receipt wait in the sign/broadcast runtime.

The ERC-20 dependency bootstrap additionally preserves deferred systemd
credential access, pre-credential transaction revalidation, post-signature
transaction revalidation, loopback Chain-2050 broadcasting, total RPC deadline,
and no automatic resubmission.

## Truth boundary after this lane

This lane sets only a **source-contract** fact:

```text
canonical_delivery_runtime_activation_configuration_contract_ready=true
```

It deliberately keeps:

```text
canonical_delivery_runtime_activation_ready=false
production_configuration_values_verified=false
production_credential_binding_ready=false
canonical_delivery_runtime_parent_mounted=false
canonical_delivery_execution_ready=false
presale_inventory_funding_ready=false
```

The current parent blocker remains:

```text
canonical_delivery_runtime_activation_not_ready
```

That blocker must not be removed merely because the source contract exists.
The next gate must verify the actual production configuration/binding intended
for activation and separately authorize the parent mount. This lane does not
read those production values or credentials.

## Verification

The focused proof binds this source contract to the actual merged delivery
runtime, ERC-20 dependency bootstrap, dependency-bootstrap integration gate, and
canonical parent source. It fails if the env names, dependency global, fixed
credential identity, authority requirements, prerequisite readiness, parent
HOLD, or no-side-effect contract drift.

The Node 22/24/26 workflow also reruns the existing dependency-bootstrap,
canonical composition/execution-HOLD, runtime-guard, repository typecheck, and
build walls.

## Authority boundary

This lane performs no production environment read or mutation, credential read,
filesystem write, runtime route mount, service start/restart, wallet access,
RPC call, signing, broadcasting, inventory funding, treasury/liquidity action,
or funds movement.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
