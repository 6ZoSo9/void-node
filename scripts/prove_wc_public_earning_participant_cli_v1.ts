// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const MARKER = "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1";
const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
const root = process.cwd();
const cli = path.join(
  root,
  "ops",
  "mainnet0",
  "wc-public-earning-participant-v1.sh",
);
const workflow = path.join(
  root,
  ".github",
  "workflows",
  "wc-public-earning-participant-cli-v1.yml",
);

function need(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

async function listen(
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void,
): Promise<{ server: http.Server; port: number; base: string }> {
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      sendJson(res, 500, { ok: false, error: String(error?.message || error) });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  need(address && typeof address === "object", "mock server address missing");
  const port = address.port;
  return { server, port, base: `http://127.0.0.1:${port}` };
}

async function close(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn("bash", [cli, ...args], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("participant CLI proof timed out"));
    }, 20_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      resolve({ code: Number(code ?? -1), stdout, stderr });
    });
  });
}

function writeTicket(
  dir: string,
  name: string,
  input: {
    ticketId?: string;
    token?: string;
    tokenSha?: string;
    account?: string;
    executorNodeId?: string;
    expiresAtMs?: number;
    coordinatorBase?: string;
  } = {},
): { file: string; token: string; ticket: Record<string, unknown> } {
  const ticketId = input.ticketId || crypto.randomBytes(16).toString("hex");
  const token = input.token || `wcep1.${ticketId}.proof-secret`;
  const ticket = {
    marker: PILOT_MARKER,
    version: 1,
    ticket_id: ticketId,
    account: input.account || "outside-operator-proof-1",
    task_class: "datanet_fetch_verify",
    executor_node_id:
      input.executorNodeId || "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    executor_http_base: "http://127.0.0.1:4101",
    dataset_id: "ds_participant_cli_v1_proof",
    expected_input_hash:
      "2112d9307da856fdb027aede7fff64c243bc99458de2fc385b7f526a36e73194",
    token_sha256: input.tokenSha || sha256(token),
    nonce: crypto.randomBytes(16).toString("hex"),
    issued_at_ms: Date.now() - 1_000,
    expires_at_ms: input.expiresAtMs || Date.now() + 300_000,
    max_uses: 1,
    status: "issued",
    fixed_award_wc: 3,
    public_submit_route: "/wc/public-earning-pilot-v1/submit-result",
    local_execute_route: "/wc/public-earning-pilot-v1/execute-local",
    capability_token: token,
    capability_token_returned_once: true,
    ...(input.coordinatorBase
      ? { coordinator_base: input.coordinatorBase }
      : {}),
  };
  const file = path.join(dir, name);
  fs.writeFileSync(file, `${JSON.stringify(ticket, null, 2)}\n`, {
    mode: 0o600,
  });
  return { file, token, ticket };
}

