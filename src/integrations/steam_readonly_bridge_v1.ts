// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { createHash } from "node:crypto";

export const VOID_STEAM_READONLY_BRIDGE_V1 =
  "VOID_STEAM_READONLY_BRIDGE_V1" as const;

export const VOID_STEAM_READONLY_FETCH_CONFIRMATION =
  "steamReadonlyBridgeFetch" as const;

export const VOID_STEAM_READONLY_HOST =
  "partner.steam-api.com" as const;

export const VOID_STEAM_READONLY_OPERATIONS = [
  "player_summaries",
  "owned_games",
] as const;

export type SteamReadonlyOperation =
  (typeof VOID_STEAM_READONLY_OPERATIONS)[number];

type ProcessEnvLike = Record<string, string | undefined>;

export interface SteamReadonlyBridgeStatus {
  marker: typeof VOID_STEAM_READONLY_BRIDGE_V1;
  enabled: boolean;
  ready: boolean;
  mode: "read_only";
  credential_present: boolean;
  credential_source: "VOID_STEAM_WEB_API_KEY";
  outbound_hosts: readonly [typeof VOID_STEAM_READONLY_HOST];
  allowlisted_operations: readonly SteamReadonlyOperation[];
  timeout_ms: number;
  max_response_bytes: number;
  automatic_background_loop: false;
  writes_to_steam: false;
  steam_client_scrape: false;
  password_access: false;
  cookie_access: false;
  wallet_access: false;
  money_movement: false;
  response_persistence: false;
  node_bootstrap_attached: false;
}

export interface PlayerSummariesInput {
  operation: "player_summaries";
  steamids: string[];
}

export interface OwnedGamesInput {
  operation: "owned_games";
  steamid: string;
  include_appinfo?: boolean;
  include_played_free_games?: boolean;
}

export type SteamReadonlyInput =
  | PlayerSummariesInput
  | OwnedGamesInput;

export interface SteamReadonlyPreparedRequest {
  marker: typeof VOID_STEAM_READONLY_BRIDGE_V1;
  operation: SteamReadonlyOperation;
  url: URL;
  headers: Readonly<Record<string, string>>;
  timeout_ms: number;
  max_response_bytes: number;
}

export interface SteamReadonlyResult {
  ok: true;
  marker: typeof VOID_STEAM_READONLY_BRIDGE_V1;
  operation: SteamReadonlyOperation;
  upstream: {
    host: typeof VOID_STEAM_READONLY_HOST;
    path: string;
    status: number;
  };
  received_bytes: number;
  response_sha256: string;
  data: unknown;
}

export class SteamReadonlyBridgeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SteamReadonlyBridgeError";
    this.code = code;
  }
}

function parseBoundedInteger(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    return fallback;
  }
  return value;
}

function parseEnabled(raw: string | undefined): boolean {
  return raw === "1" || raw?.toLowerCase() === "true";
}

function bridgeConfig(env: ProcessEnvLike): {
  enabled: boolean;
  credential: string;
  timeout_ms: number;
  max_response_bytes: number;
} {
  return {
    enabled: parseEnabled(env.VOID_STEAM_READONLY_BRIDGE_ENABLED),
    credential: String(env.VOID_STEAM_WEB_API_KEY || "").trim(),
    timeout_ms: parseBoundedInteger(
      env.VOID_STEAM_READONLY_TIMEOUT_MS,
      5000,
      500,
      15000,
    ),
    max_response_bytes: parseBoundedInteger(
      env.VOID_STEAM_READONLY_MAX_RESPONSE_BYTES,
      1048576,
      16384,
      2097152,
    ),
  };
}

function validateSteamId(value: string, field: string): string {
  const normalized = String(value || "").trim();
  if (!/^[0-9]{17}$/.test(normalized)) {
    throw new SteamReadonlyBridgeError(
      "invalid_steam_id",
      `${field} must be one 17-digit SteamID64`,
    );
  }
  return normalized;
}

function validateSteamIds(values: string[]): string[] {
  if (!Array.isArray(values) || values.length < 1 || values.length > 100) {
    throw new SteamReadonlyBridgeError(
      "invalid_steam_ids",
      "steamids must contain between 1 and 100 SteamID64 values",
    );
  }
  const normalized = values.map((value, index) =>
    validateSteamId(value, `steamids[${index}]`),
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new SteamReadonlyBridgeError(
      "duplicate_steam_ids",
      "steamids must not contain duplicates",
    );
  }
  return normalized;
}

function requireAllowlistedOperation(
  operation: string,
): asserts operation is SteamReadonlyOperation {
  if (
    !VOID_STEAM_READONLY_OPERATIONS.includes(
      operation as SteamReadonlyOperation,
    )
  ) {
    throw new SteamReadonlyBridgeError(
      "operation_not_allowlisted",
      "Steam operation is not allowlisted",
    );
  }
}

