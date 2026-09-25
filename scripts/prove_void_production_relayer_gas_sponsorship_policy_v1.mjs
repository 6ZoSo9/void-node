#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  AUTHORITY,
  VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1,
  quoteProductionRelayerGasSponsorshipV1,
  reconcileProductionRelayerGasSponsorshipV1,
} from "../tools/void-production-relayer-gas-sponsorship-policy-v1.mjs";

const USER = "0x1111111111111111111111111111111111111111";

function marketQuote(overrides = {}) {
  return {
    quote_id: "wc-void-market-quote-1",
    source_id: "wc-void-market-v1",
    source_kind: "market",
    fee_asset_id: "FEE_ASSET",
    void_atoms: "1000000000000000000",
    fee_asset_atoms: "2000000",
    observed_at_ms: "1000",
    expires_at_ms: "2000",
    fixed_conversion: false,
    ...overrides,
  };
}

function base(overrides = {}) {
  return {
    chain_id: 2050,
    user_address: USER,
    user_native_balance_wei: "10000000000000",
    estimated_gas_limit: "21000",
    max_fee_per_gas_wei: "3000000000",
    relayer_opt_in: true,
    now_ms: "1500",
    service_fee_bps: "500",
    market_quote: marketQuote(),
    ...overrides,
  };
}

assert.equal(
  VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1,
  "VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1",
);

for (const [key, value] of Object.entries(AUTHORITY)) {
  if (
    [
      "source_only_policy",
      "user_pays_first",
      "explicit_relayer_opt_in_required",
      "relayer_only_when_user_gas_insufficient",
      "market_quote_required_for_sponsorship",
      "fixed_conversion_forbidden",
      "explicit_positive_service_fee_required",
      "actual_gas_reconciliation_required",
      "unused_gas_refund_required",
      "service_fee_separately_itemized",
      "reserve_accounting_required",
    ].includes(key)
  ) {
    assert.equal(value, true, key);
  } else {
    assert.equal(value, false, key);
  }
}

{
  const direct = quoteProductionRelayerGasSponsorshipV1(
    base({
      user_native_balance_wei: "63000000000000",
      relayer_opt_in: true,
      market_quote: null,
      service_fee_bps: null,
    }),
  );
  assert.equal(direct.ok, true);
  assert.equal(direct.status, "USER_PAYS_NATIVE_GAS");
  assert.equal(direct.relayer_needed, false);
  assert.equal(direct.relayer_available, false);
  assert.equal(direct.relayer_used, false);
  assert.equal(direct.sponsorship_quote, null);
}

{
  const held = quoteProductionRelayerGasSponsorshipV1(
    base({
      relayer_opt_in: false,
      market_quote: null,
      service_fee_bps: null,
    }),
  );
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "insufficient_native_gas_relayer_opt_in_required",
  );
  assert.equal(held.relayer_needed, true);
  assert.equal(held.relayer_available, true);
  assert.equal(held.relayer_opt_in, false);
  assert.equal(held.relayer_used, false);
}

{
  const held = quoteProductionRelayerGasSponsorshipV1(
    base({
      market_quote: marketQuote({ fixed_conversion: true }),
    }),
  );
  assert.equal(held.ok, false);
  assert.equal(held.reason, "market_quote_invalid_or_expired");
}

{
  const held = quoteProductionRelayerGasSponsorshipV1(
    base({
      now_ms: "2500",
    }),
  );
  assert.equal(held.ok, false);
  assert.equal(held.reason, "market_quote_invalid_or_expired");
}

{
  const held = quoteProductionRelayerGasSponsorshipV1(
    base({ service_fee_bps: "0" }),
  );
  assert.equal(held.ok, false);
  assert.equal(
    held.reason,
    "service_fee_bps_must_be_explicit_positive",
  );
}

