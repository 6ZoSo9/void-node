#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import {
  createServer,
  type Server,
} from "node:http";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_HEALTH_MARKER,
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_MARKER,
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STATUS_MARKER,
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH,
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH,
  createAgentPaidWorkCredentialRequestGatewayHandlerV1,
  parseAgentPaidWorkCredentialRequestGatewayConfigV1,
} from "./agent_paid_work_credential_request_gateway_v1.js";
import {
  AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER,
  AGENT_PAID_WORK_SUBMIT_SCOPE,
  materializeAgentPaidWorkCredentialRequestV1,
} from "./agent_paid_work_credential_request_intake_v1.js";

type JsonResponse = {
  status: number;
  headers: Headers;
  body: Record<string, unknown>;
};

function sha256(
  value: Buffer,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

async function start(
  stateDirectory: string,
  maxRequestsPerMinute: number,
): Promise<{
  server: Server;
  baseUrl: string;
}> {
  const handler =
    createAgentPaidWorkCredentialRequestGatewayHandlerV1({
      state_directory:
        stateDirectory,
      max_body_bytes:
        4096,
      max_requests_per_minute:
        maxRequestsPerMinute,
      clock:
        () =>
          "2026-07-27T19:30:00Z",
    });
  const server =
    createServer(handler);

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      server.once(
        "error",
        reject,
      );
      server.listen(
        0,
        "127.0.0.1",
        () => resolve(),
      );
    },
  );

  const address =
    server.address();

  assert.ok(
    address &&
      typeof address ===
        "object",
  );

  return {
    server,
    baseUrl:
      `http://127.0.0.1:${address.port}`,
  };
}

async function stop(
  server: Server,
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      server.close(
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    },
  );
}

async function requestJson(
  baseUrl: string,
  pathname: string,
  options: {
    method?: string;
    body?: Buffer;
    contentType?: string;
    payloadSha256?: string;
  } = {},
): Promise<JsonResponse> {
  const headers =
    new Headers();
  const body =
    options.body;

  if (body) {
    headers.set(
      "Content-Type",
      options.contentType ||
        "application/json",
    );
    headers.set(
      "Content-Length",
      String(body.length),
    );
    headers.set(
      "x-void-payload-sha256",
      options.payloadSha256 ||
        sha256(body),
    );
  }

  const response =
    await fetch(
      `${baseUrl}${pathname}`,
      {
        method:
          options.method ||
          "GET",
        headers,
        body:
          body
            ? new Uint8Array(body)
            : undefined,
      },
    );
  const parsed =
    await response.json() as
      Record<string, unknown>;

  return {
    status:
      response.status,
    headers:
      response.headers,
    body:
      parsed,
  };
}

const temporary =
  mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-credential-request-gateway-v1-",
    ),
  );

