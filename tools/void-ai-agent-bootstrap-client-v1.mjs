#!/usr/bin/env node
import {
  closeSync,
  fchmodSync,
  fsyncSync,
  mkdirSync,
  openSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1 =
  "VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1";
export const VOID_AI_AGENT_BOOTSTRAP_RESULT_SCHEMA_V1 =
  "void_ai_agent_bootstrap_result_v1";

const WELL_KNOWN_MARKER =
  "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1";
const WELL_KNOWN_PROTOCOL =
  "void-agent-discovery-well-known/1";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 1_048_576;
const MAX_ALLOWED_BYTES = 4_194_304;
const RESPONSE_REJECTION_TEARDOWN_MS = 250;
const activeTransportLeases = new WeakMap();

const ROUTES = Object.freeze({
  well_known_discovery:
    "/.well-known/void-agent-discovery.json",
  canonical_discovery:
    "/public-node/agents/discovery-v1.json",
  capabilities:
    "/.well-known/void-agent-capabilities.json",
  authentication:
    "/.well-known/void-agent-authentication.json",
  first_contact:
    "/public-node/agents/first-contact-v1.json",
  external_opportunity_intake:
    "/.well-known/void-agent-intake-capability-v1.json",
});

function usage() {
  return [
    "VOID AI Agent Bootstrap Client V1",
    "",
    "Usage:",
    "  node tools/void-ai-agent-bootstrap-client-v1.mjs \\",
    "    --base-url https://example.invalid [options]",
    "",
    "Options:",
    "  --base-url URL       Required network origin.",
    "  --output PATH        Optional mode-0600 JSON output.",
    "  --pretty             Pretty-print JSON.",
    "  --timeout-ms N       Per-request timeout (default 10000).",
    "  --max-bytes N        Per-response maximum (default 1048576).",
    "  --help               Show this help.",
    "",
    "Authority:",
    "  GET only; no redirects; same origin only; no credentials,",
    "  wallet material, signing, submission, payment, or mutation.",
  ].join("\n");
}

function validateBoundInteger(
  value,
  label,
  maximum,
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > maximum
  ) {
    throw new Error(
      `${label} must be an integer from 1 through ${maximum}`,
    );
  }
  return value;
}

function parsePositiveInteger(
  raw,
  label,
  maximum,
) {
  if (
    typeof raw !== "string" ||
    !/^[1-9][0-9]*$/.test(raw)
  ) {
    throw new Error(
      `${label} must be an integer from 1 through ${maximum}`,
    );
  }

  return validateBoundInteger(
    Number(raw),
    label,
    maximum,
  );
}

export function parseBootstrapClientArgsV1(argv) {
  const output = {
    baseUrl: "",
    outputPath: "",
    pretty: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    maxBytes: DEFAULT_MAX_BYTES,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];

    if (item === "--help" || item === "-h") {
      output.help = true;
      continue;
    }
    if (item === "--pretty") {
      output.pretty = true;
      continue;
    }
    if (item === "--base-url") {
      output.baseUrl = String(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (item === "--output") {
      output.outputPath = String(argv[index + 1] || "");
      index += 1;
      continue;
    }
    if (item === "--timeout-ms") {
      output.timeoutMs = parsePositiveInteger(
        argv[index + 1],
        "timeout-ms",
        MAX_TIMEOUT_MS,
      );
      index += 1;
      continue;
    }
    if (item === "--max-bytes") {
      output.maxBytes = parsePositiveInteger(
        argv[index + 1],
        "max-bytes",
        MAX_ALLOWED_BYTES,
      );
      index += 1;
      continue;
    }

    throw new Error(`unknown argument: ${item}`);
  }

  return output;
}

function isLoopbackHostname(hostname) {
  const normalized = String(hostname || "")
    .trim()
    .toLowerCase();

  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]"
  );
}

export function normalizeBootstrapBaseUrlV1(raw) {
  const value = new URL(String(raw || ""));

  if (value.username || value.password) {
    throw new Error(
      "base URL credentials are forbidden",
    );
  }
  if (
    value.protocol !== "https:" &&
    !(
      value.protocol === "http:" &&
      isLoopbackHostname(value.hostname)
    )
  ) {
    throw new Error(
      "base URL must use HTTPS or loopback HTTP",
    );
  }
  if (value.search || value.hash) {
    throw new Error(
      "base URL query and fragment are forbidden",
    );
  }

  return new URL("/", value);
}

