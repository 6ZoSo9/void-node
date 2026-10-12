#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_V1 =
  "VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_V1";

export const VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_AUTHORITY_V1 = {
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
};

const MAX_TRACE_BYTES = 8 * 1024 * 1024;
const MAX_REASONABLE_CALL_GAS = 5_000_000n;
const HEADROOM_NUMERATOR = 2n;
const TRANSACTION_OVERHEAD_RESERVE = 50_000n;
const ROUNDING_QUANTUM = 10_000n;

function fail(code, detail = undefined) {
  const error = new Error(code);
  error.code = code;
  if (detail !== undefined) {
    error.detail = detail;
  }
  throw error;
}

function stripAnsi(value) {
  return value.replace(
    /\x1b\[[0-9;]*[A-Za-z]/g,
    "",
  );
}

function roundUp(value, quantum) {
  return (
    (value + quantum - 1n) /
    quantum
  ) * quantum;
}

export function reviewBuyVoidPresaleFulfillmentGasMeasurementV1(
  traceText,
) {
  if (
    typeof traceText !== "string" ||
    traceText.length < 1 ||
    Buffer.byteLength(
      traceText,
      "utf8",
    ) > MAX_TRACE_BYTES
  ) {
    fail("gas_measurement_trace_invalid");
  }

  const clean = stripAnsi(traceText);
  const values = [];

  for (const pattern of [
    /GasMeasured\(gasUsed:\s*([0-9]+)/g,
    /GasMeasured\(\s*([0-9]+)\s*\)/g,
  ]) {
    let match;
    while (
      (match = pattern.exec(clean)) !==
      null
    ) {
      values.push(BigInt(match[1]));
    }
  }

  const unique = [
    ...new Set(
      values.map((value) =>
        value.toString(),
      ),
    ),
  ].map((value) => BigInt(value));

  if (unique.length !== 1) {
    fail(
      "gas_measurement_exactly_one_value_required",
      {
        values: unique.map((value) =>
          value.toString(),
        ),
      },
    );
  }

  const measured = unique[0];
  if (
    measured <= 0n ||
    measured >
      MAX_REASONABLE_CALL_GAS
  ) {
    fail(
      "gas_measurement_value_out_of_bounds",
    );
  }

  const candidate = roundUp(
    measured *
      HEADROOM_NUMERATOR +
      TRANSACTION_OVERHEAD_RESERVE,
    ROUNDING_QUANTUM,
  );

  return {
    marker:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_V1,
    version: 1,
    status:
      "local_measurement_ready_candidate_ceiling_unaccepted",
    measurement: {
      predecessor_mode:
        "genesis_zero",
      scenario:
        "first_successful_fulfillment_to_zero_balance_recipient",
      measured_call_gas:
        measured.toString(),
      headroom_multiplier:
        "2",
      transaction_overhead_reserve_gas:
        TRANSACTION_OVERHEAD_RESERVE.toString(),
      rounding_quantum_gas:
        ROUNDING_QUANTUM.toString(),
      candidate_runtime_gas_ceiling:
        candidate.toString(),
    },
    compiler_profile: {
      solc_release:
        "0.8.24+commit.e11b9ed9",
      evm_version: "paris",
      optimizer_enabled: false,
      via_ir: false,
    },
    candidate_runtime_gas_ceiling_accepted:
      false,
    production_configuration_updated:
      false,
    runtime_enablement_changed:
      false,
    next_gate:
      "review_measured_runtime_gas_and_separately_accept_ceiling",
    authority:
      VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_AUTHORITY_V1,
  };
}

function usage() {
  return (
    VOID_BUY_VOID_PRESALE_FULFILLMENT_GAS_MEASUREMENT_REVIEW_V1 +
    "\n\nUsage:\n" +
    "  node tools/buy-void-presale-fulfillment-gas-measurement-review-v1.mjs TRACE_FILE\n"
  );
}

if (
  import.meta.url ===
  new URL(
    "file://" +
      path.resolve(process.argv[1] || ""),
  ).href
) {
  if (
    process.argv.length !== 3 ||
    process.argv[2] === "--help"
  ) {
    process.stdout.write(usage());
    process.exit(
      process.argv[2] === "--help"
        ? 0
        : 2,
    );
  }

  const file = path.resolve(
    process.argv[2],
  );
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size <= 0 ||
    stat.size > MAX_TRACE_BYTES
  ) {
    fail(
      "gas_measurement_trace_file_invalid",
    );
  }

  const result =
    reviewBuyVoidPresaleFulfillmentGasMeasurementV1(
      fs.readFileSync(
        file,
        "utf8",
      ),
    );

  process.stdout.write(
    JSON.stringify(
      result,
      null,
      2,
    ) + "\n",
  );
}
