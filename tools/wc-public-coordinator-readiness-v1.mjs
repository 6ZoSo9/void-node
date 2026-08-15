#!/usr/bin/env node
import { isIP } from "node:net";
import { parseArgs } from "node:util";

const MARKER = "VOID_WC_PUBLIC_COORDINATOR_READINESS_V1";
const MAX_RESPONSE_BYTES = 64 * 1024;
const ROUTES = {
  gateway: "/__void/public-earn-gateway-v1/status.json",
  pilot: "/wc/public-earning-pilot-v1/status",
  claim: "/wc/public-earning-pilot-v1/claim-ticket",
  submit: "/wc/public-earning-pilot-v1/submit-result",
  operatorIssue: "/wc/public-earning-pilot-v1/operator/issue",
  signClaim: "/wc/public-earning-pilot-v1/sign-claim",
};

function integer(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function jsonSafeInteger(v) {
  return typeof v === "number" && Number.isSafeInteger(v) ? v : null;
}

function jsonPositiveInteger(v) {
  const n = jsonSafeInteger(v);
  return n !== null && n > 0 ? n : null;
}

function jsonNonNegativeInteger(v) {
  const n = jsonSafeInteger(v);
  return n !== null && n >= 0 ? n : null;
}

function allowHttp(host) {
  if (host === "localhost" || host === "::1" || host.endsWith(".localhost")) return true;
  if (isIP(host) !== 4) return false;
  const [a, b] = host.split(".").map(Number);
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function origin(raw) {
  const u = new URL(raw);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("base must use HTTP or HTTPS");
  if (u.username || u.password) throw new Error("base must not contain credentials");
  if (u.pathname !== "/" || u.search || u.hash) throw new Error("base must be an origin only");
  if (u.protocol === "http:" && !allowHttp(u.hostname)) {
    throw new Error("plain HTTP is allowed only for loopback, private, or Tailscale IPv4 origins");
  }
  return u.origin;
}

function get(v, path) {
  let cur = v;
  for (const key of path) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur) || !(key in cur)) return undefined;
    cur = cur[key];
  }
  return cur;
}

function findBoolean(v, keys) {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  let found;
  function walk(x) {
    if (found !== undefined) return;
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    for (const [k, child] of Object.entries(x)) {
      if (wanted.has(k.toLowerCase()) && typeof child === "boolean") {
        found = child;
        return;
      }
      walk(child);
    }
  }
  walk(v);
  return found;
}

function scan(v) {
  const keys = new Set();
  const strings = [];
  function walk(x) {
    if (typeof x === "string") return strings.push(x);
    if (Array.isArray(x)) return x.forEach(walk);
    if (!x || typeof x !== "object") return;
    for (const [k, child] of Object.entries(x)) {
      keys.add(k);
      walk(child);
    }
  }
  walk(v);
  return { keys, strings };
}

function cancelBestEffort(target) {
  if (!target || typeof target.cancel !== "function") return;
  try {
    const pending = target.cancel();
    if (pending && typeof pending.catch === "function") pending.catch(() => undefined);
  } catch (error) { void error; }
}

async function readBoundedText(response, maximum) {
  const declaredRaw = response.headers.get("content-length");
  if (declaredRaw !== null) {
    const declaredText = declaredRaw.trim();
    if (!/^(0|[1-9]\d*)$/u.test(declaredText)) {
      cancelBestEffort(response.body);
      throw new Error("response_content_length_invalid");
    }
    const declared = Number(declaredText);
    if (!Number.isSafeInteger(declared) || declared > maximum) {
      cancelBestEffort(response.body);
      throw new Error("response_body_too_large");
    }
  }
  if (!response.body || typeof response.body.getReader !== "function") throw new Error("response_body_unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximum) {
        cancelBestEffort(reader);
        throw new Error("response_body_too_large");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    try { reader.releaseLock(); } catch (error) { void error; }
  }
}

