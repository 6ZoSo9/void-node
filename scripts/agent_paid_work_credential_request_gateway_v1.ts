#!/usr/bin/env node
import {
  createHash,
} from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type RequestListener,
  type Server,
  type ServerResponse,
} from "node:http";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import {
  pathToFileURL,
} from "node:url";

import {
  receiveAgentPaidWorkCredentialRequestV1,
} from "./agent_paid_work_credential_request_intake_v1.js";

export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_CONFIG_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_CONFIG_V1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_HEALTH_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_HEALTH_V1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STATUS_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STATUS_V1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_MARKER =
  "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_V1" as const;

export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH =
  "/__void/agents/paid-work/credential-requests/v1" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH =
  "/__void/agents/paid-work/credential-requests/v1/health" as const;
export const AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH =
  "/__void/agents/paid-work/credential-requests/v1/status" as const;

const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;
const UTC_SECONDS_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

type AnyRecord =
  Record<string, unknown>;

export type AgentPaidWorkCredentialRequestGatewayConfigV1 = {
  marker:
    typeof AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_CONFIG_MARKER;
  version: 1;
  listen_host: "127.0.0.1";
  listen_port: number;
  request_path:
    typeof AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH;
  health_path:
    typeof AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH;
  status_path:
    typeof AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH;
  state_directory: string;
  max_body_bytes: number;
  max_requests_per_minute: number;
};

export type AgentPaidWorkCredentialRequestGatewayRuntimeOptionsV1 = {
  state_directory: string;
  max_body_bytes: number;
  max_requests_per_minute: number;
  clock?: () => string;
};

export type AgentPaidWorkCredentialRequestGatewayStartedV1 = {
  server: Server;
  config:
    AgentPaidWorkCredentialRequestGatewayConfigV1;
};

class GatewayHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    status: number,
    code: string,
    message: string,
  ) {
    super(message);
    this.name = "GatewayHttpError";
    this.status = status;
    this.code = code;
  }
}

function fail(
  message: string,
): never {
  throw new Error(message);
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    fail(message);
  }
}

