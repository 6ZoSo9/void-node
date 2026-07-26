#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  VOID_AI_AGENT_PAID_WORK_CLIENT_V1,
  VOID_AI_AGENT_PAID_WORK_CLIENT_RESULT_SCHEMA_V1,
  normalizePaidWorkBaseUrlV1,
  parsePaidWorkClientArgsV1,
  probeVoidAiAgentPaidWorkV1,
  readPaidWorkTokenFileV1,
  runVoidAiAgentPaidWorkClientV1,
  submitVoidAiAgentPaidWorkV1,
} from "../tools/void-ai-agent-paid-work-client-v1.mjs";

const ROUTE =
  "/__void/agents/paid-work/submissions/v1";
const DISCOVERY =
  "/.well-known/void-agent-discovery.json";
const ROUTE_HEADER =
  "x-void-agent-paid-work-submission-route";
const TOKEN = "test-token-0123456789abcdef";

function sha256(value) {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function jsonBytes(value) {
  return Buffer.from(
    JSON.stringify(value) + "\n",
    "utf8",
  );
}

function requestValue(
  submissionId,
  workOrderId = "voidawo1_" + "1".repeat(64),
) {
  return {
    marker:
      "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1",
    version: 1,
    submission_id: submissionId,
    work_order: {
      marker:
        "VOID_AGENT_PAID_WORK_ORDER_ENVELOPE_V1",
      version: 1,
      created_at_utc:
        "2026-07-26T21:00:00Z",
      expires_at_utc:
        "2026-07-27T21:00:00Z",
      requester: {
        agent_id:
          "agent.example.client-proof",
        callback_uri:
          "https://agent.example.invalid/callback",
      },
      service: {
        capability_id:
          "datanet.fetch_verify",
        objective:
          "Verify a public object and return a deterministic receipt.",
        input_refs: [
          "datanet:sha256:" +
            "0".repeat(64),
        ],
        expected_outputs: [
          "verification_result.json",
        ],
      },
      commercial: {
        quote_asset: "USD",
        max_total: "5.00",
        payment_required_before_execution:
          true,
      },
      execution_limits: {
        max_runtime_seconds: 300,
        max_output_bytes: 1048576,
        external_side_effects_allowed:
          false,
        wallet_access_allowed: false,
        money_movement_allowed: false,
      },
      nonce:
        "client-proof-" + submissionId,
      work_order_id: workOrderId,
    },
  };
}

function receiptValue(
  submissionId,
  receiptId,
) {
  return {
    marker:
      "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1",
    version: 1,
    receipt_id: receiptId,
    submission_id: submissionId,
    request_sha256: "0".repeat(64),
    authorization_verified: true,
    loopback_source: true,
    received_at_utc:
      "2026-07-26T21:00:00Z",
    admission: {
      marker:
        "VOID_AGENT_PAID_WORK_SUBMISSION_ADMISSION_V1",
      version: 1,
      admission_id:
        "voidawsa1_" + "2".repeat(64),
      decision:
        "accepted_for_review",
    },
    duplicate: false,
    authority: {
      provider_selected: false,
      quote_created: false,
      payment_authorized: false,
      work_execution_authorized: false,
      work_dispatched: false,
      wc_award_authorized: false,
      wc_ledger_write_authorized: false,
      mutation_authority_granted: false,
      wallet_or_signer_access_granted:
        false,
      buy_void_fulfillment_authority_granted:
        false,
    },
  };
}

function writePrivate(
  target,
  value,
) {
  writeFileSync(target, value, {
    mode: 0o600,
  });
  chmodSync(target, 0o600);
}

async function withServer(runTest) {
  const records = [];
  const stored = new Map();

  const server = http.createServer(
    async (request, response) => {
      const chunks = [];
      for await (const chunk of request) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks);
      records.push({
        method: request.method,
        url: request.url,
        authorization:
          request.headers.authorization ?? null,
        payloadSha:
          request.headers[
            "x-void-payload-sha256"
          ] ?? null,
        body,
      });

      if (
        request.method === "GET" &&
        request.url === DISCOVERY
      ) {
        const payload = jsonBytes({
          marker:
            "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
          protocol:
            "void-agent-discovery-well-known/1",
        });
        response.writeHead(200, {
          "content-type":
            "application/json",
          "content-length":
            String(payload.byteLength),
        });
        response.end(payload);
        return;
      }

      if (
        request.method === "GET" &&
        request.url === ROUTE
      ) {
        const payload = jsonBytes({
          error: "method_not_allowed",
        });
        response.writeHead(405, {
          "content-type":
            "application/json",
          allow: "POST",
          "content-length":
            String(payload.byteLength),
        });
        response.end(payload);
        return;
      }

      if (
        request.method !== "POST" ||
        request.url !== ROUTE
      ) {
        response.writeHead(404);
        response.end();
        return;
      }

      if (
        request.headers.authorization !==
        `Bearer ${TOKEN}`
      ) {
        const payload = jsonBytes({
          error: "unauthorized",
        });
        response.writeHead(401, {
          "content-type":
            "application/json",
          [ROUTE_HEADER]: "v1",
          "content-length":
            String(payload.byteLength),
        });
        response.end(payload);
        return;
      }

      if (
        request.headers[
          "x-void-payload-sha256"
        ] !== sha256(body)
      ) {
        const payload = jsonBytes({
          error:
            "payload_sha256_mismatch",
        });
        response.writeHead(400, {
          "content-type":
            "application/json",
          [ROUTE_HEADER]: "v1",
          "content-length":
            String(payload.byteLength),
        });
        response.end(payload);
        return;
      }

      const value = JSON.parse(
        body.toString("utf8"),
      );
      const submissionId =
        value.submission_id;

      if (submissionId.includes("redirect")) {
        response.writeHead(307, {
          location: "/elsewhere",
          [ROUTE_HEADER]: "v1",
        });
        response.end();
        return;
      }

      if (submissionId.includes("oversize")) {
        const payload = jsonBytes({
          ok: true,
          padding: "x".repeat(4096),
        });
        response.writeHead(202, {
          "content-type":
            "application/json",
          [ROUTE_HEADER]: "v1",
          "content-length":
            String(payload.byteLength),
        });
        response.end(payload);
        return;
      }

      const digest = sha256(body);
      const existing =
        stored.get(submissionId);

      if (
        existing &&
        existing.digest !== digest
      ) {
        const payload = jsonBytes({
          error:
            "conflicting_duplicate_submission",
        });
        response.writeHead(409, {
          "content-type":
            "application/json",
          [ROUTE_HEADER]: "v1",
          "content-length":
            String(payload.byteLength),
        });
        response.end(payload);
        return;
      }

      if (existing) {
        const payload = jsonBytes({
          ok: true,
          duplicate: true,
          receipt: existing.receipt,
        });
        response.writeHead(200, {
          "content-type":
            "application/json",
          [ROUTE_HEADER]: "v1",
          "content-length":
            String(payload.byteLength),
        });
        response.end(payload);
        return;
      }

      const receiptId =
        "voidawsi1_" +
        sha256(
          Buffer.from(
            submissionId,
            "utf8",
          ),
        );
      const receipt = receiptValue(
        submissionId,
        receiptId,
      );
      stored.set(submissionId, {
        digest,
        receipt,
      });

      const payload = jsonBytes({
        ok: true,
        duplicate: false,
        receipt,
      });
      response.writeHead(202, {
        "content-type":
          "application/json",
        [ROUTE_HEADER]:
          submissionId.includes(
            "bad-header",
          )
            ? "wrong"
            : "v1",
        "content-length":
          String(payload.byteLength),
      });
      response.end(payload);
    },
  );

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(
    address &&
      typeof address === "object",
  );
  const baseUrl =
    `http://127.0.0.1:${address.port}`;

  try {
    await runTest({
      baseUrl,
      records,
      stored,
    });
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }
}

