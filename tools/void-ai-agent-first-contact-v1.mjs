#!/usr/bin/env node
import process from "node:process";

const MARKER = "VOID_AI_AGENT_FIRST_CONTACT_CLIENT_V1";
const DEFAULT_BASE_URL = "http://127.0.0.1:4100";
const DEFAULT_MANIFEST_PATH = "/public-node/agents/first-contact-v1.json";
const DEFAULT_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 65_536;
const OFFICIAL_NETWORK = {
  name: "VOID Mainnet-0",
  chain_id: 2050,
  identity: "mainnet0",
};
const PUBLIC_UTILITY_TOP_LEVEL_KEYS = [
  "contract",
  "controls",
  "entries",
  "integration",
  "limits",
  "marker",
  "network",
  "purpose",
  "status",
];
const PUBLIC_UTILITY_INTEGRATION_KEYS = [
  "activation_requires",
  "advertised_from_first_contact",
  "first_contact_manifest",
  "runtime_observed",
];
const PUBLIC_UTILITY_LIMIT_KEYS = [
  "max_catalog_bytes",
  "max_entries",
  "max_requests_per_cold_start",
  "minimum_poll_interval_ms",
];
const PUBLIC_UTILITY_CONTROL_KEYS = [
  "anonymous_read_allowed",
  "captcha_required",
  "credential_required",
  "earning_advertised",
  "human_chat_required",
  "mutation_authority_granted",
  "paid_work_advertised",
  "polling_rewarded",
  "registration_required",
  "traffic_rewarded",
  "wallet_required",
  "work_credit_award_active",
];
const PUBLIC_UTILITY_ENTRY_KEYS = [
  "access",
  "authority",
  "http_method",
  "id",
  "kind",
  "media_type",
  "path",
  "purpose",
  "repository_path",
  "required_marker",
  "runtime_observed",
  "same_origin",
  "source_present",
];

function parseArgs(argv) {
  const result = {
    baseUrl: DEFAULT_BASE_URL,
    manifestPath: DEFAULT_MANIFEST_PATH,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    pretty: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base-url") {
      result.baseUrl = argv[++index];
    } else if (value === "--manifest-path") {
      result.manifestPath = argv[++index];
    } else if (value === "--timeout-ms") {
      result.timeoutMs = Number(argv[++index]);
    } else if (value === "--pretty") {
      result.pretty = true;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write(
        [
          "VOID AI Agent First Contact Client V1",
          "",
          "Usage:",
          "  node tools/void-ai-agent-first-contact-v1.mjs [options]",
          "",
          "Options:",
          "  --base-url <url>       VOID public-node base URL",
          "  --manifest-path <path> First-contact manifest path",
          "  --timeout-ms <ms>      Per-request timeout",
          "  --pretty               Pretty-print JSON output",
          "",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${value}`);
    }
  }

  if (!Number.isFinite(result.timeoutMs) || result.timeoutMs < 100) {
    throw new Error("--timeout-ms must be at least 100");
  }
  return result;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
    url.hostname.toLowerCase(),
  );
  if (url.username || url.password) {
    throw new Error("base URL credentials are forbidden");
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) {
    throw new Error("base URL must use HTTPS or loopback HTTP");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function joinUrl(baseUrl, path) {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("?") ||
    path.includes("#") ||
    path.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`invalid public path: ${String(path)}`);
  }
  const base = new URL(`${baseUrl}/`);
  const resolved = new URL(path, base);
  if (
    resolved.origin !== base.origin ||
    resolved.username ||
    resolved.password ||
    resolved.pathname !== path
  ) {
    throw new Error(`cross-origin public path forbidden: ${String(path)}`);
  }
  return resolved.toString();
}

async function readBoundedText(response) {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    Number.isFinite(Number(declaredLength)) &&
    Number(declaredLength) > MAX_RESPONSE_BYTES
  ) {
    throw new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`);
  }
  if (response.body === null) return "";

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

async function fetchJson(baseUrl, path, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(joinUrl(baseUrl, path), {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "void-ai-agent-first-contact-v1",
      },
      redirect: "error",
      signal: controller.signal,
    });
    const text = await readBoundedText(response);
    let body = null;
    let parseError = null;
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        parseError = String(error?.message ?? error);
      }
    }
    const contentType = response.headers.get("content-type");
    const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase();
    return {
      ok:
        response.ok &&
        body !== null &&
        parseError === null &&
        mediaType === "application/json",
      status: response.status,
      content_type: contentType,
      body,
      body_bytes: Buffer.byteLength(text),
      parse_error: parseError,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      content_type: null,
      body: null,
      body_bytes: 0,
      error: String(error?.message ?? error),
    };
  } finally {
    clearTimeout(timer);
  }
}

