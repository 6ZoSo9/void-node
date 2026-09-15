# VOID Presale / Market Separation Audit V1

Marker: `VOID_PRESALE_MARKET_SEPARATION_AUDIT_V1`

Base reviewed: `def5539492dd9e5ad187f919cf827babff1afe95`

This audit separates the retained presale funding lane from the three dynamic
market lanes. It preserves historical and test evidence and does not rewrite
completed transactions.

## WC/VOID findings

### Must not remain current market-price authority

- `ops/private/wc-to-void-settlement-preview-v1.sh`
  - currently defaults `VOID_WC_TO_VOID_RATE_WC_PER_VOID` to `100`;
  - that fallback is incompatible with market-priced WC/VOID;
  - replacement must consume actual market quote/state and have no fixed fallback.
- `ops/mainnet0/wc-devnet-bootstrap-proof.sh`
  - embeds `WC_PER_VOID = 100` and seeds both sides;
  - that bootstrap is not the one-sided VOID-only launch design.
- `ops/wc-smoke.sh`
  - asserts `wc_per_void=100`;
  - replacement must validate a dynamic quote rather than a chosen fixed price.

### Already useful for the market

- `src/http/workcredits-devnet.ts` reports WC/VOID price from reserve state.
- `ops/void-workcredits-devnet-quote.sh` contains reserve-based pricing math.
- `ops/wc-relayer-v1.cjs` quotes WC->VOID and VOID->WC from reserves and applies
  price impact/slippage handling.

Those components are reusable, but the launch path still needs one-sided opening
price discovery because the protocol supplies `0 WC`.

### Preserve as historical/test evidence

Prior WC->VOID canary and settlement records containing values such as `100 WC`
and `1.000000 VOID` remain exact historical evidence. They must not be rewritten
and they do not define the current WC/VOID market price.

Unrelated fixed WC work awards are work-payment amounts, not exchange rates.

## Presale findings

### Retain as a funding lane

The existing presale implementation and its reviewed economics remain a separate
funding lane with a dedicated `10,000,000 VOID` inventory. Existing machinery
includes:

- USDC payment observation/finality;
- duplicate-payment protection;
- request and allocation journals;
- buyer/destination binding;
- bounded fulfillment and recovery;
- receipts and public verification.

The presale's fixed USDC economics apply only to the presale. They do not set or
peg WC/VOID, BTC/VOID, or ETH/VOID.

### Do not expand presale-specific design unnecessarily

Months of presale engineering are preserved and remain usable. New economic
engineering priority, however, moves to Datanet plus WC/VOID, BTC/VOID, and
ETH/VOID. Presale work should be limited to preservation, testing, safety,
required maintenance, and operation of the existing funding lane rather than
inventing additional presale economics.

### Preserve history

Historical Buy VOID operator/test canaries, receipts, recovery records, and
fixed-price proof artifacts remain chronology and regression-test evidence.

## Current decision

Canonical policy is `docs/architecture/void-market-distribution-policy-v1.md`:

- presale retained: `10,000,000 VOID` inventory under its existing reviewed
  economics;
- WC/VOID: `10,000,000 VOID`, `0 WC` protocol seed;
- BTC/VOID: `10,000,000 VOID`, `0 BTC` protocol seed;
- ETH/VOID: `10,000,000 VOID`, `0 ETH` protocol seed;
- total across the four economic lanes: `40,000,000 VOID`;
- no fixed opening price for WC/VOID, BTC/VOID, or ETH/VOID;
- quote assets for the three markets come from market participants;
- presale USDC is not market reserve backing.

## Implementation sequencing

1. Preserve the existing presale lane and historical/test records.
2. Retire/supersede executable fixed-rate WC market assumptions.
3. Implement shared one-sided opening price discovery and AMM behavior for the
   three market pairs.
4. Reuse verified settlement/finality/journal components under the appropriate
   asset-specific adapters.
5. Keep native BTC settlement behind a Bitcoin-specific finality adapter.
6. Reuse Ethereum-side finality machinery for native ETH only where the logic is
   genuinely asset-agnostic.
7. Fund or activate nothing without its separate exact-green gate.

No item in this audit authorizes a merge, deployment, wallet action, liquidity
movement, presale activation, market activation, or treasury transfer.
