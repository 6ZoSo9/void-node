import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import * as ts from "typescript";

async function main(): Promise<void> {
  const root = process.cwd();
  const indexFile = path.join(root, "src", "index.ts");
  const source = fs.readFileSync(indexFile, "utf8");
  const routePath = "/__void/buy-void/operator/mark.json";
  const gateMarker =
    "VOID_BUY_VOID_MANUAL_FULFILLED_CONFIRMED_STATE_GATE_V1";

  assert.ok(
    source.includes(
      'import {\n  buyVoidConfirmedCloseoutRuntimeRootDirV1,\n} from "./economic/buy_void_confirmed_closeout_runtime_v1.js";',
    ),
    "missing canonical confirmed-closeout runtime-root import",
  );
  assert.ok(
    source.includes(
      'import {\n  listBuyVoidConfirmedStatesV1,\n} from "./economic/buy_void_confirmed_state_journal_v1.js";',
    ),
    "missing canonical confirmed-state journal reader import",
  );

  const sf = ts.createSourceFile(
    indexFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  assert.equal(sf.parseDiagnostics.length, 0, "src/index.ts parse diagnostics");

  const candidates: ts.CallExpression[] = [];
  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(sf) === "app" &&
      node.expression.name.text === "get" &&
      node.arguments.length >= 2 &&
      (ts.isStringLiteral(node.arguments[0]) ||
        ts.isNoSubstitutionTemplateLiteral(node.arguments[0])) &&
      node.arguments[0].text === routePath
    ) {
      candidates.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.equal(candidates.length, 1, "expected one exact manual mark GET route");

  const routeCall = candidates[0];
  const callback = routeCall.arguments.find(
    (value) => ts.isArrowFunction(value) || ts.isFunctionExpression(value),
  );
  assert.ok(callback, "manual mark route callback missing");
  const routeText = routeCall.getText(sf);

  for (const token of [
    gateMarker,
    "await __voidReadBuyVoidOperatorEventsV1()",
    "__voidApplyBuyVoidOperatorEventsV1(",
    'error: "operator_event_projection_read_failed"',
    'error: "manual_fulfilled_already_recorded"',
    'error: "manual_fulfilled_requires_verified_public_status"',
    '!["payment_verified", "reviewed"].includes(',
    "buyVoidConfirmedCloseoutRuntimeRootDirV1()",
    "listBuyVoidConfirmedStatesV1(",
    'state?.schema === "void_buy_void_confirmed_state_v1"',
    'state?.marker ===\n                "VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1"',
    'state?.confirmation?.schema ===\n                "void_buy_void_confirmed_fulfillment_record_v1"',
    'state?.confirmation?.marker ===\n                "VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1"',
    'state?.buyer_status?.schema ===\n                "void_buy_void_buyer_fulfilled_status_v1"',
    'state?.allocation_status?.schema ===\n                "void_buy_void_allocation_fulfilled_status_v1"',
    'state?.fulfillment_receipt?.schema ===\n                "void_buy_void_fulfillment_receipt_v1"',
    'state?.confirmation?.status === "fulfilled_confirmed"',
    'state?.fulfillment_receipt?.status === "confirmed"',
    "state_request_id === id",
    "confirmation_request_id === id",
    "receipt_tx === normalized_delivery_tx_hash",
    "confirmation_tx === normalized_delivery_tx_hash",
    "buyer_tx === normalized_delivery_tx_hash",
    "confirmation_delivery_address === expected_delivery_address",
    "receipt_delivery_address === expected_delivery_address",
    "buyer_delivery_address === expected_delivery_address",
    "allocation_payment_identity === state_payment_identity",
    'error: "canonical_confirmed_state_read_failed"',
    '"manual_fulfilled_confirmed_state_ambiguous"',
    '"manual_fulfilled_requires_canonical_confirmed_state"',
    "prior_status: effective_prior_status",
    "canonical_confirmed_state_id:",
    "canonical_confirmed_state_fingerprint:",
    "await __voidWriteBuyVoidOperatorEventV1(event);",
  ]) {
    assert.ok(routeText.includes(token), `missing route gate token: ${token}`);
  }

  const markerIndex = routeText.indexOf(gateMarker);
  const eventIndex = routeText.indexOf("const event = {");
  const writerIndex = routeText.indexOf(
    "await __voidWriteBuyVoidOperatorEventV1(event);",
  );
  assert.ok(markerIndex >= 0, "gate marker absent");
  assert.ok(
    markerIndex < eventIndex && eventIndex < writerIndex,
    "confirmed-state gate must execute before event construction and write",
  );

  const synthetic = `
const __routes = new Map();
const app = {
  get(route, ...handlers) {
    __routes.set(route, handlers[handlers.length - 1]);
  },
};
let __requests = [];
let __operatorEvents = [];
let __operatorEventError = "";
let __confirmedStates = [];
let __confirmedError = "";
let __writes = [];
let __rootCalls = 0;
let __listCalls = 0;
let __operatorEventReadCalls = 0;
let __operatorEventApplyCalls = 0;
let __localGateCalls = 0;

function __voidBuyVoidOperatorLocalOnlyV1(_req, _res) {
  __localGateCalls += 1;
  return true;
}
async function __voidReadBuyVoidRequestsV1() {
  return __requests;
}
async function __voidReadBuyVoidOperatorEventsV1() {
  __operatorEventReadCalls += 1;
  if (__operatorEventError) throw new Error(__operatorEventError);
  return __operatorEvents;
}
function __voidApplyBuyVoidOperatorEventsV1(requests, events) {
  __operatorEventApplyCalls += 1;
  const latest = new Map();
  for (const event of events) {
    const requestId = String(event?.request_id || "");
    if (requestId && !latest.has(requestId)) latest.set(requestId, event);
  }
  return requests.map((request) => {
    const requestId = String(request?.request_id || "");
    const event = latest.get(requestId);
    const hasTx = /^0x[a-fA-F0-9]{64}$/.test(String(request?.tx_hash || ""));
    const baseStatus = hasTx
      ? "payment_submitted_pending_manual_review"
      : "awaiting_payment";
    return {
      ...request,
      effective_status: event
        ? String(event.operator_status || baseStatus)
        : baseStatus,
      operator_event: event || null,
    };
  });
}
async function __voidWriteBuyVoidOperatorEventV1(event) {
  __writes.push(event);
  return { ok: true };
}
function buyVoidConfirmedCloseoutRuntimeRootDirV1() {
  __rootCalls += 1;
  return "/server-controlled/buy-void-runtime-root";
}
function listBuyVoidConfirmedStatesV1(rootDir) {
  __listCalls += 1;
  if (rootDir !== "/server-controlled/buy-void-runtime-root") {
    throw new Error("wrong_server_controlled_root");
  }
  if (__confirmedError) throw new Error(__confirmedError);
  return __confirmedStates;
}

${routeText};

globalThis.__voidCallManualMark = async function(input) {
  __requests = [input.request];
  __operatorEvents = input.operator_events || [];
  __operatorEventError = input.operator_event_error || "";
  __confirmedStates = input.confirmed_states || [];
  __confirmedError = input.confirmed_error || "";
  __writes = [];
  __rootCalls = 0;
  __listCalls = 0;
  __operatorEventReadCalls = 0;
  __operatorEventApplyCalls = 0;
  __localGateCalls = 0;
  let sent = null;
  const req = {
    query: input.query,
    headers: { host: "127.0.0.1:4100" },
    socket: { remoteAddress: "127.0.0.1" },
  };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      sent = { status: this.statusCode, body };
      return this;
    },
  };
  const handler = __routes.get(${JSON.stringify(routePath)});
  if (!handler) throw new Error("manual_mark_handler_missing");
  await Promise.resolve(handler(req, res));
  if (!sent) throw new Error("manual_mark_handler_did_not_respond");
  return {
    sent,
    writes: __writes.map((value) => JSON.parse(JSON.stringify(value))),
    root_calls: __rootCalls,
    list_calls: __listCalls,
    operator_event_read_calls: __operatorEventReadCalls,
    operator_event_apply_calls: __operatorEventApplyCalls,
    local_gate_calls: __localGateCalls,
  };
};
`;

  const compiled = ts.transpileModule(synthetic, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
    reportDiagnostics: true,
  });
  const errors = (compiled.diagnostics || []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(
    errors.length,
    0,
    errors.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    ).join("\n"),
  );

  const context: any = {
    console,
    Date,
    Promise,
    String,
    Number,
    Boolean,
    RegExp,
    Array,
    Object,
    Set,
    Map,
    Error,
    JSON,
  };
  context.globalThis = context;
  vm.runInNewContext(compiled.outputText, context, {
    filename: "manual-fulfilled-confirmed-state-gate-v1.synthetic.cjs",
  });
  assert.equal(
    typeof context.__voidCallManualMark,
    "function",
    "synthetic route harness missing",
  );

  const requestId = "buyvoid_manual_confirmed_gate_v1";
  const deliveryTx = `0x${"a".repeat(64)}`;
  const otherTx = `0x${"b".repeat(64)}`;
  const paymentIdentity = `voidpay1:base:0x${"c".repeat(64)}:7`;
  const deliveryAddress = `0x${"e".repeat(40)}`;
  const request = {
    schema: "void_public_buy_void_request_v1",
    ok: true,
    request_id: requestId,
    status: "payment_submitted_pending_manual_review",
    tx_hash: `0x${"d".repeat(64)}`,
    usdc_amount: 7,
    quoted_void: 14,
    delivery_address: deliveryAddress,
  };
  const paymentVerifiedEvent = {
    schema: "void_buy_void_operator_mark_v1",
    ok: true,
    request_id: requestId,
    operator_status: "payment_verified",
    prior_status: "payment_submitted_pending_manual_review",
    marked_at_ms: 100,
  };
  const fulfilledEvent = {
    schema: "void_buy_void_operator_mark_v1",
    ok: true,
    request_id: requestId,
    operator_status: "fulfilled",
    prior_status: "payment_verified",
    marked_at_ms: 200,
    void_delivery_tx_hash: deliveryTx,
  };

  function confirmedState(
    overrides: Record<string, any> = {},
  ): Record<string, any> {
    const base: Record<string, any> = {
      schema: "void_buy_void_confirmed_state_v1",
      marker: "VOID_BUY_VOID_CONFIRMED_STATE_JOURNAL_V1",
      state_id: "1".repeat(64),
      projection_fingerprint: "2".repeat(64),
      canonical_payment_identity: paymentIdentity,
      request_id: requestId,
      confirmation: {
        schema: "void_buy_void_confirmed_fulfillment_record_v1",
        marker: "VOID_BUY_VOID_FULFILLMENT_CONFIRMATION_V1",
        status: "fulfilled_confirmed",
        request_id: requestId,
        canonical_payment_identity: paymentIdentity,
        void_delivery_tx_hash: deliveryTx,
        delivery_address: deliveryAddress,
        buyer_fulfilled: true,
        automatic_fulfillment_completed: true,
        payment_claim_persisted: true,
        delivery_confirmation_observed: true,
        signing_authorized_by_this_module: false,
        transaction_broadcast_authorized_by_this_module: false,
        money_movement_authorized_by_this_module: false,
      },
      buyer_status: {
        schema: "void_buy_void_buyer_fulfilled_status_v1",
        status: "fulfilled_confirmed",
        request_id: requestId,
        delivery_address: deliveryAddress,
        void_delivery_tx_hash: deliveryTx,
        buyer_fulfilled: true,
      },
      allocation_status: {
        schema: "void_buy_void_allocation_fulfilled_status_v1",
        status: "fulfilled_confirmed",
        canonical_payment_identity: paymentIdentity,
        request_id: requestId,
        allocation_fulfilled: true,
      },
      fulfillment_receipt: {
        schema: "void_buy_void_fulfillment_receipt_v1",
        status: "confirmed",
        delivery_address: deliveryAddress,
        void_delivery_tx_hash: deliveryTx,
      },
      signing_authorized_by_this_module: false,
      transaction_broadcast_authorized_by_this_module: false,
      money_movement_authorized_by_this_module: false,
    };
    return {
      ...base,
      ...overrides,
      confirmation: {
        ...base.confirmation,
        ...(overrides.confirmation || {}),
      },
      buyer_status: {
        ...base.buyer_status,
        ...(overrides.buyer_status || {}),
      },
      allocation_status: {
        ...base.allocation_status,
        ...(overrides.allocation_status || {}),
      },
      fulfillment_receipt: {
        ...base.fulfillment_receipt,
        ...(overrides.fulfillment_receipt || {}),
      },
    };
  }

  async function call(input: {
    status: string;
    tx?: string;
    states?: Record<string, any>[];
    error?: string;
    events?: Record<string, any>[];
    operatorError?: string;
  }): Promise<any> {
    const operatorEvents = input.events !== undefined
      ? input.events
      : input.status === "fulfilled"
        ? [paymentVerifiedEvent]
        : [];
    return context.__voidCallManualMark({
      request,
      query: {
        id: requestId,
        status: input.status,
        note: "focused-proof",
        void_tx_hash: input.tx || "",
      },
      operator_events: operatorEvents,
      operator_event_error: input.operatorError || "",
      confirmed_states: input.states || [],
      confirmed_error: input.error || "",
    });
  }

  const unverified = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [confirmedState()],
    events: [],
  });
  assert.equal(unverified.sent.status, 409);
  assert.equal(
    unverified.sent.body.error,
    "manual_fulfilled_requires_verified_public_status",
  );
  assert.equal(unverified.writes.length, 0);
  assert.equal(unverified.root_calls, 0);
  assert.equal(unverified.list_calls, 0);

  const duplicate = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [confirmedState()],
    events: [fulfilledEvent],
  });
  assert.equal(duplicate.sent.status, 409);
  assert.equal(duplicate.sent.body.error, "manual_fulfilled_already_recorded");
  assert.equal(duplicate.writes.length, 0);
  assert.equal(duplicate.root_calls, 0);
  assert.equal(duplicate.list_calls, 0);

  const projectionReadFailure = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [confirmedState()],
    operatorError: "synthetic_operator_event_read_failure",
  });
  assert.equal(projectionReadFailure.sent.status, 503);
  assert.equal(
    projectionReadFailure.sent.body.error,
    "operator_event_projection_read_failed",
  );
  assert.equal(projectionReadFailure.writes.length, 0);
  assert.equal(projectionReadFailure.root_calls, 0);
  assert.equal(projectionReadFailure.list_calls, 0);
  assert.equal(projectionReadFailure.operator_event_read_calls, 1);
  assert.equal(projectionReadFailure.operator_event_apply_calls, 0);

  const missing = await call({
    status: "fulfilled",
    tx: deliveryTx,
  });
  assert.equal(missing.sent.status, 409);
  assert.equal(
    missing.sent.body.error,
    "manual_fulfilled_requires_canonical_confirmed_state",
  );
  assert.equal(missing.sent.body.canonical_confirmed_state_match_count, 0);
  assert.equal(missing.writes.length, 0);
  assert.equal(missing.root_calls, 1);
  assert.equal(missing.list_calls, 1);

  const markerMismatch = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [confirmedState({ marker: "wrong-marker" })],
  });
  assert.equal(markerMismatch.sent.status, 409);
  assert.equal(markerMismatch.writes.length, 0);

  const requestMismatch = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [confirmedState({ request_id: "other-request" })],
  });
  assert.equal(requestMismatch.sent.status, 409);
  assert.equal(requestMismatch.writes.length, 0);

  const txMismatch = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [
      confirmedState({
        confirmation: { void_delivery_tx_hash: otherTx },
        buyer_status: { void_delivery_tx_hash: otherTx },
        fulfillment_receipt: { void_delivery_tx_hash: otherTx },
      }),
    ],
  });
  assert.equal(txMismatch.sent.status, 409);
  assert.equal(txMismatch.writes.length, 0);

  const addressMismatch = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [
      confirmedState({
        confirmation: { delivery_address: `0x${"f".repeat(40)}` },
      }),
    ],
  });
  assert.equal(addressMismatch.sent.status, 409);
  assert.equal(addressMismatch.writes.length, 0);

  const incomplete = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [
      confirmedState({
        confirmation: { delivery_confirmation_observed: false },
      }),
    ],
  });
  assert.equal(incomplete.sent.status, 409);
  assert.equal(incomplete.writes.length, 0);

  const ambiguous = await call({
    status: "fulfilled",
    tx: deliveryTx,
    states: [
      confirmedState(),
      confirmedState({
        state_id: "3".repeat(64),
        projection_fingerprint: "4".repeat(64),
      }),
    ],
  });
  assert.equal(ambiguous.sent.status, 409);
  assert.equal(
    ambiguous.sent.body.error,
    "manual_fulfilled_confirmed_state_ambiguous",
  );
  assert.equal(ambiguous.sent.body.canonical_confirmed_state_match_count, 2);
  assert.equal(ambiguous.writes.length, 0);

  const readFailure = await call({
    status: "fulfilled",
    tx: deliveryTx,
    error: "synthetic_confirmed_state_read_failure",
  });
  assert.equal(readFailure.sent.status, 503);
  assert.equal(
    readFailure.sent.body.error,
    "canonical_confirmed_state_read_failed",
  );
  assert.equal(readFailure.writes.length, 0);

  const exact = await call({
    status: "fulfilled",
    tx: deliveryTx.toUpperCase().replace(/^0X/, "0x"),
    states: [confirmedState()],
  });
  assert.equal(exact.sent.status, 200);
  assert.equal(exact.sent.body.ok, true);
  assert.equal(exact.writes.length, 1);
  assert.equal(exact.writes[0].operator_status, "fulfilled");
  assert.equal(exact.writes[0].prior_status, "payment_verified");
  assert.equal(exact.writes[0].void_delivery_tx_hash, deliveryTx);
  assert.equal(exact.writes[0].canonical_confirmed_state_id, "1".repeat(64));
  assert.equal(
    exact.writes[0].canonical_confirmed_state_fingerprint,
    "2".repeat(64),
  );
  assert.equal(exact.root_calls, 1);
  assert.equal(exact.list_calls, 1);
  assert.equal(exact.operator_event_read_calls, 1);
  assert.equal(exact.operator_event_apply_calls, 1);

  const reviewed = await call({ status: "reviewed" });
  assert.equal(reviewed.sent.status, 200);
  assert.equal(reviewed.writes.length, 1);
  assert.equal(reviewed.writes[0].operator_status, "reviewed");
  assert.equal(
    reviewed.writes[0].prior_status,
    "payment_submitted_pending_manual_review",
  );
  assert.equal(reviewed.root_calls, 0);
  assert.equal(reviewed.list_calls, 0);
  assert.equal(reviewed.operator_event_read_calls, 1);
  assert.equal(reviewed.operator_event_apply_calls, 1);

  const rejected = await call({ status: "rejected" });
  assert.equal(rejected.sent.status, 200);
  assert.equal(rejected.writes.length, 1);
  assert.equal(rejected.writes[0].operator_status, "rejected");
  assert.equal(
    rejected.writes[0].prior_status,
    "payment_submitted_pending_manual_review",
  );
  assert.equal(rejected.root_calls, 0);
  assert.equal(rejected.list_calls, 0);
  assert.equal(rejected.operator_event_read_calls, 1);
  assert.equal(rejected.operator_event_apply_calls, 1);

  const invalidHash = await call({
    status: "fulfilled",
    tx: "0x1234",
    states: [confirmedState()],
  });
  assert.equal(invalidHash.sent.status, 400);
  assert.equal(invalidHash.writes.length, 0);
  assert.equal(invalidHash.root_calls, 0);
  assert.equal(invalidHash.list_calls, 0);
  assert.equal(invalidHash.operator_event_read_calls, 0);
  assert.equal(invalidHash.operator_event_apply_calls, 0);

  for (const result of [
    unverified,
    duplicate,
    projectionReadFailure,
    missing,
    markerMismatch,
    requestMismatch,
    txMismatch,
    addressMismatch,
    incomplete,
    ambiguous,
    readFailure,
    exact,
    reviewed,
    rejected,
    invalidHash,
  ]) {
    assert.equal(result.local_gate_calls, 1);
  }

  console.log(
    "VOID_BUY_VOID_MANUAL_FULFILLED_CONFIRMED_STATE_GATE_V1_GREEN",
  );
  console.log("manual_fulfilled_unverified_public_status_write=0");
  console.log("manual_fulfilled_duplicate_event_write=0");
  console.log("manual_fulfilled_operator_projection_failure_write=0");
  console.log("manual_fulfilled_without_confirmed_state_write=0");
  console.log("manual_fulfilled_state_marker_mismatch_write=0");
  console.log("manual_fulfilled_request_mismatch_write=0");
  console.log("manual_fulfilled_delivery_tx_mismatch_write=0");
  console.log("manual_fulfilled_delivery_address_mismatch_write=0");
  console.log("manual_fulfilled_incomplete_confirmation_write=0");
  console.log("manual_fulfilled_ambiguous_confirmed_state_write=0");
  console.log("manual_fulfilled_confirmed_state_read_failure_write=0");
  console.log("manual_fulfilled_exact_confirmed_state_write=1");
  console.log("operator_event_chain_prior_status_bound=1");
  console.log("manual_reviewed_transition_preserved=1");
  console.log("manual_rejected_transition_preserved=1");
  console.log("server_controlled_confirmed_state_root=1");
  console.log("live_runtime_or_request_state_read=0");
  console.log("wallet_access=0");
  console.log("credential_access=0");
  console.log("signing=0");
  console.log("transaction_broadcast=0");
  console.log("money_movement=0");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
