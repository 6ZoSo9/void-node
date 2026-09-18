#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_AUTHORITY_V1,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_V1,
  reviewBuyVoidPresaleFulfillmentGasMeasurementV1,
} from "../tools/buy-void-presale-fulfillment-gas-measurement-review-v1.mjs";

const ROOT = process.cwd();

const reviewed =
  reviewBuyVoidPresaleFulfillmentGasMeasurementV1(
    [
      "[PASS] test_genesisFirstFulfillmentGasMeasurement() (gas: 999999)",
      "Traces:",
      "  emit GasMeasured(gasUsed: 123456)",
      "",
    ].join("\n"),
  );

assert.equal(
  reviewed.marker,
  VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_V1,
);
assert.equal(
  reviewed.status,
  "local_measurement_ready_candidate_ceiling_unaccepted",
);
assert.equal(
  reviewed.measurement.predecessor_mode,
  "genesis_zero",
);
assert.equal(
  reviewed.measurement.scenario,
  "first_successful_fulfillment_to_zero_balance_recipient",
);
assert.equal(
  reviewed.measurement.measured_call_gas,
  "123456",
);
assert.equal(
  reviewed.measurement.headroom_multiplier,
  "2",
);
assert.equal(
  reviewed.measurement.transaction_overhead_reserve_gas,
  "50000",
);
assert.equal(
  reviewed.measurement.rounding_quantum_gas,
  "10000",
);
assert.equal(
  reviewed.measurement.candidate_runtime_gas_ceiling,
  "300000",
);
assert.equal(
  reviewed.compiler_profile.solc_release,
  "0.8.24+commit.e11b9ed9",
);
assert.equal(
  reviewed.compiler_profile.evm_version,
  "paris",
);
assert.equal(
  reviewed.compiler_profile.optimizer_enabled,
  false,
);
assert.equal(
  reviewed.compiler_profile.via_ir,
  false,
);
assert.equal(
  reviewed.candidate_runtime_gas_ceiling_accepted,
  false,
);
assert.equal(
  reviewed.production_configuration_updated,
  false,
);
assert.equal(
  reviewed.runtime_enablement_changed,
  false,
);
assert.equal(
  reviewed.next_gate,
  "review_measured_runtime_gas_and_separately_accept_ceiling",
);

const ansi =
  reviewBuyVoidPresaleFulfillmentGasMeasurementV1(
    "\u001b[32memit GasMeasured(gasUsed: 99999)\u001b[0m\n",
  );
assert.equal(
  ansi.measurement.measured_call_gas,
  "99999",
);
assert.equal(
  ansi.measurement.candidate_runtime_gas_ceiling,
  "250000",
);

assert.throws(
  () =>
    reviewBuyVoidPresaleFulfillmentGasMeasurementV1(
      "no measurement here",
    ),
  (error) =>
    error?.code ===
    "gas_measurement_exactly_one_value_required",
);

assert.throws(
  () =>
    reviewBuyVoidPresaleFulfillmentGasMeasurementV1(
      "emit GasMeasured(gasUsed: 100000)\nemit GasMeasured(gasUsed: 100001)\n",
    ),
  (error) =>
    error?.code ===
    "gas_measurement_exactly_one_value_required",
);

assert.throws(
  () =>
    reviewBuyVoidPresaleFulfillmentGasMeasurementV1(
      "emit GasMeasured(gasUsed: 6000000)\n",
    ),
  (error) =>
    error?.code ===
    "gas_measurement_value_out_of_bounds",
);

for (const [key, expected] of Object.entries({
  local_foundry_measurement_only: true,
  genesis_predecessor_zero_only: true,
  successful_first_fulfillment_only: true,
  compiler_profile_solc_0_8_24_paris: true,
  observed_call_gas_only: true,
  candidate_ceiling_not_production_policy: true,
  rpc_call: false,
  credential_access: false,
  wallet_access: false,
  signing: false,
  transaction_broadcast: false,
  deployment: false,
  chain2050_mutation: false,
  inventory_funding: false,
  runtime_enablement_change: false,
  production_configuration_mutation: false,
  public_activation: false,
  money_movement: false,
})) {
  assert.equal(
    VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_AUTHORITY_V1[
      key
    ],
    expected,
    key,
  );
}

const gasTest = fs.readFileSync(
  path.join(
    ROOT,
    "test/mainnet/BuyVoidPresaleFulfillmentV1GasMeasurement.t.sol",
  ),
  "utf8",
);

for (const required of [
  "contract BuyVoidPresaleFulfillmentV1GasMeasurement",
  "address(0)",
  "token.mint(address(registry), CAP);",
  "uint256 beforeGas = gasleft();",
  "registry.fulfill(",
  "uint256 gasUsed = beforeGas - gasleft();",
  "emit GasMeasured(gasUsed);",
  "address(0xBEEF)",
  "1 ether",
]) {
  assert.equal(
    gasTest.includes(required),
    true,
    required,
  );
}

assert.equal(
  gasTest.indexOf(
    "uint256 beforeGas = gasleft();",
  ) <
    gasTest.indexOf(
      "registry.fulfill(",
    ),
  true,
);
assert.equal(
  gasTest.indexOf(
    "registry.fulfill(",
  ) <
    gasTest.indexOf(
      "uint256 gasUsed = beforeGas - gasleft();",
    ),
  true,
);

const reviewerSource = fs.readFileSync(
  path.join(
    ROOT,
    "tools/buy-void-presale-fulfillment-gas-measurement-review-v1.mjs",
  ),
  "utf8",
);

for (const forbidden of [
  "JsonRpcProvider",
  "eth_",
  "broadcastTransaction",
  "sendTransaction",
  "private_key",
  "mnemonic",
  "systemctl",
]) {
  assert.equal(
    reviewerSource.includes(forbidden),
    false,
    "reviewer contains forbidden operation " +
      forbidden,
  );
}

console.log(
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_V1_PROOF_GREEN",
);
console.log("genesis_first_fulfillment_measurement=true");
console.log("candidate_formula=round_up_10k(2x_measured_plus_50000)");
console.log("candidate_runtime_gas_ceiling_accepted=false");
console.log("live_rpc=false");
console.log("signing=false");
console.log("transaction_broadcast=false");
console.log("deployment=false");
console.log("production_configuration_mutation=false");
console.log("runtime_enablement_change=false");
