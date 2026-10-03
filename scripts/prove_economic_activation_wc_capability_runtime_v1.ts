import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

type Handler = (req: any, res: any) => any;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-wc-capability-runtime-v1-"));
const routes = new Map<string, Handler>();
const receipt = {
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
    bytes: 65,
  },
  ts_ms: Date.now(),
};

function append(file: string, value: any): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(value) + "\n");
}

const WC_QUANTA_PER_WC_V1 = 1_000_000_000n;

function wcDeltaQuanta(raw: unknown): bigint {
  const value = String(raw);
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]{1,9}))?$/.exec(value);
  assert.ok(match, `invalid proof WC delta: ${value}`);
  return (
    BigInt(match[1]) * WC_QUANTA_PER_WC_V1 +
    BigInt(String(match[2] || "").padEnd(9, "0") || "0")
  );
}

function wcQuantaExact(value: bigint): string {
  const whole = value / WC_QUANTA_PER_WC_V1;
  const fraction = value % WC_QUANTA_PER_WC_V1;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(9, "0").replace(/0+$/, "")}`;
}

function wcCompat(value: bigint): number | null {
  const exact = wcQuantaExact(value);
  const compat = Number(exact);
  return Number.isSafeInteger(compat) ? compat : null;
}

function canonicalState(account: string): Record<string, unknown> {
  const file = path.join(tmp, "wc_v1", "ledger.jsonl");
  let earnedQuanta = 0n;
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line);
      if (String(entry?.account || "") !== account) continue;
      earnedQuanta += wcDeltaQuanta(entry?.delta);
    }
  }
  const exact = wcQuantaExact(earnedQuanta);
  const compat = wcCompat(earnedQuanta);
  return {
    earned: compat,
    redeemable: compat,
    earned_exact: exact,
    redeemable_exact: exact,
    earned_quanta: earnedQuanta.toString(),
    redeemable_quanta: earnedQuanta.toString(),
    exact_decimals: 9,
    numeric_authority: "nano_wc_fixed_point_v1",
  };
}

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
let enableCalls = 0;
let disableCalls = 0;
let tickCalls = 0;

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
    const account = decodeURIComponent(url.split("account=")[1] || "");
    return jsonResponse({ ok: true, ...canonicalState(account) });
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
    tickCalls += 1;
    const tickReceipt =
      String(body.account || "") === receipt.account
        ? receipt
        : {
            ...receipt,
            receipt_id: `rcpt_runtime_v1_${tickCalls}`,
            job_id: `job_runtime_v1_${tickCalls}`,
            account: String(body.account || ""),
          };
    append(path.join(tmp, "agent_v1", "receipts.jsonl"), tickReceipt);
    append(path.join(tmp, "agent", "jobs.jsonl"), {
      job_id: tickReceipt.job_id,
      account: tickReceipt.account,
      kind: tickReceipt.kind,
      status: "queued",
      dataset_id: tickReceipt.dataset_id,
    });
    append(path.join(tmp, "agent_v1", "job_state.jsonl"), {
      job_id: tickReceipt.job_id,
      status: "completed",
      receipt_id: tickReceipt.receipt_id,
      dataset_id: tickReceipt.dataset_id,
      input_hash: tickReceipt.input_hash,
      output_hash: tickReceipt.output_hash,
      verified: true,
    });

    return jsonResponse({
      ok: true,
      outcome: "submitted",
      submit: {
        out: {
          worker: {
            receipt: tickReceipt,
          },
        },
      },
    });
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

async function call(
  method: "GET" | "POST",
  route: string,
  req: any,
): Promise<{ status: number; body: any }> {
  const handler = routes.get(`${method} ${route}`);
  assert.ok(handler, `missing handler ${method} ${route}`);
  const { res, sent } = responseHarness();
  await Promise.resolve(handler(req, res));
  return await Promise.race([
    sent,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${method} ${route}`)), 5000),
    ),
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

  const status = await call("GET", statusRoute, {
    query: { account: "outside-operator-1" },
  });
  assert.equal(status.status, 200);
  assert.equal(status.body.enabled, true);
  assert.equal(status.body.capability.single_use, true);
  assert.equal(status.body.money_movement, false);
  assert.equal(
    status.body.canonical_pipeline.receipt_acceptance,
    "in_process_verified_receipt_acceptance_v1",
  );

  const badTask = await call("POST", issueRoute, {
    body: { account: "outside-operator-1", task_class: "datanet_publish" },
  });
  assert.equal(badTask.status, 400);
  assert.equal(badTask.body.error, "task_class_not_allowlisted");

  const issued = await call("POST", issueRoute, {
    body: {
      account: "outside-operator-1",
      task_class: "datanet_fetch_verify",
      ttl_ms: 60_000,
    },
  });
  assert.equal(issued.status, 201);
  assert.equal(issued.body.account, "outside-operator-1");
  assert.match(
    issued.body.capability_token,
    /^wc1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/,
  );

  const record = issuedRecord(issued.body.ticket_id);
  assert.equal(record.token_sha256.length, 64);
  assert.equal(
    JSON.stringify(record).includes(issued.body.capability_token),
    false,
  );

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
  assert.equal(executed.body.wc.delta, 3);
  assert.equal(executed.body.wc.delta_quanta, "3000000000");
  assert.equal(executed.body.wc.after, 3);
  assert.equal(executed.body.wc.after_exact, "3");
  assert.equal(executed.body.wc.after_quanta, "3000000000");
  assert.equal(
    executed.body.wc.numeric_authority,
    "nano_wc_fixed_point_v1",
  );
  assert.equal(executed.body.verified_receipt.verified, true);
  assert.equal(executed.body.internal.acceptance_credited, true);
  assert.equal(executed.body.internal.acceptance_duplicate, false);
  assert.equal(executed.body.internal.acceptance_award_wc, 3);
  assert.equal(executed.body.internal.runner_disabled, true);
  assert.equal(enableCalls, 1);
  assert.equal(disableCalls, 1);
  assert.equal(tickCalls, 1);

  const ledger = fs
    .readFileSync(path.join(tmp, "wc_v1", "ledger.jsonl"), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].delta, 3);
  assert.equal(ledger[0].receipt_id, receipt.receipt_id);
  assert.equal(ledger[0].job_id, receipt.job_id);
  assert.equal(ledger[0].reason, "verified_receipt_acceptance_v1");
  assert.equal(ledger[0].reward_meta.server_controlled_award, true);

  const consumed = JSON.parse(
    fs.readFileSync(
      path.join(
        tmp,
        "wc_v1",
        "public-capabilities-v1",
        "consumed",
        `${issued.body.ticket_id}.json`,
      ),
      "utf8",
    ),
  );
  assert.equal(consumed.status, "completed");
  assert.equal(consumed.wc_delta, 3);
  assert.equal(consumed.wc_delta_quanta, "3000000000");
  assert.equal(consumed.canonical_redeemable_after_exact, "3");
  assert.equal(
    consumed.canonical_redeemable_after_quanta,
    "3000000000",
  );
  assert.equal(consumed.numeric_authority, "nano_wc_fixed_point_v1");
  assert.equal(
    JSON.stringify(consumed).includes(issued.body.capability_token),
    false,
  );

  const replay = await call("POST", runRoute, {
    headers: { authorization: `Bearer ${issued.body.capability_token}` },
    body: { account: "outside-operator-1" },
  });
  assert.equal(replay.status, 409);
  assert.equal(replay.body.error, "capability_already_used");
  assert.equal(
    fs
      .readFileSync(path.join(tmp, "wc_v1", "ledger.jsonl"), "utf8")
      .trim()
      .split(/\r?\n/).length,
    1,
  );

  const highAccount = "outside-operator-high";
  append(path.join(tmp, "wc_v1", "ledger.jsonl"), {
    kind: "credit",
    account: highAccount,
    delta: Number.MAX_SAFE_INTEGER,
  });
  append(path.join(tmp, "wc_v1", "ledger.jsonl"), {
    kind: "credit",
    account: highAccount,
    delta: 1,
  });
  assert.equal(canonicalState(highAccount).redeemable, null);
  assert.equal(
    canonicalState(highAccount).redeemable_exact,
    "9007199254740992",
  );

  const highIssued = await call("POST", issueRoute, {
    body: {
      account: highAccount,
      task_class: "datanet_fetch_verify",
      ttl_ms: 60_000,
    },
  });
  assert.equal(highIssued.status, 201);

  const highExecuted = await call("POST", runRoute, {
    headers: {
      authorization: `Bearer ${highIssued.body.capability_token}`,
    },
    body: { account: highAccount },
  });
  assert.equal(highExecuted.status, 200);
  assert.equal(highExecuted.body.ok, true);
  assert.equal(highExecuted.body.wc.before, null);
  assert.equal(
    highExecuted.body.wc.before_exact,
    "9007199254740992",
  );
  assert.equal(
    highExecuted.body.wc.before_quanta,
    "9007199254740992000000000",
  );
  assert.equal(highExecuted.body.wc.after, null);
  assert.equal(
    highExecuted.body.wc.after_exact,
    "9007199254740995",
  );
  assert.equal(
    highExecuted.body.wc.after_quanta,
    "9007199254740995000000000",
  );
  assert.equal(highExecuted.body.wc.delta, 3);
  assert.equal(
    highExecuted.body.wc.delta_quanta,
    "3000000000",
  );
  assert.equal(
    highExecuted.body.wc.numeric_authority,
    "nano_wc_fixed_point_v1",
  );

  const highConsumed = JSON.parse(
    fs.readFileSync(
      path.join(
        tmp,
        "wc_v1",
        "public-capabilities-v1",
        "consumed",
        `${highIssued.body.ticket_id}.json`,
      ),
      "utf8",
    ),
  );
  assert.equal(highConsumed.status, "completed");
  assert.equal(highConsumed.wc_delta, 3);
  assert.equal(highConsumed.wc_delta_quanta, "3000000000");
  assert.equal(
    highConsumed.canonical_redeemable_after_exact,
    "9007199254740995",
  );
  assert.equal(
    highConsumed.canonical_redeemable_after_quanta,
    "9007199254740995000000000",
  );
  assert.equal(
    highConsumed.numeric_authority,
    "nano_wc_fixed_point_v1",
  );

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
      path.join(
        tmp,
        "wc_v1",
        "public-capabilities-v1",
        "issued",
        `${unsafe.body.ticket_id}.json`,
      ),
    ),
    true,
  );
  assert.equal(
    fs.existsSync(
      path.join(
        tmp,
        "wc_v1",
        "public-capabilities-v1",
        "consumed",
        `${unsafe.body.ticket_id}.json`,
      ),
    ),
    false,
  );

  console.log("VOID_ECONOMIC_ACTIVATION_WC_CAPABILITY_RUNTIME_V1_GREEN");
} finally {
  globalThis.fetch = originalFetch;
  delete (globalThis as any).__void_http_app;
  fs.rmSync(tmp, { recursive: true, force: true });
}