function bindingConsistent(manifest, discovery, authenticity) {
  const discoveryDocument = discovery?.body;
  const authenticityDocument = authenticity?.body;
  return (
    manifest?.network?.name === OFFICIAL_NETWORK.name &&
    manifest?.network?.chain_id === OFFICIAL_NETWORK.chain_id &&
    manifest?.network?.identity === OFFICIAL_NETWORK.identity &&
    discoveryDocument?.marker ===
      "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1" &&
    discoveryDocument?.protocol === "void-agent-discovery-well-known/1" &&
    discoveryDocument?.network?.name === OFFICIAL_NETWORK.name &&
    discoveryDocument?.network?.chain_id === OFFICIAL_NETWORK.chain_id &&
    discoveryDocument?.network_authenticity ===
      manifest?.entrypoints?.official_authenticity &&
    discoveryDocument?.authority?.default === "read_only" &&
    discoveryDocument?.authority?.mutation_authority_granted === false &&
    discoveryDocument?.authority?.credentials_required === false &&
    discoveryDocument?.safety?.same_origin_only === true &&
    discoveryDocument?.safety?.follow_redirects === false &&
    authenticityDocument?.marker ===
      "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1" &&
    authenticityDocument?.protocol === "void-network-authenticity/1" &&
    authenticityDocument?.status === "public_verification_available" &&
    authenticityDocument?.network?.name === OFFICIAL_NETWORK.name &&
    authenticityDocument?.network?.chain_id === OFFICIAL_NETWORK.chain_id &&
    authenticityDocument?.authority?.verification_only === true &&
    authenticityDocument?.authority?.mutation_authority_granted === false &&
    authenticityDocument?.authority?.runtime_authority_granted === false &&
    authenticityDocument?.authority?.economic_authority_granted === false &&
    authenticityDocument?.safety?.credentials_required === false &&
    authenticityDocument?.safety?.follow_redirects === false
  );
}

function authenticationContractValid(manifest, authentication) {
  const contract = authentication?.body;
  return (
    authentication?.ok === true &&
    contract?.marker === "VOID_AI_AGENT_AUTHENTICATION_WELL_KNOWN_V1" &&
    contract?.protocol === "void-agent-authentication-well-known/1" &&
    contract?.contract_published === true &&
    contract?.canonical_authentication_contract ===
      "/public-node/agents/authentication-v1.json" &&
    contract?.network?.name === manifest?.network?.name &&
    contract?.network?.chain_id === manifest?.network?.chain_id &&
    contract?.authenticated_routes_active === false &&
    contract?.verifier_runtime_active === false &&
    contract?.mutation_authority_granted === false &&
    contract?.safety?.same_origin_only === true &&
    contract?.safety?.follow_redirects === false &&
    contract?.safety?.send_credentials_now === false &&
    contract?.safety?.send_signed_envelopes_now === false &&
    contract?.safety?.treat_unknown_as === "not_granted"
  );
}

function capabilitiesContractValid(manifest, capabilities) {
  const catalog = capabilities?.body;
  if (
    capabilities?.ok !== true ||
    catalog?.marker !== "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1" ||
    catalog?.protocol !== "void-agent-capability-negotiation/1" ||
    catalog?.network?.name !== manifest?.network?.name ||
    catalog?.network?.chain_id !== manifest?.network?.chain_id ||
    catalog?.authority?.default !== "not_granted" ||
    catalog?.authority?.discovery_authority !== "read_only" ||
    catalog?.authority?.mutation_authority_granted !== false ||
    catalog?.negotiation?.mode !== "client_side_intersection" ||
    catalog?.negotiation?.default_result !== "not_granted" ||
    catalog?.negotiation?.request_submission_enabled !== false ||
    catalog?.negotiation?.server_round_trip_required !== false ||
    catalog?.safety?.same_origin_only !== true ||
    catalog?.safety?.follow_redirects !== false ||
    catalog?.safety?.send_credentials !== false ||
    catalog?.safety?.send_operator_keys !== false ||
    catalog?.safety?.send_secrets !== false ||
    catalog?.safety?.send_wallet_material !== false ||
    !Array.isArray(catalog?.capabilities) ||
    catalog.capabilities.length === 0
  ) {
    return false;
  }

  const identifiers = new Set();
  for (const capability of catalog.capabilities) {
    if (
      typeof capability?.id !== "string" ||
      !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(capability.id) ||
      identifiers.has(capability.id) ||
      typeof capability?.enabled !== "boolean" ||
      typeof capability?.state !== "string" ||
      typeof capability?.access !== "string" ||
      typeof capability?.authority !== "string" ||
      !Array.isArray(capability?.http_methods) ||
      !capability.http_methods.every((method) =>
        ["GET", "HEAD"].includes(method)
      ) ||
      !Array.isArray(capability?.paths) ||
      !capability.paths.every((path) => {
        try {
          joinUrl("https://void.invalid", path);
          return path.endsWith(".json");
        } catch {
          return false;
        }
      }) ||
      (capability.enabled === true &&
        (capability.state !== "live" ||
          capability.access !== "anonymous" ||
          capability.authority !== "read_only" ||
          capability.http_methods.length === 0))
    ) {
      return false;
    }
    identifiers.add(capability.id);
  }
  return (
    identifiers.has("public_discovery") &&
    identifiers.has("capability_negotiation")
  );
}

