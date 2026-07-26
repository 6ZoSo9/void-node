import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import {
  materializeAgentPaidWorkOrder,
  type AgentPaidWorkOrderDraft,
} from "./agent_paid_work_order_envelope_v1.js";

const receiverPath = path.resolve(
  "scripts/agent_paid_work_submission_receiver_v1.ts",
);
const route =
  "/__void/agents/paid-work/submissions/v1";
const healthRoute =
  "/__void/agent-paid-work-submission-receiver-v1/health";
const token = "paid-work-submission-proof-token-0001";
const bearer = `Bearer ${token}`;

function sha256(value: Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function request({
  port,
  method,
  requestPath,
  headers = {},
  body = null,
}: {
  port: number;
  method: string;
  requestPath: string;
  headers?: Record<string, string>;
  body?: Buffer | null;
}): Promise<{
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        method,
        path: requestPath,
        headers,
        timeout: 5_000,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on(
          "data",
          (chunk: Buffer) =>
            chunks.push(chunk),
        );
        response.on("end", () => {
          resolve({
            status:
              response.statusCode || 0,
            headers: response.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy(
        new Error("request timeout"),
      );
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseJson(
  response: { body: Buffer },
): Record<string, unknown> {
  return JSON.parse(
    response.body.toString("utf8"),
  ) as Record<string, unknown>;
}

function countJson(pathname: string): number {
  try {
    return readdirSync(pathname)
      .filter((name) => name.endsWith(".json"))
      .length;
  } catch {
    return 0;
  }
}

const temporary = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-agent-paid-work-submission-receiver-v1-",
  ),
);
const configPath = path.join(
  temporary,
  "config.json",
);
const tokenPath = path.join(
  temporary,
  "token",
);
const stateDir = path.join(
  temporary,
  "state",
);
const config = {
  marker:
    "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_CONFIG_V1",
  version: 1,
  enabled: true,
  listen_host: "127.0.0.1",
  listen_port: 0,
  request_path: route,
  health_path: healthRoute,
  max_body_bytes: 65536,
  admission_policy: {
    marker:
      "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_POLICY_V1",
    version: 1,
    policy_id:
      "void.policy.agent-paid-work-submission-admission.v1",
    allowed_capability_ids: [
      "datanet.fetch_verify",
    ],
    max_total_by_asset: {
      USD: "10.00",
    },
    max_runtime_seconds: 600,
    max_output_bytes: 2_097_152,
    max_input_refs: 8,
    max_expected_outputs: 8,
    max_ttl_seconds: 172800,
    require_https_callback: true,
    callback_policy: {
      forbid_credentials: true,
      forbid_fragment: true,
      forbid_loopback: true,
      forbid_private_ip_literals: true,
    },
    authority: {
      provider_selection_authorized:
        false,
      quote_creation_authorized: false,
      payment_authorized: false,
      work_execution_authorized: false,
      work_dispatch_authorized: false,
      wc_award_authorized: false,
      wc_ledger_write_authorized: false,
      wallet_or_signer_access_authorized:
        false,
      buy_void_fulfillment_authorized:
        false,
    },
  },
};

writeFileSync(
  configPath,
  JSON.stringify(config, null, 2) + "\n",
  { mode: 0o600 },
);
writeFileSync(
  tokenPath,
  token + "\n",
  { mode: 0o600 },
);
chmodSync(configPath, 0o600);
chmodSync(tokenPath, 0o600);

const example = JSON.parse(
  readFileSync(
    "examples/agent-paid-work-order-envelope-v1.example.json",
    "utf8",
  ),
) as Record<string, unknown>;
const {
  work_order_id: _exampleId,
  ...draftRaw
} = example;
const draft =
  draftRaw as AgentPaidWorkOrderDraft;
const acceptedWorkOrder =
  materializeAgentPaidWorkOrder(draft);

const rejectedDraft = JSON.parse(
  JSON.stringify(draft),
) as AgentPaidWorkOrderDraft;
rejectedDraft.service.capability_id =
  "unsupported.capability";
const rejectedWorkOrder =
  materializeAgentPaidWorkOrder(
    rejectedDraft,
  );

const child = spawn(
  path.resolve("node_modules/.bin/tsx"),
  [receiverPath],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VOID_AGENT_PAID_WORK_SUBMISSION_CONFIG:
        configPath,
      VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE:
        tokenPath,
      VOID_AGENT_PAID_WORK_SUBMISSION_STATE_DIR:
        stateDir,
      VOID_AGENT_PAID_WORK_SUBMISSION_PROOF_MODE:
        "1",
      VOID_AGENT_PAID_WORK_SUBMISSION_PROOF_NOW_UTC:
        "2026-07-25T23:00:00Z",
    },
    stdio: [
      "ignore",
      "pipe",
      "pipe",
    ],
  },
);

let stdout = "";
let stderr = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on(
  "data",
  (chunk: string) => {
    stdout += chunk;
  },
);
child.stderr.on(
  "data",
  (chunk: string) => {
    stderr += chunk;
  },
);

async function waitForReady(): Promise<{
  port: number;
}> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    for (const line of stdout.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const value = JSON.parse(line);
        if (
          value.marker ===
            "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_V1" &&
          value.ready === true
        ) {
          assert.equal(
            value.host,
            "127.0.0.1",
          );
          assert.equal(
            value.request_path,
            route,
          );
          assert.equal(
            value.append_once_receipts,
            true,
          );
          assert.equal(
            value.payment_authority,
            false,
          );
          assert.equal(
            value.work_dispatch_authority,
            false,
          );
          assert.equal(
            value.wc_ledger_write_authority,
            false,
          );
          return {
            port: Number(value.port),
          };
        }
      } catch {
        // Wait for a complete JSON line.
      }
    }
    if (child.exitCode !== null) {
      throw new Error(
        `receiver exited early=${child.exitCode}\n${stderr}`,
      );
    }
    await new Promise((resolve) =>
      setTimeout(resolve, 50),
    );
  }
  throw new Error(
    `receiver did not become ready\nstdout=${stdout}\nstderr=${stderr}`,
  );
}

