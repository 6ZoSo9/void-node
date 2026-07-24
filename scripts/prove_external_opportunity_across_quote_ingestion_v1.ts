import {
  readFile,
} from "node:fs/promises";
import {
  fileURLToPath,
} from "node:url";

import {
  VOID_ACROSS_QUOTE_INGESTION_RESULT_SCHEMA_V1,
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1,
  acrossSwapApiReadonlyHttpsGetV1,
  ingestAcrossSwapApprovalQuoteV1,
  type AcrossReadonlyHttpsRequestV1,
  type AcrossReadonlyTransportV1,
} from "../src/external_opportunity/across_swap_api_quote_ingestion_v1.js";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`HOLD: ${message}`);
  }
}

async function expectHold(
  operation: () => Promise<unknown>,
  expectedFragment: string,
  forbiddenSecret: string,
): Promise<void> {
  let message = "";

  try {
    await operation();
  } catch (error) {
    message =
      error instanceof Error
        ? error.message
        : String(error);
  }

  assert(
    message.includes(expectedFragment),
    `expected HOLD fragment is absent: ${expectedFragment}`,
  );
  assert(
    !message.includes(forbiddenSecret),
    "credential leaked through HOLD message",
  );
}

const API_KEY =
  "fixture-across-api-key-not-a-real-secret-123456";
const INPUT_TOKEN =
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const OUTPUT_TOKEN =
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const DEPOSITOR =
  "0x1111111111111111111111111111111111111111";
const RECIPIENT =
  "0x2222222222222222222222222222222222222222";
const APP_FEE_RECIPIENT =
  "0x3333333333333333333333333333333333333333";

const fixtureResponse = Object.freeze({
  crossSwapType: "bridgeableToBridgeable",
  amountType: "exactInput",
  inputToken: Object.freeze({
    decimals: 6,
    symbol: "USDC",
    address: INPUT_TOKEN,
    name: "USD Coin",
    chainId: 42161,
  }),
  outputToken: Object.freeze({
    decimals: 6,
    symbol: "USDC",
    address: OUTPUT_TOKEN,
    name: "USD Coin",
    chainId: 8453,
  }),
  fees: Object.freeze({
    total: Object.freeze({
      amount: "1500000",
      amountUsd: "1.5000004",
      pct: "1500000000000000",
      details: Object.freeze({
        type: "total-breakdown",
        app: Object.freeze({
          amount: "1250000",
          amountUsd: "1.2500009",
          pct: "1250000000000000",
        }),
        bridge: Object.freeze({
          amount: "250000",
          amountUsd: "0.2500000",
          details: Object.freeze({
            type: "across",
            destinationGas: Object.freeze({
              amount: "200000",
              amountUsd: "0.2000001",
            }),
          }),
        }),
      }),
    }),
    totalMax: Object.freeze({
      amount: "1600000",
      amountUsd: "1.600000",
    }),
    originGas: Object.freeze({
      amount: "100000",
      amountUsd: "0.1000001",
    }),
  }),
  inputAmount: "1000000000",
  maxInputAmount: "1000000000",
  expectedOutputAmount: "998500000",
  minOutputAmount: "998000000",
  expectedFillTime: 2,
  quoteExpiryTimestamp: 1_767_225_700,
  id: "fixture-across-swap-approval-001",
  checks: Object.freeze({
    allowance: Object.freeze({
      actual: "0",
      expected: "1000000000",
    }),
  }),
  approvalTxns: Object.freeze([
    Object.freeze({
      chainId: 42161,
      to: "0x4444444444444444444444444444444444444444",
      data: "0xdeadbeef",
    }),
  ]),
  swapTx: Object.freeze({
    simulationSuccess: true,
    chainId: 42161,
    to: "0x5555555555555555555555555555555555555555",
    data: "0xcafebabe",
    value: "0",
  }),
});

const fixtureInput = Object.freeze({
  api_key: API_KEY,
  query: Object.freeze({
    trade_type: "exactInput",
    amount: "1000000000",
    input_token: INPUT_TOKEN,
    output_token: OUTPUT_TOKEN,
    origin_chain_id: 42161,
    destination_chain_id: 8453,
    depositor: DEPOSITOR,
    recipient: RECIPIENT,
    integrator_id: "0xdead",
    app_fee: "0.01",
    app_fee_recipient: APP_FEE_RECIPIENT,
  }),
  policy: Object.freeze({
    capital_at_risk_usd: "1000",
    capital_lock_seconds: 60,
    annual_capital_cost_bps: 800,
    risk_haircut_bps: 1000,
    safety_buffer_usd: "0.05",
  }),
  timeout_ms: 5_000,
});

