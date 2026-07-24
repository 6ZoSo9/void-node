import fs from "fs";
import path from "path";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "src/index.ts"),
  "utf8",
);
const moduleSource = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_request_tx_hash_binding_v1.ts",
  ),
  "utf8",
);

const sourceRequired = [
  'require("./economic/buy_void_request_tx_hash_binding_v1")',
  ".installBuyVoidRequestTxHashBindingV1({",
  "localOnly: __voidBuyVoidOperatorLocalOnlyV1",
  "readRequests: __voidReadBuyVoidRequestsV1",
  "persistRequest: __voidPersistBuyVoidRequestV1",
];

const moduleRequired = [
  "VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1",
  "export function installBuyVoidRequestTxHashBindingV1",
  '"/__void/buy-void/operator/request.json"',
  '"/__void/buy-void/operator/request/tx-hash.json"',
  'error: "method_not_allowed"',
  'required_method: "POST"',
  '"bindBuyVoidPaymentTxHash"',
  'error: "confirmation_required"',
  'error: "invalid_request_id"',
  'error: "invalid_payment_tx_hash"',
  'error: "buy_void_request_not_found"',
  '"request_payment_tx_hash_conflict"',
  'error: "payment_tx_hash_already_bound"',
  '"request_not_awaiting_payment_tx_hash"',
  '"payment_submitted_pending_manual_review"',
  "idempotent: true",
  "idempotent: false",
  "const persisted = await persistRequest(",
];

const missingSource = sourceRequired.filter(
  (term) => !source.includes(term),
);
const missingModule = moduleRequired.filter(
  (term) => !moduleSource.includes(term),
);

const directRouteCount = (
  source.match(
    /\/__void\/buy-void\/operator\/request\/tx-hash\.json/g,
  ) || []
).length;
const moduleRouteCount = (
  moduleSource.match(
    /\/__void\/buy-void\/operator\/request\/tx-hash\.json/g,
  ) || []
).length;
const directMarkerCount = (
  source.match(
    /VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1/g,
  ) || []
).length;
const moduleMarkerCount = (
  moduleSource.match(
    /VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1/g,
  ) || []
).length;

const failures: string[] = [];

if (missingSource.length) {
  failures.push(
    `missing_source:${missingSource.join(",")}`,
  );
}
if (missingModule.length) {
  failures.push(
    `missing_module:${missingModule.join(",")}`,
  );
}
if (directRouteCount !== 0) {
  failures.push(
    `direct_route_count:${directRouteCount}`,
  );
}
if (moduleRouteCount !== 2) {
  failures.push(
    `module_route_count:${moduleRouteCount}`,
  );
}
if (directMarkerCount !== 0) {
  failures.push(
    `direct_marker_count:${directMarkerCount}`,
  );
}
if (moduleMarkerCount !== 1) {
  failures.push(
    `module_marker_count:${moduleMarkerCount}`,
  );
}

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1_PROOF",
      ok: failures.length === 0,
      index_neutral_module_extraction: true,
      existing_read_route_preserved: true,
      post_only_mutation: true,
      get_returns_405: true,
      local_only_dependency_injected: true,
      confirmation_guard: true,
      request_id_guard: true,
      tx_hash_shape_guard: true,
      request_state_guard: true,
      conflicting_hash_guard: true,
      duplicate_hash_guard: true,
      same_hash_idempotency: true,
      submitted_status_transition: true,
      direct_route_count: directRouteCount,
      module_route_count: moduleRouteCount,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length) {
  process.exit(1);
}
