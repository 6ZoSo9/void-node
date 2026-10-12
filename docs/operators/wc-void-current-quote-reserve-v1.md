# WC/VOID current quote-reserve custody v1

Marker: `VOID_WC_VOID_CURRENT_QUOTE_RESERVE_V1`

Status: source-only, read-only filesystem verifier for the **current** WC quote
reserve associated with one coupled WC/VOID launch.

It does not write the WC ledger, issue WC, move VOID, access a signer, submit a
transaction, activate WC/VOID or the presale, or move funds.

## Why this exists

The opening ledger-persistence verifier proves that the expected opening WC
debits were durably appended. That does not by itself prove the **current**
quote reserve after post-opening reverse settlements.

A canonical reverse VOID→WC settlement creates a positive WC credit with:

- reason `wc_void_reverse_settlement_v1`;
- adapter `void-wc-ledger-reverse-settlement-v1`; and
- direction `void_to_wc`.

Each such credit consumes WC quote reserve.

Therefore:

```text
current_quote_reserve_units
  = opening_settled_wc_reserve_units
  - canonical_reverse_credited_wc_units
```

## Inputs

The verifier accepts:

- canonical WC data directory;
- coupled launch ID;
- expected market-vault address;
- opening commitments;
- expected opening ledger debits; and
- the pre-opening ledger byte offset.

It first invokes the existing opening ledger-persistence verifier and requires
the exact opening settlement root and settled-WC total.

It then independently reopens the same canonical ledger and requires the exact
file size, append-window size, and append-window SHA-256 already proven by the
opening persistence verifier.

## Reserve-affecting rows

For the selected coupled launch, V1 understands only:

1. canonical opening WC debit rows; and
2. canonical reverse-settlement WC credit rows.

A reverse credit must have the exact reviewed row/meta shape, exact launch,
exact market vault, positive whole-WC amount, positive matching ledger delta,
canonical adapter/pair/direction/source-domain metadata, and content-addressed
reference fields in the expected formats.

Generic WC earning credits without this launch binding do not consume the
market quote reserve and are ignored.

Any other launch-scoped WC/VOID mutation fails closed with:

`WC_VOID_CURRENT_QUOTE_RESERVE_UNKNOWN_LAUNCH_LEDGER_MUTATION`

This is deliberate. If a future forward WC→VOID settlement class or another
reserve mutation is introduced, this verifier must be reviewed and extended
before quote-custody evidence can remain green.

## Ordering and conservation

All expected opening settlements must appear before the first reverse credit.

The verifier rejects:

- reverse settlement before opening is complete;
- duplicate opening settlement IDs;
- duplicate reverse settlement IDs;
- malformed reverse credits;
- wrong market vault;
- unknown launch-scoped market mutation; and
- reverse credits whose total exceeds the opening WC reserve.

A successful decision reports:

```text
ledger_persistence_verified=true
quote_reserve_custody_verified=true
reverse_credit_projection_complete=true
unknown_launch_market_mutation_fail_closed=true
post_opening_forward_settlement_supported=false
```

along with the opening reserve, total reverse WC credits, current reserve,
stable ledger-window identity, and content-addressed evidence ID.

## Deliberate runtime boundary

This is point-in-time canonical-ledger evidence. It does not prove a production
RPC/runtime identity and does not update the WC/VOID production candidate.

The returned result keeps:

```text
production_runtime_binding_verified=false
production_candidate_binding_allowed=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

A later import/composition lane must bind this receipt to the intended production
runtime and launch before any production quote-custody gate can advance.

## Authority boundary

The tool has bounded read-only filesystem inspection authority only.

It has no filesystem-write, credential, wallet/signer, private-key, RPC,
transaction, Chain-2050-write, WC-mutation, funding, liquidity, activation, or
funds-movement authority.

Verification:

```bash
node scripts/prove_void_wc_void_current_quote_reserve_v1.mjs
```
