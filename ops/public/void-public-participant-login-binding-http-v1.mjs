#!/usr/bin/env node
import {
  VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1,
  bindVoidPublicParticipantLoginKeyV1,
} from "../../tools/void-public-participant-login-binding-v1.mjs";

export const VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1 =
  Object.freeze({
    marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1",
    status_path:
      "/__void/participant/enrollment/v1/status.json",
    bind_path:
      "/__void/participant/enrollment/v1/bind",
    pairing_token_prefix: "vpp1",
    pairing_capability: "participant.login_key.bind.v1",
    session_capability: "participant.account.read.v1",
    login_key_type: "ed25519",
    max_request_body_bytes: 8 * 1024,
    cookie_authentication: false,
    authorization_header_authentication: false,
    raw_pairing_token_persistence: false,
    wallet_passphrase_transport: false,
    wallet_private_key_access: false,
    login_private_key_access: false,
    wallet_unlock_authority: false,
    signer_cache_write_authority: false,
    transaction_signing_authority: false,
    wallet_send_authority: false,
    work_credit_mutation_authority: false,
    validator_mutation_authority: false,
    generic_rpc_authority: false,
    money_movement_authority: false,
    listener_created: false,
    production_route_mounted: false,
  });

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const PAIRING_TOKEN_RE =
  /^vpp1\.[0-9a-f]{32}\.[A-Za-z0-9_-]{43}$/;
const LOGIN_PUBLIC_KEY_RE = /^[A-Za-z0-9_-]{40,1024}$/;
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

function requestBodyBytes(raw) {
  if (raw === undefined || raw === null) return Buffer.alloc(0);
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (typeof raw === "string") return Buffer.from(raw, "utf8");
  fail("request_body_bytes_required");
}

function requestMethod(raw) {
  const method = String(raw || "").toUpperCase();
  return method || "GET";
}

function parseTarget(raw) {
  const text = String(raw || "");
  if (
    !text.startsWith("/") ||
    text.startsWith("//") ||
    text.length > 512 ||
    text.includes("#")
  ) {
    fail("request_target_invalid");
  }

  const parsed = new URL(
    text,
    "http://void-participant-enrollment.local",
  );
  if (
    parsed.origin !==
      "http://void-participant-enrollment.local" ||
    parsed.search
  ) {
    fail("request_target_invalid");
  }
  return parsed.pathname;
}

function parseBindRequest(request) {
  const contentType = headerValue(
    request.headers,
    "content-type",
  );
  if (!JSON_CONTENT_TYPE_RE.test(contentType)) {
    fail("json_content_type_required");
  }

  const body = requestBodyBytes(request.body);
  if (
    body.length < 2 ||
    body.length >
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1
        .max_request_body_bytes
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

  exactObject(
    value,
    [
      "account",
      "pairing_token",
      "login_public_key_spki_base64url",
    ],
    "bind_request",
  );

  const account = String(value.account || "").trim();
  const pairingToken = String(value.pairing_token || "");
  const loginPublicKeySpkiBase64url = String(
    value.login_public_key_spki_base64url || "",
  );

  if (!ACCOUNT_RE.test(account)) fail("account_invalid");
  if (!PAIRING_TOKEN_RE.test(pairingToken)) {
    fail("pairing_token_invalid");
  }
  if (!LOGIN_PUBLIC_KEY_RE.test(loginPublicKeySpkiBase64url)) {
    fail("login_public_key_invalid");
  }

  return Object.freeze({
    account,
    pairingToken,
    loginPublicKeySpkiBase64url,
  });
}

function baseHeaders() {
  return Object.freeze({
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "x-void-marker":
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.marker,
  });
}

function response(status, body, method) {
  return Object.freeze({
    status,
    headers: baseHeaders(),
    body: method === "HEAD" ? null : body,
  });
}

export function createVoidPublicParticipantLoginBindingHttpV1({
  pairingStateDir,
  bindingRegistryFile,
  now = () => Date.now(),
  bindLoginKey =
    bindVoidPublicParticipantLoginKeyV1,
} = {}) {
  if (!pairingStateDir || !bindingRegistryFile) {
    fail("enrollment_state_required");
  }
  if (typeof bindLoginKey !== "function") {
    fail("binding_primitive_required");
  }

  const handle = async (request = {}) => {
    let pathname;
    try {
      pathname = parseTarget(request.url);
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
      pathname ===
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.status_path
    ) {
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
          marker:
            VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.marker,
          method: "POST",
          bind_path:
            VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.bind_path,
          pairing_token_ttl_ms: 5 * 60_000,
          pairing_token_single_use: true,
          login_key_type: "ed25519",
          session_capability:
            VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1
              .session_capability,
          cookie_authentication: false,
          authorization_header_authentication: false,
          wallet_secret_transport: false,
          money_movement_authority: false,
          production_route_mounted: false,
        },
        method,
      );
    }

    if (
      pathname !==
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.bind_path
    ) {
      return response(
        404,
        { ok: false, error: "not_found" },
        method,
      );
    }

    if (method !== "POST") {
      return response(
        405,
        {
          ok: false,
          error: "method_not_allowed",
          allowed: ["POST"],
        },
        method,
      );
    }

    if (
      headerValue(request.headers, "authorization") ||
      headerValue(request.headers, "cookie")
    ) {
      return response(
        400,
        { ok: false, error: "ambient_auth_not_accepted" },
        method,
      );
    }

    let input;
    try {
      input = parseBindRequest(request);
    } catch (error) {
      void error;
      return response(
        400,
        { ok: false, error: "invalid_enrollment_request" },
        method,
      );
    }

    let bound;
    try {
      bound = await bindLoginKey({
        account: input.account,
        pairingToken: input.pairingToken,
        loginPublicKeySpkiBase64url:
          input.loginPublicKeySpkiBase64url,
        pairingStateDir,
        bindingRegistryFile,
        now,
      });
    } catch (error) {
      void error;
      return response(
        401,
        { ok: false, error: "enrollment_failed" },
        method,
      );
    }

    if (
      !bound ||
      typeof bound !== "object" ||
      Array.isArray(bound) ||
      bound.marker !==
        VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.marker ||
      bound.account !== input.account ||
      bound.capability !==
        VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1
          .session_capability ||
      bound.binding_created !== true ||
      bound.pairing_consumed !== true ||
      bound.wallet_passphrase_transport !== false ||
      bound.wallet_private_key_access !== false ||
      bound.login_private_key_access !== false ||
      bound.session_authority_created !== false ||
      bound.wallet_unlocked !== false ||
      bound.signing_authority !== false ||
      bound.money_movement_authority !== false ||
      !/^[0-9a-f]{64}$/.test(
        String(bound.public_key_fingerprint_sha256 || ""),
      )
    ) {
      return response(
        503,
        { ok: false, error: "enrollment_unavailable" },
        method,
      );
    }

    return response(
      200,
      {
        ok: true,
        marker:
          VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1.marker,
        account: bound.account,
        key_type:
          VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1
            .login_key_type,
        public_key_fingerprint_sha256:
          bound.public_key_fingerprint_sha256,
        capability: bound.capability,
        binding_created: true,
        pairing_consumed: true,
        wallet_secret_transport: false,
        login_private_key_transport: false,
        signing_authority: false,
        money_movement_authority: false,
      },
      method,
    );
  };

  return Object.freeze({
    handle,
    authority:
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_HTTP_V1,
  });
}
