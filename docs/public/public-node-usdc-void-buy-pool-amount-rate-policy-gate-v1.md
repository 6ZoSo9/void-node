# USDC/VOID Buy Pool Amount + Rate Policy Gate v1

Marker: VOID_USDC_VOID_BUY_POOL_AMOUNT_RATE_POLICY_GATE_V1

Purpose: prove the fixed-price quote/accounting policy needed before automatic USDC payment handling can safely compare received USDC amounts to expected VOID allocation amounts.

This gate is green for amount/rate policy only.

Policy:

- Accepted payment asset: USDC
- USDC decimals: 6
- Fixed price: 0.50 USDC per 1 VOID
- Quote rate: 1 USDC quotes 2 VOID
- Micro-USDC per VOID: 500000
- Public buy pool allocation: 10000000 VOID
- Target USDC if full pool drains: 5000000 USDC
- Target micro-USDC if full pool drains: 5000000000000

Quote examples:

- 1 USDC quotes 2 VOID
- 100 USDC quotes 200 VOID
- 5000000 USDC quotes 10000000 VOID

Gate result:

- amount_rate_policy_gate_green: true
- usdc_decimals_green: true
- fixed_rate_policy_green: true
- quote_math_green: true
- pool_capacity_math_green: true

Non-authority statement:

This gate does not verify a real payment now, does not fetch live chain data now, does not approve a buyer, does not write a private allocation ledger, does not reserve inventory, does not enable automatic fulfillment, and does not transfer VOID.
