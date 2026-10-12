# Buy VOID deployment resolution and runtime gas measurement v1

This lane prepares the remaining read-only facts needed before an unsigned
\`BuyVoidPresaleFulfillmentV1\` deployment transaction can be constructed.

It does not choose or approve a deployer, sign, broadcast, deploy, fund
inventory, mutate Chain-2050, change production configuration, enable runtime,
or activate the public Buy VOID path.

## Read-only deployment resolution observer

The observer requires an explicit deployer address supplied by the operator.

That address is an input to observation only. A successful observation still
returns:

\`\`\`text
deployer_reviewed=false
\`\`\`

The observer accepts only loopback HTTP RPC and allows only:

\`\`\`text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
eth_getTransactionCount
eth_getBalance
eth_maxPriorityFeePerGas
eth_estimateGas
\`\`\`

It binds the accepted compiler identity and exact genesis constructor data,
then observes:

- latest and pending deployer nonce;
- deployer balance;
- latest block hash and base fee;
- provider priority-fee suggestion;
- exact deployment gas estimate; and
- the future CREATE address from deployer + pending nonce.

The pending nonce and observation-block hash are re-read before the observation
is accepted.

## Fee-cap behavior

The observer does not raise the reviewed fee caps.

It checks the existing bounds:

\`\`\`text
max_fee_per_gas_wei=3000000000
max_priority_fee_per_gas_wei=1000000000
\`\`\`

against the observed base fee and priority suggestion.

A fee-cap or balance shortfall remains a HOLD condition for later review; it
does not mutate policy.

The proposed deployment gas limit is read-only arithmetic:

\`\`\`text
ceil(eth_estimateGas × 12000 / 10000)
\`\`\`

using the already reviewed gas-limit multiplier.

## Runtime fulfill gas is a different quantity

Deployment gas and the payment-keyed runtime \`fulfill(...)\` gas ceiling are
not interchangeable.

The old bare ERC-20 transfer ceiling of \`100000\` remains retired for this
purpose.

A dedicated local Foundry measurement executes the real reviewed genesis
contract:

\`\`\`text
BuyVoidPresaleFulfillmentV1
predecessor = zero address
first successful fulfillment
recipient starts with zero token balance
amount = 1 VOID
\`\`\`

The measurement surrounds only the external \`registry.fulfill(...)\` call with
\`gasleft()\` and emits:

\`\`\`text
GasMeasured(uint256 gasUsed)
\`\`\`

## Compiler profile

The Foundry measurement is pinned to the same relevant compiler profile as the
accepted identity:

\`\`\`text
solc=0.8.24
evm_version=paris
optimizer=false
optimizer_runs=200
via_ir=false
\`\`\`

## Candidate ceiling formula

The reviewer computes a deliberately conservative candidate:

\`\`\`text
candidate =
  round_up_10000(
    2 × measured_call_gas
    + 50000
  )
\`\`\`

This gives 100% call-execution headroom plus a 50,000-gas
transaction/calldata reserve before rounding upward.

The output remains:

\`\`\`text
candidate_runtime_gas_ceiling_accepted=false
production_configuration_updated=false
runtime_enablement_changed=false
\`\`\`

until the measured number is separately reviewed.

## Current unresolved boundary

After this source lane is merged, live values still remain unresolved until a
separately authorized read-only observation is run with an explicitly selected
deployer:

\`\`\`text
deployer_address
pending_nonce
future_contract_address
deployment_gas_estimate
deployment_gas_limit
live base fee / priority fee
deployer balance sufficiency
\`\`\`

The runtime gas ceiling also remains unresolved until the local Foundry
measurement result is reviewed and accepted.

No private key or credential is needed for either read-only observation or the
local gas measurement.
