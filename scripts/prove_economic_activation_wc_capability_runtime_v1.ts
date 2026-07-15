import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Handler = (req: any, res: any) => any;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-wc-capability-runtime-v1-"));
const routes = new Map<string, Handler>();

const app: any = {
  get(route: string, ...handlers: Handler[]) {
    routes.set(`GET ${route}`, handlers[handlers.length - 1]);
  },
  post(route: string, ...handlers: Handler[]) {
    routes.set(`POST ${route}`, handlers[handlers.length - 1]);
  },
};

(globalThis as any).__void_http_app = app;
process.env.DATA_DIR = tmp;
process.env.HTTP_PORT = "4199";
process.env.VOID_WC_PUBLIC_CAPABILITY_ENABLED = "1";
process.env.VOID_WC_PUBLIC_CAPABILITY_PER_ACCOUNT_CAP = "10";
process.env.VOID_WC_PUBLIC_CAPABILITY_GLOBAL_CAP = "20";

const originalFetch = globalThis.fetch;

function jsonResponse(value: any, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

let safeRunner = true;
let redeemCalls = 0;
let enableCalls = 0;
let disableCalls = 0;
let scanCalls = 0;

globalThis.fetch = (async (input: any, init?: RequestInit): Promise<Response> => {
  const url = String(input);
  const body = init?.body ? JSON.parse(String(init.body)) : {};

  if (url.includes("/wc/runner/status?account=")) {
    return jsonResponse({
      ok: true,
      enabled: false,
      loop_disabled: safeRunner,
      loop_started: !safeRunner,
    });
  }

  if (url.includes("/wc/redeemable?account=")) {
    redeemCalls += 1;
    return jsonResponse({
      ok: true,
      redeemable: redeemCalls === 1 ? 0 : 1,
    });
  }

  if (url.includes("/wc/runner/config?dry=0&confirm=wcRunnerConfig")) {
    return jsonResponse({ ok: true, ...body });
  }

  if (url.includes("/wc/runner/set?dry=0&confirm=wcRunnerSet")) {
    if (body.enabled === true) {
      enableCalls += 1;
      return jsonResponse({ ok: true, enabled: true });
    }
    disableCalls += 1;
    return jsonResponse({ ok: true, enabled: false });
  }

  if (url.includes("/wc/runner/tick?dry=0&confirm=wcRunnerTick")) {
    return jsonResponse({
      ok: true,
      outcome: "submitted",
      submit: {
        out: {
          worker: {
            receipt: {
              receipt_id: "rcpt_runtime_v1",
              job_id: "job_runtime_v1",
              account: "outside-operator-1",
              kind: "datanet_fetch_verify",
              status: "completed",
              dataset_id: "ds_runtime_v1",
              input_hash: "a".repeat(64),
              output_hash: "b".repeat(64),
              output: {
                verified: true,
                fetched_input_hash: "a".repeat(64),
              },
            },
          },
        },
      },
    });
  }

  if (url.includes("/wc/scan-receipts?dry=0&confirm=wcScanReceipts")) {
    scanCalls += 1;
    return jsonResponse({ ok: true, credited: 1 });
  }

  return jsonResponse({ ok: false, error: `unexpected_fetch:${url}` }, 500);
}) as typeof fetch;

function responseHarness() {
  let resolveSent: (value: { status: number; body: any }) => void = () => {};
  const sent = new Promise<{ status: number; body: any }>((resolve) => {
    resolveSent = resolve;
  });

  const res: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      resolveSent({ status: this.statusCode, body });
      return this;
    },
  };

  return { res, sent };
}