function sameOriginUrl(base, routeOrUrl) {
  const resolved = new URL(routeOrUrl, base);

  if (resolved.origin !== base.origin) {
    throw new Error(
      `cross-origin route forbidden: ${resolved.href}`,
    );
  }
  if (resolved.username || resolved.password) {
    throw new Error(
      "route credentials are forbidden",
    );
  }

  return resolved;
}

function requireExactObjectKeys(value, expected, label) {
  if (
    value === null ||
    Array.isArray(value) ||
    typeof value !== "object"
  ) {
    throw new Error(`${label}_object_required`);
  }

  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new Error(`${label}_keys_mismatch`);
  }
}

function validateWellKnownEntrypointV1(payload) {
  requireExactObjectKeys(
    payload,
    [
      "$schema",
      "marker",
      "protocol",
      "network",
      "canonical_discovery",
      "authority",
      "safety",
      "network_authenticity",
    ],
    "well_known",
  );

  if (payload.$schema !== "./void-agent-discovery.schema.json") {
    throw new Error("well-known discovery schema mismatch");
  }
  if (payload.marker !== WELL_KNOWN_MARKER) {
    throw new Error("well-known discovery marker mismatch");
  }
  if (payload.protocol !== WELL_KNOWN_PROTOCOL) {
    throw new Error("well-known discovery protocol mismatch");
  }

  requireExactObjectKeys(
    payload.network,
    ["name", "chain_id"],
    "well_known_network",
  );
  if (payload.network.name !== "VOID Mainnet-0") {
    throw new Error("well-known network name mismatch");
  }
  if (
    typeof payload.network.chain_id !== "number" ||
    !Number.isSafeInteger(payload.network.chain_id) ||
    payload.network.chain_id !== 2050
  ) {
    throw new Error("well-known chain id mismatch");
  }

  if (payload.canonical_discovery !== ROUTES.canonical_discovery) {
    throw new Error("well-known canonical discovery mismatch");
  }

  requireExactObjectKeys(
    payload.authority,
    [
      "default",
      "mutation_authority_granted",
      "credentials_required",
    ],
    "well_known_authority",
  );
  if (payload.authority.default !== "read_only") {
    throw new Error("well-known default authority mismatch");
  }
  if (payload.authority.mutation_authority_granted !== false) {
    throw new Error("well-known discovery mutation boundary mismatch");
  }
  if (payload.authority.credentials_required !== false) {
    throw new Error("well-known credentials requirement mismatch");
  }

  requireExactObjectKeys(
    payload.safety,
    [
      "same_origin_only",
      "follow_redirects",
      "send_secrets",
      "send_wallet_material",
      "send_operator_keys",
      "treat_unknown_as",
    ],
    "well_known_safety",
  );
  if (payload.safety.same_origin_only !== true) {
    throw new Error("well-known same-origin boundary mismatch");
  }
  if (payload.safety.follow_redirects !== false) {
    throw new Error("well-known redirect boundary mismatch");
  }
  if (payload.safety.send_secrets !== false) {
    throw new Error("well-known secret-send boundary mismatch");
  }
  if (payload.safety.send_wallet_material !== false) {
    throw new Error("well-known wallet-send boundary mismatch");
  }
  if (payload.safety.send_operator_keys !== false) {
    throw new Error("well-known operator-key boundary mismatch");
  }
  if (payload.safety.treat_unknown_as !== "not_granted") {
    throw new Error("well-known unknown-authority boundary mismatch");
  }

  if (
    payload.network_authenticity !==
    "/.well-known/void-network-authenticity.json"
  ) {
    throw new Error("well-known network authenticity route mismatch");
  }

  return payload;
}

function requireExactResponseUrl(response, requestedUrl) {
  if (response?.redirected === true) {
    throw new Error("response_redirected_forbidden");
  }

  const raw = response?.url;
  if (typeof raw !== "string" || raw.length === 0) {
    throw new Error("response_final_url_missing");
  }

  let finalUrl;
  try {
    finalUrl = new URL(raw);
  } catch {
    throw new Error("response_final_url_invalid");
  }

  if (finalUrl.href !== requestedUrl.href) {
    throw new Error("response_final_url_mismatch");
  }
}

