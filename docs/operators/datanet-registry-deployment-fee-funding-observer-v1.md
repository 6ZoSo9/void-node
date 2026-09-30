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

It reuses the existing bounded Chain-2050 deployment policy:

```text
gas_limit_multiplier_bps=12000
max_fee_per_gas_wei=3000000000
max_priority_fee_per_gas_wei=1000000000
```

The gas limit is:

```text
ceil(eth_estimateGas × 12000 / 10000)
```

The conservative fee-cap requirement is:

```text
2 × observed_base_fee + observed_priority_fee <= max_fee_per_gas
observed_priority_fee <= max_priority_fee_per_gas
```

The maximum native deployment-gas requirement is:

```text
proposed_gas_limit × max_fee_per_gas
```

The observed deployer balance is compared against that amount. Any deficit is
reported exactly; no funding action is performed.

## Private zero-fee compatibility

The reviewed Epoch-2 genesis has:

`baseFeePerGas=0x0`

and the private runtime allows zero minimum gas price. Therefore an observed
priority-fee suggestion of zero is valid in this lane and is not treated as an
error.

The policy caps remain the same; zero observed fees do not widen authority or
reduce the conservative maximum-cost calculation.

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

A green packet requires both:

- reviewed fee caps sufficient for the current observation; and
- deployer balance sufficient for the conservative maximum gas cost.

A fee-cap or balance shortfall remains:

`READ_ONLY_DEPLOYMENT_FEE_GAS_FUNDING_HOLD`

with an exact `minimum_additional_funding_wei`.

Funding is never automatic.

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

If funding is short, the next gate is separate explicit gas-funding review,
followed by a new read-only observation. This observer never moves the funding.
