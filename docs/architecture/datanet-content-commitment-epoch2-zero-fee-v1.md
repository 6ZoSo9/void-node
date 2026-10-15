# DataNet content commitment Epoch-2 zero-fee alignment v1

Issue: #2341.

The content-commitment transaction chain on Chain ID 2050 must use the same
metered Epoch-2 zero-gas-price model as the current DataNet registry deployment.

Production content-commitment policy requires observed `eth_gasPrice=0`,
`max_fee_per_gas_wei="0"`, `max_priority_fee_per_gas_wei="0"`, and maximum
native gas cost `"0"`. The gas limit remains positive, pending-estimated and
bounded. Publisher native balance remains observed and bound; zero balance is
valid because the admitted native gas liability is zero. Any nonzero fee drift
fails closed.

Transaction type 2, Chain ID 2050, exact calldata, value zero, pending nonce
freshness, signer separation, Sovereign one-transaction authorization, opaque
signer custody, receipt verification and finality gates remain unchanged.

Source/proof/schema only. No private-key access, signing, broadcast, Chain-2050
mutation, runtime/service action, WC/token mutation, market activation,
treasury/liquidity action or funds movement is authorized.