function publicMarker(value) {
  const marker = value?.marker;
  return (
    typeof marker === "string" &&
    /^VOID_[A-Z0-9_]+$/.test(marker)
  )
    ? marker
    : null;
}

function parseDeclaredResponseLength(response) {
  const raw = response.headers.get("content-length");
  if (raw === null) return null;

  if (!/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new Error(
      `response_invalid_content_length:${raw}`,
    );
  }

  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `response_invalid_content_length:${raw}`,
    );
  }

  return value;
}

function deadlineError(signal) {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error("bootstrap_request_deadline_exceeded");
}

function awaitWithinOwnedDeadline(promise, signal) {
  if (signal.aborted) {
    return Promise.reject(deadlineError(signal));
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const onAbort = () => {
      if (settled) return;
      settled = true;
      reject(deadlineError(signal));
    };

    signal.addEventListener("abort", onAbort, {
      once: true,
    });

    Promise.resolve(promise).then(
      (value) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener("abort", onAbort);
        resolve(value);
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

async function settleCancellationBounded(cancellation) {
  if (!cancellation || typeof cancellation.then !== "function") {
    return;
  }

  let timeout = null;
  try {
    await Promise.race([
      Promise.resolve(cancellation).catch(() => undefined),
      new Promise((resolve) => {
        timeout = setTimeout(
          resolve,
          RESPONSE_REJECTION_TEARDOWN_MS,
        );
      }),
    ]);
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}

function getTransportOriginLeases(fetchImpl, create = false) {
  let originLeases = activeTransportLeases.get(fetchImpl);
  if (!originLeases && create) {
    originLeases = new Map();
    activeTransportLeases.set(fetchImpl, originLeases);
  }
  return originLeases ?? null;
}

function makeTransportLease(fetchImpl, origin, acquisition) {
  const lease = {
    acquisition,
    pendingRetentions: 0,
    releaseRequested: false,
    released: false,
    retain(promise) {
      if (!promise || typeof promise.then !== "function") {
        return;
      }
      lease.pendingRetentions += 1;
      const settle = () => {
        lease.pendingRetentions -= 1;
        lease.maybeRelease();
      };
      Promise.resolve(promise).then(settle, settle);
    },
    maybeRelease() {
      if (
        lease.released ||
        !lease.releaseRequested ||
        lease.pendingRetentions !== 0
      ) {
        return;
      }
      lease.released = true;
      const originLeases = getTransportOriginLeases(fetchImpl);
      if (originLeases?.get(origin) === lease) {
        originLeases.delete(origin);
        if (originLeases.size === 0) {
          activeTransportLeases.delete(fetchImpl);
        }
      }
    },
    release() {
      lease.releaseRequested = true;
      lease.maybeRelease();
    },
  };
  return lease;
}

async function rejectResponseBodyBounded(
  response,
  reader,
  controller,
  transportLease = null,
) {
  if (!controller.signal.aborted) {
    controller.abort(
      new Error("bootstrap_response_rejected"),
    );
  }

  let cancellation = null;
  try {
    cancellation = reader?.cancel
      ? reader.cancel()
      : response?.body?.cancel
        ? response.body.cancel()
        : null;
  } catch (_error) {
    // Preserve the already-known response rejection.
  }

  transportLease?.retain(cancellation);
  await settleCancellationBounded(cancellation);
}

async function acquireResponseBounded(
  fetchImpl,
  url,
  init,
  controller,
) {
  const origin = url.origin;
  const originLeases = getTransportOriginLeases(fetchImpl, true);
  if (originLeases.has(origin)) {
    throw new Error(
      "bootstrap_fetch_acquisition_quarantined",
    );
  }

  const acquisition = Promise.resolve().then(
    () => fetchImpl(url, init),
  );
  const lease = makeTransportLease(fetchImpl, origin, acquisition);
  originLeases.set(origin, lease);

  // If the logical request times out before a custom fetch settles, retain
  // ownership of that exact generation. A late Response is torn down once,
  // and unresolved cancellation keeps only that exact origin quarantined
  // without extending the participant-facing deadline.
  acquisition.then(
    async (response) => {
      if (controller.signal.aborted) {
        try {
          await rejectResponseBodyBounded(
            response,
            null,
            controller,
            lease,
          );
        } catch (_error) {
          // The participant-facing deadline is already terminal.
        } finally {
          lease.release();
        }
      }
    },
    () => {
      lease.release();
    },
  ).catch(() => undefined);

  try {
    const response = await awaitWithinOwnedDeadline(
      acquisition,
      controller.signal,
    );
    return { response, lease };
  } catch (error) {
    if (!controller.signal.aborted) {
      lease.release();
    }
    throw error;
  }
}

async function boundedRead(
  response,
  maxBytes,
  controller,
  transportLease,
) {
  let declared;
  try {
    declared = parseDeclaredResponseLength(response);
  } catch (error) {
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
    );
    throw error;
  }

  if (declared !== null && declared > maxBytes) {
    const primary = new Error(
      `response_too_large:${declared}`,
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
    );
    throw primary;
  }

  const body = response.body;
  if (!body || typeof body.getReader !== "function") {
    if (declared === null || declared === 0) {
      return "";
    }
    const primary = new Error(
      "response_body_unavailable",
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
    );
    throw primary;
  }

  let reader;
  try {
    reader = body.getReader();
  } catch (_error) {
    const primary = new Error(
      "response_body_reader_unavailable",
    );
    await rejectResponseBodyBounded(
      response,
      null,
      controller,
      transportLease,
    );
    throw primary;
  }

  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const readPromise = Promise.resolve().then(
        () => reader.read(),
      );
      let readResult;
      try {
        readResult = await awaitWithinOwnedDeadline(
          readPromise,
          controller.signal,
        );
      } catch (error) {
        if (controller.signal.aborted) {
          transportLease?.retain(readPromise);
          let cancellation = null;
          try {
            cancellation = reader.cancel();
          } catch (_cancelError) {
            cancellation = null;
          }
          transportLease?.retain(cancellation);
          await settleCancellationBounded(cancellation);
        } else {
          await rejectResponseBodyBounded(
            response,
            reader,
            controller,
            transportLease,
          );
        }
        throw error;
      }

      const { done, value } = readResult;
      if (done) break;

      const chunk = Buffer.from(value);
      total += chunk.length;

      if (total > maxBytes) {
        chunks.length = 0;
        const primary = new Error(
          `response_too_large:${total}`,
        );
        await rejectResponseBodyBounded(
          response,
          reader,
          controller,
          transportLease,
        );
        throw primary;
      }

      chunks.push(chunk);
    }
  } catch (error) {
    throw error;
  }

  return new TextDecoder("utf-8", {
    fatal: true,
  }).decode(Buffer.concat(chunks, total));
}

async function fetchJsonV1({
  base,
  route,
  timeoutMs,
  maxBytes,
  fetchImpl,
}) {
  const url = sameOriginUrl(base, route);
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new Error("bootstrap_request_deadline_exceeded"),
      ),
    timeoutMs,
  );
  let transportLease = null;

  try {
    const acquired = await acquireResponseBounded(
      fetchImpl,
      url,
      {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          "user-agent":
            "void-ai-agent-bootstrap-client-v1",
        },
      },
      controller,
    );
    const response = acquired.response;
    transportLease = acquired.lease;

    try {
      requireExactResponseUrl(response, url);
    } catch (error) {
      await rejectResponseBodyBounded(
        response,
        null,
        controller,
        transportLease,
      );
      throw error;
    }

    if (
      response.status >= 300 &&
      response.status < 400
    ) {
      const primary = new Error(
        `redirect_forbidden:${response.status}`,
      );
      await rejectResponseBodyBounded(
        response,
        null,
        controller,
        transportLease,
      );
      throw primary;
    }

    const raw = await boundedRead(
      response,
      maxBytes,
      controller,
      transportLease,
    );

    if (!response.ok) {
      throw new Error(
        `http_status:${response.status}`,
      );
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("invalid_json");
    }

    if (
      payload === null ||
      Array.isArray(payload) ||
      typeof payload !== "object"
    ) {
      throw new Error("json_object_required");
    }

    return {
      ok: true,
      route: url.pathname,
      status: response.status,
      bytes: Buffer.byteLength(raw, "utf8"),
      marker: publicMarker(payload),
      payload,
    };
  } finally {
    clearTimeout(timer);
    transportLease?.release();
  }
}

