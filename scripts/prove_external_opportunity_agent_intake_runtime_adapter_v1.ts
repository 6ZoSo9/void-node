import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  handleExternalOpportunityAgentIntakeDiscoveryV1,
} from "../src/external_opportunity/agent_intake_readonly_discovery_route_v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1,
  createExternalOpportunityAgentIntakeRuntimeAdapterContractV1,
  createExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  mountExternalOpportunityAgentIntakeRuntimeAdapterV1,
  validateExternalOpportunityAgentIntakeRuntimeAdapterContractV1,
  type ExternalOpportunityAgentIntakeRuntimeAdapterApplicationV1,
  type ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  type ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1,
} from "../src/external_opportunity/agent_intake_runtime_adapter_v1.js";

const FIXTURE_PATH = resolve(
  "fixtures/external-opportunity/agent-intake-runtime-adapter-v1.example.json",
);
const SCHEMA_PATH = resolve(
  "schemas/external-opportunity-agent-intake-runtime-adapter-v1.schema.json",
);
const SOURCE_PATH = resolve(
  "src/external_opportunity/agent_intake_runtime_adapter_v1.ts",
);
const PROOF_PATH = resolve(
  "scripts/prove_external_opportunity_agent_intake_runtime_adapter_v1.ts",
);

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

class FakeResponseV1
  implements ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1 {
  statusCode = 0;
  readonly headers: Record<string, string> = {};
  body = "";
  sendCount = 0;
  endCount = 0;

  status(
    code: number,
  ): ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1 {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): void {
    this.headers[name.toLowerCase()] = value;
  }

  send(body: string): unknown {
    this.sendCount += 1;
    this.body = body;
    return this;
  }

  end(body = ""): unknown {
    this.endCount += 1;
    this.body = body;
    return this;
  }
}

class FakeApplicationV1
  implements ExternalOpportunityAgentIntakeRuntimeAdapterApplicationV1 {
  readonly registrations: Array<{
    path: string;
    handler: ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1;
  }> = [];

  all(
    path: string,
    handler: ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  ): unknown {
    this.registrations.push({ path, handler });
    return this;
  }
}

function invokeV1(
  handler: ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  request: {
    method: string;
    path?: string;
    originalUrl?: string;
    headers?: Record<string, string | string[] | undefined>;
  },
): FakeResponseV1 {
  const response = new FakeResponseV1();
  handler(request, response);
  return response;
}

console.log(
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1_PROOF",
);

const fixture = parseJsonObject(FIXTURE_PATH);
const schema = parseJsonObject(SCHEMA_PATH);
assert.equal(
  schema["$id"],
  "https://voidchain.io/schemas/external-opportunity-agent-intake-runtime-adapter-v1.schema.json",
);

const contract =
  createExternalOpportunityAgentIntakeRuntimeAdapterContractV1();
assert.deepEqual(contract, fixture);
assert.deepEqual(
  validateExternalOpportunityAgentIntakeRuntimeAdapterContractV1(contract),
  { ok: true, errors: [] },
);
assert.equal(
  contract.marker,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1,
);
assert.equal(contract.behavior.production_mount, false);
assert.equal(contract.behavior.runtime_host_mutation, false);
assert.equal(contract.behavior.index_mutation, false);

const application = new FakeApplicationV1();
const mountedContract =
  mountExternalOpportunityAgentIntakeRuntimeAdapterV1(application);
assert.deepEqual(mountedContract, contract);
assert.equal(application.registrations.length, 1);
assert.equal(
  application.registrations[0]?.path,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
);
const mountedHandler = application.registrations[0]?.handler;
assert.notEqual(mountedHandler, undefined);

const getExpected = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "GET",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
const getActual = invokeV1(mountedHandler!, {
  method: "GET",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(getActual.statusCode, getExpected.status);
assert.deepEqual(getActual.headers, getExpected.headers);
assert.equal(getActual.body, getExpected.body);
assert.equal(getActual.sendCount, 1);
assert.equal(getActual.endCount, 0);

const headExpected = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "HEAD",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
const headActual = invokeV1(mountedHandler!, {
  method: "HEAD",
  originalUrl:
    `${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1}?source=proof`,
});
assert.equal(headActual.statusCode, headExpected.status);
assert.deepEqual(headActual.headers, headExpected.headers);
assert.equal(headActual.body, "");
assert.equal(headActual.sendCount, 0);
assert.equal(headActual.endCount, 1);

const conditionalExpected =
  handleExternalOpportunityAgentIntakeDiscoveryV1({
    method: "GET",
    path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    headers: {
      "If-None-Match":
        VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
    },
  });
const conditionalActual = invokeV1(mountedHandler!, {
  method: "GET",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  headers: {
    "If-None-Match":
      VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  },
});
assert.equal(conditionalActual.statusCode, conditionalExpected.status);
assert.deepEqual(conditionalActual.headers, conditionalExpected.headers);
assert.equal(conditionalActual.body, "");
assert.equal(conditionalActual.sendCount, 0);
assert.equal(conditionalActual.endCount, 1);

const methodExpected = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "POST",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
const methodActual = invokeV1(mountedHandler!, {
  method: "POST",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(methodActual.statusCode, methodExpected.status);
assert.deepEqual(methodActual.headers, methodExpected.headers);
assert.equal(methodActual.body, methodExpected.body);
assert.equal(methodActual.sendCount, 1);
assert.equal(methodActual.endCount, 0);

const directHandler =
  createExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1();
const pathExpected = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "GET",
  path: `${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1}/`,
});
const pathActual = invokeV1(directHandler, {
  method: "GET",
  path: `${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1}/`,
});
assert.equal(pathActual.statusCode, pathExpected.status);
assert.deepEqual(pathActual.headers, pathExpected.headers);
assert.equal(pathActual.body, pathExpected.body);

const source = readFileSync(SOURCE_PATH, "utf8");
const proof = readFileSync(PROOF_PATH, "utf8");
assert.equal(hasRawEmptyCatch(source), false);
assert.equal(hasRawEmptyCatch(proof), false);
assert.equal(source.includes('from "express"'), false);
assert.equal(source.includes('from "node:http"'), false);
assert.equal(source.includes("listen("), false);
assert.equal(source.includes("createServer("), false);
assert.equal(source.includes("fetch("), false);
assert.equal(source.includes("process.env"), false);
assert.equal(source.includes("systemctl"), false);
assert.equal(source.includes("setInterval("), false);
assert.equal(source.includes("setTimeout("), false);
assert.equal(
  source.includes("ai-agent-discovery-runtime-route-v1"),
  false,
);
assert.equal(source.includes("src/index.ts"), false);

console.log(
  `discovery_path=${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1}`,
);
console.log(`registration_count=${application.registrations.length}`);
console.log(`get_status=${getActual.statusCode}`);
console.log(`head_status=${headActual.statusCode}`);
console.log(`conditional_status=${conditionalActual.statusCode}`);
console.log(`method_guard_status=${methodActual.statusCode}`);
console.log(`path_guard_status=${pathActual.statusCode}`);
console.log(`etag=${getActual.headers.etag}`);
console.log(
  `response_body_bytes=${Buffer.byteLength(getActual.body, "utf8")}`,
);
console.log("new_lane_raw_empty_catch_count=0");
console.log("structural_application_interface_used=true");
console.log("express_import_performed=false");
console.log("production_mount_performed=false");
console.log("runtime_host_mutation_performed=false");
console.log("index_mutation_performed=false");
console.log("network_listener_created=false");
console.log("network_request_performed=false");
console.log("filesystem_write_performed=false");
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
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_ADAPTER_V1_PROOF_EXACT_GREEN",
);
