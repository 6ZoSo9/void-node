# Buy VOID ERC-20 delivery runtime activation configuration contract v1

Marker: `VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1`

## Source boundary

The canonical ERC-20 execution-composition source is now a prerequisite of any later activation. The retained delivery runtime no longer accepts a caller-supplied nonce/gas/fee transaction plan. It delegates to the server-controlled execution-composition layer, which derives the exact `VoidToken.transfer(...)` transaction through the coherent `pending` planner, durably reserves the wallet nonce, persists signed-hash custody before broadcast, uses the existing saga write-ahead broadcast-intent boundary, reconciles exact ERC-20 receipts into canonical `record_confirmed`, and leaves terminal inventory/public closeout to the existing saga closeout implementation.

The next source gate parent-mounts this already-reviewed runtime while leaving it disabled. That source composition does not enable production execution, inject signer/broadcaster dependencies, inspect a credential, fund presale inventory, or authorize a transaction.

## Required production configuration contract

In addition to the existing delivery chain/token/wallet/amount/gas/fee caps, a later production configuration must provide the server-controlled loopback ERC-20 RPC URL, gas-limit multiplier, fee multiplier, and receipt confirmation depth. Optional bounded RPC timeout/response-size controls retain fail-closed defaults.

The configuration is not considered verified merely because these environment-variable names exist in source. Production values and the fixed systemd credential binding remain separate operator-evidence gates.

## Execution ordering

The disabled parent mount must continue proving:

- caller transaction plans are forbidden;
- planning uses coherent `pending` state;
- overlapping use of the same pending wallet nonce fails closed;
- the exact signed transaction hash and server-derived plan are recoverable before broadcast;
- a crash after possible provider acceptance never causes automatic rebroadcast;
- receipt presence can repair a missing broadcast projection without asserting a broadcast before evidence exists;
- the full ERC-20 receipt reconciler validates the canonical `Transfer` and confirmation stability;
- canonical `record_confirmed` is written before the saga advances to `receipt_confirmed`; and
- the existing terminal closeout remains the sole inventory/public closeout implementation.

## Current truth

```text
erc20_execution_composition_ready=true
canonical_delivery_runtime_activation_ready=false
production_configuration_values_verified=false
production_credential_binding_ready=false
canonical_delivery_runtime_parent_mounted=true
canonical_delivery_execution_ready=false
presale_inventory_funding_ready=false
```

After the disabled parent mount, the next operations gates are credential key-to-wallet evidence and separately authorized dependency injection/runtime enablement. Inventory funding remains an independent later value-bearing gate.

## Authority boundary

Source, proof, documentation, and CI only. This lane changes source composition so the child is parent-mounted, but performs no deployment, live service restart, production credential read, wallet/private-key access, live RPC, signing, transaction broadcast, inventory funding, treasury/liquidity action, or funds movement.

## Current-main reconciliation after #1287

This lane is reconciled on top of source `main` `ddb50ddfd74f048bb98a17ef2cdf554963dc4a5c`. It preserves
#1287's operator-facing configuration truth: a fully populated environment is
not considered configured merely because values are non-empty. The execution
composition reuses the canonical ERC-20 planner policy validator before runtime
status can expose RPC/signing readiness.

### Amount unit domain

`VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS` is explicitly denominated in the
canonical **6-decimal fulfillment-unit** domain. The ERC-20 transfer remains an
exact integer conversion into 18-decimal VoidToken atoms:

```text
fulfillment_unit_decimals=6
token_atom_decimals=18
token_atom_multiplier=1000000000000
rounding=false
```

The configured delivery maximum must not exceed either the saga inventory pool
capacity or the saga maximum reservation, which are in the same fulfillment
unit domain. An 18-decimal atom value such as `10^21` therefore cannot be
silently interpreted as a fulfillment-unit cap when the reviewed reservation
cap is `10^9`.

### Receipt confirmation domain

The receipt reconciler retains decimal-string/BigInt confirmation truth. The
existing generic saga accepts `receipt_confirmed.confirmations` only through
1,000,000. The composition therefore fails closed **before canonical
`record_confirmed`** whenever the observed count is above 1,000,000. Exact
1,000,000 is accepted; 1,000,001 and values above the JavaScript safe-integer
range are held without confirmed-state mutation.

This source closure mounts only the disabled child route in the canonical parent. It still does not inject value-bearing dependencies, read production credentials, enable execution, fund presale inventory, sign or broadcast a live transaction, or move funds.