async function stop(): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise<void>(
    (resolve, reject) => {
      const timer = setTimeout(
        () =>
          reject(
            new Error(
              "receiver stop timeout",
            ),
          ),
        5_000,
      );
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    },
  );
}

try {
  const { port } = await waitForReady();

  const health = await request({
    port,
    method: "GET",
    requestPath: healthRoute,
  });
  assert.equal(health.status, 200);
  const healthJson = parseJson(health);
  assert.equal(healthJson.ready, true);
  assert.equal(
    healthJson.provider_selection_authority,
    false,
  );

  const methodGuard = await request({
    port,
    method: "GET",
    requestPath: route,
  });
  assert.equal(methodGuard.status, 405);
  assert.equal(
    methodGuard.headers.allow,
    "POST",
  );

  const acceptedRequest = {
    marker:
      "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
    version: 1,
    submission_id:
      "proof-accepted-submission-v1",
    work_order: acceptedWorkOrder,
  };
  const acceptedBody = Buffer.from(
    JSON.stringify(acceptedRequest),
  );
  const acceptedSha =
    sha256(acceptedBody);

  const missingAuth = await request({
    port,
    method: "POST",
    requestPath: route,
    body: acceptedBody,
    headers: {
      "content-type":
        "application/json",
      "content-length":
        String(acceptedBody.length),
      "x-void-payload-sha256":
        acceptedSha,
    },
  });
  assert.equal(missingAuth.status, 401);
  assert.equal(
    countJson(
      path.join(stateDir, "receipts"),
    ),
    0,
  );

  const wrongSha = await request({
    port,
    method: "POST",
    requestPath: route,
    body: acceptedBody,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(acceptedBody.length),
      "x-void-payload-sha256":
        "0".repeat(64),
    },
  });
  assert.equal(wrongSha.status, 400);

  const accepted = await request({
    port,
    method: "POST",
    requestPath: route,
    body: acceptedBody,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(acceptedBody.length),
      "x-void-payload-sha256":
        acceptedSha,
    },
  });
  assert.equal(accepted.status, 202);
  const acceptedJson =
    parseJson(accepted);
  assert.equal(acceptedJson.ok, true);
  assert.equal(
    acceptedJson.duplicate,
    false,
  );
  const acceptedReceipt =
    acceptedJson.receipt as Record<
      string,
      unknown
    >;
  assert.equal(
    (
      acceptedReceipt.admission as Record<
        string,
        unknown
      >
    ).decision,
    "accepted_for_review",
  );
  assert.equal(
    acceptedReceipt.authorization_verified,
    true,
  );
  assert.equal(
    acceptedReceipt.loopback_source,
    true,
  );
  assert(
    Object.values(
      acceptedReceipt.authority as Record<
        string,
        unknown
      >,
    ).every((value) => value === false),
  );

  const differentlyFormattedBody =
    Buffer.from(
      JSON.stringify(
        acceptedRequest,
        null,
        2,
      ),
    );
  const duplicate = await request({
    port,
    method: "POST",
    requestPath: route,
    body: differentlyFormattedBody,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(
          differentlyFormattedBody.length,
        ),
      "x-void-payload-sha256":
        sha256(differentlyFormattedBody),
    },
  });
  assert.equal(duplicate.status, 200);
  const duplicateJson =
    parseJson(duplicate);
  assert.equal(
    duplicateJson.duplicate,
    true,
  );
  assert.equal(
    (
      duplicateJson.receipt as Record<
        string,
        unknown
      >
    ).receipt_id,
    acceptedReceipt.receipt_id,
  );

  const conflictingRequest = {
    marker:
      "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
    version: 1,
    submission_id:
      "proof-accepted-submission-v1",
    work_order: rejectedWorkOrder,
  };
  const conflictingBody = Buffer.from(
    JSON.stringify(conflictingRequest),
  );
  const conflict = await request({
    port,
    method: "POST",
    requestPath: route,
    body: conflictingBody,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(conflictingBody.length),
      "x-void-payload-sha256":
        sha256(conflictingBody),
    },
  });
  assert.equal(conflict.status, 409);

  const rejectedRequest = {
    ...conflictingRequest,
    submission_id:
      "proof-rejected-submission-v1",
  };
  const rejectedBody = Buffer.from(
    JSON.stringify(rejectedRequest),
  );
  const rejected = await request({
    port,
    method: "POST",
    requestPath: route,
    body: rejectedBody,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(rejectedBody.length),
      "x-void-payload-sha256":
        sha256(rejectedBody),
    },
  });
  assert.equal(rejected.status, 422);
  const rejectedJson =
    parseJson(rejected);
  assert.equal(rejectedJson.ok, false);
  assert.equal(
    (
      (
        rejectedJson.receipt as Record<
          string,
          unknown
        >
      ).admission as Record<
        string,
        unknown
      >
    ).decision,
    "rejected",
  );

  const tooLarge = Buffer.alloc(
    65_537,
    0x78,
  );
  const oversized = await request({
    port,
    method: "POST",
    requestPath: route,
    body: tooLarge,
    headers: {
      authorization: bearer,
      "content-type":
        "application/json",
      "content-length":
        String(tooLarge.length),
      "x-void-payload-sha256":
        sha256(tooLarge),
    },
  });
  assert.equal(oversized.status, 413);

  assert.equal(
    countJson(
      path.join(stateDir, "receipts"),
    ),
    2,
  );
  assert.equal(
    countJson(
      path.join(stateDir, "submissions"),
    ),
    2,
  );
  assert.equal(
    stdout.includes(token),
    false,
    "token leaked to stdout",
  );
  assert.equal(
    stderr.includes(token),
    false,
    "token leaked to stderr",
  );

  console.log(
    "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_V1_PROOF_GREEN",
  );
  console.log("loopback_only=1");
  console.log("bearer_authentication=1");
  console.log("payload_sha256_binding=1");
  console.log("maximum_body_bytes=65536");
  console.log("accepted_for_review_receipt=1");
  console.log("rejected_receipt=1");
  console.log("identical_duplicate_suppressed=1");
  console.log("conflicting_duplicate_rejected=1");
  console.log("append_once_receipts=1");
  console.log("provider_selected=0");
  console.log("quote_created=0");
  console.log("payment_authorized=0");
  console.log("work_execution_authorized=0");
  console.log("work_dispatched=0");
  console.log("wc_award_authorized=0");
  console.log("wc_ledger_write_authorized=0");
  console.log("wallet_or_signer_access=0");
  console.log("buy_void_fulfillment_authority=0");
} finally {
  await stop().catch(() => {});
}
