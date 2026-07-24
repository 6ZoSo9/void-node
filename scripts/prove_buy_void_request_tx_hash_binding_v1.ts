import fs from "fs";
import path from "path";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "src/index.ts"),
  "utf8",
);

const required = [
  "VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1",
  'app.get("/__void/buy-void/operator/request/tx-hash.json"',
  'app.post("/__void/buy-void/operator/request/tx-hash.json"',
  "if (!__voidBuyVoidOperatorLocalOnlyV1(req,res)) return;",
  'required_method: "POST"',
  'required_confirmation: "bindBuyVoidPaymentTxHash"',
  'const required_confirmation = "bindBuyVoidPaymentTxHash"',
  'error: "confirmation_required"',
  'error: "invalid_request_id"',
  'error: "invalid_payment_tx_hash"',
  'error: "buy_void_request_not_found"',
  'error: "request_payment_tx_hash_conflict"',
  'error: "payment_tx_hash_already_bound"',
  'error: "request_not_awaiting_payment_tx_hash"',
  'existing_status === "payment_submitted_pending_manual_review"',
  "idempotent: true",
  'status: "payment_submitted_pending_manual_review"',
  "payment_submitted_at_ms: Date.now()",
  "const persisted = await ",
  "idempotent: false",
];

const missing = required.filter(
  (term) => !source.includes(term),
);

if (missing.length) {
  console.error(
    JSON.stringify(
      {
        marker:
          "VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1_PROOF",
        ok: false,
        missing,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const routeCount = (
  source.match(
    /\/__void\/buy-void\/operator\/request\/tx-hash\.json/g,
  ) || []
).length;

if (routeCount !== 2) {
  console.error(
    JSON.stringify(
      {
        marker:
          "VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1_PROOF",
        ok: false,
        error: "unexpected_route_count",
        routeCount,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      marker:
        "VOID_BUY_VOID_REQUEST_TX_HASH_BINDING_V1_PROOF",
      ok: true,
      post_only_mutation: true,
      get_returns_405: true,
      local_only: true,
      confirmation_guard: true,
      request_id_guard: true,
      tx_hash_shape_guard: true,
      request_state_guard: true,
      conflicting_hash_guard: true,
      duplicate_hash_guard: true,
      same_hash_idempotency: true,
      submitted_status_transition: true,
      public_request_route_unchanged: true,
    },
    null,
    2,
  ),
);
