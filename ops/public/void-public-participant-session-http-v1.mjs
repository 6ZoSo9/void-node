#!/usr/bin/env node
import {
  createVoidPublicParticipantReadSessionV1,
} from "./void-public-participant-read-session-v1.mjs";

export const VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1",
  status_path: "/__void/participant/session/v1/status.json",
  challenge_path: "/__void/participant/session/v1/challenge",
  login_path: "/__void/participant/session/v1/login",
  logout_path: "/__void/participant/session/v1/logout",
  capability: "participant.account.read.v1",
  role_authority_required: true,
  required_role: "AGENT",
  max_request_body_bytes: 8 * 1024,
  cookie_authentication: false,
  cors_wildcard: false,
  wallet_passphrase_transport: false,
  wallet_private_key_access: false,
  wallet_unlock_performed: false,
  signer_cache_written: false,
  transaction_signing: false,
  wallet_send_authority: false,
  work_credit_mutation_authority: false,
  validator_mutation_authority: false,
  generic_rpc_authority: false,
  money_movement_authority: false,
  listener_created: false,
  production_route_mounted: false,
});

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const JSON_CONTENT_TYPE_RE =
  /^application\/json(?:\s*;\s*charset=utf-8)?$/i;

function fail(message) {
  throw new Error(message);
}

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_object_required");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    !actual.every((key, index) => key === expected[index])
  ) {
    fail(label + "_shape_invalid");
  }
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

function routeOf(raw) {
  const text = String(raw || "");
  if (
    !text.startsWith("/") ||
    text.startsWith("//") ||
    text.length > 512 ||
    text.includes("#")
  ) {
    fail("route_invalid");
  }
  const parsed = new URL(text, "http://void-session-http.local");
  if (
    parsed.origin !== "http://void-session-http.local" ||
    parsed.search
  ) {
    fail("route_invalid");
  }
  return parsed.pathname;
}

function requestBodyBytes(raw) {
  if (raw === undefined || raw === null) return Buffer.alloc(0);
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (typeof raw === "string") return Buffer.from(raw, "utf8");
  fail("request_body_bytes_required");
}

function parseJsonBody(request, label) {
  const contentType = headerValue(request.headers, "content-type");
  if (!JSON_CONTENT_TYPE_RE.test(contentType)) {
    fail("json_content_type_required");
  }
  const body = requestBodyBytes(request.body);
  if (
    body.length < 2 ||
    body.length >
      VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.max_request_body_bytes
  ) {
    fail("request_body_size_invalid");
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch (error) {
    void error;
    fail("request_body_utf8_invalid");
  }

  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    void error;
    fail("request_json_invalid");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_object_required");
  }
  return value;
}

function baseHeaders() {
  return Object.freeze({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-void-marker": VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.marker,
  });
}

function response(status, body = null) {
  return Object.freeze({
    status,
    headers: baseHeaders(),
    body,
  });
}

function requestMethod(raw) {
  const method = String(raw || "").toUpperCase();
  return method || "GET";
}

export function createVoidPublicParticipantSessionHttpV1({
  bindingRegistryFile,
  roleAuthority,
  now,
  randomBytes,
} = {}) {
  if (!roleAuthority) {
    fail("role_authority_adapter_required");
  }
  const session = createVoidPublicParticipantReadSessionV1({
    bindingRegistryFile,
    roleAuthority,
    now,
    randomBytes,
  });
  if (session.role_authority_required !== true) {
    fail("role_authority_adapter_required");
  }

  const authorizeAccountRead = (authorization, accountRaw) => {
    const account = safeAccount(accountRaw);
    return session.authorize(String(authorization || ""), account);
  };

  const handle = async (request = {}) => {
    let route;
    try {
      route = routeOf(request.url);
    } catch (error) {
      void error;
      return response(404, { ok: false, error: "not_found" });
    }

    const method = requestMethod(request.method);

    if (route === VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.status_path) {
      if (method !== "GET" && method !== "HEAD") {
        return response(405, {
          ok: false,
          error: "method_not_allowed",
          allowed: ["GET", "HEAD"],
        });
      }
      let statusBody;
      try {
        statusBody = requestBodyBytes(request.body);
      } catch (error) {
        void error;
        return response(400, {
          ok: false,
          error: "request_body_invalid",
        });
      }
      if (statusBody.length !== 0) {
        return response(400, { ok: false, error: "request_body_not_allowed" });
      }
      return response(200, {
        ok: true,
        marker: VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.marker,
        capability: VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.capability,
        challenge_ttl_ms: session.authority.challenge_ttl_ms,
        session_ttl_ms: session.authority.session_ttl_ms,
        login_key_type: "ed25519",
        role_authority_required: true,
        required_role: "AGENT",
        cookie_authentication: false,
        account_enumeration: false,
        wallet_passphrase_transport: false,
        signing_authority: false,
        money_movement_authority: false,
        production_route_mounted: false,
      });
    }

    if (
      route !== VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path &&
      route !== VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path &&
      route !== VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.logout_path
    ) {
      return response(404, { ok: false, error: "not_found" });
    }

    if (method !== "POST") {
      return response(405, {
        ok: false,
        error: "method_not_allowed",
        allowed: ["POST"],
      });
    }

    if (route === VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.challenge_path) {
      if (headerValue(request.headers, "authorization")) {
        return response(400, {
          ok: false,
          error: "authorization_not_accepted",
        });
      }

      let body;
      try {
        body = parseJsonBody(request, "challenge_request");
        exactObject(
          body,
          ["identity_id", "account"],
          "challenge_request",
        );
        const account = safeAccount(body.account);
        const challenge = session.challenge({
          identity_id: body.identity_id,
          account,
        });
        return response(200, {
          ok: true,
          ...challenge,
        });
      } catch (error) {
        if (String(error?.message || error) === "challenge_capacity_reached") {
          return response(429, {
            ok: false,
            error: "challenge_capacity_reached",
          });
        }
        return response(400, {
          ok: false,
          error: "invalid_challenge_request",
        });
      }
    }

    if (route === VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1.login_path) {
      if (headerValue(request.headers, "authorization")) {
        return response(400, {
          ok: false,
          error: "authorization_not_accepted",
        });
      }

      let body;
      try {
        body = parseJsonBody(request, "login_request");
        exactObject(
          body,
          [
            "challenge_id",
            "nonce",
            "identity_id",
            "account",
            "signature_base64url",
          ],
          "login_request",
        );
      } catch (error) {
        void error;
        return response(400, {
          ok: false,
          error: "invalid_login_request",
        });
      }

      try {
        const loggedIn = await session.login(body);
        return response(200, {
          ok: true,
          ...loggedIn,
        });
      } catch (error) {
        if (String(error?.message || error) === "session_capacity_reached") {
          return response(503, {
            ok: false,
            error: "session_capacity_reached",
          });
        }
        return response(401, {
          ok: false,
          error: "account_authentication_failed",
        });
      }
    }

    let rawBody;
    try {
      rawBody = requestBodyBytes(request.body);
    } catch (error) {
      void error;
      return response(400, {
        ok: false,
        error: "request_body_invalid",
      });
    }
    if (rawBody.length !== 0) {
      return response(400, {
        ok: false,
        error: "request_body_not_allowed",
      });
    }

    session.logout(headerValue(request.headers, "authorization"));
    return response(204, null);
  };

  return Object.freeze({
    handle,
    authorizeAccountRead,
    role_authority_required: true,
    authority: VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1,
    session_authority: session.authority,
  });
}
