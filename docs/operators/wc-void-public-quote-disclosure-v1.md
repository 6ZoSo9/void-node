# WC/VOID public quote disclosure v1

Marker: `VOID_WC_VOID_PUBLIC_QUOTE_DISCLOSURE_V1`

Status: source-only disclosure contract. It validates what a public WC/VOID quote
must reveal before any future money authority may rely on it. It does not create
a market quote, execute a trade, access custody, or activate the market.

## Required quote disclosure

Every quote binds:

- coupled launch ID;
- exact market-state ID;
- Chain 2050 / `mainnet0` / execution epoch 2;
- canonical `VoidToken`
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`;
- direction: WC→VOID or VOID→WC;
- exact input/output asset and unit;
- gross input amount;
- trade input amount;
- complete input-fee total;
- gross output amount;
- complete output-fee total;
- net output amount;
- minimum output amount;
- slippage tolerance in basis points;
- issue and expiry timestamps;
- the complete economic fee-component list; and
- the native-gas execution model.

Fee components are explicit rather than hidden. Each component names a unique
code, input/output side, charged asset, and positive amount. The declared input
and output fee totals must exactly equal the component sums.

The accounting identities are enforced:

```text
gross input = trade input + input-side fees
gross output = net output + output-side fees
```

The minimum output is deterministically derived from the disclosed net output
and slippage tolerance.

## Gas disclosure

The quote is bound to the reviewed epoch-2 execution model:

- gas is metered;
- target gas price is zero;
- participant native-gas balance is not required;
- native gas is not an economic asset; and
- the disclosed native-gas economic charge is exactly zero.

This prevents a future quote from silently reviving the retired relayer gas-fee
model or charging an undisclosed native-gas amount.

## Pricing authority

The disclosure requires:

- `pricing_source=wc_void_market_state`;
- a content-addressed market-state ID;
- `presale_price_authority=false`; and
- `fixed_conversion=false`.

The fixed presale rate cannot silently become WC/VOID market price authority.

This module validates disclosure completeness and arithmetic only.
`pricing_math_verified=false` and `reserve_custody_verified=false` remain
explicit until separately reviewed market-state/custody composition exists.

## Gate effect

The source disclosure mechanism closes:

`public_quote_disclosure_ready=true`

It does **not** grant quote execution, market activation, presale activation,
wallet/signer access, or funds movement.

## Authority boundary

All value-bearing and mutation authority remains false.

Verification:

```bash
node scripts/prove_void_wc_void_public_quote_disclosure_v1.mjs
```
