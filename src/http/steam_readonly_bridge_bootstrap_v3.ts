// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { createHash, timingSafeEqual } from "node:crypto";
import type {
  Express,
  Request,
  RequestHandler,
} from "express";
import {
  registerSteamReadonlyBridgeRuntimeV2,
  VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
  VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
  type SteamReadonlyBridgeRuntimeRegistrationV2,
} from "./steam_readonly_bridge_runtime_v2.js";

export const VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3 =
  "VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3" as const;
export const VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256_ENV =
  "VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256" as const;
export const VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_BODY_LIMIT_BYTES =
  16 * 1024;

const HEX64 = /^[0-9a-f]{64}$/;
const BEARER = /^Bearer\s+([^\s]{32,512})$/i;
const BOOTSTRAP_BOUND = Symbol.for(
  "void.steam-readonly-bridge-bootstrap-v3.bound",
);
const BOOTSTRAP_STATE = Symbol.for(
  "void.steam-readonly-bridge-bootstrap-v3.state",
);

type SteamReadonlyBridgeRegistrationStateV3 =
  | "unattempted"
  | "indeterminate"
  | "bound";

function registrationStateV3(
  value: unknown,
): SteamReadonlyBridgeRegistrationStateV3 {
  if (value === true || value === "bound") return "bound";
  if (value === "indeterminate") return "indeterminate";
  return "unattempted";
}

type SteamReadonlyBridgeBootstrapStateV3 = {
  readonly json_body_parser: RequestHandler;
  readonly env: NodeJS.ProcessEnv;
  readonly fetch_impl: typeof fetch | undefined;
  readonly now: (() => number) | undefined;
  parser_registration_state: SteamReadonlyBridgeRegistrationStateV3;
};

type BootstrapApp = Express & {
  [BOOTSTRAP_BOUND]?: boolean;
  [BOOTSTRAP_STATE]?: SteamReadonlyBridgeBootstrapStateV3;
};

export type SteamReadonlyBridgeBootstrapV3Options = {
  readonly json_body_parser: RequestHandler;
  readonly env?: NodeJS.ProcessEnv;
  readonly fetch_impl?: typeof fetch;
  readonly now?: () => number;
};

export type SteamReadonlyBridgeBootstrapStatusV3 = {
  readonly marker: typeof VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3;
  readonly version: 3;
  readonly source_bootstrap_attached: true;
  readonly operator_surface: "loopback_and_bearer_sha256";
  readonly operator_authentication: {
    readonly loopback_socket_required: true;
    readonly bearer_token_required: true;
    readonly bearer_token_sha256_required: true;
    readonly token_hash_environment_variable:
      typeof VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256_ENV;
    readonly token_hash_configured: boolean;
    readonly token_hash_valid: boolean;
    readonly raw_token_included: false;
    readonly raw_token_logged: false;
    readonly raw_token_persisted: false;
  };
  readonly request_body: {
    readonly content_type: "application/json";
    readonly limit_bytes:
      typeof VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_BODY_LIMIT_BYTES;
    readonly parser_injected_by_node_bootstrap: true;
  };
  readonly routes: {
    readonly status: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH;
    readonly request: typeof VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH;
  };
  readonly listener_created: false;
  readonly live_steam_request: false;
  readonly credential_read: false;
  readonly response_persistence: false;
  readonly work_credit_write: false;
  readonly wallet_or_signer_access: false;
  readonly money_movement: false;
};

export type SteamReadonlyBridgeBootstrapRegistrationV3 =
  SteamReadonlyBridgeBootstrapStatusV3 & {
    readonly registered: boolean;
    readonly runtime: SteamReadonlyBridgeRuntimeRegistrationV2;
  };

function normalizedEnv(
  suppliedEnv: NodeJS.ProcessEnv | undefined,
): NodeJS.ProcessEnv {
  return suppliedEnv ?? process.env;
}

function expectedTokenHash(env: NodeJS.ProcessEnv): string {
  return String(
    env[VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256_ENV] ?? "",
  )
    .trim()
    .toLowerCase();
}

function requestRemoteAddress(request: Request): string {
  return String(request.socket?.remoteAddress ?? "")
    .trim()
    .toLowerCase();
}

