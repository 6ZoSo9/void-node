#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const MARKER = "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1_PROOF_GREEN";
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-directory-v1.mjs");

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [TOOL, ...args], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", rejectRun);
    child.on("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

const fixtureDir = mkdtempSync(join(tmpdir(), "void-wc-directory-"));
const fixtureTool = join(fixtureDir, "fixture-discovery.mjs");
const inputFile = join(fixtureDir, "nodes.txt");

writeFileSync(fixtureTool, `#!/usr/bin/env node
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    base: { type: "string" },
    "timeout-ms": { type: "string" },
    "expected-award-wc": { type: "string" },
  },
  strict: true,
});

const host = new URL(values.base).hostname;

const common = {
  marker: "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1",
  status: "green",
  participant: { node_required: false },
  public_claim: {
    configured: true,
    enabled: true,
    path: "/wc/public-earning-pilot-v1/claim-ticket",
  },
  pilot: {
    marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1",
    coordinator_enabled: true,
    executor_enabled: false,
    fixed_award_wc: 3,
    fixed_award_matches: true,
  },
  safety: {
    read_only: true,
    http_methods_used: ["GET"],
    public_routes_award_wc: false,
    public_award_boundary_confirmed: true,
    public_award_boundary_safe: true,
    mutation_attempted: false,
    ticket_issuance_attempted: false,
    receipt_submission_attempted: false,
    wc_award_attempted: false,
    wallet_access_attempted: false,
    settlement_attempted: false,
  },
};

let body;
let code = 0;

if (host === "available.example") {
  body = {
    ...common,
    opportunity_state: "available",
    reason: "bounded_public_earning_opportunity_available",
    source_path: "/wc/public-earning-pilot-v1/status",
  };
} else if (host === "hold.example") {
  body = {
    ...common,
    opportunity_state: "hold",
    reason: "coordinator_not_enabled",
    pilot: { ...common.pilot, coordinator_enabled: false },
  };
} else if (host === "unknown.example") {
  body = {
    ...common,
    opportunity_state: "hold",
    reason: "public_award_boundary_unconfirmed",
    safety: {
      ...common.safety,
      public_routes_award_wc: null,
      public_award_boundary_confirmed: false,
      public_award_boundary_safe: false,
    },
  };
} else if (host === "unsafe.example") {
  body = {
    ...common,
    opportunity_state: "available",
    reason: "should_be_rejected",
    safety: { ...common.safety, mutation_attempted: true },
  };
} else {
  body = {
    ...common,
    status: "hold",
    opportunity_state: "unavailable",
    reason: "compatible public earning gateway not discovered",
  };
  code = 2;
}

process.stdout.write(JSON.stringify(body));
process.exitCode = code;
`, { mode: 0o755 });

writeFileSync(inputFile, [
  "# directory fixture",
  "https://hold.example",
  "https://unknown.example",
  "https://offline.example",
].join("\n") + "\n");

try {
  const mixed = await run([
    "--base", "https://available.example",
    "--base", "https://available.example",
    "--base", "https://unsafe.example",
    "--input", inputFile,
    "--concurrency", "2",
    "--discovery-tool", fixtureTool,
    "--require-available",
  ]);

  assert.equal(mixed.code, 0, mixed.stderr || mixed.stdout);
  const body = JSON.parse(mixed.stdout);
  assert.equal(body.marker, "VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_V1");
  assert.equal(body.status, "green");
  assert.equal(body.directory_state, "available");
  assert.equal(body.query.requested_entries, 6);
  assert.equal(body.query.unique_origins, 5);
  assert.equal(body.summary.total, 5);
  assert.equal(body.summary.available, 1);
  assert.equal(body.summary.hold, 2);
  assert.equal(body.summary.unavailable, 2);
  assert.equal(body.summary.invalid_result, 1);
  assert.deepEqual(body.summary.observed_fixed_awards_wc, [3]);
  assert.equal(body.summary.award_policy_consistent, true);
  assert.equal(body.participant.node_required, false);
  assert.equal(body.safety.read_only, true);
  assert.equal(body.safety.child_results_safety_validated, true);
  assert.equal(body.safety.mutation_attempted, false);
  assert.equal(body.safety.ticket_issuance_attempted, false);
  assert.equal(body.safety.wc_award_attempted, false);

  const available = body.results.find(
    (entry) => entry.base === "https://available.example",
  );
  assert.equal(available.state, "available");
  assert.equal(available.trusted, true);
  assert.equal(available.safety.public_award_boundary_confirmed, true);

  const unknown = body.results.find(
    (entry) => entry.base === "https://unknown.example",
  );
  assert.equal(unknown.state, "hold");
  assert.equal(unknown.trusted, true);
  assert.equal(unknown.safety.public_award_boundary_confirmed, false);

  const unsafe = body.results.find(
    (entry) => entry.base === "https://unsafe.example",
  );
  assert.equal(unsafe.state, "unavailable");
  assert.equal(unsafe.trusted, false);
  assert.equal(unsafe.reason, "discovery_safety_contract_failed");

  const holdOnly = await run([
    "--base", "https://hold.example",
    "--base", "https://unknown.example",
    "--discovery-tool", fixtureTool,
    "--require-available",
  ]);
  assert.equal(holdOnly.code, 2);
  const holdBody = JSON.parse(holdOnly.stdout);
  assert.equal(holdBody.directory_state, "hold");
  assert.equal(holdBody.summary.available, 0);
  assert.equal(holdBody.summary.hold, 2);

  const invalid = await run([
    "--base", "ftp://invalid.example",
    "--discovery-tool", fixtureTool,
  ]);
  assert.equal(invalid.code, 2);
  const invalidBody = JSON.parse(invalid.stdout);
  assert.equal(invalidBody.directory_state, "unavailable");
  assert.equal(invalidBody.safety.mutation_attempted, false);
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

console.log(MARKER);
