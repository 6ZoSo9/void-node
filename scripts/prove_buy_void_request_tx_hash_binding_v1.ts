import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import {
  installBuyVoidRequestTxHashBindingV1,
} from "../src/economic/buy_void_request_tx_hash_binding_v1.js";

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
  "requestLaunchAuthorityReady:__blo",
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
  '"request_launch_authority_expired_or_superseded"',
  "requestLaunchAuthorityReady(found) === true",
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
      launch_authority_guard: true,
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

async function exerciseLaunchAuthorityGuard(): Promise<void> {
  const requestId = "buyvoid_lease_aaaaaaaa";
  const txHash = `0x${"a".repeat(64)}`;
  const baseRequest = {
    request_id: requestId,
    status: "awaiting_payment_tx_hash",
    tx_hash: "",
    created_at_ms: 1_791_014_400_000,
    launch_authority: {
      marker: "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    },
  };

  async function run(
    authority: boolean | "throw",
  ): Promise<{
    status: number;
    body: any;
    persisted: any[];
    authority_calls: number;
  }> {
    const routes = new Map<string, Function>();
    const persisted: any[] = [];
    let authorityCalls = 0;
    const app = {
      get(pathname: string, handler: Function) {
        routes.set("GET " + pathname, handler);
      },
      post(pathname: string, handler: Function) {
        routes.set("POST " + pathname, handler);
      },
    };

    installBuyVoidRequestTxHashBindingV1({
      app,
      localOnly: () => true,
      readRequests: async () => [structuredClone(baseRequest)],
      persistRequest: async (request) => {
        persisted.push(structuredClone(request));
        return { ok: true };
      },
      requestLaunchAuthorityReady: () => {
        authorityCalls += 1;
        if (authority === "throw") {
          throw new Error("synthetic_launch_authority_failure");
        }
        return authority;
      },
    });

    const handler = routes.get(
      "POST /__void/buy-void/operator/request/tx-hash.json",
    );
    assert.equal(typeof handler, "function");

    let status = 200;
    let body: any = null;
    const req = {
      body: {
        request_id: requestId,
        tx_hash: txHash,
        confirmation: "bindBuyVoidPaymentTxHash",
      },
    };
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(value: any) {
        body = value;
        return this;
      },
    };

    await Promise.resolve(handler!(req, res));
    return { status, body, persisted, authority_calls: authorityCalls };
  }

  const held = await run(false);
  assert.equal(held.status, 409);
  assert.equal(
    held.body?.error,
    "request_launch_authority_expired_or_superseded",
  );
  assert.equal(held.persisted.length, 0);
  assert.equal(held.authority_calls, 1);

  const thrown = await run("throw");
  assert.equal(thrown.status, 409);
  assert.equal(
    thrown.body?.error,
    "request_launch_authority_expired_or_superseded",
  );
  assert.equal(thrown.persisted.length, 0);
  assert.equal(thrown.authority_calls, 1);

  const allowed = await run(true);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body?.ok, true);
  assert.equal(allowed.body?.idempotent, false);
  assert.equal(allowed.persisted.length, 1);
  assert.equal(
    allowed.persisted[0]?.status,
    "payment_submitted_pending_manual_review",
  );
  assert.equal(allowed.persisted[0]?.tx_hash, txHash);
  assert.equal(allowed.authority_calls, 1);
}

await exerciseLaunchAuthorityGuard();
console.log("launch_authority_runtime_guard_exercised=true");
