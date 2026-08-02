// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import {
  executeSteamReadonlyRequest,
  SteamReadonlyBridgeError,
} from "../integrations/steam_readonly_bridge_v1.js";

export const VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2 =
  "VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2" as const;
export const VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2 =
  "VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2" as const;
export const VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH =
  "/__void/operator/steam-readonly-bridge-v2/status" as const;
export const VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH =
  "/__void/operator/steam-readonly-bridge-v2/request" as const;
export const VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION =
  "steamReadonlyBridgeRouteFetchV2" as const;

const REFERENCE_ID_ENV = "VOID_STEAM_WEB_API_KEY_REFERENCE_ID";
const SOURCE_LOCATOR_SHA256_ENV =
  "VOID_STEAM_WEB_API_KEY_SOURCE_LOCATOR_SHA256";
const KEY_ENV = "VOID_STEAM_WEB_API_KEY";
const BRIDGE_ENABLED_ENV = "VOID_STEAM_READONLY_BRIDGE_ENABLED";
const HEX64 = /^[0-9a-f]{64}$/;
const REFERENCE_ID = /^voidsteamref1_[0-9a-f]{64}$/;
const BOUND = Symbol.for("void.steam-readonly-bridge-runtime-v2.bound");

type JsonObject = Record<string, unknown>;

type SteamPlayerSummariesRouteRequestV2 = {
  readonly confirmation: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION;
  readonly operation: "player_summaries";
  readonly steamids: readonly string[];
};

type SteamOwnedGamesRouteRequestV2 = {
  readonly confirmation: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION;
  readonly operation: "owned_games";
  readonly steamid: string;
  readonly include_appinfo?: boolean;
  readonly include_played_free_games?: boolean;
};

export type SteamReadonlyBridgeRouteRequestV2 =
  | SteamPlayerSummariesRouteRequestV2
  | SteamOwnedGamesRouteRequestV2;

export type SteamReadonlyBridgeCredentialReferenceStatusV2 = {
  readonly marker: typeof VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2;
  readonly version: 2;
  readonly mode: "environment_reference";
  readonly expected_scope: "steam_readonly_web_api";
  readonly environment_variable: typeof KEY_ENV;
  readonly reference_configured: boolean;
  readonly reference_valid: boolean;
  readonly reference_id_sha256: string | null;
  readonly source_locator_sha256_configured: boolean;
  readonly source_locator_sha256_valid: boolean;
  readonly source_locator_sha256: string | null;
  readonly credential_material_state: "not_inspected";
  readonly credential_read: false;
  readonly credential_provider_invoked: false;
  readonly raw_credential_included: false;
  readonly credential_digest_included: false;
  readonly private_locator_disclosed: false;
  readonly revalidation_required: true;
};

export type SteamReadonlyBridgeRuntimeStatusV2 = {
  readonly marker: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2;
  readonly version: 2;
  readonly enabled: boolean;
  readonly status:
    | "disabled"
    | "credential_reference_hold"
    | "ready_for_confirmed_attempt";
  readonly operator_authentication_required: true;
  readonly request_confirmation_required: true;
  readonly confirmation_value_disclosed_to_operator_docs: true;
  readonly routes: {
    readonly status: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH;
    readonly request: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH;
  };
  readonly credential_reference: SteamReadonlyBridgeCredentialReferenceStatusV2;
  readonly authority: {
    readonly automatic_background_loop: false;
    readonly live_steam_request: false;
    readonly response_persistence: false;
    readonly steam_client_scrape: false;
    readonly password_access: false;
    readonly cookie_access: false;
    readonly writes_to_steam: false;
    readonly purchase_or_trade: false;
    readonly work_credit_write: false;
    readonly wallet_or_signer_access: false;
    readonly money_movement: false;
  };
};

export type SteamReadonlyBridgeRedactedReceiptV2 = {
  readonly marker: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2;
  readonly version: 2;
  readonly receipt_id: string;
  readonly request_id: string;
  readonly operation: "player_summaries" | "owned_games";
  readonly target_count: number;
  readonly request_binding_sha256: string;
  readonly credential_reference_id_sha256: string;
  readonly credential_source_locator_sha256: string;
  readonly started_at_utc: string;
  readonly completed_at_utc: string;
  readonly elapsed_ms: number;
  readonly upstream_status: number;
  readonly received_bytes: number;
  readonly response_sha256: string;
  readonly operator_authenticated: true;
  readonly confirmation_verified: true;
  readonly response_body_included: false;
  readonly steam_ids_included: false;
  readonly steam_profile_data_included: false;
  readonly credential_material_included: false;
  readonly credential_digest_included: false;
  readonly private_locator_included: false;
  readonly response_persisted: false;
  readonly work_credit_write: false;
  readonly wallet_or_signer_access: false;
  readonly money_movement: false;
};

