#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isIP } from "node:net";
import { parseArgs } from "node:util";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_HANDOFF_V1";
const DIRECTORY_MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1";
const DISCOVERY_MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1";
const MAX_HEALTH_RESPONSE_BYTES = 64 * 1024;
const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_CLIENT = resolve(HERE, "void_public_earn_no_node_client_v1.mjs");

function hold(reason, extra = {}) {
  process.stdout.write(JSON.stringify({
    marker: MARKER,
    status: "hold",
    handoff_state: "hold",
    reason,
    ...extra,
    safety: {
      read_only: true,
      health_method: "GET",
      health_response_max_bytes: MAX_HEALTH_RESPONSE_BYTES,
      client_executed: false,
      identity_created: false,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  }, null, 2) + "\n");
  process.exitCode = 2;
}

function validAccount(value) {
  return typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/u.test(value);
}

function validNodeId(value) {
  return typeof value === "string" && /^[0-9a-f]{32}$/u.test(value);
}

function privateHttpHost(hostname) {
  const rawHost = String(hostname || "").trim().toLowerCase();
  const host = rawHost.startsWith("[") && rawHost.endsWith("]")
    ? rawHost.slice(1, -1)
    : rawHost;
  if (host === "localhost" || host === "::1") return true;
  if (host.endsWith(".ts.net")) return true;
  if (isIP(host) !== 4) return false;
  const [a,b] = host.split(".").map(Number);
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

function normalizeOrigin(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error(`invalid coordinator origin: ${raw}`); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("coordinator origin must use HTTP or HTTPS");
  if (url.username || url.password) throw new Error("coordinator origin must not contain credentials");
  if (url.pathname !== "/" || url.search || url.hash) throw new Error("coordinator origin must not contain path, query, or fragment");
  if (url.protocol === "http:" && !privateHttpHost(url.hostname)) {
    throw new Error("plain HTTP is allowed only for loopback, private, CGNAT, or .ts.net origins");
  }
  return url.origin;
}

function readDirectory(path) {
  const text = path === "-" ? readFileSync(0, "utf8") : readFileSync(resolve(path), "utf8");
  return JSON.parse(text);
}

function validateDirectory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("directory result must be a JSON object");
  if (value.marker !== DIRECTORY_MARKER) throw new Error("directory marker mismatch");
  if (value.status !== "green") throw new Error("directory status is not green");
  if (!Array.isArray(value.results)) throw new Error("directory results array missing");
  const s = value.safety || {};
  const safe = s.read_only === true && s.composed_discovery_marker === DISCOVERY_MARKER &&
    s.child_results_safety_validated === true && s.mutation_attempted === false &&
    s.ticket_issuance_attempted === false && s.receipt_submission_attempted === false &&
    s.wc_award_attempted === false && s.wallet_access_attempted === false &&
    s.settlement_attempted === false;
  if (!safe) throw new Error("directory safety contract failed");
  return value;
}

function candidates(directory) {
  return directory.results.filter((r) => r && r.state === "available" && r.trusted === true &&
    r.pilot?.coordinator_enabled === true && r.pilot?.fixed_award_matches === true &&
    r.public_claim?.configured === true && r.public_claim?.enabled === true &&
    r.safety?.read_only === true && r.safety?.get_only === true &&
    r.safety?.public_award_boundary_confirmed === true && r.safety?.mutation_attempted === false)
    .map((r) => ({
      base: normalizeOrigin(r.base),
      source_path: typeof r.source_path === "string" ? r.source_path : null,
      fixed_award_wc: Number.isFinite(Number(r.pilot?.fixed_award_wc)) ? Number(r.pilot.fixed_award_wc) : null,
      claim_path: typeof r.public_claim?.path === "string" ? r.public_claim.path : null,
    }))
    .sort((a,b) => a.base.localeCompare(b.base));
}

async function cancelResponseBody(response, reason) {
  if (!response.body || typeof response.body.cancel !== "function") return;
  try {
    await response.body.cancel(reason);
  } catch (cleanupError) {
    void cleanupError;
  }
}

async function readBoundedHealthText(response) {
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/u.test(declared)) {
      await cancelResponseBody(response, "coordinator health content-length is invalid");
      throw new Error("coordinator health content-length is invalid");
    }
    if (BigInt(declared) > BigInt(MAX_HEALTH_RESPONSE_BYTES)) {
      await cancelResponseBody(response, "coordinator health response exceeds byte limit");
      throw new Error("coordinator health response exceeds byte limit");
    }
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    throw new Error("coordinator health response body is not stream-readable");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new Error("coordinator health response chunk is invalid");
      total += value.byteLength;
      if (total > MAX_HEALTH_RESPONSE_BYTES) {
        try {
          await reader.cancel("coordinator health response exceeds byte limit");
        } catch (cleanupError) {
          void cleanupError;
        }
        throw new Error("coordinator health response exceeds byte limit");
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch (cleanupError) {
      void cleanupError;
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new Error("coordinator health returned invalid UTF-8", { cause: error });
  }
}

async function health(base, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(new URL("/health", base), {
      method: "GET",
      headers: { accept: "application/json", "user-agent": "void-wc-public-opportunity-handoff-v1" },
      redirect: "error",
      signal: controller.signal,
    });
    const text = await readBoundedHealthText(response);
    let body;
    try { body = JSON.parse(text); } catch { throw new Error("coordinator health returned non-JSON"); }
    if (!response.ok) throw new Error(`coordinator health HTTP ${response.status}`);
    if (body?.ok !== true || !validNodeId(body?.nodeId)) throw new Error("coordinator health identity is invalid");
    return { path: "/health", http_status: response.status, node_id: body.nodeId };
  } finally { clearTimeout(timer); }
}

