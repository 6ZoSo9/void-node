import fs from "node:fs";
import path from "node:path";
import type { Express, Request, Response as ExpressResponse } from "express";
import {
  registerSteamReadonlyBridgeRuntimeV2,
  steamReadonlyBridgeCredentialReferenceStatusV2,
  steamReadonlyBridgeRuntimeStatusV2,
  VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2,
  VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
  VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION,
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
  readonly getHandlers = new Map<string, Handler>();
  readonly postHandlers = new Map<string, Handler>();

  get(pathname: string, handler: Handler): this {
    this.getHandlers.set(pathname, handler);
    return this;
  }

  post(pathname: string, handler: Handler): this {
    this.postHandlers.set(pathname, handler);
    return this;
  }
}

function need(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(
      `VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_FAIL: ${message}`,
    );
  }
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
  body: unknown,
): Promise<CapturedResponse> {
  need(handler, "route handler missing");
  const request = { body } as Request;
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

function responseWithFinalUrl(
  body: BodyInit,
  init: ResponseInit,
  finalUrl: string,
): Response {
  const response = new Response(body, init);
  Object.defineProperty(response, "url", {
    configurable: false,
    enumerable: true,
    value: finalUrl,
  });
  return response;
}

const root = process.cwd();
const moduleText = fs.readFileSync(
  path.join(
    root,
    "src",
    "http",
    "steam_readonly_bridge_runtime_v2.ts",
  ),
  "utf8",
);
const v1Text = fs.readFileSync(
  path.join(
    root,
    "src",
    "integrations",
    "steam_readonly_bridge_v1.ts",
  ),
  "utf8",
);
const indexText = fs.readFileSync(
  path.join(root, "src", "index.ts"),
  "utf8",
);
const schema = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "schemas",
      "steam-readonly-bridge-credential-reference-v2.schema.json",
    ),
    "utf8",
  ),
) as Record<string, unknown>;
const example = JSON.parse(
  fs.readFileSync(
    path.join(
      root,
      "examples",
      "steam-readonly-bridge-credential-reference-v2.example.json",
    ),
    "utf8",
  ),
) as Record<string, unknown>;

for (const marker of [
  "VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2",
  "VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2",
  "/__void/operator/steam-readonly-bridge-v2/status",
  "/__void/operator/steam-readonly-bridge-v2/request",
  "steamReadonlyBridgeRouteFetchV2",
  "operator_authentication_required",
  "credential_reference_not_ready",
  "credential_material_state: \"not_inspected\"",
  "credential_read: false",
  "credential_provider_invoked: false",
  "response_body_included: false",
  "steam_ids_included: false",
  "credential_material_included: false",
  "response_persisted: false",
  "automatic_background_loop: false",
  "writes_to_steam: false",
  "money_movement: false",
]) {
  need(moduleText.includes(marker), `missing marker: ${marker}`);
}

need(
  moduleText.includes(
    'from "../integrations/steam_readonly_bridge_v1.js"',
  ),
  "runtime route does not reuse the reviewed v1 adapter",
);
need(!moduleText.includes("app.listen"), "runtime source creates a listener");
need(!moduleText.includes("writeFile"), "runtime source persists a response");
need(!moduleText.includes("appendFile"), "runtime source appends a response");
need(
  !indexText.includes("steam_readonly_bridge_runtime_v2"),
  "source lane unexpectedly changes node bootstrap",
);
need(
  v1Text.includes('redirect: "error"'),
  "reviewed v1 redirect boundary missing",
);
need(
  v1Text.includes("x-webapi-key"),
  "reviewed v1 credential header boundary missing",
);
const schemaProperties = asObject(
  schema.properties,
  "schema properties missing",
);
const markerSchema = asObject(
  schemaProperties.marker,
  "schema marker constraint missing",
);
need(
  markerSchema.const ===
    VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2,
  "schema marker mismatch",
);
need(
  example.marker === VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2,
  "example marker mismatch",
);
need(
  typeof example.reference_id === "string" &&
    /^voidsteamref1_[0-9a-f]{64}$/.test(example.reference_id),
  "example reference ID invalid",
);
const exampleCredentialReference = asObject(
  example.credential_reference,
  "example credential reference missing",
);
need(
  typeof exampleCredentialReference.source_locator_sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(
      exampleCredentialReference.source_locator_sha256,
    ),
  "example source-locator hash invalid",
);
need(
  example.status ===
    "source_reference_only_credential_read_forbidden",
  "example status mismatch",
);
need(
  !JSON.stringify(example).includes("proof-only-secret"),
  "example includes credential material",
);

