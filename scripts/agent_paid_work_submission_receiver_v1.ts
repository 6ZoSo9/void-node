import {
  createHash,
  timingSafeEqual,
} from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import process from "node:process";

import {
  canonicalJson,
  validateAgentPaidWorkOrderEnvelope,
  type AgentPaidWorkOrderEnvelope,
} from "./agent_paid_work_order_envelope_v1.js";
import {
  materializeAgentPaidWorkSubmissionAdmissionV1,
  validateAgentPaidWorkSubmissionAdmissionPolicyV1,
  type AgentPaidWorkSubmissionAdmissionPolicyV1,
  type AgentPaidWorkSubmissionAdmissionV1,
} from "./agent_paid_work_submission_admission_v1.js";

export const AGENT_PAID_WORK_SUBMISSION_RECEIVER_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_RECEIVER_V1" as const;
export const AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_REQUEST_V1" as const;
export const AGENT_PAID_WORK_SUBMISSION_RECEIPT_MARKER =
  "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_RECEIPT_V1" as const;
export const AGENT_PAID_WORK_SUBMISSION_RECEIPT_ID_PREFIX =
  "voidawsi1_" as const;

type ReceiverConfig = {
  marker: "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_CONFIG_V1";
  version: 1;
  enabled: boolean;
  listen_host: "127.0.0.1";
  listen_port: number;
  request_path:
    "/__void/agents/paid-work/submissions/v1";
  health_path:
    "/__void/agent-paid-work-submission-receiver-v1/health";
  max_body_bytes: number;
  admission_policy:
    AgentPaidWorkSubmissionAdmissionPolicyV1;
};

type SubmissionRequest = {
  marker:
    typeof AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER;
  version: 1;
  submission_id: string;
  work_order: AgentPaidWorkOrderEnvelope;
};

type SubmissionReceiptDraft = {
  marker:
    typeof AGENT_PAID_WORK_SUBMISSION_RECEIPT_MARKER;
  version: 1;
  submission_id: string;
  work_order_id: string;
  request_payload_sha256: string;
  canonical_request_sha256: string;
  admission_id: string;
  admission: AgentPaidWorkSubmissionAdmissionV1;
  received_at_utc: string;
  authorization_verified: true;
  loopback_source: true;
  duplicate: false;
  authority: {
    provider_selected: false;
    quote_created: false;
    payment_authorized: false;
    work_execution_authorized: false;
    work_dispatched: false;
    wc_award_authorized: false;
    wc_ledger_write_authorized: false;
    mutation_authority_granted: false;
    wallet_or_signer_access_granted: false;
    buy_void_fulfillment_authority_granted: false;
  };
};

export type SubmissionReceipt =
  SubmissionReceiptDraft & {
    receipt_id: string;
  };

type SubmissionIndex = {
  marker:
    "VOID_AGENT_PAID_WORK_SUBMISSION_INDEX_V1";
  version: 1;
  submission_id: string;
  canonical_request_sha256: string;
  request_payload_sha256: string;
  receipt_id: string;
  receipt_path: string;
};

const SUBMISSION_ID_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const DEFAULT_MAX_BODY_BYTES = 64 * 1024;
const MAX_ALLOWED_BODY_BYTES = 1024 * 1024;

function fail(message: string): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) fail(message);
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assertCondition(
    actual.length === wanted.length &&
      actual.every(
        (item, index) => item === wanted[index],
      ),
    `${label} must contain exactly: ${wanted.join(", ")}`,
  );
}

function requireString(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  assertCondition(
    typeof value === "string",
    `${label} must be a string`,
  );
  assertCondition(
    value === value.trim(),
    `${label} must not have edge whitespace`,
  );
  assertCondition(
    value.length >= minimum &&
      value.length <= maximum,
    `${label} length must be ${minimum}..${maximum}`,
  );
  if (pattern) {
    assertCondition(
      pattern.test(value),
      `${label} has invalid format`,
    );
  }
  return value;
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    typeof value === "number" &&
      Number.isSafeInteger(value),
    `${label} must be a safe integer`,
  );
  assertCondition(
    value >= minimum &&
      value <= maximum,
    `${label} must be ${minimum}..${maximum}`,
  );
  return value;
}

