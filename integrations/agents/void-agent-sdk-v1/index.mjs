import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

export const VOID_AGENT_SDK_VERSION = "0.1.0";
export const VOID_AGENT_SDK_CLIENT_MARKER = "VOID_AGENT_SDK_CLIENT_V1";
export const VOID_AGENT_SDK_REPORT_MARKER = "VOID_AGENT_SDK_DISCOVERY_REPORT_V1";

const WELL_KNOWN_DISCOVERY_PATH = "/.well-known/void-agent-discovery.json";
const WELL_KNOWN_MARKER = "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1";
const DISCOVERY_MARKER = "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1";
const DISCOVERY_PROTOCOL = "void-agent-discovery/1";
const CAPABILITY_MARKER = "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1";
const CAPABILITY_PROTOCOL = "void-agent-capability-negotiation/1";
const SAFE_METHODS = new Set(["GET", "HEAD"]);
const CAPABILITY_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const DEFAULT_WANTED = ["public_discovery", "capability_negotiation"];
const RESPONSE_TEARDOWN_SETTLE_MAX_MS = 250;

function fail(message) {
  throw new Error(message);
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label}_must_be_object`);
  }
  return value;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    const output = {};
    for (const key of Object.keys(value).sort()) output[key] = canonicalValue(value[key]);
    return output;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isLoopback(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" ||
    hostname === "::1" || hostname === "[::1]";
}

export function normalizeVoidAgentBaseUrl(value) {
  const url = new URL(value);
  if (url.username || url.password) fail("base_url_credentials_rejected");
  const onion = url.hostname.toLowerCase().endsWith(".onion");
  if (url.protocol !== "https:" &&
      !(url.protocol === "http:" && (isLoopback(url.hostname) || onion))) {
    fail("base_url_requires_https_except_loopback_or_onion");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

export function sameOriginVoidPath(base, value, label = "path") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    fail(`${label}_must_be_same_origin_absolute_path`);
  }
  const resolved = new URL(value, base);
  if (resolved.origin !== base.origin) fail(`${label}_cross_origin_rejected`);
  if (resolved.username || resolved.password || resolved.hash) {
    fail(`${label}_unsafe_url_rejected`);
  }
  return resolved;
}

function timeoutError(label) {
  const error = new Error(`${label}_deadline_exceeded`);
  error.name = "TimeoutError";
  return error;
}

async function awaitWithinDeadline(operation, request, label) {
  const remaining = request.deadlineAt - Date.now();
  if (remaining <= 0) {
    const error = timeoutError(label);
    if (!request.controller.signal.aborted) request.controller.abort(error);
    throw error;
  }
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = timeoutError(label);
          if (!request.controller.signal.aborted) request.controller.abort(error);
          reject(error);
        }, remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function settleCleanupWithinDeadline(cleanup, deadlineAt) {
  if (!cleanup || typeof cleanup.then !== "function") return;
  const remaining = Math.min(
    RESPONSE_TEARDOWN_SETTLE_MAX_MS,
    Math.max(0, deadlineAt - Date.now()),
  );
  if (remaining <= 0) {
    void Promise.resolve(cleanup).catch(() => undefined);
    return;
  }
  let timer;
  try {
    await Promise.race([
      Promise.resolve(cleanup).catch(() => undefined),
      new Promise((resolve) => {
        timer = setTimeout(resolve, remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function abortAndCancelWithinDeadline(target, request) {
  if (!request.controller.signal.aborted) request.controller.abort();
  let cleanup;
  try {
    cleanup = target?.cancel?.();
  } catch {
    return;
  }
  await settleCleanupWithinDeadline(cleanup, request.deadlineAt);
}

async function rejectResponse(response, request, message) {
  await abortAndCancelWithinDeadline(response?.body, request);
  fail(message);
}

async function validateAcceptedResponseUrl(response, requestedHref, label, request) {
  const finalUrlValue = response?.url;
  const redirected = response?.redirected === true;
  if (typeof finalUrlValue !== "string" || finalUrlValue.length === 0) {
    await rejectResponse(response, request, `${label}_final_url_missing`);
  }

  let finalUrl;
  try {
    finalUrl = new URL(finalUrlValue);
  } catch {
    await rejectResponse(response, request, `${label}_final_url_invalid`);
  }

  if (finalUrl.href !== requestedHref) {
    await rejectResponse(response, request, `${label}_final_url_mismatch`);
  }
  if (redirected) {
    await rejectResponse(response, request, `${label}_redirected_response_rejected`);
  }
}

async function readBoundedText(response, label, maxBytes, request) {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    const parsed = Number(declared);
    if (Number.isFinite(parsed) && parsed > maxBytes) {
      await abortAndCancelWithinDeadline(response.body, request);
      fail(`${label}_body_too_large`);
    }
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    await abortAndCancelWithinDeadline(response.body, request);
    fail(`${label}_body_stream_unavailable`);
  }

  const chunks = [];
  let total = 0;
  try {
    while (true) {
      let item;
      try {
        item = await awaitWithinDeadline(reader.read(), request, `${label}_body`);
      } catch (error) {
        await abortAndCancelWithinDeadline(reader, request);
        throw error;
      }
      const { done, value } = item;
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        await abortAndCancelWithinDeadline(reader, request);
        fail(`${label}_body_too_large`);
      }
      chunks.push(chunk);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (releaseError) {
      void releaseError;
    }
  }
  return Buffer.concat(chunks, total).toString("utf8");
}

async function fetchJson(url, label, options) {
  const { fetchImpl, timeoutMs, maxResponseBytes } = options;
  const requestedHref = url instanceof URL ? url.href : new URL(url).href;
  const controller = new AbortController();
  const request = {
    controller,
    deadlineAt: Date.now() + timeoutMs,
  };
  const response = await awaitWithinDeadline(
    Promise.resolve().then(() => fetchImpl(requestedHref, {
      method: "GET",
      redirect: "manual",
      credentials: "omit",
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": `void-agent-sdk/${VOID_AGENT_SDK_VERSION}`,
      },
      signal: controller.signal,
    })),
    request,
    `${label}_fetch`,
  );

  if (response.status >= 300 && response.status < 400) {
    await rejectResponse(response, request, `${label}_redirect_rejected`);
  }
  if (!response.ok) {
    await rejectResponse(response, request, `${label}_http_${response.status}`);
  }
  await validateAcceptedResponseUrl(response, requestedHref, label, request);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    await rejectResponse(response, request, `${label}_content_type_not_json`);
  }
  const text = await readBoundedText(response, label, maxResponseBytes, request);
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label}_invalid_json`);
  }
}