const emptyReference =
  steamReadonlyBridgeCredentialReferenceStatusV2({});
need(
  emptyReference.marker ===
    VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2,
  "credential-reference marker mismatch",
);
need(
  emptyReference.credential_material_state === "not_inspected",
  "credential material was inspected",
);
need(emptyReference.credential_read === false, "credential read enabled");
need(
  emptyReference.credential_provider_invoked === false,
  "credential provider invoked",
);

const disabledStatus = steamReadonlyBridgeRuntimeStatusV2({});
need(
  disabledStatus.marker === VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
  "runtime marker mismatch",
);
need(disabledStatus.enabled === false, "runtime must default disabled");
need(disabledStatus.status === "disabled", "disabled status mismatch");
need(
  disabledStatus.operator_authentication_required === true,
  "operator authentication is optional",
);
need(
  disabledStatus.authority.live_steam_request === false,
  "status claims a live request",
);

const referenceId =
  "voidsteamref1_561353f2f0484bff9bb5b9fac49273e2cb0af96d28197d5421de8e82337f00a2";
const locatorSha =
  "26a4690aa2467d0c15e76e1bb6b8feb2c602cffb8e6e2562155a3deae33d8e30";
const secret = "proof-only-secret-never-persist";
const env: NodeJS.ProcessEnv = {
  VOID_STEAM_READONLY_BRIDGE_ENABLED: "1",
  VOID_STEAM_WEB_API_KEY_REFERENCE_ID: referenceId,
  VOID_STEAM_WEB_API_KEY_SOURCE_LOCATOR_SHA256: locatorSha,
  VOID_STEAM_WEB_API_KEY: secret,
  VOID_STEAM_READONLY_MAX_RESPONSE_BYTES: "16384",
};

const readyStatus = steamReadonlyBridgeRuntimeStatusV2(env);
need(
  readyStatus.status === "ready_for_confirmed_attempt",
  "configured bridge is not ready for confirmed attempt",
);
need(
  readyStatus.credential_reference.reference_id_sha256 !== null,
  "reference ID hash missing",
);
need(
  readyStatus.credential_reference.source_locator_sha256 === locatorSha,
  "locator hash mismatch",
);
need(
  !JSON.stringify(readyStatus).includes(secret),
  "status leaks credential material",
);
need(
  !JSON.stringify(readyStatus).includes(referenceId),
  "status leaks raw reference ID",
);

const deniedApp = new FakeApp();
registerSteamReadonlyBridgeRuntimeV2(
  deniedApp as unknown as Express,
  {
    env,
    authorize_operator: () => false,
  },
);
const denied = await invoke(
  deniedApp.getHandlers.get(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
  ),
  undefined,
);
need(denied.status === 401, "unauthorized status route not denied");
need(
  asObject(denied.body, "unauthorized response missing").error ===
    "operator_authentication_required",
  "unauthorized error mismatch",
);

const app = new FakeApp();
let observedUrl = "";
let observedHeaders: Record<string, string> = {};
const fetchCalls = new Set<string>();
const mockBody = JSON.stringify({
  response: {
    players: [
      {
        steamid: "76561198000000000",
        personaname: "proof-persona",
      },
    ],
  },
});
const times = [1_754_150_000_000, 1_754_150_000_025];