function parseConfig(value: unknown): ReceiverConfig {
  assertCondition(
    isRecord(value),
    "receiver config must be an object",
  );
  assertExactKeys(
    value,
    [
      "marker",
      "version",
      "enabled",
      "listen_host",
      "listen_port",
      "request_path",
      "health_path",
      "max_body_bytes",
      "admission_policy",
    ],
    "receiver config",
  );
  assertCondition(
    value.marker ===
      "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_CONFIG_V1",
    "receiver config marker mismatch",
  );
  assertCondition(
    value.version === 1,
    "receiver config version must be 1",
  );
  assertCondition(
    typeof value.enabled === "boolean",
    "receiver config enabled must be boolean",
  );
  assertCondition(
    value.listen_host === "127.0.0.1",
    "receiver host must remain loopback",
  );
  const proofMode =
    process.env
      .VOID_AGENT_PAID_WORK_SUBMISSION_PROOF_MODE === "1";
  const port = requireInteger(
    value.listen_port,
    "listen_port",
    proofMode ? 0 : 1,
    65535,
  );
  assertCondition(
    value.request_path ===
      "/__void/agents/paid-work/submissions/v1",
    "request path mismatch",
  );
  assertCondition(
    value.health_path ===
      "/__void/agent-paid-work-submission-receiver-v1/health",
    "health path mismatch",
  );
  const maximum = requireInteger(
    value.max_body_bytes,
    "max_body_bytes",
    1024,
    MAX_ALLOWED_BODY_BYTES,
  );
  validateAgentPaidWorkSubmissionAdmissionPolicyV1(
    value.admission_policy,
  );

  return {
    marker:
      "VOID_AGENT_PAID_WORK_SUBMISSION_INTAKE_CONFIG_V1",
    version: 1,
    enabled: value.enabled,
    listen_host: "127.0.0.1",
    listen_port: port,
    request_path:
      "/__void/agents/paid-work/submissions/v1",
    health_path:
      "/__void/agent-paid-work-submission-receiver-v1/health",
    max_body_bytes: maximum,
    admission_policy: value.admission_policy,
  };
}

function parseSubmissionRequest(
  value: unknown,
): SubmissionRequest {
  assertCondition(
    isRecord(value),
    "submission request must be an object",
  );
  assertExactKeys(
    value,
    [
      "marker",
      "version",
      "submission_id",
      "work_order",
    ],
    "submission request",
  );
  assertCondition(
    value.marker ===
      AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
    "submission request marker mismatch",
  );
  assertCondition(
    value.version === 1,
    "submission request version must be 1",
  );
  const submissionId = requireString(
    value.submission_id,
    "submission_id",
    3,
    128,
    SUBMISSION_ID_PATTERN,
  );
  validateAgentPaidWorkOrderEnvelope(
    value.work_order,
  );

  return {
    marker:
      AGENT_PAID_WORK_SUBMISSION_REQUEST_MARKER,
    version: 1,
    submission_id: submissionId,
    work_order: value.work_order,
  };
}

function sha256(value: Buffer | string): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function receiptId(
  draft: SubmissionReceiptDraft,
): string {
  return (
    AGENT_PAID_WORK_SUBMISSION_RECEIPT_ID_PREFIX +
    sha256(canonicalJson(draft))
  );
}

function isLoopbackAddress(
  value: string | undefined,
): boolean {
  return (
    value === "127.0.0.1" ||
    value === "::1" ||
    value === "::ffff:127.0.0.1"
  );
}

function commonHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function jsonResponse(
  response: ServerResponse,
  statusCode: number,
  value: unknown,
  method = "GET",
  extraHeaders: Record<string, string> = {},
): void {
  const bytes = Buffer.from(
    JSON.stringify(value) + "\n",
  );
  response.writeHead(statusCode, {
    ...commonHeaders(),
    "Content-Type":
      "application/json; charset=utf-8",
    "Content-Length": String(bytes.length),
    ...extraHeaders,
  });
  if (method === "HEAD") {
    response.end();
    return;
  }
  response.end(bytes);
}

function emptyResponse(
  response: ServerResponse,
  statusCode: number,
  extraHeaders: Record<string, string> = {},
): void {
  response.writeHead(statusCode, {
    ...commonHeaders(),
    "Content-Length": "0",
    ...extraHeaders,
  });
  response.end();
}

function readBoundedBody(
  request: IncomingMessage,
  maximum: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(
      request.headers["content-length"] || 0,
    );
    if (
      Number.isFinite(declared) &&
      declared > maximum
    ) {
      request.resume();
      reject(new Error("request_body_too_large"));
      return;
    }

    const chunks: Buffer[] = [];
    let total = 0;
    let tooLarge = false;

    request.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maximum) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on("end", () => {
      if (tooLarge) {
        reject(
          new Error("request_body_too_large"),
        );
        return;
      }
      resolve(Buffer.concat(chunks));
    });
    request.on("error", reject);
  });
}

