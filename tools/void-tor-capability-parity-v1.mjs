#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = resolve(ROOT, "config/void-tor-capability-parity-v1.json");
const MARKER = "VOID_TOR_CAPABILITY_PARITY_V1";

function fail(message) {
  process.stderr.write(`${MARKER}_FAIL\n${message}\n`);
  process.exit(2);
}

function parseArgs(argv) {
  const result = { format: "compact", output: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--format") {
      index += 1;
      if (index >= argv.length) fail("--format requires a value");
      result.format = argv[index];
    } else if (argument === "--output") {
      index += 1;
      if (index >= argv.length) fail("--output requires a value");
      result.output = argv[index];
    } else if (argument === "--help" || argument === "-h") {
      process.stdout.write(
        "Usage: node tools/void-tor-capability-parity-v1.mjs [--format compact|pretty] [--output PATH]\n",
      );
      process.exit(0);
    } else {
      fail(`unknown argument: ${argument}`);
    }
  }
  if (!["compact", "pretty"].includes(result.format)) {
    fail("--format must be compact or pretty");
  }
  return result;
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function validateContract(contract) {
  assertPlainObject(contract, "contract");
  if (contract.schema !== "void-tor-capability-parity-v1") {
    throw new Error("schema mismatch");
  }
  if (contract.marker !== MARKER || contract.version !== 1) {
    throw new Error("marker or version mismatch");
  }
  if (contract.status_scope !== "source-policy-not-live-runtime") {
    throw new Error("status_scope must not claim live runtime state");
  }
  assertPlainObject(contract.principles, "principles");
  if (!Array.isArray(contract.stages) || contract.stages.length < 3) {
    throw new Error("at least three stages are required");
  }
  if (!Array.isArray(contract.capabilities) || contract.capabilities.length < 1) {
    throw new Error("capabilities must be non-empty");
  }

  const ids = new Set();
  const stages = new Set(contract.stages.map((entry) => entry.stage));
  for (const capability of contract.capabilities) {
    assertPlainObject(capability, "capability");
    if (!/^[a-z0-9_]+(?:\.[a-z0-9_]+)+$/.test(capability.id)) {
      throw new Error(`invalid capability id: ${capability.id}`);
    }
    if (ids.has(capability.id)) {
      throw new Error(`duplicate capability id: ${capability.id}`);
    }
    ids.add(capability.id);
    if (!["required", "separate_review", "forbidden"].includes(capability.tor_policy)) {
      throw new Error(`invalid tor_policy for ${capability.id}`);
    }
    if (!Array.isArray(capability.evidence_files) || capability.evidence_files.length < 1) {
      throw new Error(`missing evidence_files for ${capability.id}`);
    }
    if (capability.tor_policy === "forbidden") {
      if (capability.source_status !== "forbidden") {
        throw new Error(`forbidden capability must remain forbidden: ${capability.id}`);
      }
      if (capability.target_stage !== null || capability.direct_surface !== false) {
        throw new Error(`forbidden capability cannot have a target stage or direct surface: ${capability.id}`);
      }
    } else if (!stages.has(capability.target_stage)) {
      throw new Error(`capability target stage is not declared: ${capability.id}`);
    }
  }

  const required = new Set([
    "discovery.public_node",
    "identity.signed_node_onion_binding",
    "agent.mcp_readonly",
    "agent.authenticated_paid_work_submission",
    "commerce.public_quote_contract",
    "commerce.deterministic_quote_retrieval",
    "commerce.order_status_retrieval",
    "commerce.signed_receipt_retrieval",
    "datanet.public_dynamic_read",
    "work_credits.bounded_earning_workflow",
    "settlement.void_service_payment",
    "network.p2p_over_tor",
    "tor.verified_capacity_contribution",
    "wallet.direct_signer_access",
    "operator.direct_control",
    "transport.generic_reverse_proxy",
  ]);
  for (const id of required) {
    if (!ids.has(id)) throw new Error(`required capability missing: ${id}`);
  }
  return contract;
}

function summarize(contract) {
  const count = (predicate) => contract.capabilities.filter(predicate).length;
  return {
    capability_count: contract.capabilities.length,
    policy_required_count: count((entry) => entry.tor_policy === "required"),
    separate_review_count: count((entry) => entry.tor_policy === "separate_review"),
    forbidden_count: count((entry) => entry.tor_policy === "forbidden"),
    implemented_count: count((entry) => entry.source_status === "implemented"),
    stage_2_gap_count: count(
      (entry) => entry.target_stage === 2 && entry.source_status !== "implemented",
    ),
    live_runtime_claimed: false,
    runtime_mutation: false,
    service_restart: false,
    wallet_or_signer_access: false,
    work_credit_write: false,
    void_settlement: false,
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const contract = validateContract(JSON.parse(readFileSync(CONTRACT_PATH, "utf8")));
  const payload = {
    schema: "void-tor-capability-parity-report-v1",
    marker: MARKER,
    status: "SOURCE_POLICY_GREEN",
    contract,
    summary: summarize(contract),
  };
  const serialized =
    options.format === "pretty"
      ? `${JSON.stringify(payload, null, 2)}\n`
      : `${JSON.stringify(payload)}\n`;
  if (options.output) {
    writeFileSync(resolve(options.output), serialized, { mode: 0o600 });
  } else {
    process.stdout.write(serialized);
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