const temporary = mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-ai-agent-paid-work-client-v1-",
  ),
);
const tokenPath = path.join(
  temporary,
  "token",
);
writePrivate(
  tokenPath,
  TOKEN + "\n",
);
assert.equal(
  readPaidWorkTokenFileV1(
    tokenPath,
  ),
  TOKEN,
);

const insecureTokenPath = path.join(
  temporary,
  "insecure-token",
);
writeFileSync(
  insecureTokenPath,
  TOKEN + "\n",
  {
    mode: 0o644,
  },
);
chmodSync(
  insecureTokenPath,
  0o644,
);
assert.throws(
  () =>
    readPaidWorkTokenFileV1(
      insecureTokenPath,
    ),
  /group or other permissions/,
);

assert.equal(
  normalizePaidWorkBaseUrlV1(
    "http://127.0.0.1:4100",
  ).origin,
  "http://127.0.0.1:4100",
);
assert.throws(
  () =>
    normalizePaidWorkBaseUrlV1(
      "http://example.invalid",
    ),
  /HTTPS or loopback HTTP/,
);
assert.throws(
  () =>
    normalizePaidWorkBaseUrlV1(
      "https://user:pass@example.invalid",
    ),
  /credentials are forbidden/,
);
assert.throws(
  () =>
    parsePaidWorkClientArgsV1([
      "submit",
      "--token",
      TOKEN,
    ]),
  /unknown argument: --token/,
);

