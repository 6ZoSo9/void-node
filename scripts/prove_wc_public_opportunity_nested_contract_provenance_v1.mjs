#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const discoveryTool = path.join(repoRoot, "tools", "wc-public-opportunity-discovery-v1.mjs");
const testPath = "/public/earn/status-v1";
const canonicalClaimRoute = "/wc/public-earning-pilot-v1/claim-ticket";

function safety() {
  return {
    public_ticket_issue: true,
    public_signed_ticket_claim: true,
    claim_server_selected_work: true,
    participant_selected_award: false,
    submission_response_canonical_accounting: true,
  };
}

function publicClaim({
  route = canonicalClaimRoute,
  includeRoute = true,
  enabled = true,
  includeEnabled = true,
  award = 3,
  includeAward = true,
  extra = {},
} = {}) {
  return {
    ...(includeEnabled ? { enabled } : {}),
    method: "POST",
    ...(includeRoute ? { public_route: route } : {}),
    ...(includeAward ? { fixed_award_wc: award } : {}),
    server_selected_work: true,
    participant_selected_award: false,
    ...extra,
  };
}

function pilot() {
  return {
    marker: PILOT_MARKER,
    coordinator_enabled: true,
    coordinator_ready: true,
    executor_enabled: false,
    fixed_award_wc: 3,
  };
}

function gateway(claim = publicClaim()) {
  return {
    marker: "VOID_PUBLIC_EARN_GATEWAY_V1",
    pilot_status: pilot(),
    public_claim: claim,
    safety: safety(),
  };
}

function topLevelPilot(claim = publicClaim()) {
  return {
    ...pilot(),
    public_claim: claim,
    safety: safety(),
  };
}

function runDiscovery(origin) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      discoveryTool,
      "--base",
      origin,
      "--path",
      testPath,
      "--require-available",
    ], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (signal) return reject(new Error(`discovery terminated by ${signal}: ${stderr}`));
      let result;
      try { result = JSON.parse(stdout); }
      catch (error) { return reject(new Error(`discovery emitted invalid JSON: ${stdout}\n${stderr}\n${error}`)); }
      resolve({ code, result, stderr });
    });
  });
}

let payload = null;
let observedMethods = [];
const server = http.createServer((request, response) => {
  observedMethods.push(request.method ?? null);
  response.setHeader("content-type", "application/json; charset=utf-8");
  if (request.url === testPath) {
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return;
  }
  response.statusCode = 404;
  response.end(JSON.stringify({ marker: "VOID_TEST_NOT_FOUND_V1" }));
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", resolve);
});

