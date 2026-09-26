# BTC/VOID Deterministic Quote Math V1

Marker: VOID_BTC_VOID_QUOTE_MATH_V1

This Phase-0 source contract implements deterministic, integer-only indicative quote math for the official native-BTC / canonical Chain-2050 `VoidToken` pair. It follows the architecture in btc-void-native-atomic-market-v1.md without mounting a market runtime or reserving inventory.

The reference tool consumes one closed JSON request on stdin and emits one content-addressed indicative quote:

~~~bash
node tools/void-btc-void-quote-math-v1.mjs --pretty < request.json
~~~

Amounts, reserves, and reserve floors are canonical decimal strings. BTC uses satoshis; the VOID-side reserve uses canonical Chain-2050 `VoidToken` atomic units. The two bounded basis-point policy fields are JSON safe integers. Floating-point values, scientific notation, signs, leading zeroes, unknown fields, unsupported directions, and values above the unsigned 128-bit V1 envelope fail closed.

The quote primitive assumes positive reserves have already been admitted by a
separate market-state authority. Because official BTC/VOID starts with a
protocol BTC seed of zero, positive-reserve fixtures in this proof are
**post-discovery math examples**, not opening-price or liquidity authority.

## Formula

For either direction, V1 selects an input reserve and output reserve, then computes:

~~~text
fee_factor = 10000 - fee_bps
adjusted_input_numerator = amount_in * fee_factor
amount_out = floor(
  reserve_out * adjusted_input_numerator
  /
  (reserve_in * 10000 + adjusted_input_numerator)
)
~~~

The tool retains the complete input amount in the logical input reserve, applies output-floor rounding, and proves that the BTC×VOID invariant does not decrease.

Policy remains explicit input rather than hidden operator discretion. This
low-level quote primitive deliberately accepts bounded fee values for generic
math/adversarial tests; the proof's 30-bps fixture is **not** the official launch
parameter. The executable BTC/VOID wrapper in
`VOID_BTC_VOID_TRADE_FUNDED_FEES_V1` requires exactly 50 bps (0.50%).
V1 bounds the generic primitive to at most 1,000 basis points and the input to at
most 25% of its input reserve. Each request also supplies minimum BTC and VOID
reserve floors. These are safety envelopes, not liquidity-seeding authority.

## Authority boundary

Every output is indicative-only. The tool:

- performs no HTTP, RPC, wallet, signer, filesystem, or environment lookup;
- observes no live BTC, VOID, reserve, or price state;
- reserves no inventory;
- creates or broadcasts no transaction;
- carries no fiat, stablecoin, wrapped-BTC, leverage, lending, or treasury-refill path; and
- grants no execution or settlement authority.

The quote ID is a SHA-256 content identity over canonical normalized source data. It is not a signature, executable reservation, live price, or promise of inventory.

## Proof

Run:

~~~bash
node scripts/prove_void_btc_void_quote_math_v1.mjs
~~~

The proof covers both directions, zero-fee behavior, invariant preservation, canonical key-order independence, one-unit quote-ID sensitivity, exact allowlists, integer encoding, reserve-fraction limits, reserve floors, fee bounds, overflow boundaries, unsupported assets, and the complete negative authority contract.

Before executable quotes can exist, later separately reviewed work must bind versioned reserve snapshots, exact policies, reservation state, Bitcoin regtest behavior, isolated Chain-2050 hashlocks, restart recovery, and public receipts. No wallet, liquidity, deployment, presale, or funds authority is included here.
