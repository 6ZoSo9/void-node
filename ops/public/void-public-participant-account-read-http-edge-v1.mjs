#!/usr/bin/env node
import {
  VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1,
} from "./void-public-participant-session-http-v1.mjs";
import {
  VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1,
  createVoidPublicParticipantAccountReadProjectionV1,
} from "./void-public-participant-account-read-projection-v1.mjs";

export const VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1 =
  Object.freeze({
    marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1",
    status_path: "/__void/participant/account-read/v1/status.json",
    wallet_path: "/__void/participant/account-read/v1/wallet.json",
    earn_path: "/__void/participant/account-read/v1/earn.json",
    capability: "participant.account.read.v1",
    cookie_authentication: false,
    cors_wildcard: false,
    raw_wallet_route_forwarding: false,
    raw_work_credit_route_forwarding: false,
    authorization_forwarded_upstream: false,
    wallet_private_key_access: false,
    wallet_unlock_authority: false,
    wallet_send_authority: false,
    work_credit_mutation_authority: false,
    validator_mutation_authority: false,
    generic_rpc_authority: false,
    transaction_signing: false,
    money_movement_authority: false,
    listener_created: false,
    production_route_mounted: false,
  });

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;

function fail(message) {
  throw new Error(message);
}

function safeAccount(raw) {
  const account = String(raw || "").trim();
  if (!ACCOUNT_RE.test(account)) fail("account_invalid");
  return account;
}

function headerValue(headers, name) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return "";
  }
  const wanted = String(name).toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (String(key).toLowerCase() !== wanted) continue;
    if (Array.isArray(value)) {
      return value.length === 1
        ? String(value[0])
        : "__void_ambiguous_header__";
    }
    return value === undefined || value === null ? "" : String(value);
  }
  return "";
}

function requestMethod(raw) {
  const method = String(raw || "").toUpperCase();
  return method || "GET";
}

function requestBodyBytes(raw) {
  if (raw === undefined || raw === null) return Buffer.alloc(0);
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (typeof raw === "string") return Buffer.from(raw, "utf8");
  fail("request_body_bytes_required");
}

function requestUrl(raw) {
  const text = String(raw || "");
  if (
    !text.startsWith("/") ||
    text.startsWith("//") ||
    text.length > 1024 ||
    text.includes("#")
  ) {
    fail("route_invalid");
  }

  let parsed;
  try {
    parsed = new URL(text, "http://void-account-read-edge.local");
  } catch (error) {
    void error;
    fail("route_invalid");
  }

  if (parsed.origin !== "http://void-account-read-edge.local") {
    fail("route_invalid");
  }
  return parsed;
}

function exactAccountQuery(parsed) {
  const keys = Array.from(parsed.searchParams.keys());
  if (
    keys.length !== 1 ||
    keys[0] !== "account" ||
    parsed.searchParams.getAll("account").length !== 1
  ) {
    fail("account_query_invalid");
  }
  return safeAccount(parsed.searchParams.get("account"));
}

function baseHeaders() {
  return Object.freeze({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-void-marker":
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.marker,
  });
}

function response(status, body = null) {
  return Object.freeze({
    status,
    headers: baseHeaders(),
    body,
  });
}

function sessionHttpAuthorityValid(sessionHttp) {
  const authority = sessionHttp?.authority;
  return Boolean(
    sessionHttp &&
      typeof sessionHttp.authorizeAccountRead === "function" &&
      authority &&
      authority.marker === VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.marker &&
      authority.capability ===
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.capability &&
      authority.cookie_authentication === false &&
      authority.cors_wildcard === false &&
      authority.wallet_passphrase_transport === false &&
      authority.wallet_private_key_access === false &&
      authority.wallet_unlock_performed === false &&
      authority.signer_cache_written === false &&
      authority.transaction_signing === false &&
      authority.wallet_send_authority === false &&
      authority.work_credit_mutation_authority === false &&
      authority.validator_mutation_authority === false &&
      authority.generic_rpc_authority === false &&
      authority.money_movement_authority === false &&
      authority.listener_created === false &&
      authority.production_route_mounted === false
  );
}

