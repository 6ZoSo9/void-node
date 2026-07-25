#!/usr/bin/env node
import process from "node:process";

const MARKER = "VOID_AI_AGENT_FIRST_CONTACT_CLIENT_V1";
const DEFAULT_BASE_URL = "http://127.0.0.1:4100";
const DEFAULT_MANIFEST_PATH = "/public-node/agents/first-contact-v1.json";
const DEFAULT_TIMEOUT_MS = 8000;

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
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("base URL must use http or https");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function joinUrl(baseUrl, path) {
  if (typeof path !== "string" || !path.startsWith("/")) {
    throw new Error(`invalid public path: ${String(path)}`);
  }
  return new URL(path, `${baseUrl}/`).toString();
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
    const text = await response.text();
    let body = null;
    let parseError = null;
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch (error) {
        parseError = String(error?.message ?? error);
      }
    }
    return {
      ok: response.ok && body !== null && parseError === null,
      status: response.status,
      content_type: response.headers.get("content-type"),
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

function normalizedText(value) {
  return JSON.stringify(value ?? null).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function bindingConsistent(manifest, discovery, authenticity) {
  const expectedName = String(manifest?.network?.name ?? "");
  const expectedChainId = Number(manifest?.network?.chain_id);
  const combined = normalizedText({
    discovery: discovery?.body,
    authenticity: authenticity?.body,
  });
  const nameMatch =
    expectedName.toLowerCase().includes("void") &&
    combined.includes("void") &&
    combined.includes("mainnet0");
  const chainMatch =
    Number.isInteger(expectedChainId) &&
    combined.includes(String(expectedChainId));
  return nameMatch && chainMatch;
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

function nextActions(manifest, checks, commercial) {
  const actions = [];
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

  const [discovery, authenticity, authentication, capabilities, intake] =
    await Promise.all([
      fetchEntry("well_known_discovery"),
      fetchEntry("official_authenticity"),
      fetchEntry("authentication"),
      fetchEntry("capabilities"),
      fetchEntry("agent_intake"),
    ]);

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
    authentication_contract_found: authentication.ok,
    capabilities_loaded: capabilities.ok,
    agent_intake_reachable: intake.ok,
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
  ].every(Boolean);

  const commercial = observedCommercialSignals(capabilities);
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
    next_actions:
      firstContact.ok
        ? nextActions(manifest, checks, commercial)
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
