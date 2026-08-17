#!/usr/bin/env node

import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const GATEWAY_MARKER = "VOID_PUBLIC_EARN_GATEWAY_V1";
const PILOT_MARKER = "VOID_WC_PUBLIC_EARNING_PILOT_V1";
const CLAIM_MARKER = "VOID_WC_PUBLIC_TICKET_CLAIM_V1";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const discoveryTool = path.join(repoRoot, "tools", "wc-public-opportunity-discovery-v1.mjs");
const testPath = "/public/earn/status-v1";
const gatewayPath = "/__void/public-earn-gateway-v1/status.json";
const claimRoute = "/wc/public-earning-pilot-v1/claim-ticket";

function safety() {
  return {
    public_ticket_issue: true,
    public_signed_ticket_claim: true,
    claim_executor_key_possession_required: true,
    claim_server_selected_work: true,
    participant_selected_award: false,
    submission_response_canonical_accounting: true,
  };
}

function claim() {
  return {
    marker: CLAIM_MARKER,
    enabled: true,
    method: "POST",
    public_route: claimRoute,
    fixed_award_wc: 3,
    server_selected_work: true,
    proof_of_executor_key_possession_required: true,
    signed_claim_timestamp_required: true,
    claim_nonce_replay_protection: true,
    participant_selected_award: false,
  };
}

function pilot() {
  return {
    marker: PILOT_MARKER,
    gateway_marker: GATEWAY_MARKER,
    coordinator_enabled: true,
    coordinator_ready: true,
    executor_enabled: false,
    fixed_award_wc: 3,
  };
}

function gatewayEnvelope() {
  return {
    marker: GATEWAY_MARKER,
    pilot_status: pilot(),
    public_claim: claim(),
    safety: safety(),
  };
}

function pilotEnvelope() {
  return {
    ...pilot(),
    public_claim: claim(),
    safety: safety(),
  };
}

function gatewayContract() {
  return {
    marker: GATEWAY_MARKER,
    routes: { claim_ticket: claimRoute },
    methods: { claim_ticket: ["POST"] },
    safety: { claim_executor_key_possession_required: true },
  };
}

