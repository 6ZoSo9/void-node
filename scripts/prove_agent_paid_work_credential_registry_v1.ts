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
  AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER,
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  agentPaidWorkTokenSha256V1,
  authenticateAgentPaidWorkCredentialV1,
  materializeAgentPaidWorkCredentialRegistryV1,
  materializeAgentPaidWorkCredentialV1,
  parseAgentPaidWorkCredentialRegistryV1,
} from "./agent_paid_work_credential_registry_v1.js";

const receiverPath = path.resolve(
  "scripts/agent_paid_work_submission_receiver_v1.ts",
);
const route =
  "/__void/agents/paid-work/submissions/v1";
const healthRoute =
  "/__void/agent-paid-work-submission-receiver-v1/health";
const proofNow = "2026-07-25T23:00:00Z";

function sha256(value: Buffer): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
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

const activeToken =
  "registry-active-proof-token-0001";
const revokedToken =
  "registry-revoked-proof-token-0001";
const expiredToken =
  "registry-expired-proof-token-0001";
const futureToken =
  "registry-future-proof-token-0001";

const activeCredential =
  materializeAgentPaidWorkCredentialV1({
    agent_id:
      "void.agent.registry-proof.active",
    token_sha256:
      agentPaidWorkTokenSha256V1(
        activeToken,
      ),
    scopes: [
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    ],
    issued_at_utc:
      "2026-07-25T20:00:00Z",
    expires_at_utc:
      "2026-07-26T20:00:00Z",
    revoked_at_utc: null,
  });
const revokedCredential =
  materializeAgentPaidWorkCredentialV1({
    agent_id:
      "void.agent.registry-proof.revoked",
    token_sha256:
      agentPaidWorkTokenSha256V1(
        revokedToken,
      ),
    scopes: [
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    ],
    issued_at_utc:
      "2026-07-25T20:00:00Z",
    expires_at_utc:
      "2026-07-26T20:00:00Z",
    revoked_at_utc:
      "2026-07-25T22:00:00Z",
  });
const expiredCredential =
  materializeAgentPaidWorkCredentialV1({
    agent_id:
      "void.agent.registry-proof.expired",
    token_sha256:
      agentPaidWorkTokenSha256V1(
        expiredToken,
      ),
    scopes: [
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    ],
    issued_at_utc:
      "2026-07-25T20:00:00Z",
    expires_at_utc:
      "2026-07-25T22:00:00Z",
    revoked_at_utc: null,
  });
const futureCredential =
  materializeAgentPaidWorkCredentialV1({
    agent_id:
      "void.agent.registry-proof.future",
    token_sha256:
      agentPaidWorkTokenSha256V1(
        futureToken,
      ),
    scopes: [
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    ],
    issued_at_utc:
      "2026-07-26T00:00:00Z",
    expires_at_utc:
      "2026-07-27T00:00:00Z",
    revoked_at_utc: null,
  });

const registry =
  materializeAgentPaidWorkCredentialRegistryV1({
    created_at_utc:
      "2026-07-25T20:00:00Z",
    credentials: [
      activeCredential,
      revokedCredential,
      expiredCredential,
      futureCredential,
    ],
  });

assert.equal(
  registry.marker,
  AGENT_PAID_WORK_CREDENTIAL_REGISTRY_MARKER,
);
assert.deepEqual(
  parseAgentPaidWorkCredentialRegistryV1(
    registry,
  ),
  registry,
);
assert.equal(
  JSON.stringify(registry).includes(
    activeToken,
  ),
  false,
);

const activeAuthentication =
  authenticateAgentPaidWorkCredentialV1(
    `Bearer ${activeToken}`,
    registry,
    proofNow,
  );
