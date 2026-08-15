#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOOL = resolve(ROOT, "tools/wc-public-opportunity-directory-v1.mjs");
const fixtureDir = mkdtempSync(join(tmpdir(), "void-wc-directory-types-"));
const fixtureTool = join(fixtureDir, "fixture-discovery.mjs");

function run(args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [TOOL, ...args], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", rejectRun);
    child.once("close", (code) => resolveRun({ code, stdout, stderr }));
  });
}

writeFileSync(fixtureTool, `#!/usr/bin/env node
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: { base: { type: "string" }, "timeout-ms": { type: "string" }, "expected-award-wc": { type: "string" } }, strict: true });
const host = new URL(values.base).hostname;
const award = host === "number.example" ? 3 : host === "string.example" ? "3" : host === "boolean.example" ? true : null;
process.stdout.write(JSON.stringify({
  marker: "VOID_WC_PUBLIC_OPPORTUNITY_DISCOVERY_V1",
  status: "green",
  opportunity_state: "available",
  reason: "bounded_public_earning_opportunity_available",
  source_path: "/wc/public-earning-pilot-v1/status",
  pilot: { marker: "VOID_WC_PUBLIC_EARNING_PILOT_V1", coordinator_enabled: true, executor_enabled: false, fixed_award_wc: award, fixed_award_matches: true },
  public_claim: { configured: true, enabled: true, path: "/wc/public-earning-pilot-v1/claim-ticket" },
  safety: { read_only: true, http_methods_used: ["GET"], public_routes_award_wc: false, public_award_boundary_confirmed: true, public_award_boundary_safe: true, mutation_attempted: false, ticket_issuance_attempted: false, receipt_submission_attempted: false, wc_award_attempted: false, wallet_access_attempted: false, settlement_attempted: false }
}));
`, { mode: 0o755 });

try {
  const good = await run(["--base", "https://number.example", "--discovery-tool", fixtureTool, "--require-available"]);
  assert.equal(good.code, 0, good.stderr || good.stdout);
  const goodBody = JSON.parse(good.stdout);
  assert.equal(goodBody.directory_state, "available");
  assert.equal(goodBody.results[0].trusted, true);
  assert.equal(goodBody.results[0].pilot.fixed_award_wc, 3);
  assert.equal(goodBody.results[0].pilot.fixed_award_matches, true);

  for (const host of ["string.example", "boolean.example", "null.example"]) {
    const result = await run(["--base", `https://${host}`, "--discovery-tool", fixtureTool, "--require-available"]);
    assert.equal(result.code, 2, `${host}: ${result.stderr || result.stdout}`);
    const body = JSON.parse(result.stdout);
    assert.equal(body.directory_state, "unavailable", host);
    assert.equal(body.summary.invalid_result, 1, host);
    assert.equal(body.results[0].trusted, false, host);
    assert.equal(body.results[0].pilot.fixed_award_wc, null, host);
    assert.equal(body.results[0].pilot.fixed_award_matches, false, host);
    assert.equal(body.results[0].reason, "available_result_contract_failed", host);
    assert.equal(body.safety.mutation_attempted, false, host);
    assert.equal(body.safety.ticket_issuance_attempted, false, host);
    assert.equal(body.safety.wc_award_attempted, false, host);
  }
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

console.log("VOID_WC_PUBLIC_OPPORTUNITY_DIRECTORY_EVIDENCE_TYPES_V1_PROOF_GREEN");
