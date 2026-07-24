import {
  readFile,
} from "node:fs/promises";
import {
  fileURLToPath,
} from "node:url";

import {
  ingestAcrossSwapApprovalQuoteV1,
  type AcrossReadonlyHttpsRequestV1,
  type AcrossReadonlyTransportV1,
} from "../src/external_opportunity/across_swap_api_quote_ingestion_v1.js";

import {
  ACROSS_SCHEDULED_OBSERVER_AUTHENTICATED_GETS_PER_RUN_V1,
  ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1,
  ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1,
  ACROSS_SCHEDULED_OBSERVER_MIN_CADENCE_SECONDS_V1,
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1,
  completeAcrossScheduledObservationV1,
  createAcrossScheduledObserverStateV1,
  planAcrossScheduledObservationV1,
  serializeAcrossScheduledObserverStateV1,
} from "../src/external_opportunity/across_scheduled_observer_v1.js";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`HOLD: ${message}`);
  }
}

async function expectHold(
  operation: () => unknown | Promise<unknown>,
  fragment: string,
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
    message.includes(fragment),
    `expected HOLD fragment is absent: ${fragment}`,
  );
}

const INPUT_TOKEN =
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831";
const OUTPUT_TOKEN =
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const DEPOSITOR =
  "0x1111111111111111111111111111111111111111";
const APP_FEE_RECIPIENT =
  "0x2222222222222222222222222222222222222222";
const API_KEY =
  "fixture-api-key-not-a-production-secret";

const fixtureResponse = Object.freeze({
  inputToken: Object.freeze({
    decimals: 6,
    symbol: "USDC",
    address: INPUT_TOKEN,
    chainId: 42161,
  }),
  outputToken: Object.freeze({
    decimals: 6,
    symbol: "USDC",
    address: OUTPUT_TOKEN,
    chainId: 8453,
  }),
  fees: Object.freeze({
    total: Object.freeze({
      amount: "1100000",
      amountUsd: "1.1000001",
      details: Object.freeze({
        app: Object.freeze({
          amount: "1000000",
          amountUsd: "1.0000009",
        }),
        bridge: Object.freeze({
          amount: "100000",
          amountUsd: "0.1000000",
          details: Object.freeze({
            destinationGas: Object.freeze({
              amount: "50000",
              amountUsd: "0.0500001",
            }),
          }),
        }),
      }),
    }),
    originGas: Object.freeze({
      amount: "40000",
      amountUsd: "0.0400001",
    }),
  }),
  inputAmount: "100000000",
  expectedOutputAmount: "98900000",
  minOutputAmount: "98800000",
  expectedFillTime: 2,
  quoteExpiryTimestamp: 1_767_225_700,
  id: "scheduled-fixture-quote-001",
  approvalTxns: Object.freeze([
    Object.freeze({
      to: "0x3333333333333333333333333333333333333333",
      data: "0xdeadbeef",
    }),
  ]),
  swapTx: Object.freeze({
    to: "0x4444444444444444444444444444444444444444",
    data: "0xcafebabe",
  }),
});

function clock(
  observedAt: string,
  evaluatedAt: string,
): () => string {
  const values = [observedAt, evaluatedAt];
  let index = 0;

  return (): string => {
    const value = values[index];

    assert(
      value !== undefined,
      "fixture clock called too many times",
    );

    index += 1;
    return value;
  };
}

function fixtureTransport(
  capture: {
    request?: AcrossReadonlyHttpsRequestV1;
  },
): AcrossReadonlyTransportV1 {
  return async (
    request: AcrossReadonlyHttpsRequestV1,
  ) => {
    capture.request = request;

    return Object.freeze({
      status_code: 200,
      content_type: "application/json",
      body: JSON.stringify(fixtureResponse),
    });
  };
}

assert(
  ACROSS_SCHEDULED_OBSERVER_MIN_CADENCE_SECONDS_V1 ===
    900,
  "minimum cadence differs",
);
assert(
  ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1 ===
    96,
  "daily authenticated GET cap differs",
);
assert(
  ACROSS_SCHEDULED_OBSERVER_AUTHENTICATED_GETS_PER_RUN_V1 ===
    1,
  "authenticated GETs per run differs",
);
assert(
  ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1 ===
    0,
  "internal retry count differs",
);

const initialState =
  createAcrossScheduledObserverStateV1(
    "2025-12-31T23:00:00.000Z",
  );

const firstPlan = planAcrossScheduledObservationV1({
  now: "2025-12-31T23:00:00.000Z",
  state: initialState,
});

assert(firstPlan.status === "ready", "first plan is not ready");
assert(
  firstPlan.state.authenticated_get_count === 1,
  "first plan did not reserve exactly one GET",
);
assert(
  firstPlan.authenticated_gets_remaining_today === 95,
  "first plan daily remainder differs",
);
assert(
  firstPlan.credential_access_performed === false &&
    firstPlan.network_access_performed === false &&
    firstPlan.execution_authorized === false,
  "first plan safety boundary differs",
);

