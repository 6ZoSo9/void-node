import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ALLOW_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  createExternalOpportunityAgentIntakeDiscoveryContractV1,
  handleExternalOpportunityAgentIntakeDiscoveryV1,
  serializeExternalOpportunityAgentIntakeCapabilityV1,
  validateExternalOpportunityAgentIntakeDiscoveryContractV1,
} from "../src/external_opportunity/agent_intake_readonly_discovery_route_v1";
import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1,
  createExternalOpportunityAgentIntakeCapabilityV1,
  validateExternalOpportunityAgentIntakeCapabilityV1,
} from "../src/external_opportunity/agent_intake_capability_v1";

const FIXTURE_PATH = resolve(
  "fixtures/external-opportunity/agent-intake-readonly-discovery-route-v1.example.json",
);
const SCHEMA_PATH = resolve(
  "schemas/external-opportunity-agent-intake-readonly-discovery-route-v1.schema.json",
);
const SOURCE_PATH = resolve(
  "src/external_opportunity/agent_intake_readonly_discovery_route_v1.ts",
);
const PROOF_PATH = resolve(
  "scripts/prove_external_opportunity_agent_intake_readonly_discovery_route_v1.ts",
);

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseJsonObject(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function hasRawEmptyCatch(value: string): boolean {
  return /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/m.test(value);
}

console.log(
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1_PROOF",
);

const fixture = parseJsonObject(FIXTURE_PATH);
const schema = parseJsonObject(SCHEMA_PATH);
assert.equal(
  schema["$id"],
  "https://voidchain.io/schemas/external-opportunity-agent-intake-readonly-discovery-route-v1.schema.json",
);

const contract = createExternalOpportunityAgentIntakeDiscoveryContractV1();
assert.deepEqual(contract, fixture);
assert.deepEqual(
  validateExternalOpportunityAgentIntakeDiscoveryContractV1(contract),
  { ok: true, errors: [] },
);

const manifest = createExternalOpportunityAgentIntakeCapabilityV1();
const manifestValidation =
  validateExternalOpportunityAgentIntakeCapabilityV1(manifest);
assert.equal(manifestValidation.ok, true);
assert.equal(
  manifestValidation.fingerprint_sha256,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_FINGERPRINT_V1,
);

const expectedBody = serializeExternalOpportunityAgentIntakeCapabilityV1(
  manifest,
);
assert.equal(
  sha256(expectedBody),
  contract.capability_binding.response_body_sha256,
);

const getResponse = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "GET",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(getResponse.status, 200);
assert.equal(getResponse.body, expectedBody);
assert.equal(
  getResponse.headers["content-type"],
  "application/json; charset=utf-8",
);
assert.equal(
  getResponse.headers["content-length"],
  String(Buffer.byteLength(expectedBody, "utf8")),
);
assert.equal(
  getResponse.headers.etag,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
);
assert.equal(getResponse.headers["access-control-allow-origin"], "*");

const parsedBody: unknown = JSON.parse(getResponse.body);
assert.deepEqual(parsedBody, manifest);

const headResponse = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "head",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(headResponse.status, 200);
assert.equal(headResponse.body, "");
assert.deepEqual(headResponse.headers, getResponse.headers);

const strongConditional =
  handleExternalOpportunityAgentIntakeDiscoveryV1({
    method: "GET",
    path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    headers: {
      "If-None-Match":
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
    },
  });
assert.equal(strongConditional.status, 304);
assert.equal(strongConditional.body, "");

const weakConditional =
  handleExternalOpportunityAgentIntakeDiscoveryV1({
    method: "HEAD",
    path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    headers: {
      "if-none-match":
        `W/${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1}`,
    },
  });
assert.equal(weakConditional.status, 304);
assert.equal(weakConditional.body, "");

const listConditional =
  handleExternalOpportunityAgentIntakeDiscoveryV1({
    method: "GET",
    path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    headers: {
      "IF-NONE-MATCH": [
        "\"other\"",
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
      ],
    },
  });
assert.equal(listConditional.status, 304);

const wildcardConditional =
  handleExternalOpportunityAgentIntakeDiscoveryV1({
    method: "GET",
    path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    headers: { "if-none-match": "*" },
  });
assert.equal(wildcardConditional.status, 304);

const staleConditional =
  handleExternalOpportunityAgentIntakeDiscoveryV1({
    method: "GET",
    path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    headers: { "if-none-match": "\"stale\"" },
  });
assert.equal(staleConditional.status, 200);
assert.equal(staleConditional.body, expectedBody);

const methodResponse = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "POST",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(methodResponse.status, 405);
assert.equal(
  methodResponse.headers.allow,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ALLOW_V1,
);
assert.equal(
  (JSON.parse(methodResponse.body) as Record<string, unknown>).code,
  "method_not_allowed",
);

const pathResponse = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "GET",
  path: `${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1}/`,
});
assert.equal(pathResponse.status, 404);
assert.equal(
  (JSON.parse(pathResponse.body) as Record<string, unknown>).code,
  "not_found",
);

const source = readFileSync(SOURCE_PATH, "utf8");
const proof = readFileSync(PROOF_PATH, "utf8");
assert.equal(hasRawEmptyCatch(source), false);
assert.equal(hasRawEmptyCatch(proof), false);
assert.equal(source.includes("listen("), false);
assert.equal(source.includes("createServer("), false);
assert.equal(source.includes("fetch("), false);
assert.equal(source.includes("process.env"), false);
assert.equal(source.includes("systemctl"), false);
assert.equal(source.includes("setInterval("), false);
assert.equal(source.includes("setTimeout("), false);

console.log(
  `discovery_path=${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1}`,
);
console.log(
  `etag=${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1}`,
);
console.log(`response_body_sha256=${sha256(expectedBody)}`);
console.log(`response_body_bytes=${Buffer.byteLength(expectedBody, "utf8")}`);
console.log(`get_status=${getResponse.status}`);
console.log(`head_status=${headResponse.status}`);
console.log(`conditional_status=${strongConditional.status}`);
console.log(`method_guard_status=${methodResponse.status}`);
console.log(`path_guard_status=${pathResponse.status}`);
console.log("new_lane_raw_empty_catch_count=0");
console.log("repository_fixture_read_performed=true");
console.log("repository_schema_read_performed=true");
console.log("filesystem_write_performed=false");
console.log("route_binding_performed=false");
console.log("network_listener_created=false");
console.log("network_request_performed=false");
console.log("authentication_secret_accessed=false");
console.log("credential_access_performed=false");
console.log("journal_file_read_performed=false");
console.log("journal_file_write_performed=false");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_construction_performed=false");
console.log("transaction_submission_performed=false");
console.log("paid_work_submission_performed=false");
console.log("wc_earning_performed=false");
console.log("runtime_mutation_performed=false");
console.log("service_mutation_performed=false");
console.log("scheduler_mutation_performed=false");
console.log("live_execution_authorized=false");
console.log(
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_READONLY_DISCOVERY_ROUTE_V1_PROOF_EXACT_GREEN",
);