function projectionAuthorityValid(projection) {
  const authority = projection?.authority;
  return Boolean(
    projection &&
      typeof projection.read === "function" &&
      authority &&
      authority.marker ===
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.marker &&
      authority.capability ===
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.capability &&
      authority.raw_source_forwarding === false &&
      authority.authorization_forwarded_upstream === false &&
      authority.cookie_forwarding === false &&
      authority.wallet_private_key_access === false &&
      authority.wallet_unlock_authority === false &&
      authority.wallet_send_authority === false &&
      authority.work_credit_mutation_authority === false &&
      authority.validator_mutation_authority === false &&
      authority.generic_rpc_authority === false &&
      authority.transaction_signing === false &&
      authority.money_movement_authority === false &&
      authority.listener_created === false &&
      authority.production_route_mounted === false
  );
}

function projectionResultValid(result, account, view) {
  return Boolean(
    result &&
      typeof result === "object" &&
      !Array.isArray(result) &&
      result.ok === true &&
      result.marker ===
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1.marker &&
      result.account === account &&
      result.view === view &&
      result.capability ===
        VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.capability &&
      result.read_only === true
  );
}

function authorizationFailure(error) {
  const message = String(error?.message || error);
  return (
    message.startsWith("session_") ||
    message === "account_invalid"
  );
}

export function createVoidPublicParticipantAccountReadHttpEdgeV1({
  sessionHttp,
  sourceBase = "http://127.0.0.1:4100",
  fetchImpl = fetch,
} = {}) {
  if (!sessionHttpAuthorityValid(sessionHttp)) {
    fail("session_http_authority_invalid");
  }

  const projection =
    createVoidPublicParticipantAccountReadProjectionV1({
      sessionHttp,
      sourceBase,
      fetchImpl,
    });
  if (!projectionAuthorityValid(projection)) {
    fail("projection_authority_invalid");
  }

  const handle = async (request = {}) => {
    let parsed;
    try {
      parsed = requestUrl(request.url);
    } catch (error) {
      void error;
      return response(404, { ok: false, error: "not_found" });
    }

    const route = parsed.pathname;
    const method = requestMethod(request.method);

    let body;
    try {
      body = requestBodyBytes(request.body);
    } catch (error) {
      void error;
      return response(400, {
        ok: false,
        error: "request_body_invalid",
      });
    }

    if (route ===
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.status_path) {
      if (parsed.search) {
        return response(400, {
          ok: false,
          error: "query_not_allowed",
        });
      }
      if (method !== "GET" && method !== "HEAD") {
        return response(405, {
          ok: false,
          error: "method_not_allowed",
          allowed: ["GET", "HEAD"],
        });
      }
      if (body.length !== 0) {
        return response(400, {
          ok: false,
          error: "request_body_not_allowed",
        });
      }
      return response(200, {
        ok: true,
        marker:
          VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.marker,
        capability:
          VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.capability,
        wallet_path:
          VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.wallet_path,
        earn_path:
          VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.earn_path,
        cookie_authentication: false,
        raw_route_forwarding: false,
        wallet_mutation_authority: false,
        work_credit_mutation_authority: false,
        money_movement_authority: false,
        listener_created: false,
        production_route_mounted: false,
      });
    }

    let view;
    if (
      route ===
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.wallet_path
    ) {
      view = "wallet";
    } else if (
      route ===
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1.earn_path
    ) {
      view = "earn";
    } else {
      return response(404, { ok: false, error: "not_found" });
    }

    if (method !== "GET") {
      return response(405, {
        ok: false,
        error: "method_not_allowed",
        allowed: ["GET"],
      });
    }
    if (body.length !== 0) {
      return response(400, {
        ok: false,
        error: "request_body_not_allowed",
      });
    }
    if (headerValue(request.headers, "cookie")) {
      return response(400, {
        ok: false,
        error: "cookie_not_accepted",
      });
    }

    const authorization = headerValue(
      request.headers,
      "authorization",
    );
    if (!authorization) {
      return response(401, {
        ok: false,
        error: "account_authorization_failed",
      });
    }

    let account;
    try {
      account = exactAccountQuery(parsed);
    } catch (error) {
      void error;
      return response(400, {
        ok: false,
        error: "invalid_account_query",
      });
    }

    let result;
    try {
      result = await projection.read({
        authorization,
        account,
        view,
      });
    } catch (error) {
      if (authorizationFailure(error)) {
        return response(401, {
          ok: false,
          error: "account_authorization_failed",
        });
      }
      return response(502, {
        ok: false,
        error: "account_read_unavailable",
      });
    }

    if (!projectionResultValid(result, account, view)) {
      return response(502, {
        ok: false,
        error: "account_read_unavailable",
      });
    }

    return response(200, result);
  };

  return Object.freeze({
    handle,
    authority:
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1,
  });
}
