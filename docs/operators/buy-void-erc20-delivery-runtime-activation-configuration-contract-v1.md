# Buy VOID ERC-20 delivery runtime activation configuration contract v1

Marker: `VOID_BUY_VOID_ERC20_DELIVERY_RUNTIME_ACTIVATION_CONFIGURATION_CONTRACT_V1`

## Source boundary

The canonical ERC-20 execution-composition source is now a prerequisite of any later activation. The retained delivery runtime no longer accepts a caller-supplied nonce/gas/fee transaction plan. It delegates to the server-controlled execution-composition layer, which derives the exact `VoidToken.transfer(...)` transaction through the coherent `pending` planner, durably reserves the wallet nonce, persists signed-hash custody before broadcast, uses the existing saga write-ahead broadcast-intent boundary, reconciles exact ERC-20 receipts into canonical `record_confirmed`, and leaves terminal inventory/public closeout to the existing saga closeout implementation.

The canonical parent now mounts this already-reviewed runtime while leaving execution disabled. Dormant signer/broadcaster dependency injection is separately fail-closed to delivery enable exact `0`. Neither source composition nor dormant injection enables production execution, inspects a credential, funds presale inventory, or authorizes a transaction.

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
status=presale_invariants_source_ready_held_on_activation
erc20_execution_composition_ready=true
canonical_delivery_runtime_activation_ready=false
production_configuration_values_verified=false
production_credential_binding_ready=false
canonical_production_credential_binding_evidence_ready=true
dormant_dependency_injection_source_ready=true
dormant_dependency_injection_requires_delivery_runtime_disabled=true
dormant_dependency_injection_required_delivery_enable_value=0
dormant_dependency_injection_wallet_evidence_binding_required=true
dependency_injection_runtime_ready=false
canonical_delivery_runtime_parent_mounted=true
canonical_delivery_execution_ready=false
presale_inventory_funding_ready=false
canonical_presale_pool_id=buy-void-presale-v1
canonical_presale_max_void=10000000
canonical_presale_max_fulfillment_units_6_decimal=10000000000000
canonical_presale_max_reservation_fulfillment_units_6_decimal=10000000000000
finite_presale_cap_end_to_end_enforced=true
canonical_presale_rate=2/1
fixed_presale_rate_enforced=true
reservation_ceiling_equals_total_pool=true
per_buyer_purchase_throttle_below_remaining_inventory=false
validator_scale_purchase_10000_void_admission_ready=true
delivery_execution_amount_cap_separate_from_purchase_admission=true
public_delivery_activation_requires_presale_capacity_max=true
production_broad_delivery_configuration_verified=false
current_parent_blocker=production_broad_delivery_configuration_not_verified
next_gate=production_broad_delivery_configuration_verification
```

Credential key-to-wallet evidence is recorded for the canonical Precision/Mainnet-0 fulfillment wallet without inferring clone-local binding. Dormant dependency injection requires delivery enable exact `0`, the exact evidence ID, and a configured delivery wallet matching that evidence; any mismatch remains held before dependencies are populated.

The canonical presale economics source is now fail-closed to one pool (`buy-void-presale-v1`), exactly 10000000 VOID (10000000000000 six-decimal fulfillment units), and exactly `2 VOID / 1 USDC`. The inventory reservation ceiling equals the entire presale pool, so there is **no per-buyer 2-VOID throttle** below remaining inventory. A 10,000 VOID validator-scale purchase is explicitly proven to reserve successfully.

`VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS` remains a separate delivery-execution safety control. A lower 2-VOID canary is allowed only while delivery is disabled; public delivery activation fails configuration unless the delivery maximum is widened to the canonical presale capacity so every admitted purchase can be fulfilled without an execution-layer throttle. Production broad-delivery configuration verification, runtime enablement, and inventory funding remain later gates.

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


## Payment admission / inventory atomicity

Canonical broad-sale admission now uses `verify_reserve_and_claim`: a verified payment is first evaluated against the aggregate presale reservation journal under its pool lock. A **new durable paid claim is not created until its VOID inventory reservation exists**.

If a confirmed payment cannot reserve because the pool is sold out or has insufficient remaining VOID, the reservation journal records a deterministic `VOID_BUY_VOID_PAID_UNRESERVABLE_OBLIGATION_V1` terminal obligation. That record acknowledges the confirmed customer payment and binds its payment/request identity, payment transaction evidence, requested VOID, observed remaining inventory, and canonical pool policy while authorizing **no automatic retry, refund execution, alternate fulfillment execution, wallet access, signing, broadcast, or money movement**.

Crash recovery is fail-closed in the opposite direction as well: if inventory reservation becomes durable before claim persistence, the reservation is deterministic/duplicate-safe and a retry can finish the same claim without consuming inventory twice.

Acceptance requires adversarial near-sellout and sold-out proofs showing no confirmed payer is left without either reserved VOID or a canonical terminal reconciliation obligation.