function fixedClock(): () => string {
  const values = [
    "2025-12-31T23:59:00.000Z",
    "2025-12-31T23:59:01.000Z",
  ];
  let index = 0;

  return (): string => {
    const value = values[index];

    assert(
      value !== undefined,
      "fixture clock was called too many times",
    );

    index += 1;
    return value;
  };
}

function fixtureTransport(
  capture: {
    request?: AcrossReadonlyHttpsRequestV1;
  },
  response: unknown = fixtureResponse,
  statusCode = 200,
): AcrossReadonlyTransportV1 {
  return async (
    request: AcrossReadonlyHttpsRequestV1,
  ) => {
    capture.request = request;

    return Object.freeze({
      status_code: statusCode,
      content_type: "application/json; charset=utf-8",
      body: JSON.stringify(response),
    });
  };
}

const capture: {
  request?: AcrossReadonlyHttpsRequestV1;
} = {};

const result = await ingestAcrossSwapApprovalQuoteV1(
  fixtureInput,
  fixtureTransport(capture),
  fixedClock(),
);

assert(
  result.schema ===
    VOID_ACROSS_QUOTE_INGESTION_RESULT_SCHEMA_V1,
  "result schema differs",
);
assert(
  result.marker ===
    VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1,
  "result marker differs",
);
assert(result.provider === "across", "provider differs");
assert(result.method === "GET", "method differs");
assert(
  result.endpoint ===
    "https://app.across.to/api/swap/approval",
  "endpoint differs",
);
assert(
  result.paper_receipt.status === "paper_positive",
  "positive quote status differs",
);
assert(
  result.paper_receipt.paper_gross_revenue_usd ===
    "1.250000",
  "conservative app-fee revenue rounding differs",
);
assert(
  result.paper_receipt.total_user_fee_usd ===
    "1.500001",
  "conservative total-fee rounding differs",
);
assert(
  result.paper_receipt.paper_costs.origin_gas_usd ===
    "0.100001",
  "conservative origin-gas rounding differs",
);
assert(
  result.paper_receipt.paper_costs.destination_gas_usd ===
    "0.200001",
  "conservative destination-gas rounding differs",
);
assert(
  result.paper_receipt.paper_net_profit_usd ===
    "0.774845",
  "paper net profit differs",
);
assert(
  result.paper_receipt.paper_net_profit_bps_of_capital ===
    "7",
  "paper net profit bps differs",
);
assert(
  result.paper_receipt.execution_authorized === false,
  "paper receipt authorized execution",
);
assert(
  result.credential_retention === false &&
    result.raw_response_retention === false &&
    result.transaction_payload_retention === false,
  "retention boundary differs",
);
assert(
  result.network_mutation_performed === false &&
    result.wallet_or_key_access_performed === false &&
    result.transaction_construction_performed === false &&
    result.transaction_submission_performed === false &&
    result.live_execution_authorized === false,
  "execution boundary differs",
);

const capturedRequest = capture.request;

assert(
  capturedRequest !== undefined,
  "fixture transport did not receive a request",
);

const capturedUrl = new URL(capturedRequest.url);

assert(
  capturedRequest.method === "GET",
  "transport method differs",
);
assert(
  capturedUrl.origin === "https://app.across.to",
  "transport origin differs",
);
assert(
  capturedUrl.pathname === "/api/swap/approval",
  "transport pathname differs",
);
assert(
  capturedUrl.searchParams.get("integratorId") ===
    "0xdead",
  "integrator ID query differs",
);
assert(
  capturedUrl.searchParams.get("appFee") === "0.01",
  "appFee query differs",
);
assert(
  capturedUrl.searchParams.get("appFeeRecipient") ===
    APP_FEE_RECIPIENT,
  "appFeeRecipient query differs",
);
assert(
  !capturedRequest.url.includes(API_KEY),
  "API key leaked into URL",
);
assert(
  capturedRequest.headers.Authorization ===
    `Bearer ${API_KEY}`,
  "Bearer authorization header differs",
);
assert(
  capturedRequest.headers["Cache-Control"] ===
    "no-store" &&
    capturedRequest.headers.Pragma === "no-cache",
  "no-cache request headers differ",
);
assert(
  capturedRequest.max_response_bytes === 1_048_576,
  "response byte limit differs",
);

const serialized = JSON.stringify(result);

for (const forbidden of [
  API_KEY,
  "approvalTxns",
  "swapTx",
  "0xdeadbeef",
  "0xcafebabe",
  "Authorization",
]) {
  assert(
    !serialized.includes(forbidden),
    `result retained forbidden data: ${forbidden}`,
  );
}

const secondResult =
  await ingestAcrossSwapApprovalQuoteV1(
    fixtureInput,
    fixtureTransport({}),
    fixedClock(),
  );