async function probeSurfaceV1(options) {
  try {
    const value = await fetchJsonV1(options);

    return {
      available: true,
      route: value.route,
      http_status: value.status,
      response_bytes: value.bytes,
      marker: value.marker,
      public_marker_valid: Boolean(
        value.marker,
      ),
      error: null,
      payload: value.payload,
    };
  } catch (error) {
    return {
      available: false,
      route: String(options.route),
      http_status: null,
      response_bytes: null,
      marker: null,
      public_marker_valid: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
      payload: null,
    };
  }
}

function surfaceProjection(value) {
  return {
    available: value.available,
    route: value.route,
    http_status: value.http_status,
    response_bytes: value.response_bytes,
    marker: value.marker,
    public_marker_valid:
      value.public_marker_valid,
    error: value.error,
  };
}

function readNetwork(value) {
  const network = value?.network;
  if (
    network === null ||
    Array.isArray(network) ||
    typeof network !== "object"
  ) {
    return {
      name: null,
      chain_id: null,
    };
  }

  return {
    name:
      typeof network.name === "string"
        ? network.name
        : null,
    chain_id:
      Number.isInteger(network.chain_id)
        ? network.chain_id
        : null,
  };
}

export function writeBootstrapOutputFileV1(outputPath, content) {
  const resolved = path.resolve(
    process.cwd(),
    outputPath,
  );
  const parent = path.dirname(resolved);

  mkdirSync(parent, {
    recursive: true,
    mode: 0o700,
  });

  if (pathToFileURL(resolved).protocol !== "file:") {
    throw new Error(
      "output path must be a local file",
    );
  }

  let descriptor;
  try {
    descriptor = openSync(resolved, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error("output path already exists");
    }
    throw error;
  }

  try {
    writeFileSync(descriptor, content, {
      encoding: "utf8",
    });
    fchmodSync(descriptor, 0o600);
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }

  return resolved;
}

