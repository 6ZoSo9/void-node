#!/usr/bin/env node
import process from "node:process";

const CLIENT_MARKER = "VOID_AI_AGENT_CAPABILITY_CLIENT_V1";
const WELL_KNOWN_DISCOVERY_PATH =
  "/.well-known/void-agent-discovery.json";
const DISCOVERY_MARKER = "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1";
const DISCOVERY_PROTOCOL = "void-agent-discovery/1";
const CAPABILITY_MARKER =
  "VOID_AI_AGENT_CAPABILITY_NEGOTIATION_V1";
const CAPABILITY_PROTOCOL =
  "void-agent-capability-negotiation/1";
const SAFE_METHODS = new Set(["GET", "HEAD"]);

function fail(error, detail = undefined) {
  const output = {
    ok: false,
    marker: CLIENT_MARKER,
    error,
  };
  if (detail !== undefined) {
    output.detail = detail;
  }
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const parsed = {
    base: "",
    wanted: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--base") {
      parsed.base = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--want") {
      parsed.wanted = (argv[index + 1] ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      index += 1;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node tools/void-ai-agent-capability-client-v1.mjs \\",
          "    --base https://node.example \\",
          "    --want public_discovery,capability_negotiation",
          "",
          "Fetches VOID discovery and capability documents using same-origin",
          "GET-only requests, then computes a fail-closed client-side",
          "intersection. No credentials or mutation requests are sent.",
          "",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      fail("unknown_argument", value);
      return null;
    }
  }

  if (!parsed.base) {
    fail("missing_required_argument", "--base");
    return null;
  }

  if (parsed.wanted.length === 0) {
    parsed.wanted = [
      "public_discovery",
      "capability_negotiation",
    ];
  }

  if (new Set(parsed.wanted).size !== parsed.wanted.length) {
    fail("duplicate_wanted_capability");
    return null;
  }

  return parsed;
}

function normalizeBase(value) {
  const url = new URL(value);
  const loopback =
    url.hostname === "127.0.0.1" ||
    url.hostname === "localhost" ||
    url.hostname === "::1";

  if (url.protocol !== "https:" && !loopback) {
    throw new Error("base_must_use_https_except_loopback");
  }

  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function sameOriginPath(base, value, label) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    throw new Error(`${label}_must_be_same_origin_absolute_path`);
  }

  const resolved = new URL(value, base);
  if (resolved.origin !== base.origin) {
    throw new Error(`${label}_cross_origin_rejected`);
  }
  return resolved;
}

