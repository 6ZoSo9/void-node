# Buy VOID production fulfillment gas attestation v1

Marker: `VOID_BUY_VOID_PRESALE_FULFILLMENT_PRODUCTION_GAS_OBSERVER_V1`

This gate keeps the local Foundry gas measurement and the production gas
decision separate.

## Local lower-bound evidence

Precision V5 measured the genesis first-fulfillment call in the reviewed local
harness:

```text
measured_fulfill_call_gas=131047
local_candidate_runtime_gas_ceiling=320000
candidate_runtime_gas_ceiling_accepted=false
```

The exact host proof was run at PR #1553 head:

```text
f6d296772fd41dc57d3fae726e87c4ead2f10664
```

and #1553 merged as:

```text
61e57ef10e64b372165c3ce390b9ac17456bf235
```

The local measurement uses `BuyVoidGasMeasureTokenV1`, not the frozen
Mainnet-0 `VoidToken` implementation. The repository retains the canonical
live VoidToken address but not the exact production token Solidity source used
for that frozen deployment.

Therefore the local result is accepted only as lower-bound evidence.

## Real production-token gas observation

Before the payment-keyed runtime gas ceiling may be accepted, the actual
deployed fulfillment contract must be observed against the real canonical
Mainnet-0 token path.

The read-only observer requires:

- Chain ID exactly `2050`;
- loopback HTTP RPC;
- code present at the fulfillment contract;
- code present at the canonical VOID token;
- `voidToken()` equals the canonical VOID token;
- `fulfiller()` equals the canonical fulfillment wallet;
- `predecessor()` equals the reviewed predecessor;
- an unused probe payment-delivery ID;
- a probe recipient whose current VOID balance is exactly zero;
- enough remaining presale inventory for the probe amount;
- enough actual VOID held by the fulfillment contract for the probe amount;
- positive native gas balance on the canonical fulfiller.

The observer then executes only:

```text
eth_estimateGas
```

for:

```text
from  = canonical fulfiller
to    = deployed fulfillment contract
value = 0
data  = fulfill(probePaymentId, zeroBalanceRecipient, probeAmount)
```

The estimate is evaluated at one fixed block.

## State-neutrality proof

After `eth_estimateGas`, the observer re-checks:

- probe payment ID is still unfulfilled;
- fulfillment-contract VOID balance is unchanged;
- probe-recipient VOID balance is unchanged; and
- observation block hash is unchanged.

Any apparent mutation or reorg mismatch fails closed.

## Read-only RPC allowlist

Only these methods are allowed:

```text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
eth_getCode
eth_call
eth_getBalance
eth_estimateGas
```

No send, sign, unlock, admin, debug, or transaction-broadcast method exists in
the observer.

## Candidate formula

The production observation derives:

```text
live_candidate =
  round_up_10000(
    ceil(live_estimated_transaction_gas × 15000 / 10000)
  )

proposed_runtime_gas_ceiling =
  max(live_candidate, 320000)
```

The local `320000` value therefore acts only as a conservative floor.

A GREEN observation still returns:

```text
production_runtime_gas_ceiling_accepted=false
production_configuration_updated=false
runtime_enablement_changed=false
```

The measured result must be separately reviewed and accepted before the
production runtime configuration can adopt it.

## Lifecycle order

This gate does not change the deployment sequence.

The fulfillment contract must first be:

1. deployed through the separately reviewed deployment flow;
2. exactly attested against the accepted compiler identity; and
3. funded through the separately authorized inventory-funding gate.

Only then can the real-token `eth_estimateGas` observation succeed.

Production runtime enablement remains after gas-ceiling acceptance.

## Authority boundary

This source gate authorizes no:

- deployment;
- inventory funding;
- credential/private-key access;
- wallet access;
- signing;
- transaction broadcast;
- Chain-2050 mutation;
- production configuration mutation;
- runtime enablement;
- public activation; or
- funds movement.