export async function runVoidAiAgentBootstrapClientV1({
  baseUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = DEFAULT_MAX_BYTES,
  fetchImpl = globalThis.fetch,
} = {}) {
  const checkedTimeoutMs = validateBoundInteger(
    timeoutMs,
    "timeoutMs",
    MAX_TIMEOUT_MS,
  );
  const checkedMaxBytes = validateBoundInteger(
    maxBytes,
    "maxBytes",
    MAX_ALLOWED_BYTES,
  );

  if (typeof fetchImpl !== "function") {
    throw new Error(
      "fetch implementation is unavailable",
    );
  }

  const base = normalizeBootstrapBaseUrlV1(
    baseUrl,
  );

  const wellKnown = await fetchJsonV1({
    base,
    route: ROUTES.well_known_discovery,
    timeoutMs: checkedTimeoutMs,
    maxBytes: checkedMaxBytes,
    fetchImpl,
  });

  const wellKnownPayload =
    validateWellKnownEntrypointV1(
      wellKnown.payload,
    );
  const canonicalRoute =
    wellKnownPayload.canonical_discovery;

  // Preserve a transport-level same-origin assertion even though the exact
  // root contract already pins the reviewed canonical discovery path.
  sameOriginUrl(base, canonicalRoute);

  const canonical = await probeSurfaceV1({
    base,
    route: canonicalRoute,
    timeoutMs: checkedTimeoutMs,
    maxBytes: checkedMaxBytes,
    fetchImpl,
  });
  const capabilities =
    await probeSurfaceV1({
      base,
      route: ROUTES.capabilities,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
    });
  const authentication =
    await probeSurfaceV1({
      base,
      route: ROUTES.authentication,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
    });
  const firstContact =
    await probeSurfaceV1({
      base,
      route: ROUTES.first_contact,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
    });
  const externalIntake =
    await probeSurfaceV1({
      base,
      route:
        ROUTES.external_opportunity_intake,
      timeoutMs: checkedTimeoutMs,
      maxBytes: checkedMaxBytes,
      fetchImpl,
    });

  const required = [
    canonical,
    capabilities,
    authentication,
  ];
  const all = [
    ...required,
    firstContact,
    externalIntake,
  ];

  const readOnlyConnectionReady =
    required.every(
      (value) =>
        value.available &&
        value.public_marker_valid,
    );
  const onboardingSurfaceComplete =
    all.every(
      (value) =>
        value.available &&
        value.public_marker_valid,
    );

  const nextSteps = [];
  if (!canonical.available) {
    nextSteps.push(
      "retry_canonical_discovery_read",
    );
  }
  if (!capabilities.available) {
    nextSteps.push(
      "retry_capability_discovery_read",
    );
  }
  if (!authentication.available) {
    nextSteps.push(
      "retry_authentication_contract_read",
    );
  }
  if (!firstContact.available) {
    nextSteps.push(
      "retry_first_contact_contract_read",
    );
  }
  if (!externalIntake.available) {
    nextSteps.push(
      "retry_external_opportunity_intake_read",
    );
  }
  if (onboardingSurfaceComplete) {
    nextSteps.push(
      "select_explicit_read_only_capability",
    );
  }

  const network = readNetwork(
    wellKnownPayload,
  );

  return {
    marker:
      VOID_AI_AGENT_BOOTSTRAP_CLIENT_V1,
    schema:
      VOID_AI_AGENT_BOOTSTRAP_RESULT_SCHEMA_V1,
    version: 1,
    base_origin: base.origin,
    network,
    official_entrypoint: {
      verified: true,
      route: wellKnown.route,
      marker: wellKnown.marker,
      protocol:
        wellKnownPayload.protocol,
      canonical_discovery:
        new URL(
          canonicalRoute,
          base,
        ).pathname,
      authority_default:
        wellKnownPayload.authority.default,
      mutation_authority_granted: false,
    },
    surfaces: {
      canonical_discovery:
        surfaceProjection(canonical),
      capabilities:
        surfaceProjection(capabilities),
      authentication:
        surfaceProjection(authentication),
      first_contact:
        surfaceProjection(firstContact),
      external_opportunity_intake:
        surfaceProjection(externalIntake),
    },
    readiness: {
      read_only_connection_ready:
        readOnlyConnectionReady,
      onboarding_surface_complete:
        onboardingSurfaceComplete,
      paid_work_execution_promised: false,
      work_credit_earning_promised: false,
      mutation_authority_granted: false,
      wallet_or_signer_access_granted: false,
      payment_authority_granted: false,
      buy_void_fulfillment_authority_granted:
        false,
    },
    next_steps: nextSteps,
    safety: {
      http_methods_used: ["GET"],
      same_origin_only: true,
      redirects_followed: false,
      credentials_sent: false,
      authorization_header_sent: false,
      cookies_sent: false,
      wallet_material_sent: false,
      operator_keys_sent: false,
      request_body_sent: false,
      mutation_performed: false,
      payment_performed: false,
      transaction_broadcast_performed: false,
      wc_ledger_write_performed: false,
    },
  };
}

async function main() {
  const args = parseBootstrapClientArgsV1(
    process.argv.slice(2),
  );

  if (args.help) {
    process.stdout.write(usage() + "\n");
    return 0;
  }
  if (!args.baseUrl) {
    throw new Error("--base-url is required");
  }

  const result =
    await runVoidAiAgentBootstrapClientV1({
      baseUrl: args.baseUrl,
      timeoutMs: args.timeoutMs,
      maxBytes: args.maxBytes,
    });

  const content =
    JSON.stringify(
      result,
      null,
      args.pretty ? 2 : 0,
    ) + "\n";

  if (args.outputPath) {
    const resolved = writeBootstrapOutputFileV1(
      args.outputPath,
      content,
    );
    process.stderr.write(
      `output=${resolved}\n`,
    );
  }

  process.stdout.write(content);
  return 0;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(
      path.resolve(process.argv[1]),
    ).href
  : "";

if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(
      `HOLD: ${
        error instanceof Error
          ? error.message
          : String(error)
      }\n`,
    );
    process.exitCode = 2;
  });
}
