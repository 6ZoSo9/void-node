import {
  readFile,
} from "node:fs/promises";
import {
  fileURLToPath,
} from "node:url";
import {
  dirname,
  join,
} from "node:path";

import {
  VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_OBSERVER_V1,
  canonicalExternalOpportunityJsonV1,
  hashExternalOpportunityDocumentV1,
  observeAcrossPaperQuoteV1,
} from "../src/external_opportunity/across_quote_observer_v1.js";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const modulePath = join(
  repo,
  "src",
  "external_opportunity",
  "across_quote_observer_v1.ts",
);

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`HOLD: ${message}`);
  }
}

const expiry = Math.floor(
  Date.parse("2026-07-24T02:05:00.000Z") / 1_000,
);

const base = {
  schema: VOID_ACROSS_PAPER_QUOTE_INPUT_SCHEMA_V1,
  observed_at: "2026-07-24T02:00:00.000Z",
  evaluated_at: "2026-07-24T02:00:05.000Z",
  quote_id: "fixture-across-quote-001",
  quote_expiry_timestamp: expiry,
  route: {
    origin_chain_id: 42161,
    destination_chain_id: 8453,
    input_token: {
      address:
        "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      symbol: "USDC",
      decimals: 6,
    },
    output_token: {
      address:
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      symbol: "USDC",
      decimals: 6,
    },
  },
  input_amount: "1000000000",
  expected_output_amount: "998000000",
  min_output_amount: "997000000",
  expected_fill_time_sec: 2,
  fee_summary: {
    total_fee_amount: "2000000",
    total_fee_usd: "2",
    origin_gas_usd: "0.05",
  },
  revenue_assumption: {
    model: "integrator_app_fee" as const,
    gross_revenue_usd: "1",
    evidence_label:
      "across_swap_api_documented_integrator_app_fee",
  },
  cost_assumptions: {
    destination_gas_usd: "0.05",
    capital_at_risk_usd: "1000",
    capital_lock_seconds: 120,
    annual_capital_cost_bps: 1200,
    risk_haircut_bps: 1000,
    safety_buffer_usd: "0.05",
  },
};

const positive = observeAcrossPaperQuoteV1(base);
const repeated = observeAcrossPaperQuoteV1(
  JSON.parse(JSON.stringify(base)),
);

assert(
  positive.marker ===
    VOID_EXTERNAL_OPPORTUNITY_OBSERVER_V1,
  "positive marker differs",
);
assert(
  positive.phase === "paper_only" &&
    positive.execution_authorized === false,
  "execution boundary differs",
);
assert(
  positive.status === "paper_positive",
  "positive fixture status differs",
);
assert(
  positive.paper_costs.capital_lock_cost_usd ===
    "0.000457",
  "capital lock cost differs",
);
assert(
  positive.paper_costs.risk_haircut_usd ===
    "0.100000",
  "risk haircut differs",
);
assert(
  positive.paper_costs.total_cost_usd ===
    "0.250457",
  "total paper cost differs",
);
assert(
  positive.paper_net_profit_usd === "0.749543",
  "paper net profit differs",
);
assert(
  positive.paper_net_profit_bps_of_capital === "7",
  "paper net profit bps differs",
);
assert(
  positive.opportunity_id === repeated.opportunity_id &&
    positive.receipt_sha256 === repeated.receipt_sha256,
  "deterministic receipt differs",
);

const negative = observeAcrossPaperQuoteV1({
  ...base,
  quote_id: "fixture-across-quote-negative-001",
  revenue_assumption: {
    ...base.revenue_assumption,
    gross_revenue_usd: "0.1",
  },
});

assert(
  negative.status === "paper_negative",
  "negative fixture status differs",
);
assert(
  negative.paper_net_profit_usd === "-0.060457",
  "negative fixture net profit differs",
);

const expired = observeAcrossPaperQuoteV1({
  ...base,
  quote_id: "fixture-across-quote-expired-001",
  evaluated_at: "2026-07-24T02:05:00.000Z",
});

assert(
  expired.status === "expired" &&
    expired.quote_expired === true,
  "expired fixture status differs",
);

const tampered = observeAcrossPaperQuoteV1({
  ...base,
  input_amount: "1000000001",
});

assert(
  tampered.opportunity_id !== positive.opportunity_id,
  "tampering did not change opportunity ID",
);

let extraKeyRejected = false;

try {
  observeAcrossPaperQuoteV1({
    ...base,
    swapTx: {
      to: "0x0000000000000000000000000000000000000000",
      data: "0x",
    },
  });
} catch (error) {
  extraKeyRejected =
    error instanceof Error &&
    error.message.startsWith("HOLD:");
}

assert(
  extraKeyRejected,
  "execution-shaped extra input was not rejected",
);

const moduleSource = await readFile(modulePath, "utf8");

const forbiddenSourcePatterns = [
  /\bfetch\s*\(/,
  /\bsendTransaction\b/,
  /\bwallet(Client)?\b/i,
  /\bprivateKey\b/i,
  /\beth_sendRawTransaction\b/,
  /\bchild_process\b/,
  /\bprocess\.env\b/,
  /\bWebSocket\b/,
];

for (const pattern of forbiddenSourcePatterns) {
  assert(
    !pattern.test(moduleSource),
    `module contains forbidden execution/network surface: ${pattern}`,
  );
}

const canonical = canonicalExternalOpportunityJsonV1({
  z: 2,
  a: 1,
});

assert(
  canonical === '{"a":1,"z":2}',
  "canonical JSON ordering differs",
);
assert(
  hashExternalOpportunityDocumentV1({
    z: 2,
    a: 1,
  }) ===
    hashExternalOpportunityDocumentV1({
      a: 1,
      z: 2,
    }),
  "canonical hash ordering differs",
);

console.log(
  JSON.stringify({
    marker:
      "VOID_EXTERNAL_OPPORTUNITY_OBSERVER_ACROSS_PAPER_PROOF_V1",
    positive_opportunity_id: positive.opportunity_id,
    positive_receipt_sha256: positive.receipt_sha256,
    positive_net_profit_usd:
      positive.paper_net_profit_usd,
    negative_net_profit_usd:
      negative.paper_net_profit_usd,
    expired_status: expired.status,
    execution_authorized: false,
    network_access_performed: false,
    wallet_or_key_access_performed: false,
    transaction_construction_performed: false,
    transaction_submission_performed: false,
  }),
);
console.log(
  "external_opportunity_positive_fixture_exact=true",
);
console.log(
  "external_opportunity_negative_fixture_exact=true",
);
console.log(
  "external_opportunity_expired_fixture_exact=true",
);
console.log(
  "external_opportunity_determinism_exact=true",
);
console.log(
  "external_opportunity_tamper_evidence_exact=true",
);
console.log(
  "external_opportunity_execution_surface_rejected=true",
);
console.log(
  "external_opportunity_network_surface_absent=true",
);
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_OBSERVER_ACROSS_PAPER_V1_EXACT_GREEN",
);