const capture: {
  request?: AcrossReadonlyHttpsRequestV1;
} = {};

const result =
  await ingestAcrossSwapApprovalQuoteV1(
    Object.freeze({
      api_key: API_KEY,
      query: Object.freeze({
        trade_type: "exactInput",
        amount: "100000000",
        input_token: INPUT_TOKEN,
        output_token: OUTPUT_TOKEN,
        origin_chain_id: 42161,
        destination_chain_id: 8453,
        depositor: DEPOSITOR,
        integrator_id: "0x022d",
        app_fee: "0.01",
        app_fee_recipient: APP_FEE_RECIPIENT,
      }),
      policy: Object.freeze({
        capital_at_risk_usd: "100",
        capital_lock_seconds: 3_600,
        annual_capital_cost_bps: 800,
        risk_haircut_bps: 25,
        safety_buffer_usd: "0.10",
      }),
      timeout_ms: 5_000,
    }),
    fixtureTransport(capture),
    clock(
      "2025-12-31T23:00:01.000Z",
      "2025-12-31T23:00:02.000Z",
    ),
  );

assert(
  capture.request !== undefined,
  "fixture ingestion request is absent",
);
assert(
  capture.request.method === "GET",
  "fixture ingestion method differs",
);

const firstDecision =
  completeAcrossScheduledObservationV1({
    completed_at: "2025-12-31T23:00:03.000Z",
    plan: firstPlan,
    result,
  });

assert(
  firstDecision.status === "recorded",
  "first observation was not recorded",
);
assert(firstDecision.record !== null, "record is absent");
assert(
  firstDecision.append_jsonl !== null &&
    firstDecision.append_jsonl.endsWith("\n") &&
    !firstDecision.append_jsonl.slice(0, -1).includes("\n"),
  "append-only JSONL boundary differs",
);
assert(
  firstDecision.state.record_count === 1,
  "record count differs",
);
assert(
  firstDecision.state.seen_quote_ids.length === 1 &&
    firstDecision.state.seen_opportunity_ids.length === 1 &&
    firstDecision.state.seen_source_quote_sha256.length === 1,
  "dedupe state differs",
);
assert(
  firstDecision.record.record_sha256.length === 64,
  "record SHA differs",
);

const serializedDecision = JSON.stringify(firstDecision);

for (const forbidden of [
  API_KEY,
  "Authorization",
  "approvalTxns",
  "swapTx",
  "0xdeadbeef",
  "0xcafebabe",
]) {
  assert(
    !serializedDecision.includes(forbidden),
    `scheduled record retained forbidden data: ${forbidden}`,
  );
}

const cadenceBlocked = planAcrossScheduledObservationV1({
  now: "2025-12-31T23:10:00.000Z",
  state: firstDecision.state,
});

assert(
  cadenceBlocked.status === "cadence_blocked",
  "cadence block status differs",
);
assert(
  cadenceBlocked.seconds_until_ready === 300,
  "cadence wait differs",
);
assert(
  cadenceBlocked.authenticated_gets_this_run === 0,
  "cadence block reserved a GET",
);

const secondPlan = planAcrossScheduledObservationV1({
  now: "2025-12-31T23:15:00.000Z",
  state: firstDecision.state,
});

assert(
  secondPlan.status === "ready" &&
    secondPlan.state.authenticated_get_count === 2,
  "second plan differs",
);

const duplicateDecision =
  completeAcrossScheduledObservationV1({
    completed_at: "2025-12-31T23:15:03.000Z",
    plan: secondPlan,
    result: {
      ...result,
      observed_at: "2025-12-31T23:15:01.000Z",
      evaluated_at: "2025-12-31T23:15:02.000Z",
    },
  });

assert(
  duplicateDecision.status === "duplicate",
  "duplicate was not suppressed",
);
assert(
  duplicateDecision.record === null &&
    duplicateDecision.append_jsonl === null,
  "duplicate produced an append record",
);
assert(
  JSON.stringify(duplicateDecision.duplicate_fields) ===
    JSON.stringify([
      "quote_id",
      "opportunity_id",
      "source_quote_sha256",
    ]),
  "duplicate fields differ",
);
assert(
  duplicateDecision.state.record_count === 1 &&
    duplicateDecision.state.authenticated_get_count === 2,
  "duplicate state accounting differs",
);

const cappedState = {
  ...firstDecision.state,
  authenticated_get_count: 96,
  last_attempt_started_at:
    "2025-12-31T22:00:00.000Z",
};

const capBlocked = planAcrossScheduledObservationV1({
  now: "2025-12-31T23:30:00.000Z",
  state: cappedState,
});

assert(
  capBlocked.status === "daily_cap_blocked",
  "daily cap status differs",
);
assert(
  capBlocked.authenticated_gets_remaining_today === 0 &&
    capBlocked.authenticated_gets_this_run === 0,
  "daily cap accounting differs",
);

