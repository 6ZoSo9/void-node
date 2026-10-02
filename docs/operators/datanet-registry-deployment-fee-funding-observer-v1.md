# DataNet registry deployment fee/funding observer v1

Marker: `VOID_DATANET_REGISTRY_DEPLOYMENT_FEE_FUNDING_OBSERVER_V1`

Status: read-only live observation. No funding or transaction authority.

## Purpose

Take the source-only registry deployment-input plan and resolve the remaining
live gas/fee/funding facts against the activated private Epoch-2 successor.

The observer is bound to:

`http://127.0.0.1:18553/`

and rebuilds the activation/resolution/deployment-input lineage before making
any RPC call.

## Reviewed policy reused

This gate does not invent new gas or fee policy.

It reuses the canonical Epoch-2 metered zero-gas-price execution model and
keeps the reviewed 20% gas-limit safety buffer:

```text
gas_limit_multiplier_bps=12000
max_fee_per_gas_wei=0
max_priority_fee_per_gas_wei=0
native_gas_economic_charge_atoms=0
participant_native_gas_balance_required=false
```

The zero-fee selection is not inferred from one live sample. It is already
proven by the committed Besu raw-transaction validator runtime evidence: a
correctly marked EIP-1559/type-2 transaction from a zero-native-balance sender
was accepted and mined with effective gas price zero.

The gas limit is:

```text
ceil(eth_estimateGas × 12000 / 10000)
```

The exact fee requirement is fail-closed:

```text
observed_base_fee = 0
observed_priority_fee = 0
max_fee_per_gas = 0
max_priority_fee_per_gas = 0
```

Any nonzero live fee observation remains HOLD. Under the zero-fee model the
maximum native deployment-gas cost is exactly zero, so a zero-native-balance
deployer is sufficient. No funding action is performed.

## Private zero-fee compatibility

The reviewed Epoch-2 genesis has:

`baseFeePerGas=0x0`

and the private runtime allows zero minimum gas price. Therefore an observed
priority-fee suggestion of zero is valid in this lane and is not treated as an
error.

The exact zero-fee envelope matches the production execution model. It does not
widen authority: gas remains metered, the 120% gas-limit buffer remains, the
Epoch-2 signed access-list marker remains mandatory, and any nonzero live fee
observation fails closed.

## Exact read-only RPC sequence

A successful observation uses exactly:

1. `eth_chainId`
2. `eth_blockNumber`
3. `eth_getBlockByNumber`
4. `eth_getTransactionCount` — deployer pending
5. `eth_getBalance`
6. `eth_getTransactionCount` — predicted registry address
7. `eth_getCode` — predicted registry address
8. `eth_estimateGas` — exact creation bytes, zero value
9. `eth_maxPriorityFeePerGas`
10. `eth_getTransactionCount` — pending nonce revalidation
11. `eth_getBlockByNumber` — block/hash/base-fee revalidation

The observer also requires the live head to remain at or above the activation
block floor and the predicted registry address to remain vacant.

## Result states

A green packet requires:

- observed base fee exactly zero;
- observed priority fee exactly zero; and
- deployer balance sufficient for the exact zero maximum gas cost.

A fee-policy drift remains:

`READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_HOLD`

with `minimum_additional_funding_wei=0`.

Native funding is not required by this execution model and is never automatic.

## Authority boundary

This lane does not:

- read a credential, wallet, or private key;
- fund the deployer;
- construct a signable transaction;
- sign, submit, or broadcast;
- deploy a contract;
- mutate Chain-2050 or validators;
- move tokens or funds;
- retry automatically;
- authorize migration; or
- authorize public activation.

## Next gate

If the fee/funding packet is green, the next gate is a fresh read-only
pre-sign revalidation before any signable transaction construction.

If live fees are nonzero, the next gate is a separate zero-fee execution-policy
drift review followed by a new read-only observation. This observer never moves
funds.
