import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1,
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
  buyVoidProductionCanaryCandidateCommandEndpointV1,
  buyVoidProductionCanaryCandidateStatusEndpointV1,
  defaultBuyVoidProductionCanaryCandidateHttpGetV1,
  defaultBuyVoidProductionCanaryCandidateHttpPostV1,
  parseBuyVoidProductionCanaryCandidateArgsV1,
  planBuyVoidProductionCanaryCandidateReservationV1,
  runBuyVoidProductionCanaryCandidateReservationV1,
} from "./buy_void_production_canary_candidate_reservation_v1.js";

const requestId = "buyvoid_candidate_retired_1270_v1";

assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1.retired,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
    .retired_for_canonical_erc20_transition,
  true,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
    .canonical_delivery_asset,
  "void_token_erc20",
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
    .legacy_parent_runtime_action_reachable,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
    .runtime_http_get,
  false,
);
assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
    .runtime_http_post,
  false,
);
assert.deepEqual(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1
    .allowed_apply_stages,
  [],
);
for (const key of [
  "transaction_preparation",
  "rpc_call",
  "credential_access",
  "wallet_access",
  "signing",
  "transaction_broadcast",
  "inventory_reservation",
  "execution_attempt_reservation",
  "inventory_decrement",
  "public_fulfilled_closeout",
  "service_start",
  "service_restart",
  "money_movement",
] as const) {
  assert.equal(
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_AUTHORITY_V1[key],
    false,
    key,
  );
}

assert.equal(
  VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1,
  "run_crash_consistent_saga_stage",
);

const parsedDry = parseBuyVoidProductionCanaryCandidateArgsV1([
  "--request-id",
  requestId,
]);
assert.deepEqual(parsedDry, { request_id: requestId, apply: false });

const parsedApply = parseBuyVoidProductionCanaryCandidateArgsV1([
  "--request-id",
  requestId,
  "--apply",
  "--confirm",
  "legacy-confirmation",
]);
assert.equal(parsedApply.apply, true);

assert.throws(
  () => parseBuyVoidProductionCanaryCandidateArgsV1([]),
  /invalid_request_id/,
);
assert.throws(
  () =>
    parseBuyVoidProductionCanaryCandidateArgsV1([
      "--request-id",
      requestId,
      "--rpc-url",
      "http://127.0.0.1:8545",
    ]),
  /unexpected_option:--rpc-url/,
);

assert.equal(
  buyVoidProductionCanaryCandidateCommandEndpointV1({}),
  "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
);
assert.equal(
  buyVoidProductionCanaryCandidateStatusEndpointV1({}),
  "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/status",
);

const retiredGet = await defaultBuyVoidProductionCanaryCandidateHttpGetV1({
  url: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/status",
});
assert.equal(retiredGet.status, 410);
assert.deepEqual(retiredGet.json, {
  marker: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1,
  ok: false,
  error: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1,
});

const retiredPost = await defaultBuyVoidProductionCanaryCandidateHttpPostV1({
  url: "http://127.0.0.1:4100/__void/operator/buy-void-runtime-v1/command",
  body: { action: VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RUNTIME_ACTION_V1 },
});
assert.equal(retiredPost.status, 410);

let getCalls = 0;
let postCalls = 0;
const httpGet = async () => {
  getCalls += 1;
  throw new Error("retired reservation must not perform GET");
};
const httpPost = async () => {
  postCalls += 1;
  throw new Error("retired reservation must not perform POST");
};

const plan = await planBuyVoidProductionCanaryCandidateReservationV1({
  request_id: requestId,
  http_get: httpGet,
  http_post: httpPost,
});
const dry = await runBuyVoidProductionCanaryCandidateReservationV1({
  args: parsedDry,
  http_get: httpGet,
  http_post: httpPost,
});
const apply = await runBuyVoidProductionCanaryCandidateReservationV1({
  args: parsedApply,
  http_get: httpGet,
  http_post: httpPost,
});

for (const decision of [plan, dry, apply]) {
  assert.equal(decision.ok, false);
  assert.equal(decision.status, "held");
  assert.equal(
    decision.reason,
    VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RETIREMENT_REASON_V1,
  );
  assert.equal(decision.retired, true);
  assert.equal(decision.legacy_parent_runtime_action_reachable, false);
  assert.equal(decision.runtime_http_get_performed, false);
  assert.equal(decision.runtime_http_post_performed, false);
  assert.equal(decision.stage_transition_count, 0);
  assert.equal(decision.transaction_preparation_performed, false);
  assert.equal(decision.rpc_call_performed, false);
  assert.equal(decision.credential_access_performed, false);
  assert.equal(decision.wallet_access_performed, false);
  assert.equal(decision.signing_performed, false);
  assert.equal(decision.transaction_broadcast_performed, false);
  assert.equal(decision.inventory_reservation_performed, false);
  assert.equal(decision.execution_attempt_reservation_performed, false);
  assert.equal(decision.inventory_decrement_performed, false);
  assert.equal(decision.public_fulfilled_closeout_performed, false);
  assert.equal(decision.money_movement_performed, false);
}

assert.equal(getCalls, 0);
assert.equal(postCalls, 0);

const source = fs.readFileSync(
  new URL("./buy_void_production_canary_candidate_reservation_v1.ts", import.meta.url),
  "utf8",
);
assert.equal(source.includes("fetch("), false);
assert.equal(source.includes("reserveBuyVoidInventoryV1"), false);
assert.equal(source.includes("reserveBuyVoidExecutionAttemptV1"), false);
assert.equal(source.includes("runBuyVoidCrashConsistentSaga"), false);
assert.equal(source.includes("eth_sendRawTransaction"), false);

console.log(
  "VOID_BUY_VOID_PRODUCTION_CANARY_CANDIDATE_RESERVATION_V1_PROOF_GREEN",
);
console.log("legacy_candidate_reservation_retired=1");
console.log("canonical_delivery_asset=void_token_erc20");
console.log("legacy_parent_runtime_action_reachable=0");
console.log("runtime_http_get_calls=0");
console.log("runtime_http_post_calls=0");
console.log("inventory_reservation=0");
console.log("execution_attempt_reservation=0");
console.log("transaction_preparation=0");
console.log("rpc_call=0");
console.log("credential_access=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