function validateWellKnown(base, value) {
  const document = requireRecord(value, "well_known_discovery");
  if (document.marker !== WELL_KNOWN_MARKER) fail("well_known_discovery_marker_mismatch");
  if (document.network?.chain_id !== 2050) fail("well_known_discovery_chain_id_mismatch");
  if (document.authority?.mutation_authority_granted !== false) {
    fail("well_known_mutation_authority_claim_rejected");
  }
  if (document.authority?.credentials_required !== false) {
    fail("well_known_credentials_requirement_rejected");
  }
  if (document.safety?.same_origin_only !== true) fail("well_known_same_origin_wall_missing");
  if (document.safety?.follow_redirects !== false) fail("well_known_redirect_wall_missing");
  return sameOriginVoidPath(base, document.canonical_discovery, "canonical_discovery");
}

function validateCanonicalDiscovery(base, value) {
  const document = requireRecord(value, "canonical_discovery");
  if (document.marker !== DISCOVERY_MARKER) fail("canonical_discovery_marker_mismatch");
  if (document.protocol !== DISCOVERY_PROTOCOL) fail("canonical_discovery_protocol_mismatch");
  if (document.network?.chain_id !== 2050) fail("canonical_discovery_chain_id_mismatch");
  if (document.authority?.mutation_authority_granted !== false) {
    fail("canonical_mutation_authority_claim_rejected");
  }

  const advertised = document.entrypoints?.capability_negotiation;
  const capability = Array.isArray(document.capabilities)
    ? document.capabilities.find((entry) => entry?.id === "capability_negotiation")
    : undefined;
  if (!capability) fail("capability_negotiation_entry_missing");
  if (capability.state !== "live" || capability.authority !== "read_only" ||
      capability.discovery !== advertised) {
    fail("capability_negotiation_advertisement_rejected");
  }
  return sameOriginVoidPath(base, advertised, "capability_negotiation");
}

