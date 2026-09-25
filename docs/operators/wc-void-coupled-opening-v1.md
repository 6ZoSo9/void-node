# WC/VOID coupled opening v1

Marker: `VOID_WC_VOID_COUPLED_OPENING_V1`

Status: source-only production mechanism. This gate implements the WC-specific
opening-price and settlement-verification seam required by issue #1822. It does
not write the WC ledger, fund the WC/VOID market, activate the market, activate
the presale, access a wallet/signer, sign or broadcast a transaction, or move
funds.

## Why this is WC-specific

The older shared post-discovery market reference assumes a formal
`presale_closeout_id` for all approved markets. That assumption is no longer
valid for WC/VOID because canonical policy now requires WC/VOID to launch in the
same ceremony as the presale.

This lane therefore binds WC/VOID opening state to a content-addressed
`coupled_launch_id` instead of fabricating a presale closeout.

BTC/VOID and ETH/VOID are not changed by this source gate.

## Canonical market inputs

The source contract fixes:

- chain ID: `2050`;
- pair: `WC_VOID`;
- quote asset: `WC`;
- base asset: canonical Chain-2050 `VoidToken`;
- Chain-2050 transaction gas: paid from a distinct native gas balance, not from
  the `VoidToken` balance;
- WC source domain: `void-work-credit-ledger`;
- WC asset form: `ledger-credit`;
- quote unit: whole `wc`;
- quote decimals: `0`;
- protocol VOID opening inventory:
  `10000000000000000000000000` token atoms = `10,000,000 VOID`;
- opening sale tranche:
  `5000000000000000000000000` token atoms = `5,000,000 VOID`;
- post-opening retained VOID reserve:
  `5000000000000000000000000` token atoms = `5,000,000 VOID`;
- opening allocation policy: `pro_rata_largest_remainder_v1`;
- protocol WC seed: `0 WC`;
- fixed conversion: false;
- fixed opening price: false; and
- opening price source: `settled_wc_over_opening_sale_tranche`.

## Opening-price anti-manipulation boundary

The deterministic reserve-ratio formula is not by itself a manipulation defense.

With `0 WC` protocol seed, the opening cohort buys a fixed **5,000,000 VOID**
batch while the other **5,000,000 VOID** remains in the market. The clearing
price is derived from total settled WC over that 5M sale tranche. After the
batch, all settled WC plus the retained 5M VOID form the initial two-sided
reserve. This 50/50 split is the unique simple split where the batch clearing
price equals the immediate post-opening reserve ratio.

Before production opening, the price-forming cohort itself still needs a
reviewed admission policy.

The final policy must bind:

- one fixed opening commitment window and deterministic close;
- participant identity/provenance and eligibility;
- no operator discretion to add/remove a participant after seeing the aggregate;
- policy-bound per-participant and related-identity concentration limits;
- Sybil/replay resistance across the opening cohort;
- a minimum aggregate real-WC quote-depth threshold before the opening price is
  accepted;
- exclusion of test/canary/internal/operator-generated WC that is not explicitly
  eligible production participant WC;
- immutable commitment-set and settlement-set roots before final price
  publication; and
- deterministic participant claim/allocation rules after the opening state is
  fixed.

No numeric concentration or minimum-depth threshold is selected by this source
audit. Those are explicit market-policy values that must be reviewed before
activation.

## Opening commitments

Each commitment binds:

- one coupled launch ID;
- one participant ID;
- one canonical WC account;
- one positive whole-WC amount; and
- one content-addressed commitment ID.

Duplicate commitment IDs and duplicate participant IDs fail closed.

This source contract does not create participant commitments or claim that a
participant authorized one. Participant provenance remains a later live
admission/custody gate.

## Canonical WC settlement adapter

Adapter ID:

`void-wc-ledger-opening-settlement-v1`

The adapter verifies the exact row shape that a future WC opening settlement
must use in the canonical `wc_v1/ledger.jsonl` accounting domain.

A qualifying row must be a canonical WC debit:

- `kind=debit`;
- positive integer `amount`;
- `delta=-amount`;
- `reason=wc_void_opening_settlement_v1`;
- exact commitment/account/launch binding;
- exact WC source/unit profile;
- `opening_only=true`;
- `fixed_price=false`; and
- `protocol_wc_seed_units=0`.

This is compatible with the existing canonical WC balance projector, which
already subtracts `kind=debit` rows using their `amount`.

The adapter requires an exact one-to-one mapping from commitments to debit
events. Duplicate settlement IDs, duplicate commitment settlement, amount drift,
account substitution, launch substitution, fixed-price metadata, and nonzero
protocol WC seed fail closed.

This opening adapter is specifically a WC -> VoidToken path. It does not
implement a production VOID -> WC reverse settlement, and it does not claim that
the complete post-opening two-sided market is executable.

This source gate verifies explicit event objects only. It does not yet prove that
those events have been durably appended to the live canonical ledger. Therefore:

`ledger_persistence_verified=false`

and no balance mutation authority exists.

## Opening price and allocation derivation

After the commitment/debit set is internally valid, the source derives:

```text
opening clearing price
  = real settled participant WC
    / 5,000,000 opening-sale VOID

post-opening reserves
  = all settled participant WC
    + 5,000,000 retained VOID
```

Participant VOID is allocated pro rata from the 5M tranche. Integer atom
rounding uses deterministic largest-remainder allocation with commitment-ID
tie-breaking so exactly 5M VOID atoms are allocated with no lost dust.

Example: with `1,000 WC` total, split as `250 WC` and `750 WC`:

```text
opening price = 1 WC / 5,000 VOID
participant A = 1,250,000 VOID
participant B = 3,750,000 VOID
post-opening pool = 1,000 WC + 5,000,000 VOID
```

The post-opening reserve ratio is therefore the same exact `1 WC / 5,000 VOID`
clearing price.

This source computes allocation math only. It does **not** yet durably bind each
WC debit to a participant token claim/transfer or refund/recovery path, so:

```text
opening_allocation_transfer_or_claim_runtime_ready=false
participant_opening_claim_policy_ready=false
```

A different real settled WC reserve yields a different market-discovered price;
there is still no fixed WC→VOID conversion.

## Deliberately unresolved boundaries

This lane does not claim that WC/VOID is production-ready.

The following remain separate gates:

- durable live-ledger persistence/provenance;
- durable participant opening claim/transfer or refund/recovery binding;
- reconciliation/versioning of the older shared post-discovery inspector, which
  still assumes a full 10M VOID retained reserve for WC/VOID;
- final production market-vault identity;
- independent vault verification;
- exact 10,000,000-VOID market inventory funding;
- inventory-lock proof;
- independent WC settlement-adapter review;
- deployed `settleVoid` gas-ceiling observation;
- shared presale/WC native-gas liability reservation;
- one shared nonce scheduler for the reused settlement EOA;
- fresh fee-cap admission checks;
- finality-controlled gas-liability release;
- an ongoing native-gas replenishment or user-paid native-gas model;
- a separately reviewed VOID -> WC reverse settlement path before the market is
  described as fully two-sided;
- bounded live canary; and
- coupled presale + WC/VOID activation readiness.

## Authority boundary

All value-bearing and mutation capabilities remain false:

- WC ledger write;
- WC issuance;
- WC balance mutation;
- wallet/signer access;
- signing;
- broadcast;
- Chain-2050 write;
- inventory funding;
- liquidity movement;
- market activation;
- public presale activation; and
- funds movement.

Verification:

```bash
node scripts/prove_void_wc_void_coupled_opening_v1.mjs
```