async function main(): Promise<void> {
  need(fs.existsSync(cli), "participant CLI missing");
  need(fs.existsSync(workflow), "participant CLI workflow missing");

  const cliText = fs.readFileSync(cli, "utf8");
  const workflowText = fs.readFileSync(workflow, "utf8");

  for (const anchor of [
    MARKER,
    "wcPublicEarningPilotExecuteLocal",
    "trusted-coordinator-node-id",
    "HTTPS or loopback/Tailscale HTTP",
    "coordinator node identity mismatch",
    "capability token SHA mismatch",
    "local node does not match ticket executor identity",
    "canonical redeemable balance did not increase by exactly 3 WC",
    "ticket_deleted=1",
  ]) {
    need(cliText.includes(anchor), `participant CLI anchor missing: ${anchor}`);
  }
  need(!cliText.includes('echo "$TOKEN"'), "participant CLI must not print token");
  need(!cliText.includes("--arg capability_token"), "participant CLI must not pass token in process arguments");
  need(!cliText.includes('grep -Fq "$TOKEN"'), "participant CLI must not pass token to grep argv");
  need(!cliText.includes("set -x"), "participant CLI must not enable shell tracing");
  need(
    workflowText.includes("prove_wc_public_earning_participant_cli_v1.ts"),
    "workflow does not run participant CLI proof",
  );
  need(
    workflowText.includes("tools/check_index_size.sh"),
    "workflow does not guard index size",
  );

  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-participant-cli-v1-"),
  );
  const stateDir = path.join(tmp, "state");
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });

  const executorNodeId = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const coordinatorNodeId = "99999999999999999999999999999999";
  const account = "outside-operator-proof-1";
  let balanceCalls = 0;
  let executeCalls = 0;
  let expectedTicketId = "";
  let expectedToken = "";
  let forceTokenEchoError = false;

  const coordinator = await listen((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        nodeId: coordinatorNodeId,
        peers: [executorNodeId],
      });
    }
    if (
      req.method === "GET" &&
      url.pathname === "/wc/public-earning-pilot-v1/status"
    ) {
      return sendJson(res, 200, {
        ok: true,
        marker: PILOT_MARKER,
        coordinator_enabled: true,
        executor_enabled: false,
        fixed_award_wc: 3,
        caps: { active_issued: 1, consumed: 0, account_total: 1 },
      });
    }
    if (req.method === "GET" && url.pathname === "/wc/redeemable") {
      balanceCalls += 1;
      const redeemable = balanceCalls === 1 ? 7 : 10;
      return sendJson(res, 200, {
        ok: true,
        account,
        earned: redeemable,
        debited: 0,
        redeemable,
      });
    }
    return sendJson(res, 404, { ok: false, error: "not_found" });
  });

  const executor = await listen(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        nodeId: executorNodeId,
        peers: [coordinatorNodeId],
      });
    }
    if (
      req.method === "GET" &&
      url.pathname === "/wc/public-earning-pilot-v1/status"
    ) {
      return sendJson(res, 200, {
        ok: true,
        marker: PILOT_MARKER,
        coordinator_enabled: false,
        executor_enabled: true,
        fixed_award_wc: 3,
        caps: { active_issued: 0, consumed: 0, account_total: 0 },
      });
    }
    if (
      req.method === "POST" &&
      url.pathname === "/wc/public-earning-pilot-v1/execute-local"
    ) {
      assert.equal(url.searchParams.get("dry"), "0");
      assert.equal(
        url.searchParams.get("confirm"),
        "wcPublicEarningPilotExecuteLocal",
      );
      const body = JSON.parse(await readBody(req));
      assert.equal(body.capability_token, expectedToken);
      assert.equal(body.coordinator_base, coordinator.base);
      assert.equal(body.ticket.ticket_id, expectedTicketId);
      executeCalls += 1;
      if (forceTokenEchoError) {
        return sendJson(res, 500, {
          ok: false,
          error: `reflected:${body.capability_token}`,
        });
      }
      return sendJson(res, 200, {
        ok: true,
        marker: PILOT_MARKER,
        remote_executor: true,
        local_node_id: executorNodeId,
        ticket_id: expectedTicketId,
        job_id: "job_participant_cli_v1_proof",
        receipt_id: "rcpt_participant_cli_v1_proof",
        dataset_id: "ds_participant_cli_v1_proof",
        coordinator: {
          ok: true,
          marker: PILOT_MARKER,
          remote_executor: true,
          executor_node_id: executorNodeId,
          signature_verified: true,
          remote_health_verified: true,
          remote_job_verified: true,
          remote_receipt_verified: true,
          capability_consumed: true,
          ticket_id: expectedTicketId,
          account,
          dataset_id: "ds_participant_cli_v1_proof",
          wc: {
            before: 7,
            after: 10,
            delta: 3,
            fixed_award_wc: 3,
            canonical_redeemable: true,
          },
          acceptance: { credited: true, duplicate: false },
          completed_ticket_status: "completed",
          money_movement: false,
        },
        participant_selected_award: false,
        automatic_background_loop: false,
        money_movement: false,
      });
    }
    return sendJson(res, 404, { ok: false, error: "not_found" });
  });

  try {
    const successTicket = writeTicket(tmp, "ticket-success.json", {
      account,
      executorNodeId,
    });
    expectedTicketId = String(successTicket.ticket.ticket_id);
    expectedToken = successTicket.token;
    balanceCalls = 0;
    executeCalls = 0;

    const success = await runCli(
      [successTicket.file, coordinator.base, coordinatorNodeId],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
        VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
      },
    );

    assert.equal(success.code, 0, success.stderr || success.stdout);
    assert.match(
      success.stdout,
      /VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1_EARNED_3_WC_EXACT_GREEN/,
    );
    assert.equal(executeCalls, 1);
    assert.equal(balanceCalls, 2);
    assert.equal(fs.existsSync(successTicket.file), false);
    assert.equal(success.stdout.includes(successTicket.token), false);
    assert.equal(success.stderr.includes(successTicket.token), false);

    const receiptMatch = success.stdout.match(/^receipt=(.+)$/m);
    need(receiptMatch, "success receipt path missing");
    const receiptPath = receiptMatch[1].trim();
    need(fs.existsSync(receiptPath), "success receipt file missing");
    assert.equal(fs.statSync(receiptPath).mode & 0o777, 0o600);
    const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    assert.equal(receipt.marker, MARKER);
    assert.equal(receipt.ticket_id, expectedTicketId);
    assert.equal(receipt.wc.delta, 3);
    assert.equal(receipt.capability_consumed, true);
    assert.equal(receipt.money_movement, false);
    assert.equal(JSON.stringify(receipt).includes(successTicket.token), false);

    const privateMatch = success.stdout.match(/^private_response=(.+)$/m);
    need(privateMatch, "private response path missing");
    assert.equal(fs.statSync(privateMatch[1].trim()).mode & 0o777, 0o600);

    const reflected = writeTicket(tmp, "ticket-reflected-error.json", {
      account,
      executorNodeId,
    });
    expectedTicketId = String(reflected.ticket.ticket_id);
    expectedToken = reflected.token;
    forceTokenEchoError = true;
    const reflectedResult = await runCli(
      [reflected.file, coordinator.base, coordinatorNodeId],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
        VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
      },
    );
    forceTokenEchoError = false;
    assert.notEqual(reflectedResult.code, 0);
    assert.match(reflectedResult.stderr, /HTTP 500/);
    assert.equal(fs.existsSync(reflected.file), true);
    assert.equal(
      `${reflectedResult.stdout}${reflectedResult.stderr}`.includes(
        reflected.token,
      ),
      false,
    );
    for (const name of fs.readdirSync(stateDir)) {
      const file = path.join(stateDir, name);
      if (!fs.statSync(file).isFile()) continue;
      assert.equal(
        fs.readFileSync(file, "utf8").includes(reflected.token),
        false,
        `reflected token retained in ${name}`,
      );
    }

    const unsafeBase = writeTicket(tmp, "ticket-unsafe-base.json", {
      account,
      executorNodeId,
    });
    const executeBeforeUnsafeBase = executeCalls;
    const unsafeBaseResult = await runCli(
      [unsafeBase.file, "http://example.com", coordinatorNodeId],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
        VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
      },
    );
    assert.notEqual(unsafeBaseResult.code, 0);
    assert.match(
      unsafeBaseResult.stderr,
      /use HTTPS or loopback\/Tailscale HTTP/,
    );
    assert.equal(fs.existsSync(unsafeBase.file), true);
    assert.equal(executeCalls, executeBeforeUnsafeBase);

    const wrongCoordinator = writeTicket(tmp, "ticket-wrong-coordinator.json", {
      account,
      executorNodeId,
    });
    const executeBeforeWrongCoordinator = executeCalls;
    const wrongCoordinatorResult = await runCli(
      [
        wrongCoordinator.file,
        coordinator.base,
        "88888888888888888888888888888888",
      ],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
        VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
      },
    );
    assert.notEqual(wrongCoordinatorResult.code, 0);
    assert.match(
      wrongCoordinatorResult.stderr,
      /trusted coordinator node identity mismatch/,
    );
    assert.equal(fs.existsSync(wrongCoordinator.file), true);
    assert.equal(executeCalls, executeBeforeWrongCoordinator);
    assert.equal(
      `${wrongCoordinatorResult.stdout}${wrongCoordinatorResult.stderr}`.includes(
        wrongCoordinator.token,
      ),
      false,
    );

    const expired = writeTicket(tmp, "ticket-expired.json", {
      account,
      executorNodeId,
      expiresAtMs: Date.now() - 1,
    });
    const expiredResult = await runCli(
      [expired.file, coordinator.base, coordinatorNodeId],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
        VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
      },
    );
    assert.notEqual(expiredResult.code, 0);
    assert.match(expiredResult.stderr, /ticket is expired/);
    assert.equal(fs.existsSync(expired.file), true);

    const badToken = writeTicket(tmp, "ticket-bad-token.json", {
      account,
      executorNodeId,
      tokenSha: "0".repeat(64),
    });
    const badTokenResult = await runCli(
      [badToken.file, coordinator.base, coordinatorNodeId],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
        VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
      },
    );
    assert.notEqual(badTokenResult.code, 0);
    assert.match(badTokenResult.stderr, /capability token SHA mismatch/);
    assert.equal(fs.existsSync(badToken.file), true);

    const wrongExecutor = writeTicket(tmp, "ticket-wrong-executor.json", {
      account,
      executorNodeId: "cccccccccccccccccccccccccccccccc",
    });
    const wrongExecutorResult = await runCli(
      [wrongExecutor.file, coordinator.base, coordinatorNodeId],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
        VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
      },
    );
    assert.notEqual(wrongExecutorResult.code, 0);
    assert.match(
      wrongExecutorResult.stderr,
      /local node does not match ticket executor identity/,
    );
    assert.equal(fs.existsSync(wrongExecutor.file), true);

    const help = await runCli(["--help"], {
      VOID_WC_PARTICIPANT_HTTP_PORT: String(executor.port),
      VOID_WC_PARTICIPANT_STATE_DIR: stateDir,
    });
    assert.equal(help.code, 0);
    assert.match(help.stdout, /trusted-coordinator-node-id/);

    console.log("VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1_GREEN");
  } finally {
    await Promise.all([close(executor.server), close(coordinator.server)]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
