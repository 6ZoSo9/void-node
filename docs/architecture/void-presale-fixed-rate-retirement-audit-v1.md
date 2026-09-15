# VOID Presale / Fixed-Rate Retirement Audit V1

Marker: `VOID_PRESALE_FIXED_RATE_RETIREMENT_AUDIT_V1`

Base reviewed: `def5539492dd9e5ad187f919cf827babff1afe95`

This audit separates current economic assumptions from historical evidence. It
must not rewrite transaction history merely to make old evidence resemble new
policy.

## WC/VOID findings

### Must not remain current price authority

- `ops/private/wc-to-void-settlement-preview-v1.sh`
  - currently defaults `VOID_WC_TO_VOID_RATE_WC_PER_VOID` to `100`;
  - that default is incompatible with market-priced WC/VOID;
  - replacement must consume an actual market quote/state and have no fixed
    fallback rate.
- `ops/mainnet0/wc-devnet-bootstrap-proof.sh`
  - embeds `WC_PER_VOID = 100` in the V1 devnet pool and seeds both sides;
  - that bootstrap shape is incompatible with the one-sided VOID-only launch
    policy and must be retired/superseded before it is used as launch evidence.
- `ops/wc-smoke.sh`
  - asserts `wc_per_void=100`;
  - the replacement assertion must verify a valid dynamic market quote, not a
    particular administrator-selected price.

### Already useful for the new market

- `src/http/workcredits-devnet.ts` reports WC/VOID price from reserve state.
- `ops/void-workcredits-devnet-quote.sh` contains constant-product reserve math.
- `ops/wc-relayer-v1.cjs` quotes WC→VOID and VOID→WC from reserves and applies
  price impact/slippage handling.

Those components are reusable, but their current reserve logic requires both
reserves to be nonzero. They do not yet implement the required one-sided
VOID-only opening price discovery.

### Preserve as historical evidence

The prior WC→VOID canary/settlement family includes exact historical values such
as `100 WC` and `1.000000 VOID` in receipts, approval hashes, duplicate guards,
and execution records. Those values describe a completed historical event or a
proof fixture. They are not a current conversion policy and should remain
verifiable rather than being silently rewritten.

Examples include:

- `docs/public/public-node-wc-to-void-redacted-settlement-receipt-v1.md`;
- exact approval/recipient/duplicate-guard records under `ops/private/wc-to-void-*`.

Likewise, unrelated `100 WC` award examples are work-credit amounts, not
WC/VOID exchange rates, and are outside this cleanup.

## Presale findings

### Retire as current economics

The following families encode the old fixed-price sale and must no longer be
used as authority for new intake or market pricing:

- `VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_*` constants;
- fixed `2 VOID / 1 USDC` and `$0.50 / VOID` policy/schema fixtures;
- USDC presale quote/intake/allocation/fulfillment policy surfaces;
- public `/buy-void` checkout/intake behavior that presents a fixed-price sale;
- presale-specific inventory naming and activation dependencies.

Representative files include:

- `src/economic/buy_void_crash_consistent_saga_server_policy_v1.ts`;
- `src/economic/buy_void_source_finality_authority_v2.ts`;
- `scripts/lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs`;
- `schemas/buy-void-dual-rail-server-policy-v1.schema.json`;
- `fixtures/economic/buy-void-dual-rail-server-policy-v1.example.json`;
- `docs/public/buy-void-public-checkout-contract-v1.md`;
- `docs/architecture/buy-void-dual-rail-server-policy-v1.md`;
- `docs/architecture/buy-void-chain2050-presale-two-phase-v1.md`.

### Reuse rather than delete

The presale lane produced useful non-price-specific infrastructure. Where the
assumptions still hold, retain/refactor:

- source-chain payment/finality verification;
- duplicate-payment protection;
- append-only reservation/execution journals;
- participant/destination binding;
- bounded execution and recovery logic;
- receipts and public verification surfaces;
- Datanet accounting/settlement components.

New market code should use neutral WC/VOID, BTC/VOID, market, settlement, or
Datanet naming instead of extending `presale` as a live concept.

### Preserve history

Historical Buy VOID operator/test canaries, receipts, recovery records, and old
fixed-price proof artifacts remain chronology evidence. They should be labeled
or indexed as retired/historical when surfaced, not altered to claim that the
old event used today's policy.

## Current decision

Canonical replacement policy is
`docs/architecture/void-market-distribution-policy-v1.md`:

- fixed-price presale retired;
- WC/VOID target inventory: `10,000,000 VOID`, `0 WC` protocol seed;
- BTC/VOID target inventory: `10,000,000 VOID`, `0 BTC` protocol seed;
- no fixed opening price for either market;
- market participants supply all WC and BTC;
- opening price discovery and one-sided AMM implementation remain separate
  technical gates.

## Patch sequencing

1. Land the policy and vault-purpose correction without moving funds.
2. Retire/supersede executable fixed-rate WC bootstrap/preview assumptions.
3. Disable fixed-price presale public intake and checkout behavior.
4. Implement and prove shared one-sided opening price discovery / AMM logic.
5. Reuse verified settlement/finality/journal components under market-neutral
   interfaces.
6. Only after exact-green proofs, separately authorize funding or activation.

No item in this audit authorizes a merge, deployment, wallet action, liquidity
movement, or treasury transfer.