export function steamReadonlyBridgeStatus(
  env: ProcessEnvLike = process.env,
): SteamReadonlyBridgeStatus {
  const config = bridgeConfig(env);
  return {
    marker: VOID_STEAM_READONLY_BRIDGE_V1,
    enabled: config.enabled,
    ready: config.enabled && config.credential.length > 0,
    mode: "read_only",
    credential_present: config.credential.length > 0,
    credential_source: "VOID_STEAM_WEB_API_KEY",
    outbound_hosts: [VOID_STEAM_READONLY_HOST],
    allowlisted_operations: VOID_STEAM_READONLY_OPERATIONS,
    timeout_ms: config.timeout_ms,
    max_response_bytes: config.max_response_bytes,
    automatic_background_loop: false,
    writes_to_steam: false,
    steam_client_scrape: false,
    password_access: false,
    cookie_access: false,
    wallet_access: false,
    money_movement: false,
    response_persistence: false,
    node_bootstrap_attached: false,
  };
}

export function prepareSteamReadonlyRequest(
  input: SteamReadonlyInput,
  env: ProcessEnvLike = process.env,
): SteamReadonlyPreparedRequest {
  requireAllowlistedOperation(input.operation);

  const config = bridgeConfig(env);
  if (!config.enabled) {
    throw new SteamReadonlyBridgeError(
      "bridge_disabled",
      "Steam bridge is disabled",
    );
  }
  if (!config.credential) {
    throw new SteamReadonlyBridgeError(
      "credential_missing",
      "Steam Web API key is not configured",
    );
  }

  const url = new URL(`https://${VOID_STEAM_READONLY_HOST}/`);

  if (input.operation === "player_summaries") {
    const steamids = validateSteamIds(input.steamids);
    url.pathname = "/ISteamUser/GetPlayerSummaries/v2/";
    url.searchParams.set("steamids", steamids.join(","));
  } else {
    const steamid = validateSteamId(input.steamid, "steamid");
    url.pathname = "/IPlayerService/GetOwnedGames/v1/";
    url.searchParams.set("steamid", steamid);
    url.searchParams.set(
      "include_appinfo",
      input.include_appinfo === false ? "false" : "true",
    );
    url.searchParams.set(
      "include_played_free_games",
      input.include_played_free_games === false ? "false" : "true",
    );
  }

  return {
    marker: VOID_STEAM_READONLY_BRIDGE_V1,
    operation: input.operation,
    url,
    headers: {
      Accept: "application/json",
      "User-Agent": "VOID-Steam-Readonly-Bridge/1.0",
      "x-webapi-key": config.credential,
    },
    timeout_ms: config.timeout_ms,
    max_response_bytes: config.max_response_bytes,
  };
}

const RESPONSE_TEARDOWN_TIMEOUT_MS = 250;
const CANONICAL_CONTENT_LENGTH = /^(0|[1-9][0-9]*)$/;

async function settleBestEffort(
  cleanup: () => Promise<unknown> | unknown,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      Promise.resolve().then(cleanup).catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, RESPONSE_TEARDOWN_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function rejectResponseBody(
  response: Response,
  controller: AbortController,
  error: SteamReadonlyBridgeError,
): Promise<never> {
  controller.abort(error);
  if (response.body) {
    await settleBestEffort(() => response.body?.cancel(error));
  }
  throw error;
}

async function fetchResponseWithDeadline(
  request: SteamReadonlyPreparedRequest,
  fetchImpl: typeof fetch,
  controller: AbortController,
): Promise<Response> {
  const timeoutError = new SteamReadonlyBridgeError(
    "upstream_timeout",
    "Steam Web API request timed out",
  );
  let timedOut = controller.signal.aborted;
  let removeAbortListener = () => undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    const onAbort = () => {
      timedOut = true;
      reject(timeoutError);
    };
    if (controller.signal.aborted) {
      onAbort();
      return;
    }
    controller.signal.addEventListener("abort", onAbort, { once: true });
    removeAbortListener = () =>
      controller.signal.removeEventListener("abort", onAbort);
  });

  const fetchPromise = Promise.resolve().then(() =>
    fetchImpl(request.url, {
      method: "GET",
      headers: request.headers,
      redirect: "error",
      signal: controller.signal,
    }),
  );

  void fetchPromise.then(
    (response) => {
      if (!timedOut) return;
      void settleBestEffort(() => response.body?.cancel(timeoutError));
    },
    () => undefined,
  );

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    removeAbortListener();
  }
}

async function rejectReaderFailure(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  controller: AbortController,
): Promise<never> {
  const timedOut = controller.signal.aborted;
  const error = new SteamReadonlyBridgeError(
    timedOut ? "upstream_timeout" : "upstream_unreachable",
    timedOut
      ? "Steam Web API request timed out"
      : "Steam Web API response body failed",
  );
  if (!timedOut) {
    controller.abort(error);
  }
  await settleBestEffort(() => reader.cancel(error));
  throw error;
}

