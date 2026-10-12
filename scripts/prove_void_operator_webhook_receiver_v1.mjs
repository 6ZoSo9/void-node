#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repo = process.cwd();
const receiverPath = path.join(
  repo,
  "ops/public/void-operator-webhook-receiver-v1.mjs",
);
const fixturePath = path.join(
  repo,
  "fixtures/void-operator-webhook-receiver-request-v1.example.json",
);

const temp = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-operator-webhook-receiver-v1-"),
);
const tokenPath = path.join(temp, "token");
const stateDir = path.join(temp, "state");
const healthOutput = path.join(temp, "health.json");
const token = "void-test-token-" + "x".repeat(64);
fs.writeFileSync(tokenPath, token, { mode: 0o600 });

const probe = http.createServer();
await new Promise((resolve) =>
  probe.listen(0, "127.0.0.1", resolve),
);
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));

const payload = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const body = Buffer.from(JSON.stringify(payload), "utf8");
const bodySha = crypto
  .createHash("sha256")
  .update(body)
  .digest("hex");

const child = spawn(process.execPath, [receiverPath], {
  cwd: repo,
  env: {
    ...process.env,
    VOID_OPERATOR_WEBHOOK_RECEIVER_HOST: "127.0.0.1",
    VOID_OPERATOR_WEBHOOK_RECEIVER_PORT: String(port),
    VOID_OPERATOR_WEBHOOK_RECEIVER_TOKEN_FILE: tokenPath,
    VOID_OPERATOR_WEBHOOK_RECEIVER_STATE_DIR: stateDir,
    VOID_OPERATOR_WEBHOOK_RECEIVER_HEALTH_OUTPUT: healthOutput,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk) => {
  stderr += chunk;
});

const base = `http://127.0.0.1:${port}`;
for (let attempt = 0; attempt < 100; attempt += 1) {
  try {
    const response = await fetch(
      `${base}/__void/operator-webhook-receiver-v1/health`,
    );
    if (response.status === 200) break;
  } catch (error) { void error; }
  await new Promise((resolve) => setTimeout(resolve, 25));
  if (attempt === 99) {
    throw new Error(
      `receiver did not start\nstdout=${stdout}\nstderr=${stderr}`,
    );
  }
}

async function request(pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, {
    redirect: "manual",
    ...options,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (error) { void error; }
  return { response, text, json };
}

try {
  {
    const { response, text, json } = await request(
      "/__void/operator-webhook-receiver-v1/health",
    );
    assert.equal(response.status, 200);
    assert.equal(json.marker, "VOID_OPERATOR_WEBHOOK_RECEIVER_HEALTH_V1");
    assert.equal(json.loopback_only, true);
    assert.equal(json.authentication_required, true);
    assert.equal(json.token_content_public, false);
    assert.equal(text.includes(token), false);
  }

  {
    const response = await fetch(
      `${base}/__void/operator-webhook-receiver-v1/health`,
      { method: "HEAD" },
    );
    assert.equal(response.status, 200);
    assert.equal((await response.text()).length, 0);
  }

  {
    const { response } = await request(
      "/__void/operator-notifications/v1/candidate",
    );
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
  }

  {
    const { response, json } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-void-payload-sha256": bodySha,
        },
        body,
      },
    );
    assert.equal(response.status, 401);
    assert.equal(json.error, "bearer_authorization_required");
  }

  {
    const { response } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: "Bearer wrong-token-value-that-is-long-enough",
          "content-type": "application/json",
          "x-void-payload-sha256": bodySha,
        },
        body,
      },
    );
    assert.equal(response.status, 401);
  }

  {
    const { response } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "text/plain",
          "x-void-payload-sha256": bodySha,
        },
        body,
      },
    );
    assert.equal(response.status, 415);
  }

  {
    const { response, json } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": "0".repeat(64),
        },
        body,
      },
    );
    assert.equal(response.status, 400);
    assert.equal(json.error, "payload_sha256_mismatch");
  }

  {
    const invalid = Buffer.from("{", "utf8");
    const invalidSha = crypto
      .createHash("sha256")
      .update(invalid)
      .digest("hex");
    const { response, json } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": invalidSha,
        },
        body: invalid,
      },
    );
    assert.equal(response.status, 400);
    assert.equal(json.error, "invalid_json");
  }

  {
    const invalidPayload = {
      ...payload,
      authority: {
        ...payload.authority,
        wallet_access: true,
      },
    };
    const invalidBody = Buffer.from(
      JSON.stringify(invalidPayload),
      "utf8",
    );
    const invalidSha = crypto
      .createHash("sha256")
      .update(invalidBody)
      .digest("hex");
    const { response, json } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": invalidSha,
        },
        body: invalidBody,
      },
    );
    assert.equal(response.status, 422);
    assert.equal(
      json.failures.includes("authority_wallet_access"),
      true,
    );
  }

  let acceptedReceiptId;
  {
    const { response, text, json } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": bodySha,
        },
        body,
      },
    );
    assert.equal(response.status, 202);
    assert.equal(json.duplicate, false);
    assert.match(json.receipt_id_sha256, /^[0-9a-f]{64}$/);
    assert.equal(json.activation_performed, false);
    assert.equal(json.money_movement, false);
    assert.equal(text.includes(token), false);
    acceptedReceiptId = json.receipt_id_sha256;
  }

  const receiptDir = path.join(stateDir, "receipts");
  const receiptFiles = fs.readdirSync(receiptDir);
  assert.equal(receiptFiles.length, 1);
  const receipt = JSON.parse(
    fs.readFileSync(
      path.join(receiptDir, receiptFiles[0]),
      "utf8",
    ),
  );
  assert.equal(
    receipt.marker,
    "VOID_OPERATOR_WEBHOOK_RECEIVER_RECEIPT_V1",
  );
  assert.equal(receipt.receipt_id_sha256, acceptedReceiptId);
  assert.equal(receipt.authorization_verified, true);
  assert.equal(receipt.authority.wallet_access, false);
  assert.equal(receipt.authority.signing, false);
  assert.equal(receipt.authority.transaction_broadcast, false);
  assert.equal(receipt.authority.money_movement, false);
  assert.equal(JSON.stringify(receipt).includes(token), false);

  {
    const { response, json } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": bodySha,
        },
        body,
      },
    );
    assert.equal(response.status, 200);
    assert.equal(json.duplicate, true);
    assert.equal(json.receipt_id_sha256, acceptedReceiptId);
    assert.equal(fs.readdirSync(receiptDir).length, 1);
  }

  {
    const conflict = {
      ...payload,
      plan_fingerprint_sha256: "9".repeat(64),
    };
    const conflictBody = Buffer.from(
      JSON.stringify(conflict),
      "utf8",
    );
    const conflictSha = crypto
      .createHash("sha256")
      .update(conflictBody)
      .digest("hex");
    const { response, json } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": conflictSha,
        },
        body: conflictBody,
      },
    );
    assert.equal(response.status, 409);
    assert.equal(json.error, "notification_payload_conflict");
    assert.equal(fs.readdirSync(receiptDir).length, 1);
  }

  {
    const tooLarge = Buffer.alloc(65537, 0x61);
    const tooLargeSha = crypto
      .createHash("sha256")
      .update(tooLarge)
      .digest("hex");
    const { response } = await request(
      "/__void/operator-notifications/v1/candidate",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-void-payload-sha256": tooLargeSha,
        },
        body: tooLarge,
      },
    );
    assert.equal(response.status, 413);
  }

  const health = JSON.parse(fs.readFileSync(healthOutput, "utf8"));
  assert.equal(health.receipt_count, 1);
  assert.equal(health.authority.wallet_access, false);
  assert.equal(health.authority.signing, false);
  assert.equal(health.authority.transaction_broadcast, false);
  assert.equal(health.authority.money_movement, false);
  assert.equal(JSON.stringify(health).includes(token), false);
  assert.equal(stdout.includes(token), false);
  assert.equal(stderr.includes(token), false);

  console.log("VOID_OPERATOR_WEBHOOK_RECEIVER_V1_GREEN");
  console.log("loopback_only=1");
  console.log("bearer_authentication=1");
  console.log("payload_sha256_binding=1");
  console.log("maximum_body_bytes=65536");
  console.log("append_once_receipt=1");
  console.log("identical_duplicate_suppressed=1");
  console.log("conflicting_duplicate_rejected=1");
  console.log("token_output=0");
  console.log("activation_performed=0");
  console.log("wallet_access=0");
  console.log("signing=0");
  console.log("transaction_broadcast=0");
  console.log("money_movement=0");
} finally {
  child.kill("SIGTERM");
  await new Promise((resolve) => {
    child.once("exit", resolve);
    setTimeout(resolve, 1000);
  });
  fs.rmSync(temp, { recursive: true, force: true });
}