export type SteamReadonlyBridgeRuntimeV2Dependencies = {
  readonly authorize_operator: (
    request: Request,
  ) => boolean | Promise<boolean>;
  readonly env?: NodeJS.ProcessEnv;
  readonly fetch_impl?: typeof fetch;
  readonly now?: () => number;
};

export type SteamReadonlyBridgeRuntimeRegistrationV2 = {
  readonly marker: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2;
  readonly version: 2;
  readonly registered: boolean;
  readonly routes: {
    readonly status: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH;
    readonly request: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH;
  };
  readonly listener_created: false;
  readonly live_steam_request: false;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBooleanOrUndefined(value: unknown): value is boolean | undefined {
  return value === undefined || typeof value === "boolean";
}

function normalizedEnv(
  env: NodeJS.ProcessEnv | undefined,
): NodeJS.ProcessEnv {
  return env ?? process.env;
}

function bridgeEnabled(env: NodeJS.ProcessEnv): boolean {
  return String(env[BRIDGE_ENABLED_ENV] ?? "").trim() === "1";
}

export function steamReadonlyBridgeCredentialReferenceStatusV2(
  suppliedEnv?: NodeJS.ProcessEnv,
): SteamReadonlyBridgeCredentialReferenceStatusV2 {
  const env = normalizedEnv(suppliedEnv);
  const referenceId = String(env[REFERENCE_ID_ENV] ?? "").trim();
  const sourceLocatorSha256 = String(
    env[SOURCE_LOCATOR_SHA256_ENV] ?? "",
  )
    .trim()
    .toLowerCase();

  const referenceConfigured = referenceId.length > 0;
  const referenceValid = REFERENCE_ID.test(referenceId);
  const locatorConfigured = sourceLocatorSha256.length > 0;
  const locatorValid = HEX64.test(sourceLocatorSha256);

  return {
    marker: VOID_STEAM_READONLY_BRIDGE_CREDENTIAL_REFERENCE_V2,
    version: 2,
    mode: "environment_reference",
    expected_scope: "steam_readonly_web_api",
    environment_variable: KEY_ENV,
    reference_configured: referenceConfigured,
    reference_valid: referenceValid,
    reference_id_sha256: referenceValid ? sha256(referenceId) : null,
    source_locator_sha256_configured: locatorConfigured,
    source_locator_sha256_valid: locatorValid,
    source_locator_sha256: locatorValid ? sourceLocatorSha256 : null,
    credential_material_state: "not_inspected",
    credential_read: false,
    credential_provider_invoked: false,
    raw_credential_included: false,
    credential_digest_included: false,
    private_locator_disclosed: false,
    revalidation_required: true,
  };
}

export function steamReadonlyBridgeRuntimeStatusV2(
  suppliedEnv?: NodeJS.ProcessEnv,
): SteamReadonlyBridgeRuntimeStatusV2 {
  const env = normalizedEnv(suppliedEnv);
  const enabled = bridgeEnabled(env);
  const credentialReference =
    steamReadonlyBridgeCredentialReferenceStatusV2(env);
  const referenceReady =
    credentialReference.reference_valid &&
    credentialReference.source_locator_sha256_valid;

  const status: SteamReadonlyBridgeRuntimeStatusV2["status"] = !enabled
    ? "disabled"
    : !referenceReady
      ? "credential_reference_hold"
      : "ready_for_confirmed_attempt";

  return {
    marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
    version: 2,
    enabled,
    status,
    operator_authentication_required: true,
    request_confirmation_required: true,
    confirmation_value_disclosed_to_operator_docs: true,
    routes: {
      status: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
      request: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
    },
    credential_reference: credentialReference,
    authority: {
      automatic_background_loop: false,
      live_steam_request: false,
      response_persistence: false,
      steam_client_scrape: false,
      password_access: false,
      cookie_access: false,
      writes_to_steam: false,
      purchase_or_trade: false,
      work_credit_write: false,
      wallet_or_signer_access: false,
      money_movement: false,
    },
  };
}

function parseRouteRequest(body: unknown): SteamReadonlyBridgeRouteRequestV2 {
  if (!isObject(body)) {
    throw new RuntimeRouteError("invalid_request_body", 400);
  }
  if (
    body.confirmation !==
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION
  ) {
    throw new RuntimeRouteError("confirmation_required", 428);
  }

  if (body.operation === "player_summaries") {
    if (
      !Array.isArray(body.steamids) ||
      !body.steamids.every((value) => typeof value === "string")
    ) {
      throw new RuntimeRouteError("invalid_steamids", 400);
    }
    return {
      confirmation: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION,
      operation: "player_summaries",
      steamids: body.steamids,
    };
  }

  if (body.operation === "owned_games") {
    if (
      typeof body.steamid !== "string" ||
      !isBooleanOrUndefined(body.include_appinfo) ||
      !isBooleanOrUndefined(body.include_played_free_games)
    ) {
      throw new RuntimeRouteError("invalid_owned_games_request", 400);
    }
    return {
      confirmation: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_CONFIRMATION,
      operation: "owned_games",
      steamid: body.steamid,
      include_appinfo: body.include_appinfo,
      include_played_free_games: body.include_played_free_games,
    };
  }

  throw new RuntimeRouteError("unsupported_operation", 400);
}

function targetBinding(
  request: SteamReadonlyBridgeRouteRequestV2,
): {
  readonly target_count: number;
  readonly binding: JsonObject;
} {
  if (request.operation === "player_summaries") {
    return {
      target_count: request.steamids.length,
      binding: {
        operation: request.operation,
        steamids: [...request.steamids],
      },
    };
  }
  return {
    target_count: 1,
    binding: {
      operation: request.operation,
      steamid: request.steamid,
      include_appinfo: request.include_appinfo ?? false,
      include_played_free_games:
        request.include_played_free_games ?? false,
    },
  };
}

function upstreamRequest(
  request: SteamReadonlyBridgeRouteRequestV2,
):
  | {
      readonly operation: "player_summaries";
      readonly steamids: string[];
    }
  | {
      readonly operation: "owned_games";
      readonly steamid: string;
      readonly include_appinfo?: boolean;
      readonly include_played_free_games?: boolean;
    } {
  if (request.operation === "player_summaries") {
    return {
      operation: request.operation,
      steamids: [...request.steamids],
    };
  }
  return {
    operation: request.operation,
    steamid: request.steamid,
    include_appinfo: request.include_appinfo,
    include_played_free_games: request.include_played_free_games,
  };
}

function buildReceipt(args: {
  readonly request: SteamReadonlyBridgeRouteRequestV2;
  readonly credential_reference: SteamReadonlyBridgeCredentialReferenceStatusV2;
  readonly started_ms: number;
  readonly completed_ms: number;
  readonly upstream_status: number;
  readonly received_bytes: number;
  readonly response_sha256: string;
}): SteamReadonlyBridgeRedactedReceiptV2 {
  const target = targetBinding(args.request);
  const requestBindingSha256 = sha256(JSON.stringify(target.binding));
  const requestId = `voidsteamreq2_${sha256(
    JSON.stringify({
      request_binding_sha256: requestBindingSha256,
      started_ms: args.started_ms,
    }),
  )}`;
  const credentialReferenceIdSha256 =
    args.credential_reference.reference_id_sha256;
  const credentialSourceLocatorSha256 =
    args.credential_reference.source_locator_sha256;

  if (!credentialReferenceIdSha256 || !credentialSourceLocatorSha256) {
    throw new RuntimeRouteError("credential_reference_not_ready", 503);
  }

  const seed = {
    marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
    request_id: requestId,
    operation: args.request.operation,
    request_binding_sha256: requestBindingSha256,
    credential_reference_id_sha256: credentialReferenceIdSha256,
    credential_source_locator_sha256:
      credentialSourceLocatorSha256,
    started_ms: args.started_ms,
    completed_ms: args.completed_ms,
    upstream_status: args.upstream_status,
    received_bytes: args.received_bytes,
    response_sha256: args.response_sha256,
  };

  return {
    marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
    version: 2,
    receipt_id: `voidsteamrcpt2_${sha256(JSON.stringify(seed))}`,
    request_id: requestId,
    operation: args.request.operation,
    target_count: target.target_count,
    request_binding_sha256: requestBindingSha256,
    credential_reference_id_sha256: credentialReferenceIdSha256,
    credential_source_locator_sha256:
      credentialSourceLocatorSha256,
    started_at_utc: new Date(args.started_ms).toISOString(),
    completed_at_utc: new Date(args.completed_ms).toISOString(),
    elapsed_ms: Math.max(0, args.completed_ms - args.started_ms),
    upstream_status: args.upstream_status,
    received_bytes: args.received_bytes,
    response_sha256: args.response_sha256,
    operator_authenticated: true,
    confirmation_verified: true,
    response_body_included: false,
    steam_ids_included: false,
    steam_profile_data_included: false,
    credential_material_included: false,
    credential_digest_included: false,
    private_locator_included: false,
    response_persisted: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    money_movement: false,
  };
}

class RuntimeRouteError extends Error {
  readonly code: string;
  readonly http_status: number;

  constructor(code: string, httpStatus: number) {
    super(code);
    this.name = "RuntimeRouteError";
    this.code = code;
    this.http_status = httpStatus;
  }
}

function steamErrorStatus(code: string): number {
  if (code === "bridge_disabled" || code === "credential_missing") {
    return 503;
  }
  if (
    code.startsWith("upstream_") ||
    code === "response_too_large" ||
    code === "invalid_json_response"
  ) {
    return 502;
  }
  return 400;
}

async function authorized(
  request: Request,
  response: Response,
  dependencies: SteamReadonlyBridgeRuntimeV2Dependencies,
): Promise<boolean> {
  let allowed = false;
  try {
    allowed = Boolean(
      await dependencies.authorize_operator(request),
    );
  } catch {
    allowed = false;
  }

  if (!allowed) {
    response.status(401).json({
      ok: false,
      marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
      error: "operator_authentication_required",
    });
    return false;
  }
  return true;
}

export function registerSteamReadonlyBridgeRuntimeV2(
  app: Express,
  dependencies: SteamReadonlyBridgeRuntimeV2Dependencies,
): SteamReadonlyBridgeRuntimeRegistrationV2 {
  const anyApp = app as Express & { [BOUND]?: boolean };
  if (anyApp[BOUND]) {
    return {
      marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
      version: 2,
      registered: false,
      routes: {
        status: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
        request: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
      },
      listener_created: false,
      live_steam_request: false,
    };
  }
  anyApp[BOUND] = true;

  app.get(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
    async (request: Request, response: Response) => {
      if (!(await authorized(request, response, dependencies))) {
        return;
      }
      response.json({
        ok: true,
        ...steamReadonlyBridgeRuntimeStatusV2(dependencies.env),
      });
    },
  );

  app.post(
    VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
    async (request: Request, response: Response) => {
      if (!(await authorized(request, response, dependencies))) {
        return;
      }

      try {
        const parsed = parseRouteRequest(request.body);
        const env = normalizedEnv(dependencies.env);
        const status = steamReadonlyBridgeRuntimeStatusV2(env);
        if (status.status !== "ready_for_confirmed_attempt") {
          throw new RuntimeRouteError(
            status.status === "disabled"
              ? "bridge_disabled"
              : "credential_reference_not_ready",
            503,
          );
        }

        const clock = dependencies.now ?? Date.now;
        const startedMs = clock();
        const upstream = await executeSteamReadonlyRequest(
          upstreamRequest(parsed),
          {
            env,
            fetch_impl: dependencies.fetch_impl,
          },
        );
        const completedMs = clock();

        const receipt = buildReceipt({
          request: parsed,
          credential_reference: status.credential_reference,
          started_ms: startedMs,
          completed_ms: completedMs,
          upstream_status: upstream.upstream.status,
          received_bytes: upstream.received_bytes,
          response_sha256: upstream.response_sha256,
        });

        response.json({
          ok: true,
          marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
          data: upstream.data,
          receipt,
        });
      } catch (error) {
        if (error instanceof RuntimeRouteError) {
          response.status(error.http_status).json({
            ok: false,
            marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
            error: error.code,
          });
          return;
        }
        if (error instanceof SteamReadonlyBridgeError) {
          response.status(steamErrorStatus(error.code)).json({
            ok: false,
            marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
            error: error.code,
          });
          return;
        }
        response.status(500).json({
          ok: false,
          marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
          error: "steam_readonly_bridge_runtime_failure",
        });
      }
    },
  );

  return {
    marker: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2,
    version: 2,
    registered: true,
    routes: {
      status: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
      request: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
    },
    listener_created: false,
    live_steam_request: false,
  };
}
