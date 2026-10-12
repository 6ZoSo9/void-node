# WC/VOID opening settlement-adapter source review v1

Marker: `VOID_WC_VOID_OPENING_SETTLEMENT_ADAPTER_REVIEW_V1`

Status: source-only independent review acceptance. This does not append to the
WC ledger, prove live quote custody, deploy/fund a market, access a signer, sign
or broadcast a transaction, activate WC/VOID or the presale, or move funds.

## Reviewed adapter

Adapter ID:

`void-wc-ledger-opening-settlement-v1`

Reviewed source:

`tools/void-wc-void-coupled-opening-v1.mjs`

The review packet binds the exact source Git blob:

`886feaef71a228b1e6f49f1106ae8ec2b34c404e`

at source commit:

`1a3a59dbc505edc2b5cc6f49c4d6228f3ae1a927`.

Canonical review packet:

`ops/mainnet0/wc-void-opening-settlement-adapter-review-v1.json`

Review ID:

`voidwcsar1_0e51724c2c8b8aee08e3da7a12dc78ae93179b6c9427ceca1915c26a114a972c`

## Accepted source semantics

The reviewed adapter requires:

- exact debit schema `void.wc-ledger-market-debit.v1`;
- exact adapter ID and opening-only metadata;
- `fixed_price=false` and `protocol_wc_seed_units=0`;
- pair `WC_VOID`;
- source domain `void-work-credit-ledger`;
- quote asset form `ledger-credit`, unit `wc`, zero decimals;
- positive safe whole-WC debits with `delta = -amount`;
- exact coupled-launch binding;
- exact commitment, account, and amount binding;
- content-addressed settlement IDs;
- duplicate settlement-ID rejection;
- duplicate commitment-settlement rejection;
- exact commitment↔settlement bijection; and
- total settled WC equal to total committed WC.

The review proof directly exercises these semantics and independently checks the
reviewed source Git blob identity.

## Deliberate live boundary

This source review may allow the production candidate to record:

`wc_settlement_adapter_independently_reviewed=true`

only together with the exact content-addressed review binding.

It deliberately keeps false:

- live WC-ledger persistence verification;
- quote-reserve custody verification;
- market activation;
- public presale activation; and
- funds movement.

Those remain separate live evidence gates.

## Verification

```bash
node scripts/prove_void_wc_void_opening_settlement_adapter_review_v1.mjs
node scripts/prove_void_wc_void_production_readiness_v1.mjs
```
