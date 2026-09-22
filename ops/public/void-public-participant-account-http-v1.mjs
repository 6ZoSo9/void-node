#!/usr/bin/env node

export const VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1",
  status_path: "/__void/participant/account/v1/status.json",
  wallet_path: "/__void/participant/account/v1/wallet",
  earn_path: "/__void/participant/account/v1/earn",
  capability: "participant.account.read.v1",
  max_request_target_bytes: 1024,
  bearer_cookie_authentication: false,
  cors_wildcard: false,
  raw_source_proxy: false,
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
const SESSION_BEARER_RE =
  /^Bearer vps1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/;

function fail(message) {
  throw new Error(message);
}

function requestBodyBytes(raw) {
  if (raw === undefined || raw === null) return Buffer.alloc(0);
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (typeof raw === "string") return Buffer.from(raw, "utf8");
  fail("request_body_bytes_required");
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

function parseTarget(raw) {
  const text = String(raw || "");
  if (
    !text.startsWith("/") ||
    text.startsWith("//") ||
    Buffer.byteLength(text, "utf8") >
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.max_request_target_bytes ||
    text.includes("#")
  ) {
    fail("request_target_invalid");
  }

  const parsed = new URL(text, "http://void-participant-account.local");
  if (parsed.origin !== "http://void-participant-account.local") {
    fail("request_target_invalid");
  }
  return parsed;
}

function exactAccountQuery(parsed) {
  const entries = [...parsed.searchParams.entries()];
  if (
    entries.length !== 1 ||
    entries[0][0] !== "account" ||
    !ACCOUNT_RE.test(entries[0][1])
  ) {
    fail("account_query_invalid");
  }
  return entries[0][1];
}

function requestMethod(raw) {
  const method = String(raw || "").toUpperCase();
  return method || "GET";
}

function baseHeaders() {
  return Object.freeze({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-void-marker": VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.marker,
  });
}

function response(status, body, method) {
  return Object.freeze({
    status,
    headers: baseHeaders(),
    body: method === "HEAD" ? null : body,
  });
}

function projectionError(error, method) {
  const message = String(error?.message || error || "");

  if (message === "session_account_mismatch") {
    return response(
      403,
      { ok: false, error: "account_scope_mismatch" },
      method,
    );
  }

  if (
    message === "session_authorization_required" ||
    message === "session_token_invalid" ||
    message === "session_unavailable" ||
    message === "session_binding_stale" ||
    message === "session_capability_mismatch"
  ) {
    return response(
      401,
      { ok: false, error: "session_authorization_failed" },
      method,
    );
  }

  return response(
    503,
    { ok: false, error: "account_read_unavailable" },
    method,
  );
}

export function createVoidPublicParticipantAccountHttpV1({
  accountProjection,
} = {}) {
  if (
    !accountProjection ||
    typeof accountProjection.read !== "function"
  ) {
    fail("account_projection_required");
  }

  const handle = async (request = {}) => {
    let target;
    try {
      target = parseTarget(request.url);
    } catch (error) {
      void error;
      return response(
        404,
        { ok: false, error: "not_found" },
        requestMethod(request.method),
      );
    }

    const method = requestMethod(request.method);

    if (
      target.pathname ===
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.status_path
    ) {
      if (target.search) {
        return response(
          404,
          { ok: false, error: "not_found" },
          method,
        );
      }
      if (method !== "GET" && method !== "HEAD") {
        return response(
          405,
          {
            ok: false,
            error: "method_not_allowed",
            allowed: ["GET", "HEAD"],
          },
          method,
        );
      }

      let body;
      try {
        body = requestBodyBytes(request.body);
      } catch (error) {
        void error;
        return response(
          400,
          { ok: false, error: "request_body_invalid" },
          method,
        );
      }
      if (body.length !== 0) {
        return response(
          400,
          { ok: false, error: "request_body_not_allowed" },
          method,
        );
      }

      return response(
        200,
        {
          ok: true,
          marker: VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.marker,
          capability:
            VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.capability,
          routes: {
            wallet:
              VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path,
            earn:
              VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.earn_path,
          },
          method: "GET",
          exact_account_query: true,
          bearer_session_required: true,
          cookie_authentication: false,
          raw_source_proxy: false,
          wallet_mutation: false,
          work_credit_mutation: false,
          money_movement: false,
          production_route_mounted: false,
        },
        method,
      );
    }

    let view;
    if (
      target.pathname ===
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.wallet_path
    ) {
      view = "wallet";
    } else if (
      target.pathname ===
      VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.earn_path
    ) {
      view = "earn";
    } else {
      return response(
        404,
        { ok: false, error: "not_found" },
        method,
      );
    }

    if (method !== "GET") {
      return response(
        405,
        {
          ok: false,
          error: "method_not_allowed",
          allowed: ["GET"],
        },
        method,
      );
    }

    let body;
    try {
      body = requestBodyBytes(request.body);
    } catch (error) {
      void error;
      return response(
        400,
        { ok: false, error: "request_body_invalid" },
        method,
      );
    }
    if (body.length !== 0) {
      return response(
        400,
        { ok: false, error: "request_body_not_allowed" },
        method,
      );
    }

    let account;
    try {
      account = exactAccountQuery(target);
    } catch (error) {
      void error;
      return response(
        400,
        { ok: false, error: "invalid_account_query" },
        method,
      );
    }

    const authorization = headerValue(
      request.headers,
      "authorization",
    );
    if (!SESSION_BEARER_RE.test(authorization)) {
      return response(
        401,
        { ok: false, error: "session_authorization_failed" },
        method,
      );
    }

    try {
      const result = await accountProjection.read({
        authorization,
        account,
        view,
      });
      if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(result) ||
        result.ok !== true ||
        result.account !== account ||
        result.view !== view ||
        result.read_only !== true ||
        result.capability !==
          VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1.capability
      ) {
        fail("projection_contract_invalid");
      }
      return response(200, result, method);
    } catch (error) {
      return projectionError(error, method);
    }
  };

  return Object.freeze({
    handle,
    authority: VOID_PUBLIC_PARTICIPANT_ACCOUNT_HTTP_V1,
  });
}
