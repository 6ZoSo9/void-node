import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const cli = path.join(
  root,
  "ops",
  "mainnet0",
  "wc-public-ticket-claim-v1.sh",
);
const workflow = path.join(
  root,
  ".github",
  "workflows",
  "wc-public-ticket-claim-v1.yml",
);

function need(condition: unknown, message: string): asserts condition {
  assert.ok(condition, message);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(raw),
  });
  res.end(raw);
}

async function listen(
  handler: (
    req: IncomingMessage,
    res: ServerResponse,
  ) => Promise<void> | void,
): Promise<{ server: http.Server; port: number; base: string }> {
  const server = http.createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      sendJson(res, 500, {
        ok: false,
        error: String(error?.message || error),
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  need(address && typeof address === "object", "server address missing");
  return {
    server,
    port: address.port,
    base: `http://127.0.0.1:${address.port}`,
  };
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
      reject(new Error("public ticket claim CLI proof timed out"));
    }, 25_000);

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

async function main(): Promise<void> {
  need(fs.existsSync(cli), "public ticket claim CLI missing");
  need(fs.existsSync(workflow), "public ticket claim workflow missing");

  const cliText = fs.readFileSync(cli, "utf8");
  const workflowText = fs.readFileSync(workflow, "utf8");

  for (const anchor of [
    "VOID_WC_PUBLIC_TICKET_CLAIM_CLI_V1",
    "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
    "wcPublicTicketClaimSign",
    "/wc/public-earning-pilot-v1/claim-ticket",
    "/download/wc-public-earning-participant-v1.sh",
    "server_selected_work == true",
    "proof_of_executor_key_possession_required == true",
    "participant_selected_award == false",
    "claimed capability token SHA mismatch",
    "ticket_deleted=1",
  ]) {
    need(cliText.includes(anchor), `claim CLI anchor missing: ${anchor}`);
  }
  need(!cliText.includes('echo "$TOKEN"'), "claim CLI must not print token");
  need(!cliText.includes("set -x"), "claim CLI must not enable shell tracing");
  need(
    workflowText.includes("prove_wc_public_ticket_claim_cli_v1.ts"),
    "workflow does not execute claim CLI proof",
  );

  const tmp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-wc-public-ticket-claim-cli-v1-"),
  );
  const stateDir = path.join(tmp, "state");
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });

  const executorNodeId = "b".repeat(32);
  const coordinatorNodeId = "9".repeat(32);
  const expectedInputHash = "2".repeat(64);
  const datasetId = "ds_public_ticket_claim_cli_v1_proof";
  const ticketId = "1".repeat(32);
  const claimId = "3".repeat(64);
  const token = `wcep1.${ticketId}.${"A".repeat(43)}`;
  const tokenSha = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  let signCalls = 0;
  let claimCalls = 0;
  let forceClaimRateLimit = false;

  const fakeParticipantCli = `#!/usr/bin/env bash
set -euo pipefail
ticket="$1"
base="$2"
node="$3"
test "$node" = "${coordinatorNodeId}"
jq -e '
  .ticket.ticket_id == "${ticketId}" and
  .ticket.account == "outside-claim-cli-proof-v1" and
  .ticket.executor_node_id == "${executorNodeId}" and
  .ticket.transport_mode == "outbound_bundle" and
  .ticket.fixed_award_wc == 3 and
  (.capability_token | test("^wcep1\\\\.[0-9a-f]{32}\\\\.[A-Za-z0-9_-]{43}$"))
' "$ticket" >/dev/null
token_now="$(jq -r '.capability_token' "$ticket")"
sha_now="$(printf '%s' "$token_now" | sha256sum | awk '{print $1}')"
test "$sha_now" = "$(jq -r '.ticket.token_sha256' "$ticket")"
rm -f "$ticket"
echo "VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1_EARNED_3_WC_EXACT_GREEN"
`;

  const local = await listen(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        nodeId: executorNodeId,
      });
    }
    if (
      req.method === "GET" &&
      url.pathname === "/wc/public-earning-pilot-v1/status"
    ) {
      return sendJson(res, 200, {
        ok: true,
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        coordinator_enabled: false,
        executor_enabled: true,
        fixed_award_wc: 3,
        caps: { active_issued: 0, consumed: 0, account_total: 0 },
      });
    }
    if (
      req.method === "POST" &&
      url.pathname === "/wc/public-earning-pilot-v1/sign-claim"
    ) {
      assert.equal(url.searchParams.get("dry"), "0");
      assert.equal(
        url.searchParams.get("confirm"),
        "wcPublicTicketClaimSign",
      );
      const body = JSON.parse(await readBody(req));
      assert.equal(body.account, "outside-claim-cli-proof-v1");
      signCalls += 1;
      return sendJson(res, 200, {
        ok: true,
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        local_node_id: executorNodeId,
        claim: {
          domain: "void:mainnet-0:wc-public-ticket-claim-v1",
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          version: 1,
          account: body.account,
          executor_node_id: executorNodeId,
          executor_pubkey:
            "-----BEGIN PUBLIC KEY-----\n" +
            "MCowBQYDK2VwAyEA" +
            "A".repeat(44) +
            "\n-----END PUBLIC KEY-----\n",
          claim_nonce: "4".repeat(32),
          claim_ts_ms: Date.now(),
        },
        signature: {
          alg: "ed25519",
          key_id: executorNodeId,
          sig: "5".repeat(128),
        },
        ticket_issued: false,
        wc_written: false,
        money_movement: false,
      });
    }
    return sendJson(res, 404, { ok: false, error: "not_found" });
  });

  const coordinator = await listen(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        nodeId: coordinatorNodeId,
      });
    }
    if (
      req.method === "GET" &&
      url.pathname === "/wc/public-earning-pilot-v1/status"
    ) {
      return sendJson(res, 200, {
        ok: true,
        marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
        coordinator_enabled: true,
        executor_enabled: false,
        fixed_award_wc: 3,
        caps: { active_issued: 0, consumed: 0, account_total: 0 },
        public_claim: {
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          enabled: true,
          available: true,
          server_selected_work: true,
          proof_of_executor_key_possession_required: true,
          transport_mode: "outbound_bundle",
          fixed_award_wc: 3,
          participant_selected_dataset: false,
          participant_selected_input_hash: false,
          participant_selected_award: false,
          money_movement: false,
        },
      });
    }
    if (
      req.method === "POST" &&
      url.pathname === "/wc/public-earning-pilot-v1/claim-ticket"
    ) {
      claimCalls += 1;
      const body = JSON.parse(await readBody(req));
      assert.deepEqual(Object.keys(body).sort(), ["claim", "signature"]);
      assert.equal(body.claim.account, "outside-claim-cli-proof-v1");
      assert.equal(body.claim.executor_node_id, executorNodeId);
      assert.equal(body.signature.key_id, executorNodeId);
      if (forceClaimRateLimit) {
        return sendJson(res, 429, {
          ok: false,
          marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
          error: "public_claim_account_cooldown",
        });
      }
      return sendJson(res, 201, {
        ok: true,
        marker: "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
        claim_id: claimId,
        claim_request_verified: true,
        executor_key_possession_verified: true,
        server_selected_work: true,
        ticket: {
          marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
          version: 1,
          ticket_id: ticketId,
          account: "outside-claim-cli-proof-v1",
          task_class: "datanet_fetch_verify",
          executor_node_id: executorNodeId,
          executor_http_base: "",
          transport_mode: "outbound_bundle",
          dataset_id: datasetId,
          expected_input_hash: expectedInputHash,
          token_sha256: tokenSha,
          nonce: "6".repeat(32),
          issued_at_ms: Date.now(),
          expires_at_ms: Date.now() + 300_000,
          max_uses: 1,
          status: "issued",
          public_submit_route:
            "/wc/public-earning-pilot-v1/submit-result",
          local_execute_route:
            "/wc/public-earning-pilot-v1/execute-local",
          issuance_source: "public_claim",
          public_claim_id: claimId,
          fixed_award_wc: 3,
        },
        capability_token: token,
        capability_token_returned_once: true,
        fixed_award_wc: 3,
        participant_selected_dataset: false,
        participant_selected_input_hash: false,
        participant_selected_award: false,
        generic_job_submit: false,
        wallet_send: false,
        wc_to_void: false,
        buy_void_fulfillment: false,
        money_movement: false,
      });
    }
    if (
      req.method === "GET" &&
      url.pathname === "/download/wc-public-earning-participant-v1.sh"
    ) {
      res.writeHead(200, {
        "content-type": "text/x-shellscript",
      });
      res.end(fakeParticipantCli);
      return;
    }
    return sendJson(res, 404, { ok: false, error: "not_found" });
  });

  try {
    const success = await runCli(
      [
        "outside-claim-cli-proof-v1",
        coordinator.base,
        coordinatorNodeId,
      ],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(local.port),
        VOID_WC_PUBLIC_CLAIM_STATE_DIR: stateDir,
      },
    );

    assert.equal(success.code, 0, success.stderr || success.stdout);
    assert.match(
      success.stdout,
      /VOID_WC_PUBLIC_TICKET_CLAIM_CLI_V1_EARNED_3_WC_EXACT_GREEN/,
    );
    assert.match(
      success.stdout,
      /VOID_WC_PUBLIC_EARNING_PARTICIPANT_CLI_V1_EARNED_3_WC_EXACT_GREEN/,
    );
    assert.equal(signCalls, 1);
    assert.equal(claimCalls, 1);
    assert.equal(success.stdout.includes(token), false);
    assert.equal(success.stderr.includes(token), false);

    const incoming = path.join(stateDir, "incoming");
    assert.equal(
      fs.existsSync(incoming)
        ? fs.readdirSync(incoming).filter((name) => name.endsWith(".json"))
            .length
        : 0,
      0,
    );

    for (const file of fs.readdirSync(path.join(stateDir, "bin"))) {
      assert.equal(
        fs.readFileSync(path.join(stateDir, "bin", file), "utf8")
          .includes(token),
        false,
      );
    }

    const beforeWrong = { signCalls, claimCalls };
    const wrongCoordinator = await runCli(
      [
        "outside-claim-cli-proof-v1",
        coordinator.base,
        "8".repeat(32),
      ],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(local.port),
        VOID_WC_PUBLIC_CLAIM_STATE_DIR: stateDir,
      },
    );
    assert.notEqual(wrongCoordinator.code, 0);
    assert.match(
      wrongCoordinator.stderr,
      /trusted coordinator node identity mismatch/,
    );
    assert.deepEqual(
      { signCalls, claimCalls },
      beforeWrong,
    );

    forceClaimRateLimit = true;
    const limited = await runCli(
      [
        "outside-claim-cli-proof-v1",
        coordinator.base,
        coordinatorNodeId,
      ],
      {
        VOID_WC_PARTICIPANT_HTTP_PORT: String(local.port),
        VOID_WC_PUBLIC_CLAIM_STATE_DIR: stateDir,
      },
    );
    assert.notEqual(limited.code, 0);
    assert.match(limited.stderr, /HTTP 429/);
    assert.equal(limited.stdout.includes(token), false);
    assert.equal(limited.stderr.includes(token), false);

    console.log("VOID_WC_PUBLIC_TICKET_CLAIM_CLI_V1_GREEN");
  } finally {
    await Promise.all([close(local.server), close(coordinator.server)]);
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exitCode = 1;
});