function runDiscovery(origin) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      discoveryTool,
      "--base", origin,
      "--path", testPath,
      "--require-available",
    ], { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] });
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
  if (request.url === gatewayPath) {
    response.statusCode = 200;
    response.end(JSON.stringify(gatewayContract()));
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

  function assertAvailable(outcome, label) {
    assert.equal(outcome.code, 0, `${label}: ${outcome.stderr || JSON.stringify(outcome.result)}`);
    assert.equal(outcome.result.opportunity_state, "available", label);
    assert.equal(outcome.result.gateway.marker, GATEWAY_MARKER, label);
    assert.equal(outcome.result.gateway.exact_identity, true, label);
    assert.equal(outcome.result.pilot.coordinator_enabled, true, label);
    assert.equal(outcome.result.pilot.executor_enabled, false, label);
    assert.equal(outcome.result.pilot.fixed_award_wc, 3, label);
    assert.equal(outcome.result.public_claim.marker, CLAIM_MARKER, label);
    assert.equal(outcome.result.public_claim.method, "POST", label);
    assert.equal(outcome.result.public_claim.path, claimRoute, label);
    assert.equal(outcome.result.public_claim.proof_of_executor_key_possession_required, true, label);
    assert.equal(outcome.result.public_claim.signed_claim_timestamp_required, true, label);
    assert.equal(outcome.result.public_claim.claim_nonce_replay_protection, true, label);
    assert.equal(outcome.result.safety.claim_executor_key_possession_required, true, label);
    assert.equal(outcome.result.safety.public_claim_authentication_replay_confirmed, true, label);
  }

  function mutate(base, mutation) {
    const value = structuredClone(base);
    mutation(value);
    return value;
  }

  for (const [label, envelope] of [
    ["gateway_happy", gatewayEnvelope()],
    ["pilot_happy", pilotEnvelope()],
  ]) {
    assertAvailable(await runCase(envelope), label);
  }

  for (const [label, mutation] of [
    ["award_missing", (v) => { delete (v.public_claim ?? v).fixed_award_wc; }],
    ["award_null", (v) => { (v.public_claim ?? v).fixed_award_wc = null; }],
    ["award_string", (v) => { (v.public_claim ?? v).fixed_award_wc = "3"; }],
    ["award_boolean", (v) => { (v.public_claim ?? v).fixed_award_wc = true; }],
    ["award_fractional", (v) => { (v.public_claim ?? v).fixed_award_wc = 3.5; }],
    ["award_wrong", (v) => { (v.public_claim ?? v).fixed_award_wc = 4; }],
    ["award_unsafe", (v) => { (v.public_claim ?? v).fixed_award_wc = Number.MAX_SAFE_INTEGER + 1; }],
  ]) {
    for (const [kind, base] of [["gateway", gatewayEnvelope()], ["pilot", pilotEnvelope()]]) {
      const outcome = await runCase(mutate(base, mutation));
      assert.equal(outcome.code, 2, `${kind}:${label}`);
      assert.equal(outcome.result.opportunity_state, "hold", `${kind}:${label}`);
      assert.match(outcome.result.reason, /fixed_award_evidence_missing_or_conflicting/u, `${kind}:${label}`);
    }
  }

  for (const [label, mutation] of [
    ["enabled_missing", (v) => { delete (v.public_claim ?? v).enabled; }],
    ["enabled_null", (v) => { (v.public_claim ?? v).enabled = null; }],
    ["enabled_string", (v) => { (v.public_claim ?? v).enabled = "true"; }],
    ["enabled_false", (v) => { (v.public_claim ?? v).enabled = false; }],
  ]) {
    for (const [kind, base] of [["gateway", gatewayEnvelope()], ["pilot", pilotEnvelope()]]) {
      const outcome = await runCase(mutate(base, mutation));
      assert.equal(outcome.code, 2, `${kind}:${label}`);
      assert.equal(outcome.result.opportunity_state, "hold", `${kind}:${label}`);
      assert.match(outcome.result.reason, /public_claim_not_enabled/u, `${kind}:${label}`);
    }
  }

  for (const [label, route] of [
    ["missing_route", undefined],
    ["foreign_route", "https://example.invalid/wc/public-earning-pilot-v1/claim-ticket"],
    ["noncanonical_route", "/wc/public-earning-pilot-v1/claim-ticket-alt"],
    ["query_alias", `${claimRoute}?source=metadata`],
    ["fragment_alias", `${claimRoute}#claim`],
    ["dot_segment_alias", "/wc/public-earning-pilot-v1/../public-earning-pilot-v1/claim-ticket"],
  ]) {
    const value = pilotEnvelope();
    if (route === undefined) delete value.public_claim.public_route;
    else value.public_claim.public_route = route;
    const outcome = await runCase(value);
    assert.equal(outcome.code, 2, label);
    assert.equal(outcome.result.opportunity_state, "hold", label);
    assert.equal(outcome.result.public_claim.configured, false, label);
    assert.match(outcome.result.reason, /public_claim_not_discovered/u, label);
  }

  for (const [label, mutation, reason] of [
    ["marker_missing", (c) => { delete c.marker; }, /identity_or_method/u],
    ["marker_near_match", (c) => { c.marker = `${CLAIM_MARKER}_ALT`; }, /identity_or_method/u],
    ["marker_wrong_type", (c) => { c.marker = true; }, /identity_or_method/u],
    ["method_get", (c) => { c.method = "GET"; }, /identity_or_method/u],
    ["method_wrong_type", (c) => { c.method = true; }, /identity_or_method/u],
    ["key_missing", (c) => { delete c.proof_of_executor_key_possession_required; }, /authentication_replay/u],
    ["key_false", (c) => { c.proof_of_executor_key_possession_required = false; }, /authentication_replay/u],
    ["key_wrong_type", (c) => { c.proof_of_executor_key_possession_required = "true"; }, /authentication_replay/u],
    ["timestamp_missing", (c) => { delete c.signed_claim_timestamp_required; }, /authentication_replay/u],
    ["timestamp_false", (c) => { c.signed_claim_timestamp_required = false; }, /authentication_replay/u],
    ["timestamp_wrong_type", (c) => { c.signed_claim_timestamp_required = "true"; }, /authentication_replay/u],
    ["nonce_missing", (c) => { delete c.claim_nonce_replay_protection; }, /authentication_replay/u],
    ["nonce_false", (c) => { c.claim_nonce_replay_protection = false; }, /authentication_replay/u],
    ["nonce_wrong_type", (c) => { c.claim_nonce_replay_protection = "true"; }, /authentication_replay/u],
  ]) {
    for (const [kind, base] of [["gateway", gatewayEnvelope()], ["pilot", pilotEnvelope()]]) {
      const value = structuredClone(base);
      mutation(value.public_claim);
      const outcome = await runCase(value);
      assert.equal(outcome.code, 2, `${kind}:${label}`);
      assert.equal(outcome.result.opportunity_state, "hold", `${kind}:${label}`);
      assert.match(outcome.result.reason, reason, `${kind}:${label}`);
    }
  }

  for (const [label, base] of [["gateway", gatewayEnvelope()], ["pilot", pilotEnvelope()]]) {
    const value = structuredClone(base);
    delete value.public_claim.method;
    assertAvailable(await runCase(value), `${label}:method_from_exact_gateway_contract`);
  }

  for (const [label, mutation] of [
    ["executor_true", (p) => { p.executor_enabled = true; }],
    ["executor_missing", (p) => { delete p.executor_enabled; }],
    ["executor_wrong_type", (p) => { p.executor_enabled = "false"; }],
  ]) {
    for (const [kind, base] of [["gateway", gatewayEnvelope()], ["pilot", pilotEnvelope()]]) {
      const value = structuredClone(base);
      mutation(kind === "gateway" ? value.pilot_status : value);
      const outcome = await runCase(value);
      assert.equal(outcome.code, 2, `${kind}:${label}`);
      assert.equal(outcome.result.opportunity_state, "hold", `${kind}:${label}`);
      assert.match(outcome.result.reason, /executor_role_not_disabled/u, `${kind}:${label}`);
    }
  }

  for (const [label, next] of [
    ["pilot_gateway_marker_missing", undefined],
    ["pilot_gateway_marker_near_match", `${GATEWAY_MARKER}_ALT`],
    ["pilot_gateway_marker_wrong_type", true],
  ]) {
    const value = pilotEnvelope();
    if (next === undefined) delete value.gateway_marker;
    else value.gateway_marker = next;
    const outcome = await runCase(value);
    assert.equal(outcome.code, 2, label);
    assert.equal(outcome.result.opportunity_state, "hold", label);
    assert.match(outcome.result.reason, /gateway_identity_unconfirmed/u, label);
  }

  const nearGateway = gatewayEnvelope();
  nearGateway.marker = `${GATEWAY_MARKER}_ALT`;
  const nearGatewayOutcome = await runCase(nearGateway);
  assert.equal(nearGatewayOutcome.code, 2);
  assert.notEqual(nearGatewayOutcome.result.opportunity_state, "available");

  for (const [label, next] of [
    ["gateway_key_false", false],
    ["gateway_key_wrong_type", "true"],
  ]) {
    for (const [kind, base] of [["gateway", gatewayEnvelope()], ["pilot", pilotEnvelope()]]) {
      const value = structuredClone(base);
      value.safety.claim_executor_key_possession_required = next;
      const outcome = await runCase(value);
      assert.equal(outcome.code, 2, `${kind}:${label}`);
      assert.equal(outcome.result.opportunity_state, "hold", `${kind}:${label}`);
      assert.match(outcome.result.reason, /authentication_replay/u, `${kind}:${label}`);
    }
  }

  for (const unrelated of [
    { marker: "VOID_UNRELATED_ENVELOPE_V1", metadata: { published: gatewayEnvelope() } },
    { marker: "VOID_UNRELATED_ENVELOPE_V1", metadata: { published: pilotEnvelope() } },
  ]) {
    const outcome = await runCase(unrelated);
    assert.equal(outcome.code, 2);
    assert.notEqual(outcome.result.opportunity_state, "available");
  }

  process.stdout.write("wc-public-opportunity nested contract provenance proof passed\n");
} finally {
  await new Promise((resolve) => server.close(resolve));
}