function normalizedText(value) {
  return JSON.stringify(value ?? null).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function hasExactKeys(value, expected) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
  );
}

function isBoundedString(value, maximumLength) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maximumLength
  );
}

function isPublicJsonPath(path) {
  if (
    typeof path !== "string" ||
    !/^\/public-node\/[A-Za-z0-9._/-]+\.json$/.test(path)
  ) {
    return false;
  }
  try {
    joinUrl("https://void.invalid", path);
    return true;
  } catch {
    return false;
  }
}

function usefulPublicResources(manifest, publicUtility) {
  const catalog = publicUtility?.body;
  if (
    !publicUtility?.ok ||
    !hasExactKeys(catalog, PUBLIC_UTILITY_TOP_LEVEL_KEYS) ||
    catalog?.marker !== "VOID_AI_AGENT_PUBLIC_UTILITY_V1" ||
    catalog?.contract !== "void-ai-agent-first-contact-public-utility/1" ||
    catalog?.status !== "source_only_advertised_not_observed" ||
    !isBoundedString(catalog?.purpose, 256) ||
    !hasExactKeys(catalog?.network, ["chain_id", "identity", "name"]) ||
    catalog?.network?.name !== manifest?.network?.name ||
    catalog?.network?.chain_id !== manifest?.network?.chain_id ||
    catalog?.network?.identity !== manifest?.network?.identity ||
    !hasExactKeys(catalog?.integration, PUBLIC_UTILITY_INTEGRATION_KEYS) ||
    catalog?.integration?.first_contact_manifest !== manifest?.entrypoints?.first_contact ||
    catalog?.integration?.advertised_from_first_contact !== true ||
    catalog?.integration?.runtime_observed !== false ||
    !Array.isArray(catalog?.integration?.activation_requires) ||
    catalog.integration.activation_requires.length !== 1 ||
    catalog.integration.activation_requires[0] !==
      "independent_http_observation" ||
    !hasExactKeys(catalog?.controls, PUBLIC_UTILITY_CONTROL_KEYS) ||
    catalog?.controls?.anonymous_read_allowed !== true ||
    catalog?.controls?.captcha_required !== false ||
    catalog?.controls?.credential_required !== false ||
    catalog?.controls?.mutation_authority_granted !== false ||
    catalog?.controls?.paid_work_advertised !== false ||
    catalog?.controls?.earning_advertised !== false ||
    catalog?.controls?.human_chat_required !== false ||
    catalog?.controls?.polling_rewarded !== false ||
    catalog?.controls?.registration_required !== false ||
    catalog?.controls?.traffic_rewarded !== false ||
    catalog?.controls?.wallet_required !== false ||
    catalog?.controls?.work_credit_award_active !== false ||
    !hasExactKeys(catalog?.limits, PUBLIC_UTILITY_LIMIT_KEYS) ||
    catalog?.limits?.max_catalog_bytes !== MAX_RESPONSE_BYTES ||
    catalog?.limits?.max_entries !== 8 ||
    catalog?.limits?.max_requests_per_cold_start !== 4 ||
    !Number.isInteger(catalog?.limits?.minimum_poll_interval_ms) ||
    catalog.limits.minimum_poll_interval_ms < 60_000 ||
    !Array.isArray(catalog?.entries) ||
    catalog.entries.length < 1 ||
    catalog.entries.length > catalog.limits.max_entries ||
    catalog.entries.length > catalog.limits.max_requests_per_cold_start
  ) {
    return [];
  }

  const ids = new Set();
  const paths = new Set();
  const resources = catalog.entries.flatMap((entry) => {
    if (
      !hasExactKeys(entry, PUBLIC_UTILITY_ENTRY_KEYS) ||
      typeof entry?.id !== "string" ||
      !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(entry.id) ||
      ids.has(entry.id) ||
      typeof entry?.kind !== "string" ||
      !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(entry.kind) ||
      !isBoundedString(entry?.purpose, 256) ||
      !isPublicJsonPath(entry?.path) ||
      paths.has(entry.path) ||
      entry.repository_path !== `public${entry.path}` ||
      typeof entry?.required_marker !== "string" ||
      !/^[A-Z0-9_]+$/.test(entry.required_marker) ||
      entry.http_method !== "GET" ||
      entry.media_type !== "application/json" ||
      entry.access !== "anonymous" ||
      entry.authority !== "read_only" ||
      entry.same_origin !== true ||
      entry.source_present !== true ||
      entry.runtime_observed !== false ||
      ids.size >= catalog.limits.max_entries
    ) {
      return [];
    }
    ids.add(entry.id);
    paths.add(entry.path);
    return [{
      id: entry.id,
      purpose: entry.purpose,
      path: entry.path,
      mode: "anonymous_read_only",
      catalog_observed_by_client: true,
      runtime_observed: false,
    }];
  });
  return resources.length === catalog.entries.length ? resources : [];
}

function normalizedKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function affirmativeValue(value) {
  if (value === true) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  return [
    "active",
    "available",
    "enabled",
    "live",
    "ready",
    "supported",
  ].includes(normalizedKey(value));
}

function observedCommercialSignals(capabilities) {
  let paidWorkObserved = false;
  let workCreditEarningObserved = false;

  const paidKeys = new Set([
    "paidworkavailable",
    "paidworkenabled",
    "paidworksubmissionenabled",
    "paidworksupported",
  ]);
  const workCreditKeys = new Set([
    "workcreditearningavailable",
    "workcreditearningenabled",
    "workcreditsupported",
    "wcearningavailable",
    "wcearningenabled",
  ]);

  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }
    if (!value || typeof value !== "object") {
      return;
    }

    const identifier = normalizedText({
      id: value.id,
      name: value.name,
      capability: value.capability,
      type: value.type,
    });
    const objectAvailable =
      value.enabled === true ||
      value.available === true ||
      affirmativeValue(value.status);

    if (objectAvailable && identifier.includes("paidwork")) {
      paidWorkObserved = true;
    }
    if (
      objectAvailable &&
      (
        identifier.includes("workcredit") ||
        identifier.includes("wcearning")
      )
    ) {
      workCreditEarningObserved = true;
    }

    for (const [key, item] of Object.entries(value)) {
      const normalized = normalizedKey(key);
      if (paidKeys.has(normalized) && affirmativeValue(item)) {
        paidWorkObserved = true;
      }
      if (workCreditKeys.has(normalized) && affirmativeValue(item)) {
        workCreditEarningObserved = true;
      }
      visit(item);
    }
  };

  visit(capabilities?.body);
  return {
    paid_work_observed: paidWorkObserved,
    work_credit_earning_observed: workCreditEarningObserved,
  };
}

