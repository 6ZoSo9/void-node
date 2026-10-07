import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  Express,
  Request,
  RequestHandler,
  Response as ExpressResponse,
} from "express";
import {
  authorizeSteamReadonlyBridgeOperatorV3,
  registerSteamReadonlyBridgeBootstrapV3,
  steamReadonlyBridgeBootstrapStatusV3,
  VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3,
  VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_BODY_LIMIT_BYTES,
  VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256_ENV,
} from "../src/http/steam_readonly_bridge_bootstrap_v3.js";
import {
  VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
  VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
} from "../src/http/steam_readonly_bridge_runtime_v2.js";

type Handler = (
  request: Request,
  response: ExpressResponse,
) => void | Promise<void>;

type CapturedResponse = {
  readonly status: number;
  readonly body: unknown;
};

class FakeApp {
  readonly useHandlers: Array<{
    readonly pathname: string;
    readonly handler: RequestHandler;
  }> = [];
  readonly getHandlers = new Map<string, Handler>();
  readonly postHandlers = new Map<string, Handler>();
  useAttempts = 0;
  getAttempts = 0;
  postAttempts = 0;

  use(pathname: string, handler: RequestHandler): this {
    this.useAttempts += 1;
    this.useHandlers.push({ pathname, handler });
    return this;
  }

  get(pathname: string, handler: Handler): this {
    this.getAttempts += 1;
    this.getHandlers.set(pathname, handler);
    return this;
  }

  post(pathname: string, handler: Handler): this {
    this.postAttempts += 1;
    this.postHandlers.set(pathname, handler);
    return this;
  }
}

class FailOncePostApp extends FakeApp {
  post(pathname: string, handler: Handler): this {
    if (this.postAttempts === 0) {
      this.postAttempts += 1;
      throw new Error("synthetic request-route registration failure");
    }
    return super.post(pathname, handler);
  }
}

function need(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(
      `VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_FAIL: ${message}`,
    );
  }
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

