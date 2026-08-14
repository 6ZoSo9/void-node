# Buy VOID ERC-20 delivery runtime activation/configuration contract v1

## Status

`HOLD_RUNTIME_ACTIVATION`.

The source configuration contract is ready, but production runtime activation is
not. The V90 execution-order review found that the retained canonical delivery
runtime accepted nonce/gas/fee transaction-plan material from its loopback HTTP
request body. Configuration cannot make caller-selected execution material
server-authoritative.

This lane removes that reachable source defect before any production wiring.

## Runtime behavior after V90 repair

The retained route remains:

```text
GET  /__void/operator/buy-void-delivery-runtime-v1/status
POST /__void/operator/buy-void-delivery-runtime-v1/command
```

The command is now read-only planning only.

Exact action:

```text
plan_erc20_delivery
```

Exact caller keys:

```text
action
attempt_id
```

Any caller-supplied `plan`, `transaction_plan`, `nonce`, `gas_limit`,
`max_fee_per_gas_wei`, `max_priority_fee_per_gas_wei`, `apply`, or any other
extra command field is rejected before RPC planning.

The runtime loads the reserved attempt from the server-controlled journal and
calls the merged coherent-pending ERC-20 planner. The planner is therefore the
only source of nonce/gas/fee transaction-plan material exposed by this route.

The route performs no filesystem mutation, signing, transaction broadcast,
submission-guard claim, pipeline outcome write, inventory mutation, or money
movement.

## Planner policy

Production planning requires the existing server-controlled delivery caps:

```text
VOID_BUY_VOID_DELIVERY_CHAIN_ID
VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS
VOID_BUY_VOID_DELIVERY_WALLET_ADDRESS
VOID_BUY_VOID_DELIVERY_MAX_AMOUNT_UNITS
VOID_BUY_VOID_DELIVERY_MAX_GAS_LIMIT
VOID_BUY_VOID_DELIVERY_MAX_FEE_PER_GAS_WEI
VOID_BUY_VOID_DELIVERY_MAX_PRIORITY_FEE_PER_GAS_WEI
```

The planner reuses the existing numeric-loopback Chain-2050 RPC setting:

```text
VOID_BUY_VOID_NATIVE_CHAIN2050_RPC_URL
```

and fixed source-reviewed safety multipliers:

```text
gas_limit_multiplier_bps=12000
fee_multiplier_bps=12000
```

The operator still controls hard gas/fee/amount caps. The fixed multipliers avoid
creating another production fee-policy surface solely for this transition.

The runtime remains disabled unless:

```text
VOID_BUY_VOID_DELIVERY_RUNTIME_INTEGRATION_ENABLED=1
```

and its root remains server-controlled through:

```text
VOID_BUY_VOID_RUNTIME_DIR
```

Neither should be changed merely because this source repair merges.

## What this closes

This repair proves an activated copy of this retained route cannot sign or
broadcast a transaction whose nonce/gas/fee plan originated in the request
body.

It also makes the next missing capability explicit:

```text
erc20_durable_prepared_transaction_composition
```

## What remains before activation

The existing native prepared-transaction stack already provides the primitives
that must be reused:

- wallet-scoped durable nonce reservation;
- concurrent-attempt collision safety;
- live pre-sign nonce revalidation and nonce-drift HOLD;
- opaque external signing custody;
- crash-recoverable signed-transaction binding;
- submit-once / inspect-only broadcast reconciliation;
- canonical execution/broadcast journals; and
- terminal saga closeout.

Those records are currently native-transaction-shaped. The next implementation
must generalize/compose them for the exact ERC-20 transaction envelope:

```text
to    = VoidToken
value = 0
data  = transfer(delivery_address, token_amount_atoms)
```

with the coherent-pending preparation fingerprint bound into the durable
reservation/custody record.

Only after that composition is exact-green should the sequence continue to:

1. production configuration verification;
2. production credential binding verification;
3. separately authorized parent/runtime mount; and
4. independently authorized presale inventory funding.

## Authority boundary

This source lane does not deploy, restart, mount, enable, or configure a live
service. It does not read credential contents, access a wallet, sign, broadcast,
fund inventory, mutate treasury/liquidity, or move funds.

`PROTECT THE CORE`.
`PROTECT THE TRUTH`.
`FINISH THE CAPABILITY BEFORE ACTIVATION`.