function readJsonFile(pathname: string): unknown {
  return JSON.parse(
    readFileSync(pathname, "utf8"),
  ) as unknown;
}

function writeExclusiveJson(
  pathname: string,
  value: unknown,
): void {
  mkdirSync(path.dirname(pathname), {
    recursive: true,
    mode: 0o700,
  });
  const descriptor = openSync(
    pathname,
    "wx",
    0o600,
  );
  try {
    writeFileSync(
      descriptor,
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  chmodSync(pathname, 0o600);
}

function safeCount(pathname: string): number {
  try {
    return readdirSync(pathname, {
      withFileTypes: true,
    }).filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".json"),
    ).length;
  } catch {
    return 0;
  }
}

function bearerMatches(
  authorization: string,
  token: string,
): boolean {
  const prefix = "Bearer ";
  if (!authorization.startsWith(prefix)) {
    return false;
  }
  const supplied = Buffer.from(
    authorization.slice(prefix.length),
    "utf8",
  );
  const expected = Buffer.from(token, "utf8");
  return (
    supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
  );
}

function utcNow(): string {
  const proofMode =
    process.env
      .VOID_AGENT_PAID_WORK_SUBMISSION_PROOF_MODE === "1";
  const override =
    process.env
      .VOID_AGENT_PAID_WORK_SUBMISSION_PROOF_NOW_UTC;
  if (proofMode && override) {
    assertCondition(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(
        override,
      ),
      "proof time must be exact UTC seconds",
    );
    assertCondition(
      new Date(Date.parse(override))
        .toISOString()
        .replace(".000Z", "Z") === override,
      "proof time must be real UTC",
    );
    return override;
  }
  return new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

function loadReceipt(
  receiptPath: string,
): SubmissionReceipt {
  const value = readJsonFile(receiptPath);
  assertCondition(
    isRecord(value) &&
      value.marker ===
        AGENT_PAID_WORK_SUBMISSION_RECEIPT_MARKER,
    "stored receipt marker mismatch",
  );
  return value as SubmissionReceipt;
}

async function main(): Promise<void> {
  const configPath = requireString(
    process.env
      .VOID_AGENT_PAID_WORK_SUBMISSION_CONFIG,
    "VOID_AGENT_PAID_WORK_SUBMISSION_CONFIG",
    1,
    4096,
  );
  const tokenPath = requireString(
    process.env
      .VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE,
    "VOID_AGENT_PAID_WORK_SUBMISSION_TOKEN_FILE",
    1,
    4096,
  );
  const stateDir = requireString(
    process.env
      .VOID_AGENT_PAID_WORK_SUBMISSION_STATE_DIR,
    "VOID_AGENT_PAID_WORK_SUBMISSION_STATE_DIR",
    1,
    4096,
  );

  const config = parseConfig(
    readJsonFile(configPath),
  );
  assertCondition(
    config.enabled === true,
    "receiver is disabled by config",
  );

  const token = readFileSync(
    tokenPath,
    "utf8",
  ).trim();
  assertCondition(
    /^[^\s]{16,8192}$/.test(token),
    "receiver bearer token format invalid",
  );

  const root = path.resolve(stateDir);
  const receiptsDir = path.join(
    root,
    "receipts",
  );
  const indexesDir = path.join(
    root,
    "submissions",
  );
  mkdirSync(receiptsDir, {
    recursive: true,
    mode: 0o700,
  });
  mkdirSync(indexesDir, {
    recursive: true,
    mode: 0o700,
  });

  async function handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const method = String(
      request.method || "",
    ).toUpperCase();
    let url: URL;
    try {
      url = new URL(
        request.url || "/",
        "http://127.0.0.1",
      );
    } catch {
      emptyResponse(response, 400);
      return;
    }

    if (
      url.pathname === config.health_path
    ) {
      if (
        method !== "GET" &&
        method !== "HEAD"
      ) {
        emptyResponse(
          response,
          405,
          { Allow: "GET, HEAD" },
        );
        return;
      }
      if (url.search || url.hash) {
        emptyResponse(response, 404);
        return;
      }
      jsonResponse(
        response,
        200,
        {
          marker:
            AGENT_PAID_WORK_SUBMISSION_RECEIVER_MARKER,
          ready: true,
          host: config.listen_host,
          port: config.listen_port,
          request_path: config.request_path,
          maximum_body_bytes:
            config.max_body_bytes,
          admission_policy_id:
            config.admission_policy.policy_id,
          receipt_count:
            safeCount(receiptsDir),
          submission_index_count:
            safeCount(indexesDir),
          provider_selection_authority:
            false,
          quote_creation_authority:
            false,
          payment_authority: false,
          work_execution_authority:
            false,
          work_dispatch_authority: false,
          wc_award_authority: false,
          wc_ledger_write_authority:
            false,
          wallet_or_signer_access: false,
          buy_void_fulfillment_authority:
            false,
        },
        method,
      );
      return;
    }

    if (
      url.pathname !== config.request_path
    ) {
      emptyResponse(response, 404);
      return;
    }

    if (method !== "POST") {
      emptyResponse(
        response,
        405,
        { Allow: "POST" },
      );
      return;
    }

    if (url.search || url.hash) {
      jsonResponse(response, 400, {
        ok: false,
        error: "query_not_allowed",
      });
      return;
    }

    if (
      !isLoopbackAddress(
        request.socket.remoteAddress,
      )
    ) {
      jsonResponse(response, 403, {
        ok: false,
        error: "loopback_source_required",
      });
      return;
    }

    const authorization = String(
      request.headers.authorization || "",
    ).trim();
    if (
      !bearerMatches(
        authorization,
        token,
      )
    ) {
      jsonResponse(response, 401, {
        ok: false,
        error: "unauthorized",
      });
      return;
    }

    const contentType = String(
      request.headers["content-type"] || "",
    ).toLowerCase();
    if (
      !contentType.startsWith(
        "application/json",
      )
    ) {
      jsonResponse(response, 415, {
        ok: false,
        error:
          "application_json_required",
      });
      return;
    }

    let body: Buffer;
    try {
      body = await readBoundedBody(
        request,
        config.max_body_bytes,
      );
    } catch (error) {
      if (
        String(
          (error as Error)?.message || "",
        ) === "request_body_too_large"
      ) {
        jsonResponse(response, 413, {
          ok: false,
          error:
            "request_body_too_large",
        });
        return;
      }
      throw error;
    }

    const bodySha = sha256(body);
    const declaredSha = String(
      request.headers[
        "x-void-payload-sha256"
      ] || "",
    ).toLowerCase();

    if (!SHA256_PATTERN.test(declaredSha)) {
      jsonResponse(response, 400, {
        ok: false,
        error:
          "payload_sha256_required",
      });
      return;
    }
    if (declaredSha !== bodySha) {
      jsonResponse(response, 400, {
        ok: false,
        error:
          "payload_sha256_mismatch",
      });
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(
        body.toString("utf8"),
      ) as unknown;
    } catch {
      jsonResponse(response, 400, {
        ok: false,
        error: "invalid_json",
      });
      return;
    }

    let submission: SubmissionRequest;
    try {
      submission =
        parseSubmissionRequest(parsed);
    } catch (error) {
      jsonResponse(response, 422, {
        ok: false,
        error:
          "invalid_submission_request",
        detail:
          error instanceof Error
            ? error.message
            : String(error),
      });
      return;
    }

    const canonicalRequestSha = sha256(
      canonicalJson(submission),
    );
    const indexPath = path.join(
      indexesDir,
      `${submission.submission_id}.json`,
    );

    if (existsSync(indexPath)) {
      const indexValue =
        readJsonFile(indexPath);
      assertCondition(
        isRecord(indexValue) &&
          indexValue.marker ===
            "VOID_AGENT_PAID_WORK_SUBMISSION_INDEX_V1",
        "stored submission index marker mismatch",
      );
      const existing =
        indexValue as SubmissionIndex;

      if (
        existing.canonical_request_sha256 !==
        canonicalRequestSha
      ) {
        jsonResponse(response, 409, {
          ok: false,
          error:
            "conflicting_duplicate_submission",
          submission_id:
            submission.submission_id,
        });
        return;
      }

      const receipt = loadReceipt(
        existing.receipt_path,
      );
      jsonResponse(response, 200, {
        ok: true,
        duplicate: true,
        receipt: {
          ...receipt,
          duplicate: true,
        },
      });
      return;
    }

    const evaluatedAt = utcNow();
    const admission =
      materializeAgentPaidWorkSubmissionAdmissionV1(
        submission.work_order,
        config.admission_policy,
        evaluatedAt,
      );
    const draft: SubmissionReceiptDraft = {
      marker:
        AGENT_PAID_WORK_SUBMISSION_RECEIPT_MARKER,
      version: 1,
      submission_id:
        submission.submission_id,
      work_order_id:
        submission.work_order.work_order_id,
      request_payload_sha256: bodySha,
      canonical_request_sha256:
        canonicalRequestSha,
      admission_id:
        admission.admission_id,
      admission,
      received_at_utc: evaluatedAt,
      authorization_verified: true,
      loopback_source: true,
      duplicate: false,
      authority: {
        provider_selected: false,
        quote_created: false,
        payment_authorized: false,
        work_execution_authorized:
          false,
        work_dispatched: false,
        wc_award_authorized: false,
        wc_ledger_write_authorized:
          false,
        mutation_authority_granted:
          false,
        wallet_or_signer_access_granted:
          false,
        buy_void_fulfillment_authority_granted:
          false,
      },
    };
    const receipt: SubmissionReceipt = {
      ...draft,
      receipt_id: receiptId(draft),
    };
    const receiptPath = path.join(
      receiptsDir,
      `${receipt.receipt_id}.json`,
    );
    const indexValue: SubmissionIndex = {
      marker:
        "VOID_AGENT_PAID_WORK_SUBMISSION_INDEX_V1",
      version: 1,
      submission_id:
        submission.submission_id,
      canonical_request_sha256:
        canonicalRequestSha,
      request_payload_sha256: bodySha,
      receipt_id: receipt.receipt_id,
      receipt_path: receiptPath,
    };

    writeExclusiveJson(
      receiptPath,
      receipt,
    );
    try {
      writeExclusiveJson(
        indexPath,
        indexValue,
      );
    } catch (error) {
      if (existsSync(indexPath)) {
        const existing =
          readJsonFile(indexPath);
        if (
          isRecord(existing) &&
          existing.canonical_request_sha256 ===
            canonicalRequestSha
        ) {
          jsonResponse(response, 200, {
            ok: true,
            duplicate: true,
            receipt: {
              ...receipt,
              duplicate: true,
            },
          });
          return;
        }
      }
      throw error;
    }

    const status =
      admission.decision ===
      "accepted_for_review"
        ? 202
        : 422;
    jsonResponse(response, status, {
      ok:
        admission.decision ===
        "accepted_for_review",
      duplicate: false,
      receipt,
    });
  }

  const server = createServer(
    (request, response) => {
      void handle(
        request,
        response,
      ).catch((error) => {
        process.stderr.write(
          `${AGENT_PAID_WORK_SUBMISSION_RECEIVER_MARKER} ` +
            `request_error=${String(error)}\n`,
        );
        if (!response.headersSent) {
          jsonResponse(response, 500, {
            ok: false,
            error: "internal_error",
          });
          return;
        }
        response.destroy();
      });
    },
  );

  server.requestTimeout = 5_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 5_000;
  server.maxRequestsPerSocket = 100;

  function shutdown(signal: string): void {
    server.close((error) => {
      if (error) {
        process.stderr.write(
          `${AGENT_PAID_WORK_SUBMISSION_RECEIVER_MARKER} ` +
            `shutdown_error=${String(error)}\n`,
        );
        process.exit(1);
      }
      process.stdout.write(
        `${AGENT_PAID_WORK_SUBMISSION_RECEIVER_MARKER} ` +
          `stopped signal=${signal}\n`,
      );
      process.exit(0);
    });
    setTimeout(
      () => process.exit(1),
      5_000,
    ).unref();
  }

  process.on(
    "SIGINT",
    () => shutdown("SIGINT"),
  );
  process.on(
    "SIGTERM",
    () => shutdown("SIGTERM"),
  );

  server.listen(
    {
      host: config.listen_host,
      port: config.listen_port,
      exclusive: true,
    },
    () => {
      const address = server.address();
      assertCondition(
        address &&
          typeof address !== "string",
        "unexpected receiver listen address",
      );
      process.stdout.write(
        JSON.stringify({
          marker:
            AGENT_PAID_WORK_SUBMISSION_RECEIVER_MARKER,
          ready: true,
          host: address.address,
          port: address.port,
          request_path:
            config.request_path,
          health_path:
            config.health_path,
          maximum_body_bytes:
            config.max_body_bytes,
          admission_policy_id:
            config.admission_policy.policy_id,
          append_once_receipts: true,
          identical_duplicate_suppression:
            true,
          conflicting_duplicate_rejection:
            true,
          accepted_for_review_only: true,
          provider_selection_authority:
            false,
          quote_creation_authority:
            false,
          payment_authority: false,
          work_execution_authority:
            false,
          work_dispatch_authority:
            false,
          wc_award_authority: false,
          wc_ledger_write_authority:
            false,
          wallet_or_signer_access: false,
          buy_void_fulfillment_authority:
            false,
        }) + "\n",
      );
    },
  );
}

main().catch((error) => {
  process.stderr.write(
    `HOLD: ${
      error instanceof Error
        ? error.message
        : String(error)
    }\n`,
  );
  process.exitCode = 78;
});