assert(
  JSON.stringify(secondResult) === serialized,
  "deterministic ingestion result differs",
);

const expiredFixture = {
  ...fixtureResponse,
  quoteExpiryTimestamp: 1_767_225_500,
  id: "fixture-across-swap-approval-expired-001",
};

const expiredResult =
  await ingestAcrossSwapApprovalQuoteV1(
    fixtureInput,
    fixtureTransport({}, expiredFixture),
    fixedClock(),
  );

assert(
  expiredResult.paper_receipt.status === "expired",
  "expired quote status differs",
);

await expectHold(
  async () => {
    await ingestAcrossSwapApprovalQuoteV1(
      fixtureInput,
      fixtureTransport({}, fixtureResponse, 302),
      fixedClock(),
    );
  },
  "returned status 302",
  API_KEY,
);

await expectHold(
  async () => {
    await ingestAcrossSwapApprovalQuoteV1(
      {
        ...fixtureInput,
        query: {
          ...fixtureInput.query,
          app_fee_recipient: undefined,
        },
      },
      fixtureTransport({}),
      fixedClock(),
    );
  },
  "app_fee_recipient is required",
  API_KEY,
);

await expectHold(
  async () => {
    await acrossSwapApiReadonlyHttpsGetV1({
      method: "GET",
      url: "https://example.com/api/swap/approval",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
      timeout_ms: 5_000,
      max_response_bytes: 1_048_576,
    });
  },
  "exact-host boundary differs",
  API_KEY,
);

const wrongTokenFixture = {
  ...fixtureResponse,
  outputToken: {
    ...fixtureResponse.outputToken,
    address:
      "0x6666666666666666666666666666666666666666",
  },
};

await expectHold(
  async () => {
    await ingestAcrossSwapApprovalQuoteV1(
      fixtureInput,
      fixtureTransport({}, wrongTokenFixture),
      fixedClock(),
    );
  },
  "output token or chain differs",
  API_KEY,
);

const modulePath = fileURLToPath(
  new URL(
    "../src/external_opportunity/across_swap_api_quote_ingestion_v1.ts",
    import.meta.url,
  ),
);
const moduleSource = await readFile(modulePath, "utf8");

for (const forbiddenPattern of [
  /\bPOST\b/,
  /sendTransaction/,
  /eth_sendRawTransaction/,
  /\bprivateKey\b/i,
  /\bwallet(Client)?\b/i,
  /node:child_process/,
  /process\.env/,
  /\.write\s*\(/,
  /console\./,
]) {
  assert(
    !forbiddenPattern.test(moduleSource),
    `forbidden source pattern matched: ${forbiddenPattern}`,
  );
}

for (const requiredPattern of [
  /https\.request/,
  /method:\s*"GET"/,
  /https:\/\/app\.across\.to/,
  /\/api\/swap\/approval/,
  /Cache-Control/,
  /no-store/,
  /transaction_payload_retention:\s*false/,
  /live_execution_authorized:\s*false/,
]) {
  assert(
    requiredPattern.test(moduleSource),
    `required source pattern missing: ${requiredPattern}`,
  );
}

console.log(
  JSON.stringify({
    marker:
      "VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_PROOF_V1",
    quote_id: result.quote_id,
    opportunity_id:
      result.paper_receipt.opportunity_id,
    receipt_sha256:
      result.paper_receipt.receipt_sha256,
    paper_net_profit_usd:
      result.paper_receipt.paper_net_profit_usd,
    transaction_payload_retention:
      result.transaction_payload_retention,
    credential_retention:
      result.credential_retention,
    network_access_performed: false,
    network_mutation_performed:
      result.network_mutation_performed,
    transaction_submission_performed:
      result.transaction_submission_performed,
    live_execution_authorized:
      result.live_execution_authorized,
  }),
);

console.log("across_quote_ingestion_request_boundary_exact=true");
console.log("across_quote_ingestion_bearer_transport_exact=true");
console.log("across_quote_ingestion_no_cache_exact=true");
console.log("across_quote_ingestion_app_fee_revenue_exact=true");
console.log("across_quote_ingestion_cost_rounding_conservative=true");
console.log("across_quote_ingestion_transaction_payload_discarded=true");
console.log("across_quote_ingestion_credential_nonretention_exact=true");
console.log("across_quote_ingestion_determinism_exact=true");
console.log("across_quote_ingestion_expiry_exact=true");
console.log("across_quote_ingestion_redirect_rejected=true");
console.log("across_quote_ingestion_exact_host_enforced=true");
console.log("across_quote_ingestion_network_not_called_in_proof=true");
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_ACROSS_QUOTE_INGESTION_V1_EXACT_GREEN",
);