function nextActions(manifest, checks, commercial, resources) {
  const actions = [];
  if (checks.public_utility_catalog_loaded) {
    actions.push({
      id: "inspect_public_utility",
      path: manifest.entrypoints.public_utility,
      mode: "anonymous_read_only",
      resource_count: resources.length,
    });
  }
  if (checks.capabilities_loaded) {
    actions.push({
      id: "inspect_capabilities",
      path: manifest.entrypoints.capabilities,
      mode: "read_only",
    });
  }
  if (checks.authentication_contract_found) {
    actions.push({
      id: "inspect_authentication",
      path: manifest.entrypoints.authentication,
      mode: "read_only",
    });
  }
  if (checks.agent_intake_reachable) {
    actions.push({
      id: "inspect_agent_intake",
      path: manifest.entrypoints.agent_intake,
      mode: "read_only",
    });
  }
  if (commercial.paid_work_observed) {
    actions.push({
      id: "review_observed_paid_work_capability",
      mode: "read_only_review",
    });
  }
  if (commercial.work_credit_earning_observed) {
    actions.push({
      id: "review_observed_work_credit_capability",
      mode: "read_only_review",
    });
  }
  return actions;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const firstContact = await fetchJson(
    baseUrl,
    options.manifestPath,
    options.timeoutMs,
  );
  const manifest = firstContact.body;
  const entrypoints = manifest?.entrypoints ?? {};

  const fetchEntry = async (key) => {
    const path = entrypoints[key];
    if (typeof path !== "string") {
      return {
        ok: false,
        status: 0,
        body: null,
        error: `manifest entrypoint missing: ${key}`,
      };
    }
    return fetchJson(baseUrl, path, options.timeoutMs);
  };

  const [
    discovery,
    authenticity,
    authentication,
    capabilities,
    intake,
    publicUtility,
  ] =
    await Promise.all([
      fetchEntry("well_known_discovery"),
      fetchEntry("official_authenticity"),
      fetchEntry("authentication"),
      fetchEntry("capabilities"),
      fetchEntry("agent_intake"),
      fetchEntry("public_utility"),
    ]);

  const resources = usefulPublicResources(manifest, publicUtility);
  const authenticationValid = authenticationContractValid(
    manifest,
    authentication,
  );
  const capabilitiesValid = capabilitiesContractValid(
    manifest,
    capabilities,
  );

  const checks = {
    first_contact_manifest_reachable:
      firstContact.ok &&
      manifest?.marker === "VOID_AI_AGENT_FIRST_CONTACT_V1",
    discovery_reachable: discovery.ok,
    official_authenticity_reachable: authenticity.ok,
    network_binding_consistent:
      firstContact.ok &&
      discovery.ok &&
      authenticity.ok &&
      bindingConsistent(manifest, discovery, authenticity),
    authentication_contract_found: authenticationValid,
    capabilities_loaded: capabilitiesValid,
    agent_intake_reachable: intake.ok,
    public_utility_catalog_loaded: resources.length > 0,
  };

  const officialNetworkVerified =
    checks.discovery_reachable &&
    checks.official_authenticity_reachable &&
    checks.network_binding_consistent;

  const requiredReady = [
    checks.first_contact_manifest_reachable,
    checks.discovery_reachable,
    checks.official_authenticity_reachable,
    checks.network_binding_consistent,
    checks.authentication_contract_found,
    checks.capabilities_loaded,
    checks.public_utility_catalog_loaded,
  ].every(Boolean);

  const commercial = capabilitiesValid
    ? observedCommercialSignals(capabilities)
    : {
        paid_work_observed: false,
        work_credit_earning_observed: false,
      };
  const report = {
    marker: MARKER,
    protocol: "void-ai-agent-first-contact",
    version: "1",
    status: requiredReady ? "ready_read_only" : "partial_read_only",
    base_url: baseUrl,
    connection_mode: "read_only",
    official_network_verified: officialNetworkVerified,
    verification_semantics:
      manifest?.verification?.semantics ?? null,
    network: manifest?.network ?? null,
    checks,
    observed_capabilities: commercial,
    useful_public_resources: resources,
    next_actions:
      firstContact.ok
        ? nextActions(manifest, checks, commercial, resources)
        : [],
    responses: {
      first_contact: {
        status: firstContact.status,
        body_bytes: firstContact.body_bytes,
      },
      discovery: {
        status: discovery.status,
        body_bytes: discovery.body_bytes,
      },
      official_authenticity: {
        status: authenticity.status,
        body_bytes: authenticity.body_bytes,
      },
      authentication: {
        status: authentication.status,
        body_bytes: authentication.body_bytes,
      },
      capabilities: {
        status: capabilities.status,
        body_bytes: capabilities.body_bytes,
      },
      agent_intake: {
        status: intake.status,
        body_bytes: intake.body_bytes,
      },
      public_utility: {
        status: publicUtility.status,
        body_bytes: publicUtility.body_bytes,
        error: publicUtility.error ?? null,
      },
    },
    authority: {
      mutation_authority_granted: false,
      wallet_accessed: false,
      credentials_accessed: false,
      transaction_submitted: false,
      paid_work_submitted: false,
      work_credits_earned: false,
    },
  };

  process.stdout.write(
    `${JSON.stringify(report, null, options.pretty ? 2 : 0)}\n`,
  );
  process.exitCode = requiredReady ? 0 : 2;
}

main().catch((error) => {
  process.stderr.write(`HOLD: ${String(error?.message ?? error)}\n`);
  process.exitCode = 78;
});