await withServer(
  async ({
    baseUrl,
    records,
    stored,
  }) => {
    const probeStart = records.length;
    const probe =
      await probeVoidAiAgentPaidWorkV1({
        baseUrl,
        timeoutMs: 2000,
        maxResponseBytes: 65536,
      });
    assert.equal(
      probe.marker,
      VOID_AI_AGENT_PAID_WORK_CLIENT_V1,
    );
    assert.equal(
      probe.schema,
      VOID_AI_AGENT_PAID_WORK_CLIENT_RESULT_SCHEMA_V1,
    );
    assert.equal(
      probe.mode,
      "probe",
    );
    assert.equal(
      probe.discovery.http_status,
      200,
    );
    assert.equal(
      probe.submission_route.http_status,
      405,
    );
    assert.equal(
      probe.submission_route
        .request_body_sent,
      false,
    );

    const probeRecords =
      records.slice(probeStart);
    assert.equal(
      probeRecords.length,
      2,
    );
    for (const record of probeRecords) {
      assert.equal(
        record.method,
        "GET",
      );
      assert.equal(
        record.authorization,
        null,
      );
      assert.equal(
        record.body.byteLength,
        0,
      );
    }

    const submissionId =
      "agent-client-proof-new";
    const requestPath = path.join(
      temporary,
      "request-new.json",
    );
    writePrivate(
      requestPath,
      jsonBytes(
        requestValue(
          submissionId,
        ),
      ),
    );

    const postStart = records.length;
    const accepted =
      await submitVoidAiAgentPaidWorkV1({
        baseUrl,
        requestPath,
        tokenFile: tokenPath,
        expectNew: true,
        timeoutMs: 2000,
        maxResponseBytes: 65536,
      });
    assert.equal(
      accepted.http_status,
      202,
    );
    assert.equal(
      accepted.route_header,
      "v1",
    );
    assert.equal(
      accepted.accepted_for_review,
      true,
    );
    assert.equal(
      accepted.duplicate,
      false,
    );
    assert.equal(
      accepted.receipt.admission
        .decision,
      "accepted_for_review",
    );
    assert.ok(
      Object.values(
        accepted.authority,
      ).every(
        (value) => value === false,
      ),
    );
    assert.ok(
      !JSON.stringify(
        accepted,
      ).includes(TOKEN),
    );
    assert.equal(
      records.length,
      postStart + 1,
    );

    const duplicate =
      await submitVoidAiAgentPaidWorkV1({
        baseUrl,
        requestPath,
        tokenFile: tokenPath,
        timeoutMs: 2000,
        maxResponseBytes: 65536,
      });
    assert.equal(
      duplicate.http_status,
      200,
    );
    assert.equal(
      duplicate.duplicate,
      true,
    );
    assert.equal(
      duplicate.receipt_id,
      accepted.receipt_id,
    );

    const conflictPath = path.join(
      temporary,
      "request-conflict.json",
    );
    writePrivate(
      conflictPath,
      jsonBytes(
        requestValue(
          submissionId,
          "voidawo1_" +
            "3".repeat(64),
        ),
      ),
    );
    const conflict =
      await submitVoidAiAgentPaidWorkV1({
        baseUrl,
        requestPath: conflictPath,
        tokenFile: tokenPath,
        timeoutMs: 2000,
        maxResponseBytes: 65536,
      });
    assert.equal(
      conflict.http_status,
      409,
    );
    assert.equal(
      conflict.conflicting_duplicate,
      true,
    );

    const redirectPath = path.join(
      temporary,
      "request-redirect.json",
    );
    writePrivate(
      redirectPath,
      jsonBytes(
        requestValue(
          "agent-client-proof-redirect",
        ),
      ),
    );
    await assert.rejects(
      () =>
        submitVoidAiAgentPaidWorkV1({
          baseUrl,
          requestPath:
            redirectPath,
          tokenFile: tokenPath,
          timeoutMs: 2000,
          maxResponseBytes: 65536,
        }),
      /redirect_forbidden:307/,
    );

    const oversizePath = path.join(
      temporary,
      "request-oversize.json",
    );
    writePrivate(
      oversizePath,
      jsonBytes(
        requestValue(
          "agent-client-proof-oversize",
        ),
      ),
    );
    await assert.rejects(
      () =>
        submitVoidAiAgentPaidWorkV1({
          baseUrl,
          requestPath:
            oversizePath,
          tokenFile: tokenPath,
          timeoutMs: 2000,
          maxResponseBytes: 1024,
        }),
      /response_too_large/,
    );

    const badHeaderPath = path.join(
      temporary,
      "request-bad-header.json",
    );
    writePrivate(
      badHeaderPath,
      jsonBytes(
        requestValue(
          "agent-client-proof-bad-header",
        ),
      ),
    );
    await assert.rejects(
      () =>
        submitVoidAiAgentPaidWorkV1({
          baseUrl,
          requestPath:
            badHeaderPath,
          tokenFile: tokenPath,
          timeoutMs: 2000,
          maxResponseBytes: 65536,
        }),
      /route header mismatch/,
    );

    assert.equal(
      stored.size,
      2,
    );

    const outputPath = path.join(
      temporary,
      "probe-output.json",
    );
    const cliResult =
      await runVoidAiAgentPaidWorkClientV1({
        argv: [
          "probe",
          "--base-url",
          baseUrl,
          "--output",
          outputPath,
          "--pretty",
        ],
      });
    assert.equal(
      cliResult.exitCode,
      0,
    );
    assert.equal(
      statSync(outputPath).mode &
        0o777,
      0o600,
    );
    const output = readFileSync(
      outputPath,
      "utf8",
    );
    assert.ok(
      output.includes(
        VOID_AI_AGENT_PAID_WORK_CLIENT_V1,
      ),
    );
    assert.ok(
      !output.includes(TOKEN),
    );
  },
);

