# Production relayer gas sponsorship policy v1

Marker: `VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1`

Status: source-only policy and deterministic quote/reconciliation engine. No
runtime activation, wallet access, signing, transaction broadcast, asset
transfer, Chain-2050 mutation, or funds movement is authorized.

## Purpose

The production relayer is an **optional paid gas sponsor**.

It is not the default transaction sender and it is not a treasury subsidy.

The required decision order is:

1. estimate the transaction's bounded native Chain-2050 gas requirement;
2. inspect the participant wallet's native VOID gas balance;
3. if the participant can pay, the participant pays normally and the relayer
   is not used;
4. if the participant cannot pay, expose relayer availability but do not enable
   it automatically;
5. require explicit participant opt-in;
6. convert the bounded native-gas requirement into an accepted fee asset using
   a fresh market quote;
7. itemize the market-valued gas reimbursement and the separate relayer
   privilege fee;
8. require explicit user approval of that quote before any later reservation or
   movement step;
9. after execution, reconcile against actual gas used/effective gas price;
10. refund unused reserved reimbursement; and
11. account separately for reimbursement, service-fee margin, native gas spent,
    and reserve replenishment requirements.

## User-pays-first invariant

If:

```text
participant_native_balance_wei >= estimated_gas_limit * max_fee_per_gas_wei
```

the decision is:

```text
USER_PAYS_NATIVE_GAS
```

Even if a caller supplies `relayer_opt_in=true`, the relayer is unnecessary
and is not quoted.

This keeps the sponsorship service off the normal transaction path.

## Insufficient-gas behavior

If the participant cannot cover the bounded gas envelope and has not explicitly
enabled relayer use, the decision is:

```text
HOLD
reason=insufficient_native_gas_relayer_opt_in_required
```

The participant may then choose whether to request a sponsorship quote.

Insufficient gas never silently opts the participant into a paid service.

## Market-priced reimbursement

A sponsorship quote requires a fresh market-derived price object:

```text
source_kind=market
fixed_conversion=false
void_atoms=<native VOID atomic quantity>
fee_asset_atoms=<equivalent fee-asset atomic quantity>
observed_at_ms=<quote observation>
expires_at_ms=<quote expiry>
```

The implementation rejects expired quotes and any quote marked as a fixed
conversion.

The gas reimbursement reservation is:

```text
reserved_native_gas_wei =
  estimated_gas_limit * max_fee_per_gas_wei

reserved_gas_reimbursement_fee_asset_units =
  ceil(
    reserved_native_gas_wei
    * market_quote_fee_asset_atoms
    / market_quote_void_atoms
  )
```

No fixed WC/VOID conversion is introduced.

## Privilege fee

The service fee is a separate positive basis-point policy value. There is no
code default.

```text
reserved_service_fee =
  ceil(reserved_gas_reimbursement * service_fee_bps / 10000)

reserved_total_charge =
  reserved_gas_reimbursement + reserved_service_fee
```

The quote reports reimbursement and privilege fee as separate line items.

The service fee exists because the participant chose to use the relayer rather
than supplying their own native gas.

## Reconciliation

The quote is a reservation ceiling, not permission to retain unused gas
allowance.

After a successful sponsored transaction:

```text
actual_native_gas_spent_wei =
  receipt.gas_used * receipt.effective_gas_price_wei

actual_gas_reimbursement =
  market_convert_at_locked_quote(actual_native_gas_spent_wei)

actual_service_fee =
  ceil(actual_gas_reimbursement * service_fee_bps / 10000)

actual_total_charge =
  actual_gas_reimbursement + actual_service_fee

refund =
  reserved_total_charge - actual_total_charge
```

The implementation fails closed if actual gas exceeds the reserved envelope.

This makes the participant pay actual gas cost at the locked quote plus the
explicit privilege fee, rather than hiding margin inside gas estimation.

## Relayer economics

A successful reconciliation exposes separately:

```text
native_gas_reserve_depleted_by_wei
fee_asset_reimbursement_collected_units
fee_asset_service_fee_collected_units
refund_fee_asset_units
```

At the locked quote, the service-fee amount is the relayer's positive margin.

However, fee-asset collection is **not** treated as if it automatically
replenished native Chain-2050 gas. A separate reserve-management lane must
convert/rebalance collected fee assets into native gas under bounded policy.

Therefore:

```text
reserve_replenishment_conversion_required=true
automatic_fee_asset_to_native_conversion=false
```

until that mechanism is separately implemented and verified.

## Activation gates

The production candidate remains HOLD until all of these are closed:

- initial fee asset selection;
- market quote source selection;
- explicit positive service-fee BPS selection;
- production market-quote adapter;
- participant relayer toggle;
- participant itemized quote UI;
- runtime participant native-balance gate;
- fee-asset reservation/collection;
- execution receipt binding;
- fee-asset refund;
- relayer reserve accounting;
- native gas reserve replenishment;
- duplicate/replay protection;
- bounded canary; and
- public activation readiness.

## Authority boundary

This lane does not authorize or perform:

```text
credential access
wallet/signer access
RPC calls
transaction construction
transaction signing
transaction broadcast
Chain-2050 write
fee-asset transfer
native-gas transfer
funds movement
market activation
public activation
```

## Verification

```bash
node scripts/prove_void_production_relayer_gas_sponsorship_policy_v1.mjs
node scripts/prove_void_production_relayer_gas_sponsorship_readiness_v1.mjs
```