async function call(method: "GET" | "POST", route: string, req: any): Promise<{ status: number; body: any }> {
  const handler = routes.get(`${method} ${route}`);
  assert.ok(handler, `missing handler ${method} ${route}`);
  const { res, sent } = responseHarness();
  await Promise.resolve(handler(req, res));
  return await Promise.race([
    sent,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timeout ${method} ${route}`)), 3000)),
  ]);
}

function issuedRecord(ticketId: string): any {
  return JSON.parse(
    fs.readFileSync(
      path.join(tmp, "wc_v1", "public-capabilities-v1", "issued", `${ticketId}.json`),
      "utf8",
    ),
  );
}

try {
  const moduleUrl =
    pathToFileURL(path.join(process.cwd(), "src", "economic", "wc_public_capability_v1.ts")).href +
    `?runtime-proof=${Date.now()}`;

  await import(moduleUrl);
  await new Promise((resolve) => setTimeout(resolve, 400));

  const issueRoute = "/__void/operator/wc-public-capability-v1/issue";
  const runRoute = "/wc/public-capability-v1/run-once";
  const statusRoute = "/wc/public-capability-v1/status";

  const status = await call("GET", statusRoute, { query: { account: "outside-operator-1" } });
  assert.equal(status.status, 200);
  assert.equal(status.body.enabled, true);
  assert.equal(status.body.capability.single_use, true);
  assert.equal(status.body.money_movement, false);

  const badTask = await call("POST", issueRoute, {
    body: { account: "outside-operator-1", task_class: "datanet_publish" },
  });
  assert.equal(badTask.status, 400);
  assert.equal(badTask.body.error, "task_class_not_allowlisted");

  const issued = await call("POST", issueRoute, {
    body: { account: "outside-operator-1", task_class: "datanet_fetch_verify", ttl_ms: 60_000 },
  });
  assert.equal(issued.status, 201);
  assert.equal(issued.body.account, "outside-operator-1");
  assert.match(issued.body.capability_token, /^wc1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/);

  const record = issuedRecord(issued.body.ticket_id);
  assert.equal(record.token_sha256.length, 64);
  assert.equal(JSON.stringify(record).includes(issued.body.capability_token), false);

  const mismatch = await call("POST", runRoute, {
    headers: { authorization: `Bearer ${issued.body.capability_token}` },
    body: { account: "other-account" },
  });
  assert.equal(mismatch.status, 403);
  assert.equal(mismatch.body.error, "capability_account_mismatch");

  const executed = await call("POST", runRoute, {
    headers: { authorization: `Bearer ${issued.body.capability_token}` },
    body: { account: "outside-operator-1" },
  });
  assert.equal(executed.status, 200);
  assert.equal(executed.body.ok, true);
  assert.equal(executed.body.wc.delta, 1);
  assert.equal(executed.body.verified_receipt.verified, true);
  assert.equal(executed.body.internal.runner_disabled, true);
  assert.equal(enableCalls, 1);
  assert.equal(disableCalls, 1);
  assert.equal(scanCalls, 1);

  const consumed = JSON.parse(
    fs.readFileSync(
      path.join(tmp, "wc_v1", "public-capabilities-v1", "consumed", `${issued.body.ticket_id}.json`),
      "utf8",
    ),
  );
  assert.equal(consumed.status, "completed");
  assert.equal(consumed.wc_delta, 1);
  assert.equal(JSON.stringify(consumed).includes(issued.body.capability_token), false);

  const replay = await call("POST", runRoute, {
    headers: { authorization: `Bearer ${issued.body.capability_token}` },
    body: { account: "outside-operator-1" },
  });
  assert.equal(replay.status, 409);
  assert.equal(replay.body.error, "capability_already_used");

  const expiring = await call("POST", issueRoute, {
    body: { account: "outside-operator-2", ttl_ms: 60_000 },
  });
  assert.equal(expiring.status, 201);
  const expiringPath = path.join(
    tmp,
    "wc_v1",
    "public-capabilities-v1",
    "issued",
    `${expiring.body.ticket_id}.json`,
  );
  const expiredRecord = JSON.parse(fs.readFileSync(expiringPath, "utf8"));
  expiredRecord.expires_at_ms = Date.now() - 1;
  fs.writeFileSync(expiringPath, JSON.stringify(expiredRecord, null, 2) + "\n");

  const expired = await call("POST", runRoute, {
    headers: { authorization: `Bearer ${expiring.body.capability_token}` },
    body: { account: "outside-operator-2" },
  });
  assert.equal(expired.status, 410);
  assert.equal(expired.body.error, "capability_expired");

  const unsafe = await call("POST", issueRoute, {
    body: { account: "outside-operator-3", ttl_ms: 60_000 },
  });
  assert.equal(unsafe.status, 201);
  safeRunner = false;

  const unsafeRun = await call("POST", runRoute, {
    headers: { authorization: `Bearer ${unsafe.body.capability_token}` },
    body: { account: "outside-operator-3" },
  });
  assert.equal(unsafeRun.status, 503);
  assert.equal(unsafeRun.body.error, "runner_loop_not_disabled");
  assert.equal(unsafeRun.body.capability_consumed, false);
  assert.equal(
    fs.existsSync(
      path.join(tmp, "wc_v1", "public-capabilities-v1", "issued", `${unsafe.body.ticket_id}.json`),
    ),
    true,
  );
  assert.equal(
    fs.existsSync(
      path.join(tmp, "wc_v1", "public-capabilities-v1", "consumed", `${unsafe.body.ticket_id}.json`),
    ),
    false,
  );

  console.log("VOID_ECONOMIC_ACTIVATION_WC_CAPABILITY_RUNTIME_V1_GREEN");
} finally {
  globalThis.fetch = originalFetch;
  delete (globalThis as any).__void_http_app;
  fs.rmSync(tmp, { recursive: true, force: true });
}