function tokenSha256(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function requestFixture(input: {
  readonly authorization?: string;
  readonly remoteAddress?: string;
  readonly body?: unknown;
}): Request {
  return {
    body: input.body,
    headers: input.authorization
      ? { authorization: input.authorization }
      : {},
    socket: {
      remoteAddress: input.remoteAddress,
    },
  } as unknown as Request;
}

function responseCapture(): {
  readonly response: ExpressResponse;
  readonly read: () => CapturedResponse;
} {
  let status = 200;
  let body: unknown;

  const response = {
    status(code: number) {
      status = code;
      return response;
    },
    json(value: unknown) {
      body = value;
      return response;
    },
  } as unknown as ExpressResponse;

  return {
    response,
    read: () => ({ status, body }),
  };
}

async function invoke(
  handler: Handler | undefined,
  request: Request,
): Promise<CapturedResponse> {
  need(handler, "route handler missing");
  const captured = responseCapture();
  await handler(request, captured.response);
  return captured.read();
}

function asObject(value: unknown, message: string): Record<string, unknown> {
  need(
    Boolean(value) && typeof value === "object" && !Array.isArray(value),
    message,
  );
  return value as Record<string, unknown>;
}

const root = process.cwd();
const moduleText = fs.readFileSync(
  path.join(
    root,
    "src",
    "http",
    "steam_readonly_bridge_bootstrap_v3.ts",
  ),
  "utf8",
);
const runtimeText = fs.readFileSync(
  path.join(
    root,
    "src",
    "http",
    "steam_readonly_bridge_runtime_v2.ts",
  ),
  "utf8",
);
const indexText = fs.readFileSync(
  path.join(root, "src", "index.ts"),
  "utf8",
);

for (const marker of [
  "VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3",
  "VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256",
  "loopback_and_bearer_sha256",
  "loopback_socket_required: true",
  "bearer_token_sha256_required: true",
  "raw_token_included: false",
  "raw_token_logged: false",
  "raw_token_persisted: false",
  "listener_created: false",
  "live_steam_request: false",
  "credential_read: false",
  "response_persistence: false",
  "work_credit_write: false",
  "wallet_or_signer_access: false",
  "money_movement: false",
]) {
  need(moduleText.includes(marker), `missing source marker: ${marker}`);
}

need(
  moduleText.includes('from "./steam_readonly_bridge_runtime_v2.js"'),
  "bootstrap does not reuse runtime v2",
);
need(
  moduleText.includes("request.socket?.remoteAddress"),
  "socket-level locality check missing",
);
need(
  moduleText.includes("timingSafeEqual"),
  "constant-time token hash comparison missing",
);
need(
  moduleText.includes("createHash(\"sha256\")"),
  "operator token SHA-256 binding missing",
);
need(
  moduleText.includes("options.json_body_parser"),
  "bounded node-injected JSON parser missing",
);
need(!moduleText.includes("app.listen"), "bootstrap creates a listener");
need(!moduleText.includes("console.log"), "bootstrap logs token-adjacent data");
need(!moduleText.includes("writeFile"), "bootstrap writes files");
need(!moduleText.includes("appendFile"), "bootstrap appends files");
need(!moduleText.includes("fetch("), "bootstrap directly performs fetch");
need(
  runtimeText.includes("operator_authentication_required"),
  "runtime v2 authentication boundary missing",
);

const importMarker =
  "VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_IMPORT";
const callsiteMarker =
  "VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_CALLSITE";
const sensitiveGuardMarker =
  "// === VOID public sensitive route guard v1 ===";
const nextRouteAnchor =
  'app.get("/__void/diag/storage-repair-readiness-v1.json"';

need(count(indexText, importMarker) === 1, "index import marker count mismatch");
need(count(indexText, callsiteMarker) === 1, "index callsite marker count mismatch");
need(
  indexText.includes(
    'from "./http/steam_readonly_bridge_bootstrap_v3.js"',
  ),
  "index bootstrap import missing",
);
need(
  indexText.includes("registerSteamReadonlyBridgeBootstrapV3(app"),
  "index bootstrap registration missing",
);
need(
  indexText.includes(
    "json_body_parser: express.json({ limit: \"16kb\", strict: true })",
  ),
  "route-specific bounded JSON parser callsite missing",
);

const guardIndex = indexText.indexOf(sensitiveGuardMarker);
const callsiteIndex = indexText.indexOf(callsiteMarker);
const nextRouteIndex = indexText.indexOf(nextRouteAnchor);
need(guardIndex >= 0, "sensitive-route guard marker missing");
need(callsiteIndex > guardIndex, "bootstrap mounted before sensitive-route guard");
need(nextRouteIndex > callsiteIndex, "bootstrap callsite anchor order mismatch");

const token =
  "proof-only-steam-bootstrap-operator-token-0000000000000001";
const tokenHash = tokenSha256(token);
const env: NodeJS.ProcessEnv = {
  [VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256_ENV]: tokenHash,
};

const status = steamReadonlyBridgeBootstrapStatusV3(env);
need(status.marker === VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3, "status marker mismatch");
need(status.version === 3, "status version mismatch");
need(status.source_bootstrap_attached === true, "source attach status false");
need(
  status.operator_authentication.token_hash_configured === true,
  "operator token hash not configured",
);
need(
  status.operator_authentication.token_hash_valid === true,
  "operator token hash not valid",
);
need(
  status.request_body.limit_bytes ===
    VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_BODY_LIMIT_BYTES,
  "body limit mismatch",
);
need(!JSON.stringify(status).includes(token), "status leaks raw operator token");
need(!JSON.stringify(status).includes(tokenHash), "status leaks operator token hash");

const localAuthorized = requestFixture({
  authorization: `Bearer ${token}`,
  remoteAddress: "127.0.0.1",
});
need(
  authorizeSteamReadonlyBridgeOperatorV3(localAuthorized, env),
  "valid loopback bearer token denied",
);
need(
  authorizeSteamReadonlyBridgeOperatorV3(
    requestFixture({
      authorization: `Bearer ${token}`,
      remoteAddress: "::1",
    }),
    env,
  ),
  "IPv6 loopback denied",
);
need(
  authorizeSteamReadonlyBridgeOperatorV3(
    requestFixture({
      authorization: `Bearer ${token}`,
      remoteAddress: "::ffff:127.0.0.1",
    }),
    env,
  ),
  "IPv4-mapped loopback denied",
);
need(
  !authorizeSteamReadonlyBridgeOperatorV3(
    requestFixture({
      authorization: `Bearer ${token}`,
      remoteAddress: "100.122.245.125",
    }),
    env,
  ),
  "remote address bypassed loopback gate",
);
need(
  !authorizeSteamReadonlyBridgeOperatorV3(
    requestFixture({
      authorization: "Bearer wrong-proof-token-00000000000000000000000000000000",
      remoteAddress: "127.0.0.1",
    }),
    env,
  ),
  "wrong bearer token authorized",
);
need(
  !authorizeSteamReadonlyBridgeOperatorV3(
    requestFixture({ remoteAddress: "127.0.0.1" }),
    env,
  ),
  "missing bearer token authorized",
);
need(
  !authorizeSteamReadonlyBridgeOperatorV3(localAuthorized, {}),
  "missing expected token hash authorized",
);
need(
  !authorizeSteamReadonlyBridgeOperatorV3(localAuthorized, {
    [VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256_ENV]: "not-a-hash",
  }),
  "malformed expected token hash authorized",
);

const parser = ((_request, _response, next) => next()) as RequestHandler;
const replacementParser = (
  (_request, _response, next) => next()
) as RequestHandler;
const failOnceApp = new FailOncePostApp();
let partialRegistrationFailed = false;
try {
  registerSteamReadonlyBridgeBootstrapV3(
    failOnceApp as unknown as Express,
    {
      env,
      json_body_parser: parser,
    },
  );
} catch (error) {
  partialRegistrationFailed =
    error instanceof Error &&
    error.message === "synthetic request-route registration failure";
}
need(partialRegistrationFailed, "bootstrap partial registration did not fail");
need(
  failOnceApp.useAttempts === 1 &&
    failOnceApp.getAttempts === 1 &&
    failOnceApp.postAttempts === 1,
  "bootstrap partial failure registration attempt counts mismatch",
);
need(
  failOnceApp.useHandlers.length === 1 &&
    failOnceApp.getHandlers.size === 1 &&
    failOnceApp.postHandlers.size === 0,
  "bootstrap partial failure retained an invalid route set",
);

const resumed = registerSteamReadonlyBridgeBootstrapV3(
  failOnceApp as unknown as Express,
  {
    env: {},
    json_body_parser: replacementParser,
  },
);
need(resumed.registered === true, "bootstrap retry did not resume");
need(
  resumed.operator_authentication.token_hash_valid === true,
  "bootstrap retry did not preserve the first configuration generation",
);
need(
  failOnceApp.useAttempts === 1 &&
    failOnceApp.getAttempts === 1 &&
    failOnceApp.postAttempts === 2,
  "bootstrap retry duplicated a completed registration step",
);
need(
  failOnceApp.useHandlers[0]?.handler === parser,
  "bootstrap retry replaced the first parser generation",
);
const resumedRequest = await invoke(
  failOnceApp.postHandlers.get(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
  ),
  requestFixture({
    authorization: `Bearer ${token}`,
    remoteAddress: "127.0.0.1",
    body: {
      confirmation: "steamReadonlyBridgeRouteFetchV2",
      operation: "player_summaries",
      steamids: ["76561198000000000"],
    },
  }),
);
need(
  resumedRequest.status === 503,
  "bootstrap retry did not retain the first authorization generation",
);

const resumedDuplicate = registerSteamReadonlyBridgeBootstrapV3(
  failOnceApp as unknown as Express,
  {
    env: {},
    json_body_parser: replacementParser,
  },
);
need(
  resumedDuplicate.registered === false,
  "completed bootstrap retry was not idempotent",
);
need(
  failOnceApp.useAttempts === 1 &&
    failOnceApp.getAttempts === 1 &&
    failOnceApp.postAttempts === 2,
  "completed bootstrap retry changed registration call counts",
);

const app = new FakeApp();
let fetchCalls = 0;
const registration = registerSteamReadonlyBridgeBootstrapV3(
  app as unknown as Express,
  {
    env,
    json_body_parser: parser,
    fetch_impl: async () => {
      fetchCalls += 1;
      throw new Error("mock fetch must not run in disabled bootstrap proof");
    },
  },
);

need(registration.registered === true, "bootstrap routes not registered");
need(registration.listener_created === false, "registration created listener");
need(registration.live_steam_request === false, "registration made Steam request");
need(registration.credential_read === false, "registration read Steam credential");
need(app.useHandlers.length === 1, "JSON parser middleware count mismatch");
need(
  app.useHandlers[0]?.pathname ===
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
  "JSON parser mounted on wrong path",
);
need(app.useHandlers[0]?.handler === parser, "injected JSON parser changed");
need(
  app.getHandlers.has(VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH),
  "status route absent",
);
need(
  app.postHandlers.has(VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH),
  "request route absent",
);

const duplicate = registerSteamReadonlyBridgeBootstrapV3(
  app as unknown as Express,
  {
    env,
    json_body_parser: parser,
  },
);
need(duplicate.registered === false, "duplicate bootstrap registration allowed");
need(
  app.useHandlers.length === 1 &&
    app.useAttempts === 1 &&
    app.getAttempts === 1 &&
    app.postAttempts === 1,
  "duplicate bootstrap changed parser or route registration counts",
);

const unauthorizedStatus = await invoke(
  app.getHandlers.get(VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH),
  requestFixture({
    authorization: "Bearer wrong-proof-token-00000000000000000000000000000000",
    remoteAddress: "127.0.0.1",
  }),
);
need(unauthorizedStatus.status === 401, "wrong-token status route not denied");
need(
  asObject(unauthorizedStatus.body, "unauthorized response missing").error ===
    "operator_authentication_required",
  "unauthorized error mismatch",
);

const remoteStatus = await invoke(
  app.getHandlers.get(VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH),
  requestFixture({
    authorization: `Bearer ${token}`,
    remoteAddress: "100.122.245.125",
  }),
);
need(remoteStatus.status === 401, "remote status route not denied");

const authorizedStatus = await invoke(
  app.getHandlers.get(VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH),
  localAuthorized,
);
need(authorizedStatus.status === 200, "authorized status route failed");
const authorizedBody = asObject(
  authorizedStatus.body,
  "authorized status body missing",
);
need(authorizedBody.status === "disabled", "bridge must remain disabled");
need(!JSON.stringify(authorizedBody).includes(token), "route leaks operator token");
need(!JSON.stringify(authorizedBody).includes(tokenHash), "route leaks token hash");

const disabledRequest = await invoke(
  app.postHandlers.get(VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH),
  requestFixture({
    authorization: `Bearer ${token}`,
    remoteAddress: "127.0.0.1",
    body: {
      confirmation: "steamReadonlyBridgeRouteFetchV2",
      operation: "player_summaries",
      steamids: ["76561198000000000"],
    },
  }),
);
need(disabledRequest.status === 503, "disabled request route did not hold");
need(
  asObject(disabledRequest.body, "disabled response missing").error ===
    "bridge_disabled",
  "disabled request error mismatch",
);
need(fetchCalls === 0, "transport invoked while bridge disabled");

console.log("VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_GREEN");