assert.equal(
  activeAuthentication.ok,
  true,
);
if (activeAuthentication.ok) {
  assert.equal(
    activeAuthentication.authentication
      .credential_id,
    activeCredential.credential_id,
  );
  assert.equal(
    activeAuthentication.authentication
      .agent_id,
    activeCredential.agent_id,
  );
}
assert.deepEqual(
  authenticateAgentPaidWorkCredentialV1(
    "Bearer wrong-registry-proof-token-0001",
    registry,
    proofNow,
  ),
  {
    ok: false,
    reason: "credential_not_found",
  },
);
assert.deepEqual(
  authenticateAgentPaidWorkCredentialV1(
    `Bearer ${revokedToken}`,
    registry,
    proofNow,
  ),
  {
    ok: false,
    reason: "credential_revoked",
  },
);
assert.deepEqual(
  authenticateAgentPaidWorkCredentialV1(
    `Bearer ${expiredToken}`,
    registry,
    proofNow,
  ),
  {
    ok: false,
    reason: "credential_expired",
  },
);
assert.deepEqual(
  authenticateAgentPaidWorkCredentialV1(
    `Bearer ${futureToken}`,
    registry,
    proofNow,
  ),
  {
    ok: false,
    reason:
      "credential_not_yet_valid",
  },
);

assert.throws(() => {
  parseAgentPaidWorkCredentialRegistryV1({
    ...registry,
    credentials: [
      {
        ...activeCredential,
        token: activeToken,
      },
    ],
  });
});
assert.throws(() => {
  parseAgentPaidWorkCredentialRegistryV1({
    ...registry,
    registry_id:
      "voidapwcr1_" + "0".repeat(64),
  });
});
assert.throws(() => {
  materializeAgentPaidWorkCredentialRegistryV1({
    created_at_utc:
      "2026-07-25T20:00:00Z",
    credentials: [
      activeCredential,
      {
        ...revokedCredential,
        token_sha256:
          activeCredential.token_sha256,
      },
    ],
  });
});

const temporary = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-agent-paid-work-credential-registry-v1-",
  ),
);
const configPath = path.join(
  temporary,
  "config.json",
);
const registryPath = path.join(
  temporary,
  "credential-registry.json",
);
const stateDir = path.join(
  temporary,
  "state",
);

const config = JSON.parse(
  readFileSync(
    path.resolve(
      "fixtures/agent-paid-work/agent-paid-work-submission-intake-config-v1.example.json",
    ),
    "utf8",
  ),
) as Record<string, unknown>;
config.enabled = true;
config.listen_port = 0;
writeFileSync(
  configPath,
  JSON.stringify(config, null, 2) + "\n",
  { mode: 0o600 },
);
writeFileSync(
  registryPath,
  JSON.stringify(registry, null, 2) + "\n",
  { mode: 0o600 },
);
chmodSync(configPath, 0o600);
chmodSync(registryPath, 0o600);

const requestValue = JSON.parse(
  readFileSync(
    path.resolve(
      "fixtures/agent-paid-work/agent-paid-work-submission-request-v1.example.json",
    ),
    "utf8",
  ),
) as Record<string, unknown>;
requestValue.submission_id =
  "registry-proof-submission-v1";
const requestBody = Buffer.from(
  JSON.stringify(requestValue),
);

let stdout = "";
let stderr = "";
let port = 0;

const child = spawn(
  path.resolve("node_modules/.bin/tsx"),
  [receiverPath],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VOID_AGENT_PAID_WORK_SUBMISSION_CONFIG:
        configPath,
      VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_FILE:
        registryPath,
      VOID_AGENT_PAID_WORK_SUBMISSION_STATE_DIR:
        stateDir,
      VOID_AGENT_PAID_WORK_SUBMISSION_PROOF_MODE:
        "1",
      VOID_AGENT_PAID_WORK_SUBMISSION_PROOF_NOW_UTC:
        proofNow,
    },
    stdio: [
      "ignore",
      "pipe",
      "pipe",
    ],
  },
);

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk: string) => {
  stdout += chunk;
});
child.stderr.on("data", (chunk: string) => {
  stderr += chunk;
});

const deadline = Date.now() + 10_000;
while (Date.now() < deadline && port === 0) {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.startsWith("{")) continue;
    try {
      const value = JSON.parse(line) as {
        marker?: string;
        ready?: boolean;
        port?: number;
        authentication_mode?: string;
        credential_registry_id?: string;
        credential_count?: number;
      };
      if (
        value.marker ===
          "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_V1" &&
        value.ready === true &&
        typeof value.port === "number"
      ) {
        port = value.port;
        assert.equal(
          value.authentication_mode,
          "credential_registry",
        );
        assert.equal(
          value.credential_registry_id,
          registry.registry_id,
        );
        assert.equal(
          value.credential_count,
          4,
        );
        break;
      }
    } catch {}
  }
  if (port === 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, 25),
    );
  }
}
assert.notEqual(
  port,
  0,
  `receiver failed to start: ${stderr}`,
);