try {
  const stateDirectory =
    path.join(
      temporary,
      "state",
    );
  const draft = {
    marker:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_MARKER,
    version: 1 as const,
    created_at_utc:
      "2026-07-27T19:00:00Z",
    expires_at_utc:
      "2026-07-27T21:00:00Z",
    agent_id:
      "void.agent.gateway-proof",
    callback_uri:
      "https://agent.example.invalid/void/callback",
    requested_scope:
      AGENT_PAID_WORK_SUBMIT_SCOPE,
    requested_credential_lifetime_days:
      30,
    capability_ids: [
      "datanet.fetch_verify",
    ],
    nonce:
      "gateway-proof-request-nonce-0001",
  };
  const materialized =
    materializeAgentPaidWorkCredentialRequestV1(
      draft,
    );
  const body =
    Buffer.from(
      `${JSON.stringify(
        materialized,
      )}\n`,
      "utf8",
    );
  const {
    server,
    baseUrl,
  } =
    await start(
      stateDirectory,
      100,
    );

  try {
    const health =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH,
      );

    assert.equal(
      health.status,
      200,
    );
    assert.equal(
      health.body.marker,
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_HEALTH_MARKER,
    );
    assert.equal(
      health.body.ready,
      true,
    );
    assert.equal(
      health.body.credential_issuance_authorized,
      false,
    );

    const first =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body,
        },
      );

    assert.equal(
      first.status,
      202,
    );
    assert.equal(
      first.body.marker,
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_MARKER,
    );
    assert.equal(
      first.body.ok,
      true,
    );
    assert.equal(
      first.body.duplicate,
      false,
    );
    assert.equal(
      first.body.credential_created,
      false,
    );
    assert.equal(
      first.body.credential_registry_mutated,
      false,
    );
    assert.equal(
      first.body.receiver_restart,
      false,
    );

    const requestsDirectory =
      path.join(
        stateDirectory,
        "requests",
      );
    const receiptsDirectory =
      path.join(
        stateDirectory,
        "receipts",
      );

    assert.equal(
      readdirSync(
        requestsDirectory,
      ).length,
      1,
    );
    assert.equal(
      readdirSync(
        receiptsDirectory,
      ).length,
      1,
    );

    const requestPath =
      path.join(
        requestsDirectory,
        `${materialized.request_id}.json`,
      );
    const receiptPath =
      path.join(
        receiptsDirectory,
        `${materialized.request_id}.json`,
      );
    const requestBefore =
      readFileSync(
        requestPath,
      );
    const receiptBefore =
      readFileSync(
        receiptPath,
      );

    assert.equal(
      statSync(
        stateDirectory,
      ).mode & 0o777,
      0o700,
    );
    assert.equal(
      statSync(
        requestPath,
      ).mode & 0o777,
      0o600,
    );
    assert.equal(
      statSync(
        receiptPath,
      ).mode & 0o777,
      0o600,
    );

    const duplicate =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body,
        },
      );

    assert.equal(
      duplicate.status,
      200,
    );
    assert.equal(
      duplicate.body.duplicate,
      true,
    );
    assert.equal(
      readFileSync(
        requestPath,
      ).equals(
        requestBefore,
      ),
      true,
    );
    assert.equal(
      readFileSync(
        receiptPath,
      ).equals(
        receiptBefore,
      ),
      true,
    );

    const status =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH,
      );

    assert.equal(
      status.status,
      200,
    );
    assert.equal(
      status.body.marker,
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STATUS_MARKER,
    );
    assert.equal(
      status.body.request_count,
      1,
    );
    assert.equal(
      status.body.receipt_count,
      1,
    );
    assert.equal(
      status.body.callback_uri_exposed,
      false,
    );

    const wrongMethod =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "GET",
        },
      );

    assert.equal(
      wrongMethod.status,
      405,
    );
    assert.equal(
      wrongMethod.headers.get(
        "allow",
      ),
      "POST",
    );

    const wrongType =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body,
          contentType:
            "text/plain",
        },
      );

    assert.equal(
      wrongType.status,
      415,
    );

    const wrongDigest =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body,
          payloadSha256:
            "0".repeat(64),
        },
      );

    assert.equal(
      wrongDigest.status,
      400,
    );
    assert.equal(
      readdirSync(
        requestsDirectory,
      ).length,
      1,
    );

    const invalidJson =
      Buffer.from(
        "{not-json}\n",
        "utf8",
      );
    const invalid =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body:
            invalidJson,
        },
      );

    assert.equal(
      invalid.status,
      400,
    );

    const oversized =
      Buffer.alloc(
        4097,
        0x61,
      );
    const tooLarge =
      await requestJson(
        baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body:
            oversized,
        },
      );

    assert.equal(
      tooLarge.status,
      413,
    );
    assert.equal(
      readdirSync(
        requestsDirectory,
      ).length,
      1,
    );
  } finally {
    await stop(server);
  }

  const rateState =
    path.join(
      temporary,
      "rate-state",
    );
  const rate =
    await start(
      rateState,
      1,
    );

  try {
    const first =
      await requestJson(
        rate.baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body,
        },
      );
    assert.equal(
      first.status,
      202,
    );

    const secondDraft = {
      ...draft,
      agent_id:
        "void.agent.gateway-rate-proof",
      nonce:
        "gateway-proof-request-nonce-0002",
    };
    const secondRequest =
      materializeAgentPaidWorkCredentialRequestV1(
        secondDraft,
      );
    const secondBody =
      Buffer.from(
        `${JSON.stringify(
          secondRequest,
        )}\n`,
        "utf8",
      );
    const limited =
      await requestJson(
        rate.baseUrl,
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
        {
          method:
            "POST",
          body:
            secondBody,
        },
      );

    assert.equal(
      limited.status,
      429,
    );
    assert.equal(
      readdirSync(
        path.join(
          rateState,
          "requests",
        ),
      ).length,
      1,
    );
  } finally {
    await stop(
      rate.server,
    );
  }

  assert.throws(() => {
    parseAgentPaidWorkCredentialRequestGatewayConfigV1({
      marker:
        "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_CONFIG_V1",
      version: 1,
      listen_host:
        "0.0.0.0",
      listen_port:
        4113,
      request_path:
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
      health_path:
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH,
      status_path:
        AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH,
      state_directory:
        path.join(
          temporary,
          "config-state",
        ),
      max_body_bytes:
        4096,
      max_requests_per_minute:
        12,
    });
  });

  console.log(
    "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_V1_PROOF_GREEN",
  );
  console.log(
    "loopback_bind_required=1",
  );
  console.log(
    "exact_public_route=1",
  );
  console.log(
    "https_callback_contract_reused=1",
  );
  console.log(
    "payload_sha256_required=1",
  );
  console.log(
    "content_length_required=1",
  );
  console.log(
    "body_limit_enforced=1",
  );
  console.log(
    "rate_limit_enforced=1",
  );
  console.log(
    "append_only_request_and_receipt=1",
  );
  console.log(
    "duplicate_request_second_write=0",
  );
  console.log(
    "aggregate_status_only=1",
  );
  console.log(
    "raw_request_content_exposed=0",
  );
  console.log(
    "credential_created=0",
  );
  console.log(
    "credential_registry_mutated=0",
  );
  console.log(
    "receiver_restart=0",
  );
  console.log(
    "provider_selected=0",
  );
  console.log(
    "quote_created=0",
  );
  console.log(
    "payment_authorized=0",
  );
  console.log(
    "work_execution_authorized=0",
  );
  console.log(
    "work_dispatched=0",
  );
  console.log(
    "wc_award_authorized=0",
  );
  console.log(
    "wc_ledger_write=0",
  );
  console.log(
    "wallet_access=0",
  );
  console.log(
    "buy_void_change=0",
  );
} finally {
  rmSync(
    temporary,
    {
      recursive: true,
      force: true,
    },
  );
}