function isRecord(
  value: unknown,
): value is AnyRecord {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function requireObject(
  value: unknown,
  label: string,
): AnyRecord {
  assertCondition(
    isRecord(value),
    `${label} must be an object`,
  );

  return value;
}

function assertExactKeys(
  value: AnyRecord,
  expected: readonly string[],
  label: string,
): void {
  const actual =
    Object.keys(value).sort();
  const wanted =
    [...expected].sort();

  assertCondition(
    actual.length === wanted.length &&
      actual.every(
        (key, index) =>
          key === wanted[index],
      ),
    `${label} keys mismatch`,
  );
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number {
  assertCondition(
    Number.isInteger(value) &&
      Number(value) >= minimum &&
      Number(value) <= maximum,
    `${label} must be an integer from ${minimum} to ${maximum}`,
  );

  return Number(value);
}

function requireAbsoluteDirectoryPath(
  value: unknown,
  label: string,
): string {
  assertCondition(
    typeof value === "string" &&
      value.length > 0 &&
      path.isAbsolute(value),
    `${label} must be an absolute path`,
  );

  if (existsSync(value)) {
    const metadata =
      lstatSync(value);

    assertCondition(
      metadata.isDirectory() &&
        !metadata.isSymbolicLink(),
      `${label} must be a directory`,
    );
    assertCondition(
      (metadata.mode & 0o077) === 0,
      `${label} must not be group/world accessible`,
    );
  }

  return path.resolve(value);
}

function utcNowSeconds(): string {
  return new Date(
    Math.floor(
      Date.now() / 1000,
    ) * 1000,
  )
    .toISOString()
    .replace(".000Z", "Z");
}

function requireUtcSeconds(
  value: string,
): string {
  assertCondition(
    UTC_SECONDS_PATTERN.test(value) &&
      Date.parse(value) >= 0 &&
      new Date(
        Date.parse(value),
      )
        .toISOString()
        .replace(".000Z", "Z") === value,
    "gateway clock must return real UTC seconds",
  );

  return value;
}

function sha256(
  value: Buffer,
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

export function
parseAgentPaidWorkCredentialRequestGatewayConfigV1(
  input: unknown,
): AgentPaidWorkCredentialRequestGatewayConfigV1 {
  const value =
    requireObject(
      input,
      "credential request gateway config",
    );

  assertExactKeys(
    value,
    [
      "marker",
      "version",
      "listen_host",
      "listen_port",
      "request_path",
      "health_path",
      "status_path",
      "state_directory",
      "max_body_bytes",
      "max_requests_per_minute",
    ],
    "credential request gateway config",
  );

  assertCondition(
    value.marker ===
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_CONFIG_MARKER,
    "credential request gateway config marker mismatch",
  );
  assertCondition(
    value.version === 1,
    "credential request gateway config version mismatch",
  );
  assertCondition(
    value.listen_host ===
      "127.0.0.1",
    "credential request gateway must bind loopback",
  );
  assertCondition(
    value.request_path ===
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
    "credential request path mismatch",
  );
  assertCondition(
    value.health_path ===
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH,
    "credential request health path mismatch",
  );
  assertCondition(
    value.status_path ===
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH,
    "credential request status path mismatch",
  );

  return {
    marker:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_CONFIG_MARKER,
    version: 1,
    listen_host:
      "127.0.0.1",
    listen_port:
      requireInteger(
        value.listen_port,
        "credential request gateway listen_port",
        1,
        65535,
      ),
    request_path:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
    health_path:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH,
    status_path:
      AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH,
    state_directory:
      requireAbsoluteDirectoryPath(
        value.state_directory,
        "credential request gateway state_directory",
      ),
    max_body_bytes:
      requireInteger(
        value.max_body_bytes,
        "credential request gateway max_body_bytes",
        1024,
        65536,
      ),
    max_requests_per_minute:
      requireInteger(
        value.max_requests_per_minute,
        "credential request gateway max_requests_per_minute",
        1,
        120,
      ),
  };
}

function setCommonHeaders(
  response: ServerResponse,
): void {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );
  response.setHeader(
    "Content-Type",
    "application/json; charset=utf-8",
  );
  response.setHeader(
    "X-Content-Type-Options",
    "nosniff",
  );
  response.setHeader(
    "Referrer-Policy",
    "no-referrer",
  );
}

function sendJson(
  response: ServerResponse,
  status: number,
  value: unknown,
  extraHeaders: Record<string, string> = {},
): void {
  const body =
    Buffer.from(
      `${JSON.stringify(
        value,
        null,
        2,
      )}\n`,
      "utf8",
    );

  setCommonHeaders(response);

  for (
    const [
      key,
      headerValue,
    ]
    of Object.entries(extraHeaders)
  ) {
    response.setHeader(
      key,
      headerValue,
    );
  }

  response.statusCode =
    status;
  response.setHeader(
    "Content-Length",
    String(body.length),
  );
  response.end(body);
}

function stateCounts(
  stateDirectory: string,
): {
  request_count: number;
  receipt_count: number;
  state_consistent: boolean;
} {
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

  const countJsonFiles = (
    directory: string,
  ): number => {
    if (!existsSync(directory)) {
      return 0;
    }

    const metadata =
      lstatSync(directory);

    assertCondition(
      metadata.isDirectory() &&
        !metadata.isSymbolicLink() &&
        (metadata.mode & 0o077) === 0,
      "credential request gateway state child directory invalid",
    );

    return readdirSync(
      directory,
      {
        withFileTypes: true,
      },
    )
      .filter(
        (entry) =>
          entry.isFile() &&
          !entry.isSymbolicLink() &&
          entry.name.endsWith(".json"),
      )
      .length;
  };

  const requestCount =
    countJsonFiles(
      requestsDirectory,
    );
  const receiptCount =
    countJsonFiles(
      receiptsDirectory,
    );

  return {
    request_count:
      requestCount,
    receipt_count:
      receiptCount,
    state_consistent:
      requestCount === receiptCount,
  };
}

async function readExactJsonBody(
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<Buffer> {
  const contentEncoding =
    request.headers[
      "content-encoding"
    ];

  if (
    contentEncoding !== undefined &&
    String(contentEncoding).toLowerCase() !== "identity"
  ) {
    throw new GatewayHttpError(
      415,
      "unsupported_content_encoding",
      "content encoding is not supported",
    );
  }

  const transferEncoding =
    request.headers[
      "transfer-encoding"
    ];

  if (transferEncoding !== undefined) {
    throw new GatewayHttpError(
      400,
      "transfer_encoding_forbidden",
      "transfer encoding is not accepted",
    );
  }

  const contentType =
    String(
      request.headers[
        "content-type"
      ] || "",
    )
      .split(";", 1)[0]
      .trim()
      .toLowerCase();

  if (
    contentType !==
      "application/json"
  ) {
    throw new GatewayHttpError(
      415,
      "content_type_required",
      "content type must be application/json",
    );
  }

  const contentLengthText =
    request.headers[
      "content-length"
    ];

  if (
    typeof contentLengthText !== "string" ||
    !/^\d+$/.test(
      contentLengthText,
    )
  ) {
    throw new GatewayHttpError(
      411,
      "content_length_required",
      "content length is required",
    );
  }

  const contentLength =
    Number(contentLengthText);

  if (
    !Number.isSafeInteger(
      contentLength,
    ) ||
    contentLength < 2
  ) {
    throw new GatewayHttpError(
      400,
      "content_length_invalid",
      "content length is invalid",
    );
  }

  if (
    contentLength >
      maxBodyBytes
  ) {
    throw new GatewayHttpError(
      413,
      "payload_too_large",
      "request body exceeds the configured limit",
    );
  }

  const payloadShaHeader =
    String(
      request.headers[
        "x-void-payload-sha256"
      ] || "",
    )
      .trim()
      .toLowerCase();

  if (
    !SHA256_PATTERN.test(
      payloadShaHeader,
    )
  ) {
    throw new GatewayHttpError(
      400,
      "payload_sha256_required",
      "x-void-payload-sha256 must be a lowercase SHA-256 digest",
    );
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      request.on(
        "data",
        (chunk: Buffer | string) => {
          const buffer =
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk);

          receivedBytes +=
            buffer.length;

          if (
            receivedBytes >
              maxBodyBytes ||
            receivedBytes >
              contentLength
          ) {
            reject(
              new GatewayHttpError(
                413,
                "payload_too_large",
                "request body exceeded declared or configured size",
              ),
            );
            return;
          }

          chunks.push(buffer);
        },
      );
      request.on(
        "end",
        resolve,
      );
      request.on(
        "aborted",
        () => {
          reject(
            new GatewayHttpError(
              400,
              "request_aborted",
              "request body was aborted",
            ),
          );
        },
      );
      request.on(
        "error",
        reject,
      );
    },
  );

  const body =
    Buffer.concat(chunks);

  if (
    body.length !==
      contentLength
  ) {
    throw new GatewayHttpError(
      400,
      "content_length_mismatch",
      "request body length does not match Content-Length",
    );
  }

  if (
    sha256(body) !==
      payloadShaHeader
  ) {
    throw new GatewayHttpError(
      400,
      "payload_sha256_mismatch",
      "request body digest mismatch",
    );
  }

  return body;
}

function publicError(
  error: unknown,
): {
  status: number;
  code: string;
} {
  if (
    error instanceof
      GatewayHttpError
  ) {
    return {
      status:
        error.status,
      code:
        error.code,
    };
  }

  const message =
    error instanceof Error
      ? error.message
      : String(error);

  if (
    message.includes(
      "request_id collision",
    ) ||
    message.includes(
      "state is incomplete",
    )
  ) {
    return {
      status: 409,
      code:
        "request_state_conflict",
    };
  }

  return {
    status: 400,
    code:
      "invalid_credential_request",
  };
}

export function
createAgentPaidWorkCredentialRequestGatewayHandlerV1(
  options:
    AgentPaidWorkCredentialRequestGatewayRuntimeOptionsV1,
): RequestListener {
  const stateDirectory =
    requireAbsoluteDirectoryPath(
      options.state_directory,
      "credential request gateway state_directory",
    );
  const maxBodyBytes =
    requireInteger(
      options.max_body_bytes,
      "credential request gateway max_body_bytes",
      1024,
      65536,
    );
  const maxRequestsPerMinute =
    requireInteger(
      options.max_requests_per_minute,
      "credential request gateway max_requests_per_minute",
      1,
      120,
    );
  const clock =
    options.clock ||
    utcNowSeconds;
  const rateWindows =
    new Map<
      string,
      number[]
    >();

  const handler =
    async (
      request: IncomingMessage,
      response: ServerResponse,
    ): Promise<void> => {
      const method =
        request.method || "";
      const requestUrl =
        new URL(
          request.url || "/",
          "http://127.0.0.1",
        );
      const pathname =
        requestUrl.pathname;

      if (
        requestUrl.search !== ""
      ) {
        sendJson(
          response,
          400,
          {
            ok: false,
            error:
              "query_parameters_forbidden",
          },
        );
        return;
      }

      if (
        method === "GET" &&
        pathname ===
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_HEALTH_PATH
      ) {
        const counts =
          stateCounts(
            stateDirectory,
          );

        sendJson(
          response,
          counts.state_consistent
            ? 200
            : 503,
          {
            marker:
              AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_HEALTH_MARKER,
            version: 1,
            ready:
              counts.state_consistent,
            request_path:
              AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
            decision:
              "accepted_for_review_only",
            credential_issuance_authorized:
              false,
            credential_registry_mutation_authorized:
              false,
            receiver_restart_authorized:
              false,
          },
        );
        return;
      }

      if (
        method === "GET" &&
        pathname ===
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_STATUS_PATH
      ) {
        const counts =
          stateCounts(
            stateDirectory,
          );

        sendJson(
          response,
          counts.state_consistent
            ? 200
            : 503,
          {
            marker:
              AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STATUS_MARKER,
            version: 1,
            ready:
              counts.state_consistent,
            ...counts,
            request_path:
              AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH,
            max_body_bytes:
              maxBodyBytes,
            max_requests_per_minute:
              maxRequestsPerMinute,
            raw_request_content_exposed:
              false,
            callback_uri_exposed:
              false,
            credential_issuance_authorized:
              false,
            credential_registry_mutation_authorized:
              false,
            receiver_restart_authorized:
              false,
          },
        );
        return;
      }

      if (
        pathname !==
          AGENT_PAID_WORK_CREDENTIAL_REQUEST_PATH
      ) {
        sendJson(
          response,
          404,
          {
            ok: false,
            error:
              "not_found",
          },
        );
        return;
      }

      if (
        method !== "POST"
      ) {
        sendJson(
          response,
          405,
          {
            ok: false,
            error:
              "method_not_allowed",
          },
          {
            Allow: "POST",
          },
        );
        return;
      }

      const remoteKey =
        request.socket.remoteAddress ||
        "unknown";
      const nowMs =
        Date.now();
      const minimumMs =
        nowMs - 60_000;
      const active =
        (
          rateWindows.get(
            remoteKey,
          ) || []
        )
          .filter(
            (timestamp) =>
              timestamp >
                minimumMs,
          );

      if (
        active.length >=
          maxRequestsPerMinute
      ) {
        sendJson(
          response,
          429,
          {
            ok: false,
            error:
              "rate_limit_exceeded",
          },
          {
            "Retry-After":
              "60",
          },
        );
        return;
      }

      active.push(nowMs);
      rateWindows.set(
        remoteKey,
        active,
      );

      try {
        const body =
          await readExactJsonBody(
            request,
            maxBodyBytes,
          );
        let parsed: unknown;

        try {
          parsed =
            JSON.parse(
              body.toString("utf8"),
            );
        } catch {
          throw new GatewayHttpError(
            400,
            "invalid_json",
            "request body is not valid JSON",
          );
        }

        const receivedAt =
          requireUtcSeconds(
            clock(),
          );
        const intake =
          receiveAgentPaidWorkCredentialRequestV1({
            state_directory:
              stateDirectory,
            request:
              parsed,
            received_at_utc:
              receivedAt,
          });

        sendJson(
          response,
          intake.duplicate
            ? 200
            : 202,
          {
            marker:
              AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_RESPONSE_MARKER,
            version: 1,
            ok: true,
            duplicate:
              intake.duplicate,
            receipt:
              intake.receipt,
            credential_created:
              false,
            credential_registry_mutated:
              false,
            receiver_restart:
              false,
            credential_issuance_authorized:
              false,
          },
        );
      } catch (error) {
        const mapped =
          publicError(error);

        sendJson(
          response,
          mapped.status,
          {
            ok: false,
            error:
              mapped.code,
            credential_created:
              false,
            credential_registry_mutated:
              false,
            receiver_restart:
              false,
          },
        );
      }
    };

  return (
    request,
    response,
  ) => {
    void handler(
      request,
      response,
    ).catch(
      () => {
        if (
          !response.headersSent
        ) {
          sendJson(
            response,
            500,
            {
              ok: false,
              error:
                "internal_gateway_error",
              credential_created:
                false,
              credential_registry_mutated:
                false,
              receiver_restart:
                false,
            },
          );
        } else {
          response.destroy();
        }
      },
    );
  };
}

export function
startAgentPaidWorkCredentialRequestGatewayV1(
  config:
    AgentPaidWorkCredentialRequestGatewayConfigV1,
): AgentPaidWorkCredentialRequestGatewayStartedV1 {
  const handler =
    createAgentPaidWorkCredentialRequestGatewayHandlerV1({
      state_directory:
        config.state_directory,
      max_body_bytes:
        config.max_body_bytes,
      max_requests_per_minute:
        config.max_requests_per_minute,
    });
  const server =
    createServer(handler);

  server.listen(
    config.listen_port,
    config.listen_host,
  );

  return {
    server,
    config,
  };
}

function usage(): never {
  return fail(
    "usage: tsx scripts/agent_paid_work_credential_request_gateway_v1.ts --config CONFIG.json",
  );
}

async function main(): Promise<void> {
  const args =
    process.argv.slice(2);

  if (
    args.length !== 2 ||
    args[0] !== "--config"
  ) {
    usage();
  }

  const configPath =
    path.resolve(
      args[1],
    );
  const config =
    parseAgentPaidWorkCredentialRequestGatewayConfigV1(
      JSON.parse(
        readFileSync(
          configPath,
          "utf8",
        ),
      ),
    );
  const {
    server,
  } =
    startAgentPaidWorkCredentialRequestGatewayV1(
      config,
    );

  server.on(
    "listening",
    () => {
      process.stdout.write(
        `${JSON.stringify(
          {
            marker:
              "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_STARTED_V1",
            version: 1,
            listen_host:
              config.listen_host,
            listen_port:
              config.listen_port,
            request_path:
              config.request_path,
            health_path:
              config.health_path,
            status_path:
              config.status_path,
            max_body_bytes:
              config.max_body_bytes,
            max_requests_per_minute:
              config.max_requests_per_minute,
            credential_issuance_authorized:
              false,
            credential_registry_mutation_authorized:
              false,
            receiver_restart_authorized:
              false,
          },
          null,
          2,
        )}\n`,
      );
    },
  );

  const stop =
    (): void => {
      server.close(
        () => {
          process.exit(0);
        },
      );
    };

  process.on(
    "SIGINT",
    stop,
  );
  process.on(
    "SIGTERM",
    stop,
  );
}

const entry =
  process.argv[1]
    ? pathToFileURL(
        path.resolve(
          process.argv[1],
        ),
      ).href
    : "";

if (
  import.meta.url === entry
) {
  main().catch(
    (error) => {
      process.stderr.write(
        `${String(
          error instanceof Error
            ? error.stack
            : error,
        )}\n`,
      );
      process.exitCode = 1;
    },
  );
}
