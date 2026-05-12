# Buy VOID Fixed-Rate Fulfillment Policy

status: locked_policy_plan_only
launch_state: not_go_for_public_mainnet0
mutation_allowed_by_this_doc: false

## Supported payment rails

- Base native USDC
- Ethereum mainnet USDC

## Fixed Mainnet-0 bootstrap rate

1 USDC = 100 VOID

## Current confirmed payment

payment_chain: ethereum
payment_asset: ethereum_native_usdc
payment_ref: 0x378fdba93f97afc854b3753011a09b670ab4162759c3cd33c1bc64b236030337
observed_amount_usdc: 25
observed_amount_match: true
delivery_wallet: 0x1101A058E98eDCD775c93E26900d1DdBbdfa5d31

## Fulfillment amount

void_per_usdc: 100
void_amount: 2500
void_wei: 2500000000000000000000

## Safety rules

- Payment confirmation does not send VOID.
- Fulfillment requires a separate operator action.
- Fulfillment requires a real VOID transaction reference.
- Do not record fulfillment until a real VOID transfer exists.
- Do not use a fake void_tx_ref.
- Money step remains explicit and last.