function validateCapabilityCatalog(base, value) {
  const document = requireRecord(value, "capability_catalog");
  if (document.marker !== CAPABILITY_MARKER) fail("capability_catalog_marker_mismatch");
  if (document.protocol !== CAPABILITY_PROTOCOL) fail("capability_catalog_protocol_mismatch");
  if (document.network?.chain_id !== 2050) fail("capability_catalog_chain_id_mismatch");
  if (document.negotiation?.mode !== "client_side_intersection" ||
      document.negotiation?.request_submission_enabled !== false ||
      document.negotiation?.default_result !== "not_granted") {
    fail("capability_negotiation_contract_rejected");
  }

  for (const key of [
    "mutation_authority_granted",
    "authentication_active",
    "signed_request_envelopes_active",
    "payment_submission_active",
    "work_credit_awards_active",
    "buy_void_automatic_fulfillment_active",
  ]) {
    if (document.authority?.[key] !== false) fail(`capability_authority_${key}_rejected`);
  }

  if (document.safety?.same_origin_only !== true ||
      document.safety?.follow_redirects !== false ||
      document.safety?.send_credentials !== false ||
      document.safety?.unknown_capability_result !== "not_granted" ||
      document.safety?.ambiguous_capability_result !== "not_granted") {
    fail("capability_safety_contract_rejected");
  }

  if (!Array.isArray(document.capabilities)) fail("capabilities_must_be_array");
  const byId = new Map();
  for (const capabilityValue of document.capabilities) {
    const capability = requireRecord(capabilityValue, "capability_entry");
    if (typeof capability.id !== "string" || !CAPABILITY_ID.test(capability.id)) {
      fail("capability_id_invalid");
    }
    if (byId.has(capability.id)) fail(`duplicate_capability_id_${capability.id}`);
    if (!Array.isArray(capability.http_methods) || capability.http_methods.length === 0) {
      fail(`capability_methods_invalid_${capability.id}`);
    }
    for (const method of capability.http_methods) {
      if (!SAFE_METHODS.has(method)) fail(`capability_unsafe_method_${capability.id}_${method}`);
    }
    if (!Array.isArray(capability.paths) || capability.paths.length === 0) {
      fail(`capability_paths_invalid_${capability.id}`);
    }
    for (const capabilityPath of capability.paths) {
      sameOriginVoidPath(base, capabilityPath, `capability_${capability.id}_path`);
    }
    byId.set(capability.id, capability);
  }
  return { document, byId };
}

function normalizeWanted(value) {
  const wanted = value === undefined ? [...DEFAULT_WANTED] : value;
  if (!Array.isArray(wanted) || wanted.length === 0 || wanted.length > 64) {
    fail("wanted_capabilities_must_contain_1_to_64_items");
  }
  const result = wanted.map((entry) => {
    if (typeof entry !== "string" || !CAPABILITY_ID.test(entry)) {
      fail("wanted_capability_id_invalid");
    }
    return entry;
  });
  if (new Set(result).size !== result.length) fail("duplicate_wanted_capability");
  return result;
}

function negotiate(wanted, byId) {
  const granted = [];
  const notGranted = [];
  for (const id of wanted) {
    const capability = byId.get(id);
    if (!capability) {
      notGranted.push({ id, reason: "unknown_capability" });
      continue;
    }
    const allowed = capability.state === "live" && capability.enabled === true &&
      capability.access === "anonymous" && capability.authority === "read_only" &&
      capability.http_methods.every((method) => SAFE_METHODS.has(method)) &&
      capability.paths.length > 0;
    if (!allowed) {
      notGranted.push({
        id,
        reason: "advertised_requirements_not_satisfied",
        state: capability.state,
        enabled: capability.enabled,
        access: capability.access,
        authority: capability.authority,
      });
      continue;
    }
    granted.push({
      id,
      authority: "read_only",
      http_methods: [...capability.http_methods],
      paths: [...capability.paths],
    });
  }
  return { granted, not_granted: notGranted };
}

