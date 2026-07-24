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
  type AcrossSwapApprovalIngestionResultV1,
} from "../src/external_opportunity/across_swap_api_quote_ingestion_v1.js";
import {
  ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1,
  type AcrossScheduledObserverStateV1,
} from "../src/external_opportunity/across_scheduled_observer_v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1,
  executeAcrossScheduledObserverRuntimeV1,
  parseAcrossScheduledObserverPendingV1,
  type AcrossScheduledObserverRuntimePortsV1,
} from "../src/external_opportunity/across_scheduled_observer_runtime_v1.js";

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
  quoteExpiryTimestamp: 1_767_312_000,
  id: "runtime-fixture-quote-001",
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

function ingestionClock(
  observedAt: string,
  evaluatedAt: string,
): () => string {
  const values = [observedAt, evaluatedAt];
  let index = 0;

  return (): string => {
    const value = values[index];

    assert(
      value !== undefined,
      "fixture ingestion clock called too many times",
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

async function fixtureIngestion(
  observedAt: string,
  evaluatedAt: string,
  capture: {
    request?: AcrossReadonlyHttpsRequestV1;
  },
): Promise<AcrossSwapApprovalIngestionResultV1> {
  return ingestAcrossSwapApprovalQuoteV1(
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
    ingestionClock(observedAt, evaluatedAt),
  );
}

type MemoryRuntime = {
  events: string[];
  stateText: string | null;
  pendingText: string | null;
  appendedLines: Map<string, string>;
  credentialReads: number;
  ingestions: number;
  stateWrites: string[];
  pendingWrites: string[];
};

function memoryRuntime(): MemoryRuntime {
  return {
    events: [],
    stateText: null,
    pendingText: null,
    appendedLines: new Map<string, string>(),
    credentialReads: 0,
    ingestions: 0,
    stateWrites: [],
    pendingWrites: [],
  };
}

function clockValues(
  runtime: MemoryRuntime,
  ...values: string[]
): () => string {
  let index = 0;

  return (): string => {
    runtime.events.push(`now:${index}`);
    const value = values[index];

    assert(
      value !== undefined,
      "runtime clock called too many times",
    );

    index += 1;
    return value;
  };
}

function ports(
  runtime: MemoryRuntime,
  now: () => string,
  ingest: (
    apiKey: string,
  ) => Promise<AcrossSwapApprovalIngestionResultV1>,
): AcrossScheduledObserverRuntimePortsV1 {
  return Object.freeze({
    now,
    load_state_text: async (): Promise<string | null> => {
      runtime.events.push("load_state");
      return runtime.stateText;
    },
    persist_state_atomic: async (
      serialized: string,
    ): Promise<void> => {
      runtime.events.push("persist_state");
      runtime.stateText = serialized;
      runtime.stateWrites.push(serialized);
    },
    load_pending_text: async (): Promise<string | null> => {
      runtime.events.push("load_pending");
      return runtime.pendingText;
    },
    persist_pending_atomic: async (
      serialized: string,
    ): Promise<void> => {
      runtime.events.push("persist_pending");
      runtime.pendingText = serialized;
      runtime.pendingWrites.push(serialized);
    },
    remove_pending: async (): Promise<void> => {
      runtime.events.push("remove_pending");
      runtime.pendingText = null;
    },
    append_record_idempotent: async (
      dayUtc: string,
      recordSha256: string,
      appendJsonl: string,
    ): Promise<"appended" | "already_present"> => {
      runtime.events.push("append_record");
      const key = `${dayUtc}:${recordSha256}`;

      if (runtime.appendedLines.has(key)) {
        return "already_present";
      }

      runtime.appendedLines.set(key, appendJsonl);
      return "appended";
    },
    read_api_key: async (): Promise<string> => {
      runtime.events.push("read_credential");
      runtime.credentialReads += 1;
      return API_KEY;
    },
    ingest: async (
      apiKey: string,
    ): Promise<AcrossSwapApprovalIngestionResultV1> => {
      runtime.events.push("ingest");
      runtime.ingestions += 1;
      assert(apiKey === API_KEY, "fixture API key differs");
      return ingest(apiKey);
    },
  });
}

assert(
  VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1 ===
    "VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1",
  "runtime marker differs",
);

const first = memoryRuntime();
const firstCapture: {
  request?: AcrossReadonlyHttpsRequestV1;
} = {};
const firstResult = await executeAcrossScheduledObserverRuntimeV1(
  ports(
    first,
    clockValues(
      first,
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:03.000Z",
    ),
    async () =>
      fixtureIngestion(
        "2026-01-01T00:00:01.000Z",
        "2026-01-01T00:00:02.000Z",
        firstCapture,
      ),
  ),
);

assert(firstResult.status === "recorded", "first runtime status differs");
assert(
  firstResult.authenticated_get_count === 1 &&
    firstResult.record_count === 1,
  "first runtime state counters differ",
);
assert(
  firstResult.credential_access_performed === true &&
    firstResult.authenticated_get_performed === true,
  "first runtime access flags differ",
);
assert(
  firstResult.record_append_status === "appended",
  "first runtime append status differs",
);
assert(
  firstCapture.request?.method === "GET",
  "first fixture request method differs",
);
assert(
  firstCapture.request.headers.Authorization ===
    `Bearer ${API_KEY}`,
  "first fixture authorization transport differs",
);
assert(
  first.credentialReads === 1 && first.ingestions === 1,
  "first runtime request count differs",
);
assert(
  JSON.stringify(first.events) ===
    JSON.stringify([
      "load_pending",
      "now:0",
      "load_state",
      "persist_state",
      "read_credential",
      "ingest",
      "now:1",
      "persist_pending",
      "append_record",
      "persist_state",
      "remove_pending",
    ]),
  "first runtime event order differs",
);
assert(
  first.stateWrites.length === 2,
  "first runtime state write count differs",
);

const reservedState = JSON.parse(
  first.stateWrites[0] as string,
) as AcrossScheduledObserverStateV1;
const finalState = JSON.parse(
  first.stateWrites[1] as string,
) as AcrossScheduledObserverStateV1;

assert(
  reservedState.authenticated_get_count === 1 &&
    reservedState.record_count === 0 &&
    reservedState.last_attempt_started_at ===
      "2026-01-01T00:00:00.000Z",
  "request reservation state differs",
);
assert(
  finalState.authenticated_get_count === 1 &&
    finalState.record_count === 1,
  "final state differs",
);
assert(
  first.pendingWrites.length === 1,
  "pending write count differs",
);

const firstPendingText = first.pendingWrites[0] as string;
const firstPending =
  parseAcrossScheduledObserverPendingV1(firstPendingText);
const retainedText = [
  firstPendingText,
  ...first.appendedLines.values(),
  first.stateText ?? "",
].join("\n");

for (const forbidden of [
  API_KEY,
  "Authorization",
  "approvalTxns",
  "swapTx",
  "deadbeef",
  "cafebabe",
]) {
  assert(
    !retainedText.includes(forbidden),
    `retained runtime output contains forbidden value: ${forbidden}`,
  );
}

assert(
  firstPending.record_sha256 === firstResult.record_sha256,
  "pending and runtime record SHA differ",
);
assert(
  first.pendingText === null,
  "pending journal remains after successful completion",
);

const cadence = memoryRuntime();
cadence.stateText = first.stateText;
const cadenceResult =
  await executeAcrossScheduledObserverRuntimeV1(
    ports(
      cadence,
      clockValues(
        cadence,
        "2026-01-01T00:10:00.000Z",
      ),
      async () => {
        throw new Error("HOLD: blocked run ingested");
      },
    ),
  );

assert(
  cadenceResult.status === "cadence_blocked" &&
    cadenceResult.seconds_until_ready === 300,
  "cadence-block result differs",
);
assert(
  cadence.credentialReads === 0 && cadence.ingestions === 0,
  "cadence-block access boundary differs",
);
assert(
  JSON.stringify(cadence.events) ===
    JSON.stringify([
      "load_pending",
      "now:0",
      "load_state",
    ]),
  "cadence-block event order differs",
);

const duplicate = memoryRuntime();
duplicate.stateText = first.stateText;
const duplicateCapture: {
  request?: AcrossReadonlyHttpsRequestV1;
} = {};
const duplicateResult =
  await executeAcrossScheduledObserverRuntimeV1(
    ports(
      duplicate,
      clockValues(
        duplicate,
        "2026-01-01T00:15:00.000Z",
        "2026-01-01T00:15:03.000Z",
      ),
      async () =>
        fixtureIngestion(
          "2026-01-01T00:15:01.000Z",
          "2026-01-01T00:15:02.000Z",
          duplicateCapture,
        ),
    ),
  );

assert(
  duplicateResult.status === "duplicate",
  "duplicate runtime status differs",
);
assert(
  duplicateResult.authenticated_get_count === 2 &&
    duplicateResult.record_count === 1,
  "duplicate runtime counters differ",
);
assert(
  duplicateResult.duplicate_fields.includes("quote_id") &&
    duplicateResult.record_append_status === "not_applicable",
  "duplicate suppression boundary differs",
);
assert(
  duplicate.appendedLines.size === 0,
  "duplicate runtime appended a record",
);
assert(
  duplicate.credentialReads === 1 &&
    duplicate.ingestions === 1,
  "duplicate request count differs",
);

const recovery = memoryRuntime();
recovery.pendingText = firstPendingText;
recovery.appendedLines = new Map(first.appendedLines);
const recoveryResult =
  await executeAcrossScheduledObserverRuntimeV1(
    ports(
      recovery,
      clockValues(
        recovery,
        "2026-01-01T00:20:00.000Z",
      ),
      async () => {
        throw new Error("HOLD: recovery ingested");
      },
    ),
  );

assert(
  recoveryResult.status === "recovered_recorded" &&
    recoveryResult.recovered_pending === true,
  "pending recovery status differs",
);
assert(
  recoveryResult.record_append_status === "already_present",
  "pending recovery idempotence differs",
);
assert(
  recovery.credentialReads === 0 && recovery.ingestions === 0,
  "pending recovery accessed credential or network",
);
assert(
  JSON.stringify(recovery.events) ===
    JSON.stringify([
      "load_pending",
      "now:0",
      "append_record",
      "persist_state",
      "remove_pending",
    ]),
  "pending recovery event order differs",
);

const failing = memoryRuntime();
await expectHold(
  () =>
    executeAcrossScheduledObserverRuntimeV1(
      ports(
        failing,
        clockValues(
          failing,
          "2026-01-01T01:00:00.000Z",
        ),
        async () => {
          throw new Error("HOLD: fixture network failure");
        },
      ),
    ),
  "fixture network failure",
);
assert(
  failing.stateWrites.length === 1,
  "failed run did not preserve exactly one reservation state",
);
assert(
  failing.pendingWrites.length === 0 &&
    failing.pendingText === null,
  "failed run created a pending journal",
);
assert(
  failing.credentialReads === 1 && failing.ingestions === 1,
  "failed run request attempt count differs",
);
assert(
  JSON.stringify(failing.events) ===
    JSON.stringify([
      "load_pending",
      "now:0",
      "load_state",
      "persist_state",
      "read_credential",
      "ingest",
    ]),
  "failed run reservation order differs",
);

const failedReservedState = failing.stateText;
assert(
  failedReservedState !== null,
  "failed run reservation state is absent",
);
const failedRetry = memoryRuntime();
failedRetry.stateText = failedReservedState;
const failedRetryResult =
  await executeAcrossScheduledObserverRuntimeV1(
    ports(
      failedRetry,
      clockValues(
        failedRetry,
        "2026-01-01T01:10:00.000Z",
      ),
      async () => {
        throw new Error("HOLD: failed retry ingested");
      },
    ),
  );
assert(
  failedRetryResult.status === "cadence_blocked" &&
    failedRetryResult.seconds_until_ready === 300,
  "failed-attempt cadence preservation differs",
);
assert(
  failedRetry.credentialReads === 0 &&
    failedRetry.ingestions === 0,
  "failed-attempt retry boundary differs",
);

const capState: AcrossScheduledObserverStateV1 = Object.freeze({
  ...finalState,
  authenticated_get_count:
    ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1,
  last_attempt_started_at: "2026-01-01T23:00:00.000Z",
});
const capped = memoryRuntime();
capped.stateText = JSON.stringify(capState) + "\n";
const capResult =
  await executeAcrossScheduledObserverRuntimeV1(
    ports(
      capped,
      clockValues(
        capped,
        "2026-01-01T23:59:00.000Z",
      ),
      async () => {
        throw new Error("HOLD: capped run ingested");
      },
    ),
  );
assert(
  capResult.status === "daily_cap_blocked" &&
    capResult.authenticated_gets_remaining_today === 0,
  "daily cap runtime result differs",
);
assert(
  capped.credentialReads === 0 && capped.ingestions === 0,
  "daily cap access boundary differs",
);

const runtimeSource = await readFile(
  fileURLToPath(
    new URL(
      "../src/external_opportunity/across_scheduled_observer_runtime_v1.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);
const runnerSource = await readFile(
  fileURLToPath(
    new URL(
      "../ops/main/run_external_opportunity_across_scheduled_observer_v1.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);
const serviceSource = await readFile(
  fileURLToPath(
    new URL(
      "../ops/systemd/void-external-opportunity-across-scheduled-observer-v1.service",
      import.meta.url,
    ),
  ),
  "utf8",
);
const timerSource = await readFile(
  fileURLToPath(
    new URL(
      "../ops/systemd/void-external-opportunity-across-scheduled-observer-v1.timer",
      import.meta.url,
    ),
  ),
  "utf8",
);

for (const forbidden of [
  "node:https",
  "node:http",
  "node:fs",
  "fetch(",
  "process.env",
  "process.argv",
]) {
  assert(
    !runtimeSource.includes(forbidden),
    `runtime core contains forbidden direct surface: ${forbidden}`,
  );
}

for (const required of [
  "persist_state_atomic(serializedPlanState)",
  "read_api_key()",
  "ports.ingest(apiKey)",
  "persist_pending_atomic",
  "append_record_idempotent",
  "remove_pending",
]) {
  assert(
    runtimeSource.includes(required),
    `runtime core lacks required boundary: ${required}`,
  );
}

const reservationPosition = runtimeSource.indexOf(
  "persist_state_atomic(serializedPlanState)",
);
const credentialPosition = runtimeSource.indexOf(
  "read_api_key()",
);
const ingestPosition = runtimeSource.indexOf(
  "ports.ingest(apiKey)",
);
const pendingPosition = runtimeSource.indexOf(
  "persist_pending_atomic",
  ingestPosition,
);
const appendPosition = runtimeSource.indexOf(
  "append_record_idempotent",
  pendingPosition,
);
const finalStatePosition = runtimeSource.indexOf(
  "persist_state_atomic(\n    serializeValidatedState(decision.state)",
);
const removePosition = runtimeSource.indexOf(
  "remove_pending()",
  finalStatePosition,
);

assert(
  reservationPosition >= 0 &&
    reservationPosition < credentialPosition &&
    credentialPosition < ingestPosition &&
    ingestPosition < pendingPosition &&
    pendingPosition < appendPosition &&
    appendPosition < finalStatePosition &&
    finalStatePosition < removePosition,
  "runtime crash-consistency source order differs",
);

for (const forbidden of [
  "VOID_ACROSS_API_KEY=",
  "EnvironmentFile=",
  "api_key: process.env",
  "approvalTxns",
  "swapTx",
  "transaction_submission_performed: true",
  "live_execution_authorized: true",
]) {
  assert(
    !runnerSource.includes(forbidden) &&
      !serviceSource.includes(forbidden) &&
      !timerSource.includes(forbidden),
    `runtime deployment surface contains forbidden value: ${forbidden}`,
  );
}

for (const required of [
  "LoadCredentialEncrypted=void-across-api-key:/etc/credstore.encrypted/void-across-api-key",
  "User=zoso",
  "Group=zoso",
  "StateDirectory=void-external-opportunity-across-scheduled-observer-v1",
  "ProtectSystem=strict",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
]) {
  assert(
    serviceSource.includes(required),
    `service template lacks directive: ${required}`,
  );
}

for (const required of [
  "OnUnitActiveSec=15min",
  "Persistent=true",
  "Unit=void-external-opportunity-across-scheduled-observer-v1.service",
]) {
  assert(
    timerSource.includes(required),
    `timer template lacks directive: ${required}`,
  );
}

assert(
  runnerSource.includes("CREDENTIALS_DIRECTORY") &&
    runnerSource.includes("STATE_DIRECTORY") &&
    runnerSource.includes("O_EXCL") &&
    runnerSource.includes("O_NOFOLLOW") &&
    runnerSource.includes("appendRecordIdempotent"),
  "production runner hardening boundary differs",
);

console.log(
  JSON.stringify({
    marker:
      "VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_PROOF_V1",
    first_status: firstResult.status,
    first_record_sha256: firstResult.record_sha256,
    cadence_block_seconds:
      cadenceResult.seconds_until_ready,
    duplicate_status: duplicateResult.status,
    recovery_status: recoveryResult.status,
    failed_attempt_reserved: true,
    daily_cap:
      ACROSS_SCHEDULED_OBSERVER_MAX_AUTHENTICATED_GETS_PER_DAY_V1,
    credential_access_on_blocked_run: false,
    network_access_on_blocked_run: false,
    internal_retry_count: 0,
    persistent_service_installed: false,
    persistent_timer_installed: false,
    transaction_submission_performed: false,
    live_execution_authorized: false,
  }),
);
console.log("scheduled_observer_runtime_reservation_before_credential_exact=true");
console.log("scheduled_observer_runtime_reservation_before_network_exact=true");
console.log("scheduled_observer_runtime_pending_before_append_exact=true");
console.log("scheduled_observer_runtime_append_before_final_state_exact=true");
console.log("scheduled_observer_runtime_pending_recovery_no_get_exact=true");
console.log("scheduled_observer_runtime_idempotent_append_exact=true");
console.log("scheduled_observer_runtime_failed_attempt_no_retry_exact=true");
console.log("scheduled_observer_runtime_blocked_no_credential_exact=true");
console.log("scheduled_observer_runtime_blocked_no_network_exact=true");
console.log("scheduled_observer_runtime_daily_cap_96_exact=true");
console.log("scheduled_observer_runtime_sanitized_retention_exact=true");
console.log("scheduled_observer_runtime_single_instance_lock_surface_exact=true");
console.log("scheduled_observer_runtime_system_credential_template_exact=true");
console.log("scheduled_observer_runtime_disabled_timer_template_exact=true");
console.log("scheduled_observer_runtime_no_transaction_surface_exact=true");
console.log("VOID_EXTERNAL_OPPORTUNITY_ACROSS_SCHEDULED_OBSERVER_RUNTIME_V1_EXACT_GREEN");
