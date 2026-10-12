# WC/VOID reverse settlement v1

Marker: `VOID_WC_VOID_REVERSE_SETTLEMENT_V1`

Status: source-only settlement mechanism. This contract does not append the WC
ledger, construct/sign/broadcast a transaction, activate the market or presale,
fund inventory, or move funds.

## Purpose

The opening WC -> VOID path already has a canonical settlement adapter. A
production two-sided WC/VOID market also needs the reverse VOID -> WC path.

The source contract binds three facts into one content-addressed settlement:

1. a valid public `void_to_wc` quote;
2. an actual canonical `VoidToken.transfer(vault, gross_input)` transaction
   plus successful receipt and exactly one matching `Transfer` log; and
3. one canonical positive WC ledger credit equal to the quote's **net WC
   output**.

This is not the retired development relayer and does not create a fixed WC/VOID
conversion.

## Current execution model

The reverse path is bound to the current Epoch-2 execution model:

- chain ID `2050`;
- network `mainnet0`;
- execution epoch `2`;
- canonical `VoidToken`;
- `epoch2_metered_zero_gas_price_v1`;
- positive gas metering still required;
- participant native-gas balance not required; and
- native-gas economic charge exactly `0`.

The older participant-native-gas / relayer model is not accepted by this source
contract.

## VOID input accounting

For a `void_to_wc` quote:

```text
gross VOID input = trade VOID input + input-side VOID fees
```

The participant transfer into the market vault must equal the **gross VOID
input**, not merely the trade-input amount. This keeps every input-side fee
inside the disclosed quote accounting and prevents a settlement from crediting
WC against less VOID than the quote committed.

The verifier decodes the transaction calldata as the canonical ERC-20
`transfer(address,uint256)` function and requires:

- transaction `to` = canonical `VoidToken`;
- transaction `from` = the participant address;
- chain ID = `2050`;
- transfer recipient = the supplied market vault;
- transfer amount = quote gross VOID input;
- successful receipt;
- exact transaction-hash binding;
- bounded receipt log count; and
- exactly one canonical `Transfer(address,address,uint256)` log from the
  canonical token with the same participant, vault, and amount.

## WC output accounting

The canonical reverse credit row is:

- `kind=credit`;
- exact WC account;
- positive safe-integer `delta`;
- `reason=wc_void_reverse_settlement_v1`;
- content-addressed settlement ID;
- exact quote/launch/market-state binding;
- exact participant/vault/VOID-transfer binding;
- `void_amount_atoms` = quote gross VOID input; and
- `wc_amount` / `delta` = quote net WC output.

That positive `delta` is compatible with the existing canonical WC balance
projector. The reverse verifier itself does **not** append the ledger.

## Settlement identity

The settlement ID hashes the canonical quote/transfer/receipt economic payload,
including:

- quote ID;
- coupled launch ID;
- market-state ID;
- participant and vault;
- transaction hash and Transfer-log index;
- receipt block identity;
- gross/trade/fee VOID inputs;
- gross/fee/net WC outputs; and
- the zero-native-gas economic model.

Changing the ledger timestamp does not create a different economic settlement;
the quote + canonical transfer evidence are the identity.

## Deliberately unresolved boundaries

The source contract deliberately reports:

- `pricing_math_verified=false`;
- `quote_publisher_authenticity_verified=false`;
- `receipt_provenance_verified=false`;
- `market_vault_custody_verified=false`;
- `runtime_or_launch_evidence=false`;
- `ledger_write_performed=false`; and
- all activation/funds authority false.

Those are later runtime, custody, authenticated-quote, persistence, canary, and
activation gates.

## Coupled-gate source policy

The coupled candidate now records
`reverse_void_to_wc_settlement_ready=true` only while carrying the exact
content-addressed source policy:

`sha256:073d3754f5bcd2b91558c5c8abd00bf721c545a3cd045edcc690ed17bbab31df`.

That binding fixes the adapter, direction, canonical transfer method, gross-VOID
transfer basis, net-WC credit basis, exact-one-Transfer-log rule, current
Epoch-2 gas model, and all unresolved evidence/custody flags.

This means **source-policy readiness only**. It does not claim a live reverse
settlement has occurred or that receipt provenance, quote authenticity, pricing
math, vault custody, ledger persistence, canary execution, or activation is
verified.

## Authority

No wallet/signer/private-key access, transaction construction, signing,
broadcast, Chain-2050 write, WC issuance, ledger mutation, inventory funding,
liquidity movement, market/presale activation, or funds movement is authorized.

Verification:

```bash
node scripts/prove_void_wc_void_reverse_settlement_v1.mjs
```