const quote = quoteProductionRelayerGasSponsorshipV1(base());
assert.equal(quote.ok, true);
assert.equal(quote.status, "RELAYER_QUOTE_READY_FOR_USER_APPROVAL");
assert.equal(
  quote.sponsorship_quote_id,
  "voidrgsq1_8d390d88737a6821f0e30c2403638b5119eac7ce8aa7e16761088c0239b7901d",
);
assert.equal(
  quote.market_quote_fingerprint_sha256,
  "ad297073081d6ea087cc58c5cef02cb85e0f45de328116ca2aaf95516296cb42",
);
assert.equal(quote.reserved_native_gas_wei, "63000000000000");
assert.equal(quote.native_gas_shortfall_wei, "53000000000000");
assert.equal(
  quote.reserved_gas_reimbursement_fee_asset_units,
  "126",
);
assert.equal(quote.reserved_service_fee_asset_units, "7");
assert.equal(quote.reserved_total_charge_fee_asset_units, "133");
assert.equal(
  quote.economic_margin_at_locked_quote_fee_asset_units,
  "7",
);
assert.equal(quote.user_pays_first, true);
assert.equal(quote.relayer_needed, true);
assert.equal(quote.relayer_available, true);
assert.equal(quote.relayer_used, false);
assert.equal(quote.fixed_conversion, false);
assert.equal(quote.actual_gas_reconciliation_required, true);
assert.equal(quote.unused_gas_refund_required, true);
assert.equal(quote.service_fee_separately_itemized, true);
assert.equal(quote.automatic_fee_asset_to_native_conversion, false);
assert.equal(quote.money_movement_authorized, false);

{
  const held = reconcileProductionRelayerGasSponsorshipV1({
    sponsorship_quote: quote,
    user_approved: false,
    actual_gas_used: "15000",
    actual_effective_gas_price_wei: "1000000000",
  });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "explicit_user_approval_required");
}

const reconciled = reconcileProductionRelayerGasSponsorshipV1({
  sponsorship_quote: quote,
  user_approved: true,
  actual_gas_used: "15000",
  actual_effective_gas_price_wei: "1000000000",
});
assert.equal(reconciled.ok, true);
assert.equal(reconciled.status, "RELAYER_RECONCILIATION_READY");
assert.equal(
  reconciled.reconciliation_id,
  "voidrgsr1_5676e4db46ec190882f45746ec0f338909c129cb770221c0c6e271caeb314a02",
);
assert.equal(reconciled.actual_native_gas_spent_wei, "15000000000000");
assert.equal(
  reconciled.actual_gas_reimbursement_fee_asset_units,
  "30",
);
assert.equal(reconciled.actual_service_fee_asset_units, "2");
assert.equal(reconciled.actual_total_charge_fee_asset_units, "32");
assert.equal(reconciled.refund_fee_asset_units, "101");
assert.equal(reconciled.service_fee_is_privilege_fee, true);
assert.equal(
  reconciled.reimbursement_matches_actual_gas_at_locked_quote,
  true,
);
assert.equal(reconciled.unused_reserved_charge_refunded, true);
assert.equal(reconciled.relayer_positive_margin_at_locked_quote, true);
assert.equal(
  reconciled.native_gas_reserve_depleted_by_wei,
  "15000000000000",
);
assert.equal(
  reconciled.fee_asset_reimbursement_collected_units,
  "30",
);
assert.equal(
  reconciled.fee_asset_service_fee_collected_units,
  "2",
);
assert.equal(reconciled.reserve_replenishment_conversion_required, true);
assert.equal(reconciled.automatic_fee_asset_to_native_conversion, false);
assert.equal(reconciled.money_movement_authorized, false);

{
  const held = reconcileProductionRelayerGasSponsorshipV1({
    sponsorship_quote: quote,
    user_approved: true,
    actual_gas_used: "21001",
    actual_effective_gas_price_wei: "3000000000",
  });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "actual_gas_exceeds_reserved_envelope");
}

{
  const tampered = { ...quote, reserved_total_charge_fee_asset_units: "134" };
  const held = reconcileProductionRelayerGasSponsorshipV1({
    sponsorship_quote: tampered,
    user_approved: true,
    actual_gas_used: "15000",
    actual_effective_gas_price_wei: "1000000000",
  });
  assert.equal(held.ok, false);
  assert.equal(held.reason, "sponsorship_quote_binding_invalid");
}

const source = fs.readFileSync(
  "tools/void-production-relayer-gas-sponsorship-policy-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "100 WC = 1 VOID",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "broadcastTransaction",
  "sendTransaction(",
  "--private-key",
  "mnemonic",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_PRODUCTION_RELAYER_GAS_SPONSORSHIP_POLICY_V1_PROOF_GREEN",
);
console.log("user_pays_first=true");
console.log("relayer_only_when_user_gas_insufficient=true");
console.log("explicit_relayer_opt_in_required=true");
console.log("market_quote_required=true");
console.log("fixed_conversion=false");
console.log("explicit_positive_service_fee_required=true");
console.log("actual_gas_reconciliation_required=true");
console.log("unused_gas_refund_required=true");
console.log("service_fee_is_privilege_fee=true");
console.log("reserve_replenishment_conversion_required=true");
console.log("automatic_fee_asset_to_native_conversion=false");
console.log("runtime_activation=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