const registration = registerSteamReadonlyBridgeRuntimeV2(
  app as unknown as Express,
  {
    env,
    authorize_operator: async () => true,
    now: () => {
      const value = times.shift();
      need(value !== undefined, "proof clock exhausted");
      return value;
    },
    fetch_impl: async (input, init) => {
      fetchCalls.add("mock_fetch");
      observedUrl = String(input);
      observedHeaders = Object.fromEntries(
        new Headers(init?.headers).entries(),
      );
      return responseWithFinalUrl(
        mockBody,
        {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "content-length": String(Buffer.byteLength(mockBody)),
          },
        },
        observedUrl,
      );
    },
  },
);

need(registration.registered === true, "routes not registered");
need(registration.listener_created === false, "listener created");
need(registration.live_steam_request === false, "registration made request");
need(
  app.getHandlers.has(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
  ),
  "status route absent",
);
need(
  app.postHandlers.has(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
  ),
  "request route absent",
);

const duplicate = registerSteamReadonlyBridgeRuntimeV2(
  app as unknown as Express,
  {
    env,
    authorize_operator: () => true,
  },
);
need(duplicate.registered === false, "duplicate registration allowed");

const statusResponse = await invoke(
  app.getHandlers.get(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
  ),
  undefined,
);
need(statusResponse.status === 200, "status route failed");
need(
  !JSON.stringify(statusResponse.body).includes(secret),
  "status route leaked credential",
);

const missingConfirmation = await invoke(
  app.postHandlers.get(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
  ),
  {
    operation: "player_summaries",
    steamids: ["76561198000000000"],
  },
);
need(
  missingConfirmation.status === 428,
  "confirmation gate did not fail closed",
);
need(fetchCalls.size === 0, "network reached before confirmation");

const successful = await invoke(
  app.postHandlers.get(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
  ),
  {
    confirmation:
      VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION,
    operation: "player_summaries",
    steamids: ["76561198000000000"],
  },
);
need(successful.status === 200, "mocked request route failed");
need(fetchCalls.has("mock_fetch"), "mock transport call missing");
need(!observedUrl.includes(secret), "credential leaked in URL");
need(
  observedHeaders["x-webapi-key"] === secret,
  "credential header missing from bounded adapter",
);

const successBody = asObject(
  successful.body,
  "successful response missing",
);
const receipt = asObject(
  successBody.receipt,
  "redacted receipt missing",
);
const data = asObject(successBody.data, "authorized data missing");
const responseData = asObject(data.response, "Steam response missing");
const players = responseData.players;
need(Array.isArray(players), "Steam player list missing");
need(
  asObject(players[0], "Steam player missing").personaname ===
    "proof-persona",
  "authorized upstream data not returned",
);

const receiptText = JSON.stringify(receipt);
need(
  receipt.marker === VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
  "receipt marker mismatch",
);
need(
  typeof receipt.receipt_id === "string" &&
    /^voidsteamrcpt2_[0-9a-f]{64}$/.test(receipt.receipt_id),
  "receipt ID invalid",
);
need(receipt.elapsed_ms === 25, "elapsed time mismatch");
need(receipt.response_body_included === false, "body included in receipt");
need(receipt.steam_ids_included === false, "SteamID included in receipt");
need(
  receipt.credential_material_included === false,
  "credential material included in receipt",
);
need(receipt.response_persisted === false, "response persistence enabled");
need(!receiptText.includes(secret), "receipt leaks credential");
need(
  !receiptText.includes("76561198000000000"),
  "receipt leaks SteamID",
);
need(
  !receiptText.includes("proof-persona"),
  "receipt leaks profile data",
);
need(
  !receiptText.includes(referenceId),
  "receipt leaks raw credential reference ID",
);
need(
  receipt.credential_source_locator_sha256 === locatorSha,
  "receipt locator binding mismatch",
);

console.log("VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_GREEN");
