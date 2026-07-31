#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = resolve(ROOT, "tools/void-tor-capability-parity-v1.mjs");
const CONTRACT = resolve(ROOT, "config/void-tor-capability-parity-v1.json");
const SCHEMA = resolve(ROOT, "schemas/void-tor-capability-parity-v1.schema.json");
const VALIDATOR = resolve(ROOT, "scripts/validate_void_tor_capability_parity_v1.py");
const MARKER = "VOID_TOR_CAPABILITY_PARITY_V1";

function runTool(format = "compact") {
  return execFileSync(process.execPath, [TOOL, "--format", format], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
}

try {
  const schemaValidation = execFileSync("python3", [VALIDATOR], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.match(
    schemaValidation,
    /^VOID_TOR_CAPABILITY_PARITY_V1_SCHEMA_GREEN\n/m,
    "contract must validate against the checked-in schema",
  );

  const compactA = runTool();
  const compactB = runTool();
  assert.equal(compactA, compactB, "compact output must be deterministic");

  const report = JSON.parse(compactA);
  const contractFile = JSON.parse(readFileSync(CONTRACT, "utf8"));
  JSON.parse(readFileSync(SCHEMA, "utf8"));

  assert.equal(report.marker, MARKER);
  assert.equal(report.status, "SOURCE_POLICY_GREEN");
  assert.deepEqual(report.contract, contractFile);
  assert.equal(report.summary.live_runtime_claimed, false);
  assert.equal(report.summary.runtime_mutation, false);
  assert.equal(report.summary.service_restart, false);
  assert.equal(report.summary.wallet_or_signer_access, false);
  assert.equal(report.summary.work_credit_write, false);
  assert.equal(report.summary.void_settlement, false);
  assert.equal(report.summary.capability_count, 16);
  assert.equal(report.summary.policy_required_count, 11);
  assert.equal(report.summary.separate_review_count, 2);
  assert.equal(report.summary.forbidden_count, 3);
  assert.equal(report.summary.implemented_count, 3);
  assert.equal(report.summary.stage_2_gap_count, 8);

  const byId = new Map(report.contract.capabilities.map((entry) => [entry.id, entry]));
  assert.equal(byId.get("agent.mcp_readonly")?.source_status, "implemented");
  assert.equal(
    byId.get("agent.authenticated_paid_work_submission")?.source_status,
    "guarded_disabled",
  );
  assert.equal(
    byId.get("commerce.public_quote_contract")?.source_status,
    "not_mapped",
  );
  assert.equal(
    byId.get("commerce.deterministic_quote_retrieval")?.source_status,
    "local_tool_only",
  );
  assert.equal(
    byId.get("commerce.order_status_retrieval")?.source_status,
    "not_mapped",
  );
  assert.equal(byId.get("network.p2p_over_tor")?.tor_policy, "separate_review");

  for (const id of [
    "wallet.direct_signer_access",
    "operator.direct_control",
    "transport.generic_reverse_proxy",
  ]) {
    const capability = byId.get(id);
    assert.ok(capability, `missing forbidden capability ${id}`);
    assert.equal(capability.tor_policy, "forbidden");
    assert.equal(capability.source_status, "forbidden");
    assert.equal(capability.target_stage, null);
    assert.equal(capability.direct_surface, false);
  }

  for (const capability of report.contract.capabilities) {
    for (const relative of capability.evidence_files) {
      assert.ok(existsSync(resolve(ROOT, relative)), `evidence file missing: ${relative}`);
    }
  }

  const pretty = runTool("pretty");
  assert.deepEqual(JSON.parse(pretty), report, "pretty and compact output must agree");

  const toolSource = readFileSync(TOOL, "utf8");
  for (const token of [
    "systemctl",
    "sudo",
    "apt-get",
    "fetch(",
    "http.request",
    "https.request",
    "net.connect",
    "child_process.spawn",
  ]) {
    assert.equal(toolSource.includes(token), false, `tool must not contain runtime token: ${token}`);
  }

  process.stdout.write(
    [
      "VOID_TOR_CAPABILITY_PARITY_V1_PROOF_GREEN",
      `marker=${MARKER}`,
      `capability_count=${report.summary.capability_count}`,
      `implemented_count=${report.summary.implemented_count}`,
      `stage_2_gap_count=${report.summary.stage_2_gap_count}`,
      "source_policy_only=true",
      "live_runtime_claimed=false",
      "runtime_mutation=false",
      "service_restart=false",
      "wallet_or_signer_access=false",
      "work_credit_write=false",
      "void_settlement=false",
      "",
    ].join("\n"),
  );
} catch (error) {
  process.stderr.write("VOID_TOR_CAPABILITY_PARITY_V1_PROOF_FAIL\n");
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
}