try {
  const address = server.address();
  assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;

  async function runCase(nextPayload) {
    payload = nextPayload;
    observedMethods = [];
    const outcome = await runDiscovery(origin);
    assert.deepEqual(new Set(observedMethods), new Set(["GET"]));
    assert.equal(outcome.result.safety?.mutation_attempted, false);
    assert.equal(outcome.result.safety?.ticket_issuance_attempted, false);
    assert.equal(outcome.result.safety?.wc_award_attempted, false);
    return outcome;
  }

  let outcome = await runCase(gateway());
  assert.equal(outcome.code, 0);
  assert.equal(outcome.result.opportunity_state, "available");
  assert.equal(outcome.result.public_claim.configured, true);
  assert.equal(outcome.result.public_claim.enabled, true);
  assert.equal(outcome.result.public_claim.path, canonicalClaimRoute);

  outcome = await runCase(topLevelPilot());
  assert.equal(outcome.code, 0);
  assert.equal(outcome.result.opportunity_state, "available");
  assert.equal(outcome.result.public_claim.configured, true);
  assert.equal(outcome.result.public_claim.enabled, true);
  assert.equal(outcome.result.public_claim.path, canonicalClaimRoute);

  for (const [label, claim] of [
    ["missing_claim_award", publicClaim({ includeAward: false })],
    ["null_claim_award", publicClaim({ award: null })],
    ["string_claim_award", publicClaim({ award: "3" })],
    ["boolean_claim_award", publicClaim({ award: true })],
    ["fractional_claim_award", publicClaim({ award: 3.5 })],
    ["wrong_claim_award", publicClaim({ award: 4 })],
    ["unsafe_claim_award", publicClaim({ award: Number.MAX_SAFE_INTEGER + 1 })],
  ]) {
    for (const [envelopeLabel, envelope] of [
      ["gateway", gateway],
      ["top_level_pilot", topLevelPilot],
    ]) {
      outcome = await runCase(envelope(claim));
      assert.equal(outcome.code, 2, `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.opportunity_state, "hold", `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.pilot.fixed_award_wc, null, `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.pilot.fixed_award_matches, false, `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.public_claim.configured, true, `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.public_claim.enabled, true, `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.public_claim.path, canonicalClaimRoute, `${envelopeLabel}:${label}`);
      assert.match(outcome.result.reason, /fixed_award_evidence_missing_or_conflicting/u, `${envelopeLabel}:${label}`);
    }
  }

  for (const [label, claim] of [
    ["missing_enabled", publicClaim({ includeEnabled: false })],
    ["null_enabled", publicClaim({ enabled: null })],
    ["string_enabled", publicClaim({ enabled: "true" })],
    ["false_enabled", publicClaim({ enabled: false })],
    ["legacy_available_alias_only", publicClaim({
      includeEnabled: false,
      extra: { available: true },
    })],
  ]) {
    for (const [envelopeLabel, envelope] of [
      ["gateway", gateway],
      ["top_level_pilot", topLevelPilot],
    ]) {
      outcome = await runCase(envelope(claim));
      assert.equal(outcome.code, 2, `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.opportunity_state, "hold", `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.public_claim.configured, true, `${envelopeLabel}:${label}`);
      assert.notEqual(outcome.result.public_claim.enabled, true, `${envelopeLabel}:${label}`);
      assert.equal(outcome.result.public_claim.path, canonicalClaimRoute, `${envelopeLabel}:${label}`);
      assert.match(outcome.result.reason, /public_claim_not_enabled/u, `${envelopeLabel}:${label}`);
    }
  }

  for (const [label, claim] of [
    ["missing_route", publicClaim({ includeRoute: false })],
    ["foreign_route", publicClaim({ route: "https://example.invalid/wc/public-earning-pilot-v1/claim-ticket" })],
    ["malformed_route", publicClaim({ route: "http://[::1" })],
    ["non_claim_route", publicClaim({ route: "/public/earn/status-v1" })],
    ["legacy_path_alias_only", publicClaim({ includeRoute: false, extra: { path: canonicalClaimRoute } })],
    ["nested_route_substitution", publicClaim({
      includeRoute: false,
      extra: { metadata: { ticket_url: canonicalClaimRoute } },
    })],
    ["invalid_top_level_with_nested_route", publicClaim({
      route: "/public/earn/status-v1",
      extra: { metadata: { ticket_url: canonicalClaimRoute } },
    })],
    ["absolute_same_origin_alias", publicClaim({ route: `${origin}${canonicalClaimRoute}` })],
    ["credential_absolute_route", publicClaim({
      route: `http://user:pass@127.0.0.1:${address.port}${canonicalClaimRoute}`,
    })],
    ["query_alias", publicClaim({ route: `${canonicalClaimRoute}?source=metadata` })],
    ["fragment_alias", publicClaim({ route: `${canonicalClaimRoute}#claim` })],
    ["normalized_dot_segment_alias", publicClaim({
      route: "/wc/public-earning-pilot-v1/../public-earning-pilot-v1/claim-ticket",
    })],
  ]) {
    outcome = await runCase(topLevelPilot(claim));
    assert.equal(outcome.code, 2, label);
    assert.equal(outcome.result.opportunity_state, "hold", label);
    assert.equal(outcome.result.public_claim.configured, false, label);
    assert.equal(outcome.result.public_claim.path, null, label);
    assert.match(outcome.result.reason, /public_claim_not_discovered/u, label);
  }

  outcome = await runCase({
    marker: "VOID_UNRELATED_ENVELOPE_V1",
    metadata: { published: gateway() },
  });
  assert.equal(outcome.code, 2);
  assert.notEqual(outcome.result.opportunity_state, "available");

  outcome = await runCase({
    marker: "VOID_UNRELATED_ENVELOPE_V1",
    metadata: { published: topLevelPilot() },
  });
  assert.equal(outcome.code, 2);
  assert.notEqual(outcome.result.opportunity_state, "available");

  outcome = await runCase({
    marker: "VOID_UNRELATED_ENVELOPE_V1",
    pilot_status: pilot(),
    public_claim: publicClaim(),
    safety: safety(),
  });
  assert.equal(outcome.code, 2);
  assert.notEqual(outcome.result.opportunity_state, "available");

  process.stdout.write("wc-public-opportunity nested contract provenance proof passed\n");
} finally {
  await new Promise((resolve) => server.close(resolve));
}