async function readJsonOnce(base, path, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let status = null;
  try {
    const r = await fetch(new URL(path, base), {
      method: "GET",
      headers: { accept: "application/json", "user-agent": "void-wc-public-coordinator-readiness-v1" },
      redirect: "error",
      signal: controller.signal,
    });
    status = r.status;
    const text = await readBoundedText(r, MAX_RESPONSE_BYTES);
    let body = null;
    let parseError = null;

    try {
      body = text.trim() ? JSON.parse(text) : null;
    } catch (e) {
      parseError = e?.name || "json_parse_error";
    }

    return {
      path,
      method: "GET",
      status,
      json: body !== null,
      body,
      error: null,
      parse_error: parseError,
    };
  } catch (e) {
    return {
      path,
      method: "GET",
      status,
      json: false,
      body: null,
      error: e instanceof Error ? e.message : "request_error",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(base, path, timeoutMs, retries = 1) {
  const retry_history = [];
  let result = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    result = await readJsonOnce(base, path, timeoutMs);
    retry_history.push({
      attempt,
      http_status: result.status,
      json: result.json,
      error: result.error,
    });

    const transient =
      result.status === null ||
      (Number.isInteger(result.status) && result.status >= 500);

    if (!transient || attempt === retries) break;

    await new Promise((resolveDelay) => {
      setTimeout(resolveDelay, 200 * attempt);
    });
  }

  return {
    ...result,
    attempt_count: retry_history.length,
    retry_history,
  };
}

function exactMethods(v, expected) {
  return Array.isArray(v) && JSON.stringify(v) === JSON.stringify(expected);
}

function check(id, pass, observed) {
  return { id, pass: Boolean(pass), observed };
}

function checksFor(gateway, pilot, boundaries, expectedAward) {
  const g = gateway.body;
  const p = pilot.body;
  const gscan = scan(g);
  const pscan = scan(p);
  const publicRoutesAward = findBoolean(
    [g, p],
    ["public_routes_award_wc", "public_route_can_award_wc"],
  );
  const leakedKeys = [
    "secret", "private_file", "private_dataset_path", "capability_token",
    "wallet_private_key", "seed_phrase",
  ].filter((k) => gscan.keys.has(k) || pscan.keys.has(k));
  const leakedPrivateRoutes = [...gscan.strings, ...pscan.strings].filter(
    (s) => s.includes("/operator/issue") || s.includes("/sign-claim"),
  );

  return [
    check("gateway_status_public", gateway.status === 200 && g?.marker === "VOID_PUBLIC_EARN_GATEWAY_V1", {
      http_status: gateway.status, marker: g?.marker ?? null,
    }),
    check("pilot_status_public", pilot.status === 200 && p?.marker === "VOID_WC_PUBLIC_EARNING_PILOT_V1", {
      http_status: pilot.status, marker: p?.marker ?? null,
    }),
    check("coordinator_role_enabled", p?.coordinator_enabled === true, p?.coordinator_enabled ?? null),
    check("executor_role_disabled_on_coordinator", p?.executor_enabled === false, p?.executor_enabled ?? null),
    check("fixed_award_policy",
      jsonSafeInteger(g?.fixed_award_wc) === expectedAward &&
      jsonSafeInteger(p?.fixed_award_wc) === expectedAward,
      { gateway: g?.fixed_award_wc ?? null, pilot: p?.fixed_award_wc ?? null, expected: expectedAward }),
    check("public_claim_marker", get(p, ["public_claim", "marker"]) === "VOID_WC_PUBLIC_TICKET_CLAIM_V1",
      get(p, ["public_claim", "marker"]) ?? null),
    check("public_claim_enabled_available",
      get(p, ["public_claim", "enabled"]) === true && get(p, ["public_claim", "available"]) === true,
      { enabled: get(p, ["public_claim", "enabled"]) ?? null, available: get(p, ["public_claim", "available"]) ?? null }),
    check("server_selected_work_only",
      get(p, ["public_claim", "server_selected_work"]) === true &&
      get(p, ["public_claim", "participant_selected_dataset"]) === false &&
      get(p, ["public_claim", "participant_selected_input_hash"]) === false &&
      get(p, ["public_claim", "participant_selected_award"]) === false,
      {
        server_selected_work: get(p, ["public_claim", "server_selected_work"]) ?? null,
        participant_selected_dataset: get(p, ["public_claim", "participant_selected_dataset"]) ?? null,
        participant_selected_input_hash: get(p, ["public_claim", "participant_selected_input_hash"]) ?? null,
        participant_selected_award: get(p, ["public_claim", "participant_selected_award"]) ?? null,
      }),
    check("executor_key_possession_required",
      get(p, ["public_claim", "proof_of_executor_key_possession_required"]) === true,
      get(p, ["public_claim", "proof_of_executor_key_possession_required"]) ?? null),
    check("money_movement_forbidden", get(p, ["public_claim", "money_movement"]) === false,
      get(p, ["public_claim", "money_movement"]) ?? null),
    check("ticket_caps_configured",
      jsonPositiveInteger(get(p, ["caps", "account_limit"])) !== null &&
      jsonPositiveInteger(get(p, ["caps", "global_limit"])) !== null &&
      jsonNonNegativeInteger(get(p, ["caps", "global_active"])) !== null &&
      jsonNonNegativeInteger(get(p, ["caps", "global_consumed"])) !== null,
      get(p, ["caps"]) ?? null),
    check("claim_rate_caps_configured",
      get(p, ["public_claim", "one_active_ticket_per_account"]) === true &&
      jsonPositiveInteger(get(p, ["public_claim", "ticket_ttl_ms"])) !== null &&
      jsonPositiveInteger(get(p, ["public_claim", "cooldown_ms"])) !== null &&
      jsonPositiveInteger(get(p, ["public_claim", "max_claims_per_account_24h"])) !== null &&
      jsonPositiveInteger(get(p, ["public_claim", "max_claims_per_executor_24h"])) !== null &&
      jsonPositiveInteger(get(p, ["public_claim", "global_active_cap"])) !== null &&
      jsonPositiveInteger(get(p, ["public_claim", "global_claims_per_24h"])) !== null,
      {
        one_active_ticket_per_account: get(p, ["public_claim", "one_active_ticket_per_account"]) ?? null,
        ticket_ttl_ms: get(p, ["public_claim", "ticket_ttl_ms"]) ?? null,
        cooldown_ms: get(p, ["public_claim", "cooldown_ms"]) ?? null,
        max_claims_per_account_24h: get(p, ["public_claim", "max_claims_per_account_24h"]) ?? null,
        max_claims_per_executor_24h: get(p, ["public_claim", "max_claims_per_executor_24h"]) ?? null,
        global_active_cap: get(p, ["public_claim", "global_active_cap"]) ?? null,
        global_claims_per_24h: get(p, ["public_claim", "global_claims_per_24h"]) ?? null,
      }),
    check("capability_binding_single_use", [
      "account_bound", "executor_node_bound", "outbound_only_supported",
      "dataset_bound", "input_hash_bound", "expiring", "single_use",
      "token_stored_as_sha256_only",
    ].every((k) => get(p, ["capability", k]) === true), get(p, ["capability"]) ?? null),
    check("capability_signatures_replay", [
      "ed25519_executor_signature_required",
      "public_claim_executor_key_possession_required",
      "public_claim_replay_protected",
    ].every((k) => get(p, ["capability", k]) === true), get(p, ["capability"]) ?? null),
    check("public_routes_cannot_award_wc", publicRoutesAward === false, publicRoutesAward ?? null),
    check("claim_route_post_only",
      get(g, ["routes", "claim_ticket"]) === ROUTES.claim &&
      exactMethods(get(g, ["methods", "claim_ticket"]), ["POST"]),
      { route: get(g, ["routes", "claim_ticket"]) ?? null, methods: get(g, ["methods", "claim_ticket"]) ?? null }),
    check("submit_route_post_only",
      get(g, ["routes", "submit_result"]) === ROUTES.submit &&
      exactMethods(get(g, ["methods", "submit_result"]), ["POST"]) &&
      get(p, ["routes", "submit_result"]) === ROUTES.submit,
      {
        gateway_route: get(g, ["routes", "submit_result"]) ?? null,
        gateway_methods: get(g, ["methods", "submit_result"]) ?? null,
        pilot_route: get(p, ["routes", "submit_result"]) ?? null,
      }),
    check("claim_submit_reject_get",
      boundaries.claim.status === 405 && boundaries.submit.status === 405,
      { claim_get: boundaries.claim.status, submit_get: boundaries.submit.status }),
    check("operator_routes_hidden",
      boundaries.operatorIssue.status === 404 &&
      boundaries.signClaim.status === 404 &&
      leakedPrivateRoutes.length === 0,
      {
        operator_issue_get: boundaries.operatorIssue.status,
        sign_claim_get: boundaries.signClaim.status,
        leaked_private_routes: leakedPrivateRoutes,
      }),
    check("private_fields_absent", leakedKeys.length === 0, { leaked_keys: leakedKeys }),
  ];
}

function safety() {
  return {
    read_only: true,
    http_methods_used: ["GET"],
    mutation_attempted: false,
    coordinator_enablement_attempted: false,
    ticket_issuance_attempted: false,
    receipt_submission_attempted: false,
    wc_award_attempted: false,
    settlement_attempted: false,
    wallet_access_attempted: false,
    buy_void_attempted: false,
    validator_mutation_attempted: false,
    treasury_mutation_attempted: false,
  };
}

async function main() {
  const { values } = parseArgs({
    options: {
      base: { type: "string" },
      account: { type: "string", default: "void-coordinator-readiness-observer-v1" },
      "timeout-ms": { type: "string", default: "15000" },
      "expected-award-wc": { type: "string", default: "3" },
      "status-retries": { type: "string", default: "3" },
      "require-ready": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
  });

  if (values.help) {
    console.log("Usage: node tools/wc-public-coordinator-readiness-v1.mjs --base HTTPS_ORIGIN [--require-ready]");
    return;
  }
  if (!values.base) throw new Error("--base is required");
  if (!/^[A-Za-z0-9._:-]{1,128}$/u.test(values.account)) throw new Error("invalid account");

  const timeoutMs = integer(values["timeout-ms"]);
  const expectedAward = integer(values["expected-award-wc"]);
  const statusRetries = integer(values["status-retries"]);
  if (timeoutMs === null || timeoutMs < 250 || timeoutMs > 30000) throw new Error("invalid timeout");
  if (expectedAward === null || expectedAward <= 0) throw new Error("invalid expected award");
  if (statusRetries === null || statusRetries < 1 || statusRetries > 5) {
    throw new Error("status retries must be between 1 and 5");
  }

  const base = origin(values.base);
  const gateway = await readJson(
    base,
    ROUTES.gateway,
    timeoutMs,
    statusRetries,
  );

  const pilot = await readJson(
    base,
    `${ROUTES.pilot}?account=${encodeURIComponent(values.account)}`,
    timeoutMs,
    statusRetries,
  );

  const [
    claim,
    submit,
    operatorIssue,
    signClaim,
  ] = await Promise.all([
    readJson(base, ROUTES.claim, timeoutMs),
    readJson(base, ROUTES.submit, timeoutMs),
    readJson(base, ROUTES.operatorIssue, timeoutMs),
    readJson(base, ROUTES.signClaim, timeoutMs),
  ]);

  const attempts = [gateway, pilot, claim, submit, operatorIssue, signClaim];
  if (!attempts.some((x) => x.status === 200 && x.json)) {
    console.log(JSON.stringify({
      marker: MARKER,
      status: "hold",
      readiness_state: "unavailable",
      ready_for_bounded_enablement: false,
      reason: "public_coordinator_status_surfaces_unavailable",
      attempts: attempts.map(
        ({ path, method, status, json, error, attempt_count, retry_history }) => ({
          path,
          method,
          http_status: status,
          json,
          error,
          attempt_count: attempt_count ?? 1,
          retry_history: retry_history ?? [],
        }),
      ),
      safety: safety(),
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const checks = checksFor(
    gateway,
    pilot,
    { claim, submit, operatorIssue, signClaim },
    expectedAward,
  );
  const failed = checks.filter((x) => !x.pass);
  const ready = failed.length === 0;

  console.log(JSON.stringify({
    marker: MARKER,
    status: "green",
    readiness_state: ready ? "ready" : "hold",
    ready_for_bounded_enablement: ready,
    reason: ready
      ? "all_public_coordinator_readiness_checks_passed"
      : "one_or_more_public_coordinator_readiness_checks_failed",
    base_origin: base,
    account: values.account,
    expected_fixed_award_wc: expectedAward,
    summary: {
      total_checks: checks.length,
      passed_checks: checks.length - failed.length,
      failed_checks: failed.length,
      failed_check_ids: failed.map((x) => x.id),
    },
    checks,
    attempts: attempts.map(
      ({ path, method, status, json, error, attempt_count, retry_history }) => ({
        path,
        method,
        http_status: status,
        json,
        error,
        attempt_count: attempt_count ?? 1,
        retry_history: retry_history ?? [],
      }),
    ),
    safety: safety(),
  }, null, 2));

  if (values["require-ready"] && !ready) process.exitCode = 2;
}

main().catch((e) => {
  console.log(JSON.stringify({
    marker: MARKER,
    status: "hold",
    readiness_state: "unavailable",
    ready_for_bounded_enablement: false,
    reason: e?.message || "unexpected error",
    safety: safety(),
  }, null, 2));
  process.exitCode = 2;
});