function shellQuote(value) {
  return /^[A-Za-z0-9_./:@%+=,-]+$/u.test(value) ? value : `'${value.replaceAll("'", `'\"'\"'`)}'`;
}
function record(argv) { return { argv, shell: argv.map(shellQuote).join(" ") }; }

async function main() {
  const { values } = parseArgs({
    options: {
      "directory-json": { type: "string" },
      account: { type: "string" },
      "select-base": { type: "string" },
      "health-timeout-ms": { type: "string", default: "5000" },
      "client-tool": { type: "string", default: DEFAULT_CLIENT },
      "state-dir": { type: "string" },
      "dataset-url-template": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
    strict: true,
  });
  if (values.help) {
    process.stdout.write("Usage: node tools/wc-public-opportunity-handoff-v1.mjs --directory-json directory.json --account ACCOUNT [--select-base HTTPS_ORIGIN]\n");
    return;
  }
  if (!values["directory-json"]) throw new Error("--directory-json is required");
  if (!validAccount(values.account)) throw new Error("--account must match [A-Za-z0-9._:-]{1,128}");
  const timeoutMs = Number(values["health-timeout-ms"]);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 250 || timeoutMs > 30000) throw new Error("--health-timeout-ms must be an integer between 250 and 30000");
  const client = resolve(values["client-tool"]);
  if (!existsSync(client)) throw new Error(`no-node client not found: ${values["client-tool"]}`);
  if (values["dataset-url-template"]) {
    const t = values["dataset-url-template"];
    if (!t.includes("{dataset_id}")) throw new Error("--dataset-url-template must contain {dataset_id}");
    let u; try { u = new URL(t.replace("{dataset_id}", "fixture")); } catch { throw new Error("--dataset-url-template is invalid"); }
    if (u.protocol !== "https:" || u.username || u.password) throw new Error("--dataset-url-template must be credential-free HTTPS");
  }
  const directory = validateDirectory(readDirectory(values["directory-json"]));
  const available = candidates(directory);
  if (available.length === 0) return hold("no_trusted_available_coordinator", { available_candidate_count: 0 });
  let selected;
  if (values["select-base"]) {
    const requested = normalizeOrigin(values["select-base"]);
    selected = available.find((c) => c.base === requested);
    if (!selected) return hold("selected_base_is_not_a_trusted_available_coordinator", { requested_base: requested, available_bases: available.map((c) => c.base) });
  } else if (available.length === 1) {
    [selected] = available;
  } else {
    return hold("multiple_available_coordinators_require_select_base", { available_candidate_count: available.length, available_bases: available.map((c) => c.base) });
  }
  const h = await health(selected.base, timeoutMs);
  const common = ["node", client];
  const statusArgv = [...common, "status", "--account", values.account, "--coordinator-base", selected.base, "--coordinator-node-id", h.node_id];
  const runArgv = [...common, "run", "--account", values.account, "--coordinator-base", selected.base, "--coordinator-node-id", h.node_id];
  if (values["state-dir"]) { statusArgv.push("--state-dir", values["state-dir"]); runArgv.push("--state-dir", values["state-dir"]); }
  if (values["dataset-url-template"]) runArgv.push("--dataset-url-template", values["dataset-url-template"]);
  process.stdout.write(JSON.stringify({
    marker: MARKER,
    status: "green",
    handoff_state: "ready",
    reason: "trusted_available_coordinator_bound_to_health_identity",
    account: values.account,
    selected,
    coordinator_identity: { health_path: h.path, health_http_status: h.http_status, node_id: h.node_id, node_id_format: "32_lowercase_hex" },
    commands: { status: record(statusArgv), run: record(runArgv) },
    safety: {
      read_only: true,
      health_method: "GET",
      health_response_max_bytes: MAX_HEALTH_RESPONSE_BYTES,
      directory_marker_validated: true,
      directory_safety_validated: true,
      selected_child_safety_validated: true,
      client_executed: false,
      identity_created: false,
      mutation_attempted: false,
      ticket_issuance_attempted: false,
      receipt_submission_attempted: false,
      wc_award_attempted: false,
      wallet_access_attempted: false,
      settlement_attempted: false,
    },
  }, null, 2) + "\n");
}
main().catch((error) => hold(error instanceof Error ? error.message : "unexpected error"));