function isLoopbackSocketAddress(address: string): boolean {
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1"
  );
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.authorization;
  if (typeof authorization !== "string") return null;
  const match = BEARER.exec(authorization.trim());
  return match?.[1] ?? null;
}

function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export function steamReadonlyBridgeBootstrapStatusV3(
  suppliedEnv?: NodeJS.ProcessEnv,
): SteamReadonlyBridgeBootstrapStatusV3 {
  const env = normalizedEnv(suppliedEnv);
  const tokenHash = expectedTokenHash(env);

  return {
    marker: VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3,
    version: 3,
    source_bootstrap_attached: true,
    operator_surface: "loopback_and_bearer_sha256",
    operator_authentication: {
      loopback_socket_required: true,
      bearer_token_required: true,
      bearer_token_sha256_required: true,
      token_hash_environment_variable:
        VOID_STEAM_READONLY_BRIDGE_OPERATOR_TOKEN_SHA256_ENV,
      token_hash_configured: tokenHash.length > 0,
      token_hash_valid: HEX64.test(tokenHash),
      raw_token_included: false,
      raw_token_logged: false,
      raw_token_persisted: false,
    },
    request_body: {
      content_type: "application/json",
      limit_bytes:
        VOID_STEAM_READONLY_BRIDGE_BOOTSTRAP_V3_BODY_LIMIT_BYTES,
      parser_injected_by_node_bootstrap: true,
    },
    routes: {
      status: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_STATUS_PATH,
      request: VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
    },
    listener_created: false,
    live_steam_request: false,
    credential_read: false,
    response_persistence: false,
    work_credit_write: false,
    wallet_or_signer_access: false,
    money_movement: false,
  };
}

export function authorizeSteamReadonlyBridgeOperatorV3(
  request: Request,
  suppliedEnv?: NodeJS.ProcessEnv,
): boolean {
  if (!isLoopbackSocketAddress(requestRemoteAddress(request))) {
    return false;
  }

  const expectedHex = expectedTokenHash(normalizedEnv(suppliedEnv));
  if (!HEX64.test(expectedHex)) return false;

  const token = bearerToken(request);
  if (!token) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = hashToken(token);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function registerSteamReadonlyBridgeBootstrapV3(
  app: Express,
  options: SteamReadonlyBridgeBootstrapV3Options,
): SteamReadonlyBridgeBootstrapRegistrationV3 {
  const anyApp = app as BootstrapApp;
  let state = anyApp[BOOTSTRAP_STATE];
  if (!state) {
    state = {
      json_body_parser: options.json_body_parser,
      // Preserve the original provider identity across retries without
      // enumerating or retaining every secret-bearing environment value.
      env: normalizedEnv(options.env),
      fetch_impl: options.fetch_impl,
      now: options.now,
      parser_registration_state: "unattempted",
    };
    anyApp[BOOTSTRAP_STATE] = state;
  }

  const status = steamReadonlyBridgeBootstrapStatusV3(state.env);

  if (anyApp[BOOTSTRAP_BOUND]) {
    return {
      ...status,
      registered: false,
      runtime: {
        marker: "VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2",
        version: 2,
        registered: false,
        routes: status.routes,
        listener_created: false,
        live_steam_request: false,
      },
    };
  }

  let parserRegistered = false;
  const parserRegistrationState = registrationStateV3(
    state.parser_registration_state,
  );
  if (parserRegistrationState === "indeterminate") {
    throw new Error(
      "steam_readonly_bridge_parser_registration_indeterminate",
    );
  }
  if (parserRegistrationState !== "bound") {
    state.parser_registration_state = "indeterminate";
    app.use(
      VOID_STEAM_READONLY_BRIDGE_RUNTIME_V2_REQUEST_PATH,
      state.json_body_parser,
    );
    state.parser_registration_state = "bound";
    parserRegistered = true;
  }

  const runtime = registerSteamReadonlyBridgeRuntimeV2(app, {
    env: state.env,
    fetch_impl: state.fetch_impl,
    now: state.now,
    authorize_operator: (request) =>
      authorizeSteamReadonlyBridgeOperatorV3(request, state.env),
  });

  anyApp[BOOTSTRAP_BOUND] = true;

  return {
    ...status,
    registered: parserRegistered || runtime.registered,
    runtime,
  };
}