export async function discoverVoidAgentV1(options) {
  const {
    baseUrl,
    wanted,
    timeoutMs = 10_000,
    maxResponseBytes = 1_048_576,
    fetchImpl = globalThis.fetch,
  } = options ?? {};

  if (typeof fetchImpl !== "function") fail("fetch_implementation_required");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
    fail("timeout_ms_out_of_bounds");
  }
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1024 ||
      maxResponseBytes > 8 * 1024 * 1024) {
    fail("max_response_bytes_out_of_bounds");
  }

  const base = normalizeVoidAgentBaseUrl(baseUrl);
  const wantedCapabilities = normalizeWanted(wanted);
  const wellKnownUrl = sameOriginVoidPath(
    base, WELL_KNOWN_DISCOVERY_PATH, "well_known_discovery",
  );
  const wellKnown = await fetchJson(wellKnownUrl, "well_known_discovery", {
    fetchImpl, timeoutMs, maxResponseBytes,
  });
  const canonicalUrl = validateWellKnown(base, wellKnown);
  const canonical = await fetchJson(canonicalUrl, "canonical_discovery", {
    fetchImpl, timeoutMs, maxResponseBytes,
  });
  const capabilityUrl = validateCanonicalDiscovery(base, canonical);
  const catalog = await fetchJson(capabilityUrl, "capability_catalog", {
    fetchImpl, timeoutMs, maxResponseBytes,
  });
  const { document: catalogDocument, byId } = validateCapabilityCatalog(base, catalog);
  const result = negotiate(wantedCapabilities, byId);

  const body = {
    marker: VOID_AGENT_SDK_REPORT_MARKER,
    version: 1,
    status: "ready_read_only",
    sdk: {
      marker: VOID_AGENT_SDK_CLIENT_MARKER,
      version: VOID_AGENT_SDK_VERSION,
      runtime: "node",
      minimum_node_major: 22,
      dependencies: 0,
    },
    origin: base.origin,
    network: catalogDocument.network,
    documents: {
      well_known: {
        path: WELL_KNOWN_DISCOVERY_PATH,
        sha256: sha256Hex(canonicalJson(wellKnown)),
      },
      canonical_discovery: {
        path: canonicalUrl.pathname,
        sha256: sha256Hex(canonicalJson(canonical)),
      },
      capability_catalog: {
        path: capabilityUrl.pathname,
        sha256: sha256Hex(canonicalJson(catalog)),
      },
    },
    wanted: wantedCapabilities,
    negotiation: {
      mode: "client_side_intersection",
      default_result: "not_granted",
      request_submission_enabled: false,
      ...result,
    },
    authority: {
      credentials_sent: false,
      authentication_performed: false,
      mutation_authority_granted: false,
      request_submission_performed: false,
      payment_submission_performed: false,
      work_credit_write_performed: false,
      wallet_or_signer_accessed: false,
      transaction_broadcast: false,
      deployment_performed: false,
      money_moved: false,
    },
  };

  return {
    ...body,
    report_id: `voidasdk1_${sha256Hex(canonicalJson(body))}`,
  };
}

export function verifyVoidAgentReportV1(value) {
  const report = requireRecord(value, "report");
  if (report.marker !== VOID_AGENT_SDK_REPORT_MARKER || report.version !== 1) {
    fail("report_contract_mismatch");
  }
  if (!/^voidasdk1_[0-9a-f]{64}$/.test(report.report_id ?? "")) {
    fail("report_id_invalid");
  }
  const body = { ...report };
  delete body.report_id;
  const expected = `voidasdk1_${sha256Hex(canonicalJson(body))}`;
  if (report.report_id !== expected) fail("report_id_mismatch");
  if (Object.values(report.authority ?? {}).some((entry) => entry !== false)) {
    fail("report_authority_boundary_exceeded");
  }
  return report;
}