const rolloverPlan = planAcrossScheduledObservationV1({
  now: "2026-01-01T00:00:00.000Z",
  state: cappedState,
});

assert(
  rolloverPlan.status === "ready",
  "UTC rollover did not reset daily cap",
);
assert(
  rolloverPlan.state.day_utc === "2026-01-01" &&
    rolloverPlan.state.authenticated_get_count === 1 &&
    rolloverPlan.state.seen_quote_ids.length === 0,
  "UTC rollover state differs",
);

const deterministicPlanA =
  planAcrossScheduledObservationV1({
    now: "2026-01-01T01:00:00.000Z",
    state: null,
  });
const deterministicPlanB =
  planAcrossScheduledObservationV1({
    now: "2026-01-01T01:00:00.000Z",
    state: null,
  });

assert(
  JSON.stringify(deterministicPlanA) ===
    JSON.stringify(deterministicPlanB),
  "plan determinism differs",
);

const stateLine =
  serializeAcrossScheduledObserverStateV1(
    firstDecision.state,
  );

assert(
  stateLine.endsWith("\n") &&
    !stateLine.slice(0, -1).includes("\n"),
  "serialized state JSONL boundary differs",
);

await expectHold(
  () =>
    completeAcrossScheduledObservationV1({
      completed_at: "2025-12-31T23:00:03.000Z",
      plan: firstPlan,
      result: {
        ...result,
        live_execution_authorized: true,
      },
    }),
  "live_execution_authorized must be false",
);

await expectHold(
  () =>
    planAcrossScheduledObservationV1({
      now: "2025-12-31T22:59:59.000Z",
      state: firstDecision.state,
    }),
  "last attempt is in the future",
);

const modulePath = fileURLToPath(
  new URL(
    "../src/external_opportunity/across_scheduled_observer_v1.ts",
    import.meta.url,
  ),
);
const moduleSource = await readFile(modulePath, "utf8");

for (const forbiddenPattern of [
  /node:https/,
  /node:http/,
  /node:fs/,
  /node:child_process/,
  /process\.env/,
  /\bfetch\s*\(/,
  /https\.request/,
  /\bPOST\b/,
  /sendTransaction/,
  /eth_sendRawTransaction/,
  /\bprivateKey\b/i,
  /\bwallet(Client)?\b/i,
  /LoadCredential/,
  /\.write(File|Sync)?\s*\(/,
  /console\./,
]) {
  assert(
    !forbiddenPattern.test(moduleSource),
    `forbidden scheduled-observer source pattern matched: ${forbiddenPattern}`,
  );
}

for (const requiredPattern of [
  /ACROSS_SCHEDULED_OBSERVER_MIN_CADENCE_SECONDS_V1\s*=\s*\n\s*900/,
  /ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1\s*=\s*\n\s*96/,
  /ACROSS_SCHEDULED_OBSERVER_AUTHENTICATED_GETS_PER_RUN_V1\s*=\s*\n\s*1/,
  /ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1\s*=\s*\n\s*0/,
  /transaction_payload_retention:\s*false/,
  /transaction_submission_performed:\s*false/,
  /live_execution_authorized:\s*false/,
  /execution_authorized:\s*false/,
]) {
  assert(
    requiredPattern.test(moduleSource),
    `required scheduled-observer source pattern missing: ${requiredPattern}`,
  );
}

console.log(
  JSON.stringify({
    marker:
      "VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_PROOF_V1",
    opportunity_id:
      firstDecision.record.opportunity_id,
    record_sha256:
      firstDecision.record.record_sha256,
    status: firstDecision.status,
    cadence_block_seconds:
      cadenceBlocked.seconds_until_ready,
    daily_cap:
      ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1,
    authenticated_gets_per_run:
      ACROSS_SCHEDULED_OBSERVER_AUTHENTICATED_GETS_PER_RUN_V1,
    internal_retry_count:
      ACROSS_SCHEDULED_OBSERVER_INTERNAL_RETRY_COUNT_V1,
    duplicate_suppressed:
      duplicateDecision.status === "duplicate",
    network_access_performed: false,
    credential_access_performed: false,
    transaction_submission_performed: false,
    live_execution_authorized: false,
  }),
);

console.log("scheduled_observer_initial_ready_exact=true");
console.log("scheduled_observer_15_minute_cadence_exact=true");
console.log("scheduled_observer_daily_cap_96_exact=true");
console.log("scheduled_observer_one_get_per_run_exact=true");
console.log("scheduled_observer_zero_retry_exact=true");
console.log("scheduled_observer_duplicate_suppression_exact=true");
console.log("scheduled_observer_utc_rollover_exact=true");
console.log("scheduled_observer_append_only_jsonl_exact=true");
console.log("scheduled_observer_sanitized_record_exact=true");
console.log("scheduled_observer_determinism_exact=true");
console.log("scheduled_observer_network_surface_absent=true");
console.log("scheduled_observer_credential_surface_absent=true");
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_V1_EXACT_GREEN",
);