async function readResponseChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<Awaited<ReturnType<typeof reader.read>>> {
  if (signal.aborted) {
    throw signal.reason instanceof Error
      ? signal.reason
      : new Error("steam_readonly_request_timeout");
  }

  return await new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      reject(
        signal.reason instanceof Error
          ? signal.reason
          : new Error("steam_readonly_request_timeout"),
      );
    };

    signal.addEventListener("abort", onAbort, { once: true });
    reader.read().then(
      (part) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(part);
      },
      (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

async function readBoundedResponse(
  response: Response,
  maxBytes: number,
  controller: AbortController,
): Promise<{ bytes: Uint8Array; text: string }> {
  const declaredHeader = response.headers.get("content-length");
  if (declaredHeader !== null) {
    const normalized = declaredHeader.trim();
    if (!CANONICAL_CONTENT_LENGTH.test(normalized)) {
      return rejectResponseBody(
        response,
        controller,
        new SteamReadonlyBridgeError(
          "response_content_length_invalid",
          "Steam response Content-Length was not a canonical byte count",
        ),
      );
    }
    const declaredLength = Number(normalized);
    if (!Number.isSafeInteger(declaredLength)) {
      return rejectResponseBody(
        response,
        controller,
        new SteamReadonlyBridgeError(
          "response_content_length_invalid",
          "Steam response Content-Length exceeded the safe integer range",
        ),
      );
    }
    if (declaredLength > maxBytes) {
      return rejectResponseBody(
        response,
        controller,
        new SteamReadonlyBridgeError(
          "response_too_large",
          "Steam response exceeded the configured size limit",
        ),
      );
    }
  }

  if (!response.body) {
    return { bytes: new Uint8Array(), text: "" };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const part = await readResponseChunk(reader, controller.signal).catch(() =>
      rejectReaderFailure(reader, controller),
    );
    if (part.done) break;
    total += part.value.byteLength;
    if (total > maxBytes) {
      const error = new SteamReadonlyBridgeError(
        "response_too_large",
        "Steam response exceeded the configured size limit",
      );
      controller.abort(error);
      await settleBestEffort(() => reader.cancel(error));
      throw error;
    }
    chunks.push(part.value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return {
    bytes,
    text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  };
}

export async function executeSteamReadonlyRequest(
  input: SteamReadonlyInput,
  options: {
    env?: ProcessEnvLike;
    fetch_impl?: typeof fetch;
  } = {},
): Promise<SteamReadonlyResult> {
  const request = prepareSteamReadonlyRequest(
    input,
    options.env ?? process.env,
  );
  const fetchImpl = options.fetch_impl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error("steam_readonly_request_timeout")),
    request.timeout_ms,
  );

  try {
    let response: Response;
    try {
      response = await fetchResponseWithDeadline(request, fetchImpl, controller);
    } catch (error) {
      if (error instanceof SteamReadonlyBridgeError) throw error;
      throw new SteamReadonlyBridgeError(
        controller.signal.aborted ? "upstream_timeout" : "upstream_unreachable",
        controller.signal.aborted
          ? "Steam Web API request timed out"
          : "Steam Web API request failed",
      );
    }

    if (!response.ok) {
      return rejectResponseBody(
        response,
        controller,
        new SteamReadonlyBridgeError(
          `upstream_http_${response.status}`,
          "Steam Web API returned an error status",
        ),
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return rejectResponseBody(
        response,
        controller,
        new SteamReadonlyBridgeError(
          "upstream_content_type_invalid",
          "Steam Web API did not return JSON",
        ),
      );
    }

    let bounded: { bytes: Uint8Array; text: string };
    try {
      bounded = await readBoundedResponse(
        response,
        request.max_response_bytes,
        controller,
      );
    } catch (error) {
      if (error instanceof SteamReadonlyBridgeError) throw error;
      throw new SteamReadonlyBridgeError(
        controller.signal.aborted ? "upstream_timeout" : "upstream_unreachable",
        controller.signal.aborted
          ? "Steam Web API request timed out"
          : "Steam Web API response body failed",
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(bounded.text);
    } catch {
      throw new SteamReadonlyBridgeError(
        "upstream_json_invalid",
        "Steam Web API returned invalid JSON",
      );
    }

    return {
      ok: true,
      marker: VOID_STEAM_READONLY_BRIDGE_V1,
      operation: request.operation,
      upstream: {
        host: VOID_STEAM_READONLY_HOST,
        path: request.url.pathname,
        status: response.status,
      },
      received_bytes: bounded.bytes.byteLength,
      response_sha256: createHash("sha256")
        .update(bounded.bytes)
        .digest("hex"),
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}