const schema = JSON.parse(
  readFileSync(
    new URL(
      "../schemas/void-ai-agent-paid-work-client-v1.schema.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const example = JSON.parse(
  readFileSync(
    new URL(
      "../examples/void-ai-agent-paid-work-client-v1.example.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const docs = readFileSync(
  new URL(
    "../docs/public/ai-agent-paid-work-client-v1.md",
    import.meta.url,
  ),
  "utf8",
);
const workflow = readFileSync(
  new URL(
    "../.github/workflows/void-ai-agent-paid-work-client-v1.yml",
    import.meta.url,
  ),
  "utf8",
);

assert.equal(
  schema.$id,
  "https://voidchain.io/schemas/void-ai-agent-paid-work-client-v1.schema.json",
);
assert.equal(
  example.marker,
  VOID_AI_AGENT_PAID_WORK_CLIENT_V1,
);
assert.equal(
  example.schema,
  VOID_AI_AGENT_PAID_WORK_CLIENT_RESULT_SCHEMA_V1,
);
assert.equal(
  example.accepted_for_review,
  true,
);
assert.equal(
  example.authority
    .payment_authorized,
  false,
);
for (const phrase of [
  "accepted_for_review",
  "no automatic retry",
  "token file",
  "does not select a provider",
  "does not authorize payment",
  "does not dispatch work",
  "does not write Work Credits",
]) {
  assert.ok(
    docs.includes(phrase),
    `documentation missing: ${phrase}`,
  );
}
assert.ok(
  workflow.includes(
    "prove_void_ai_agent_paid_work_client_v1.mjs",
  ),
);
assert.ok(
  workflow.includes(
    "npm run build",
  ),
);

console.log(
  "VOID_AI_AGENT_PAID_WORK_CLIENT_V1_PROOF_EXACT_GREEN",
);
console.log("probe_get_only=1");
console.log("authenticated_submit=1");
console.log("accepted_for_review=1");
console.log("identical_duplicate_suppressed=1");
console.log("conflicting_duplicate_classified=1");
console.log("redirect_rejected=1");
console.log("oversized_response_rejected=1");
console.log("route_header_verified=1");
console.log("private_token_file_required=1");
console.log("token_in_argv=0");
console.log("token_output=0");
console.log("automatic_retry=0");
console.log("output_mode_0600=1");
console.log("provider_selected=0");
console.log("quote_created=0");
console.log("payment_authorized=0");
console.log("work_execution_authorized=0");
console.log("work_dispatched=0");
console.log("wc_award_authorized=0");
console.log("wc_ledger_write_authorized=0");
console.log("wallet_or_signer_access=0");
console.log("buy_void_fulfillment_authority=0");
