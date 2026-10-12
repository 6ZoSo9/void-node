#!/usr/bin/env node
import process from "node:process";

const MARKER = "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1";
const PROTOCOL = "void-agent-discovery/1";
const DISCOVERY_PATH = "/public-node/agents/discovery-v1.json";
const SAFE_METHODS = new Set(["GET", "HEAD"]);

function fail(message, detail = undefined) {
  const output = {
    ok: false,
    marker: "VOID_AI_AGENT_DISCOVERY_CLIENT_V1",
    error: message,
  };
  if (detail !== undefined) output.detail = detail;
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const result = { base: "", probe: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base") {
      result.base = argv[index + 1] ?? "";
      index += 1;
    } else if (value === "--probe") {
      result.probe = true;
    } else if (value === "--help" || value === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node tools/void-ai-agent-discovery-client-v1.mjs --base https://node.example [--probe]",
          "",
          "The client performs GET-only, same-origin discovery. It never sends credentials or mutation requests.",
          "",
        ].join("\n"),
      );
      process.exit(0);
    } else {
      fail("unknown_argument", value);
      return null;
    }
  }
  if (!result.base) {
    fail("missing_required_argument", "--base");
    return null;
  }
  return result;
}

function normalizeBase(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" &&
    url.hostname !== "127.0.0.1" &&
    url.hostname !== "localhost"
  ) {
    throw new Error("base_must_use_https_except_loopback");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

function sameOriginPath(base, value, label) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    throw new Error(`${label}_must_be_absolute_path`);
  }
  const resolved = new URL(value, base);
  if (resolved.origin !== base.origin) {
    throw new Error(`${label}_cross_origin_rejected`);
  }
  return resolved;
}

function validateDiscovery(base, document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    throw new Error("discovery_document_must_be_object");
  }
  if (document.marker !== MARKER) throw new Error("marker_mismatch");
  if (document.protocol !== PROTOCOL) throw new Error("protocol_mismatch");
  if (document.network?.chain_id !== 2050) throw new Error("chain_id_mismatch");
  if (document.authority?.default !== "read_only") {
    throw new Error("default_authority_not_read_only");
  }
  if (document.authority?.mutation_authority_granted !== false) {
    throw new Error("mutation_authority_claim_rejected");
  }

  const methods = document.authority?.granted_http_methods;
  if (!Array.isArray(methods) || methods.length === 0) {
    throw new Error("granted_http_methods_missing");
  }
  for (const method of methods) {
    if (!SAFE_METHODS.has(method)) {
      throw new Error(`unsafe_granted_method_${method}`);
    }
  }

  const entrypoints = document.entrypoints;
  if (!entrypoints || typeof entrypoints !== "object" || Array.isArray(entrypoints)) {
    throw new Error("entrypoints_missing");
  }
  for (const [name, path] of Object.entries(entrypoints)) {
    sameOriginPath(base, path, `entrypoint_${name}`);
  }

  if (document.safety?.same_origin_only !== true) {
    throw new Error("same_origin_wall_missing");
  }
  if (document.safety?.follow_cross_origin_links_automatically !== false) {
    throw new Error("cross_origin_follow_must_be_false");
  }
  if (document.safety?.send_secrets !== false) {
    throw new Error("secret_send_must_be_false");
  }
  if (document.safety?.send_wallet_material !== false) {
    throw new Error("wallet_send_must_be_false");
  }
  if (document.safety?.send_operator_keys !== false) {
    throw new Error("operator_key_send_must_be_false");
  }
  if (document.safety?.treat_unknown_capability_as !== "not_granted") {
    throw new Error("unknown_capability_default_must_be_not_granted");
  }

  return document;
}

async function getJson(url, label) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "error",
    headers: {
      accept: "application/json",
      "user-agent": "void-ai-agent-discovery-client-v1",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${label}_http_${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    throw new Error(`${label}_content_type_not_json`);
  }
  return response.json();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return;

  try {
    const base = normalizeBase(args.base);
    const discoveryUrl = sameOriginPath(base, DISCOVERY_PATH, "discovery");
    const discovery = validateDiscovery(
      base,
      await getJson(discoveryUrl, "discovery"),
    );

    const output = {
      ok: true,
      marker: "VOID_AI_AGENT_DISCOVERY_CLIENT_V1",
      base_origin: base.origin,
      discovery_url: discoveryUrl.href,
      network: discovery.network,
      authority: discovery.authority,
      capabilities: discovery.capabilities,
      probe: null,
    };

    if (args.probe) {
      output.probe = {};
      for (const name of ["node_identity", "public_index", "readiness"]) {
        const path = discovery.entrypoints[name];
        const url = sameOriginPath(base, path, `probe_${name}`);
        try {
          const body = await getJson(url, `probe_${name}`);
          output.probe[name] = { ok: true, url: url.href, body };
        } catch (error) {
          output.probe[name] = {
            ok: false,
            url: url.href,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }

    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  } catch (error) {
    fail(
      "discovery_rejected",
      error instanceof Error ? error.message : String(error),
    );
  }
}

await main();