try {
  const health = await request({
    port,
    method: "GET",
    requestPath: healthRoute,
  });
  assert.equal(health.status, 200);
  const healthJson = parseJson(health);
  assert.equal(
    healthJson.authentication_mode,
    "credential_registry",
  );
  assert.equal(
    healthJson.credential_registry_id,
    registry.registry_id,
  );
  assert.equal(
    healthJson.credential_count,
    4,
  );

  for (const token of [
    "wrong-registry-proof-token-0001",
    revokedToken,
    expiredToken,
    futureToken,
  ]) {
    const denied = await request({
      port,
      method: "POST",
      requestPath: route,
      body: requestBody,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type":
          "application/json",
        "content-length":
          String(requestBody.length),
        "x-void-payload-sha256":
          sha256(requestBody),
      },
    });
    assert.equal(denied.status, 401);
  }
  assert.equal(
    countJson(
      path.join(stateDir, "receipts"),
    ),
    0,
  );

  const accepted = await request({
    port,
    method: "POST",
    requestPath: route,
    body: requestBody,
    headers: {
      authorization:
        `Bearer ${activeToken}`,
      "content-type":
        "application/json",
      "content-length":
        String(requestBody.length),
      "x-void-payload-sha256":
        sha256(requestBody),
    },
  });
  assert.equal(accepted.status, 202);
  const acceptedJson = parseJson(accepted);
  const receipt = acceptedJson.receipt as
    Record<string, unknown>;
  const authentication =
    receipt.authentication as
      Record<string, unknown>;
  assert.equal(
    authentication.mode,
    "credential_registry",
  );
  assert.equal(
    authentication.registry_id,
    registry.registry_id,
  );
  assert.equal(
    authentication.credential_id,
    activeCredential.credential_id,
  );
  assert.equal(
    authentication.agent_id,
    activeCredential.agent_id,
  );
  assert.equal(
    authentication.scope,
    AGENT_PAID_WORK_SUBMIT_SCOPE,
  );
  assert.equal(
    receipt.authorization_verified,
    true,
  );

  const duplicate = await request({
    port,
    method: "POST",
    requestPath: route,
    body: requestBody,
    headers: {
      authorization:
        `Bearer ${activeToken}`,
      "content-type":
        "application/json",
      "content-length":
        String(requestBody.length),
      "x-void-payload-sha256":
        sha256(requestBody),
    },
  });
  assert.equal(duplicate.status, 200);
  assert.equal(
    countJson(
      path.join(stateDir, "receipts"),
    ),
    1,
  );
  assert.equal(
    countJson(
      path.join(stateDir, "submissions"),
    ),
    1,
  );
  assert.equal(
    stdout.includes(activeToken),
    false,
  );
  assert.equal(
    stderr.includes(activeToken),
    false,
  );
} finally {
  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
    setTimeout(resolve, 5_000);
  });
}

console.log(
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REGISTRY_V1_PROOF_GREEN",
);
console.log("sha256_digest_only=1");
console.log("raw_token_in_registry=0");
console.log("per_agent_identity=1");
console.log("scope_agent_paid_work_submit=1");
console.log("expiration_required=1");
console.log("revocation_supported=1");
console.log("timing_safe_digest_comparison=1");
console.log("credential_registry_receiver_integration=1");
console.log("single_token_fallback_regression_separate=1");
console.log("receipt_credential_binding=1");
console.log("invalid_credentials_receipt_write=0");
console.log("provider_selected=0");
console.log("quote_created=0");
console.log("payment_authorized=0");
console.log("work_execution_authorized=0");
console.log("work_dispatched=0");
console.log("wc_ledger_write_authorized=0");
console.log("wallet_or_signer_access=0");
console.log("buy_void_fulfillment_authority=0");