async function getJson(url, label) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "error",
    headers: {
      accept: "application/json",
      "user-agent": "void-ai-agent-capability-client-v1",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`${label}_http_${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    throw new Error(`${label}_content_type_not_json`);
  }

  return response.json();
}

function validateWellKnownDiscovery(base, document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("well_known_discovery_must_be_object");
  }
  if (document.marker !== "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1") {
    throw new Error("well_known_discovery_marker_mismatch");
  }
  if (document.network?.chain_id !== 2050) {
    throw new Error("well_known_discovery_chain_id_mismatch");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("well_known_mutation_authority_claim_rejected");
  }
  if (document.authority?.credentials_required !== false) {
    throw new Error("well_known_credentials_requirement_rejected");
  }
  if (document.safety?.same_origin_only !== true) {
    throw new Error("well_known_same_origin_wall_missing");
  }
  if (document.safety?.follow_redirects !== false) {
    throw new Error("well_known_redirect_wall_missing");
  }

  return sameOriginPath(
    base,
    document.canonical_discovery,
    "canonical_discovery",
  );
}

function validateCanonicalDiscovery(base, document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("canonical_discovery_must_be_object");
  }
  if (document.marker !== DISCOVERY_MARKER) {
    throw new Error("canonical_discovery_marker_mismatch");
  }
  if (document.protocol !== DISCOVERY_PROTOCOL) {
    throw new Error("canonical_discovery_protocol_mismatch");
  }
  if (document.network?.chain_id !== 2050) {
    throw new Error("canonical_discovery_chain_id_mismatch");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("canonical_mutation_authority_claim_rejected");
  }

  const advertised = document.entrypoints?.capability_negotiation;
  const capability = Array.isArray(document.capabilities)
    ? document.capabilities.find(
        (entry) => entry?.id === "capability_negotiation",
      )
    : undefined;

  if (!capability) {
    throw new Error("capability_negotiation_entry_missing");
  }
  if (capability.state !== "live") {
    throw new Error("capability_negotiation_not_live");
  }
  if (capability.authority !== "read_only") {
    throw new Error("capability_negotiation_not_read_only");
  }
  if (capability.discovery !== advertised) {
    throw new Error("capability_negotiation_path_mismatch");
  }

  return sameOriginPath(
    base,
    advertised,
    "capability_negotiation",
  );
}

function validateCatalog(base, document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("capability_catalog_must_be_object");
  }
  if (document.marker !== CAPABILITY_MARKER) {
    throw new Error("capability_catalog_marker_mismatch");
  }
  if (document.protocol !== CAPABILITY_PROTOCOL) {
    throw new Error("capability_catalog_protocol_mismatch");
  }
  if (document.network?.chain_id !== 2050) {
    throw new Error("capability_catalog_chain_id_mismatch");
  }
  if (document.negotiation?.mode !== "client_side_intersection") {
    throw new Error("negotiation_mode_mismatch");
  }
  if (document.negotiation?.request_submission_enabled !== false) {
    throw new Error("negotiation_request_submission_must_be_false");
  }
  if (document.negotiation?.default_result !== "not_granted") {
    throw new Error("negotiation_default_must_be_not_granted");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("capability_mutation_authority_claim_rejected");
  }
  if (document.authority?.authentication_active !== false) {
    throw new Error("capability_authentication_must_be_inactive");
  }
  if (document.authority?.signed_request_envelopes_active !== false) {
    throw new Error("signed_request_envelopes_must_be_inactive");
  }
  if (document.authority?.payment_submission_active !== false) {
    throw new Error("payment_submission_must_be_inactive");
  }
  if (document.authority?.work_credit_awards_active !== false) {
    throw new Error("work_credit_awards_must_be_inactive");
  }
  if (
    document.authority?.buy_void_automatic_fulfillment_active !== false
  ) {
    throw new Error("buy_void_fulfillment_must_be_inactive");
  }
  if (document.safety?.same_origin_only !== true) {
    throw new Error("capability_same_origin_wall_missing");
  }
  if (document.safety?.follow_redirects !== false) {
    throw new Error("capability_redirect_wall_missing");
  }
  if (document.safety?.send_credentials !== false) {
    throw new Error("capability_credentials_send_must_be_false");
  }
  if (
    document.safety?.unknown_capability_result !== "not_granted" ||
    document.safety?.ambiguous_capability_result !== "not_granted"
  ) {
    throw new Error("capability_fail_closed_default_missing");
  }

  if (!Array.isArray(document.capabilities)) {
    throw new Error("capabilities_must_be_array");
  }

  const byId = new Map();
  for (const capability of document.capabilities) {
    if (!capability || typeof capability !== "object") {
      throw new Error("capability_entry_must_be_object");
    }
    if (typeof capability.id !== "string" || !capability.id) {
      throw new Error("capability_id_invalid");
    }
    if (byId.has(capability.id)) {
      throw new Error(`duplicate_capability_id_${capability.id}`);
    }

    if (!Array.isArray(capability.http_methods)) {
      throw new Error(`capability_methods_invalid_${capability.id}`);
    }
    for (const method of capability.http_methods) {
      if (!SAFE_METHODS.has(method)) {
        throw new Error(
          `capability_unsafe_method_${capability.id}_${method}`,
        );
      }
    }

    if (!Array.isArray(capability.paths)) {
      throw new Error(`capability_paths_invalid_${capability.id}`);
    }
    for (const capabilityPath of capability.paths) {
      sameOriginPath(
        base,
        capabilityPath,
        `capability_${capability.id}_path`,
      );
    }

    byId.set(capability.id, capability);
  }

  return byId;
}

function negotiate(wanted, byId) {
  const granted = [];
  const notGranted = [];

  for (const id of wanted) {
    const capability = byId.get(id);

    if (!capability) {
      notGranted.push({
        id,
        reason: "unknown_capability",
      });
      continue;
    }

    const methodsSafe =
      capability.http_methods.length > 0 &&
      capability.http_methods.every((method) => SAFE_METHODS.has(method));
    const pathsPresent = capability.paths.length > 0;

    if (
      capability.state === "live" &&
      capability.enabled === true &&
      capability.access === "anonymous" &&
      capability.authority === "read_only" &&
      methodsSafe &&
      pathsPresent
    ) {
      granted.push({
        id,
        authority: capability.authority,
        http_methods: capability.http_methods,
        paths: capability.paths,
      });
      continue;
    }

    notGranted.push({
      id,
      reason: "advertised_requirements_not_satisfied",
      state: capability.state,
      enabled: capability.enabled,
      access: capability.access,
      authority: capability.authority,
    });
  }

  return { granted, not_granted: notGranted };
}

const args = parseArgs(process.argv.slice(2));
if (args) {
  try {
    const base = normalizeBase(args.base);
    const wellKnown = await getJson(
      sameOriginPath(
        base,
        WELL_KNOWN_DISCOVERY_PATH,
        "well_known_discovery",
      ),
      "well_known_discovery",
    );
    const canonicalUrl = validateWellKnownDiscovery(base, wellKnown);
    const canonical = await getJson(
      canonicalUrl,
      "canonical_discovery",
    );
    const capabilityUrl = validateCanonicalDiscovery(base, canonical);
    const catalog = await getJson(capabilityUrl, "capability_catalog");
    const byId = validateCatalog(base, catalog);
    const result = negotiate(args.wanted, byId);

    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          marker: CLIENT_MARKER,
          network: catalog.network,
          negotiation: {
            mode: catalog.negotiation.mode,
            default_result: catalog.negotiation.default_result,
            request_submission_enabled:
              catalog.negotiation.request_submission_enabled,
          },
          authority: catalog.authority,
          wanted: args.wanted,
          ...result,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    fail("capability_negotiation_failed", String(error));
  }
}
