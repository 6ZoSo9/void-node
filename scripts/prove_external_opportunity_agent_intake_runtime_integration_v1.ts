import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  mountAiAgentDiscoveryRuntimeRouteV1,
  voidAiAgentDiscoveryRuntimeRoutesV1,
} from "../src/ai-agent-discovery-runtime-route-v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  handleExternalOpportunityAgentIntakeDiscoveryV1,
} from "../src/external_opportunity/agent_intake_readonly_discovery_route_v1.js";
import {
  type ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  type ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1,
} from "../src/external_opportunity/agent_intake_runtime_adapter_v1.js";

const MARKER =
  "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_RUNTIME_INTEGRATION_V1" as const;
const RUNTIME_HOST_PATH = resolve("src/ai-agent-discovery-runtime-route-v1.ts");
const RUNTIME_PROOF_PATH = resolve(
  "scripts/prove_void_ai_agent_discovery_runtime_route_v1.ts",
);
const INDEX_PATH = resolve("src/index.ts");
const ADAPTER_IMPORT =
  'from "./external_opportunity/agent_intake_runtime_adapter_v1.js";';
const ADAPTER_MOUNT =
  "mountExternalOpportunityAgentIntakeRuntimeAdapterV1(app);";

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
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

  status(code: number): ExternalOpportunityAgentIntakeRuntimeAdapterResponseV1 {
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

class FakeRuntimeApplicationV1 {
  readonly getRegistrations: Array<{ path: string; handler: unknown }> = [];
  readonly allRegistrations: Array<{
    path: string;
    handler: ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1;
  }> = [];

  get(path: string, handler: unknown): this {
    this.getRegistrations.push({ path, handler });
    return this;
  }

  all(
    path: string,
    handler: ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  ): this {
    this.allRegistrations.push({ path, handler });
    return this;
  }
}

function invokeV1(
  handler: ExternalOpportunityAgentIntakeRuntimeAdapterHandlerV1,
  request: {
    method: string;
    path: string;
    headers?: Record<string, string | string[] | undefined>;
  },
): FakeResponseV1 {
  const response = new FakeResponseV1();
  handler(request, response);
  return response;
}

console.log(`${MARKER}_PROOF`);

const runtimeSource = readFileSync(RUNTIME_HOST_PATH, "utf8");
const runtimeProofSource = readFileSync(RUNTIME_PROOF_PATH, "utf8");
const indexSource = readFileSync(INDEX_PATH, "utf8");

assert.equal(count(runtimeSource, ADAPTER_IMPORT), 1);
assert.equal(count(runtimeSource, ADAPTER_MOUNT), 1);
assert.equal(
  count(runtimeSource, "mountExternalOpportunityAgentIntakeRuntimeAdapterV1"),
  2,
);
assert.equal(runtimeSource.includes('typeof app.all !== "function"'), true);
assert.equal(
  count(indexSource, "mountExternalOpportunityAgentIntakeRuntimeAdapterV1"),
  0,
);
assert.equal(
  count(indexSource, VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1),
  0,
);
assert.equal(
  count(
    runtimeProofSource,
    "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1",
  ),
  6,
  "baseline proof imports and uses the route constant exactly six times",
);
assert.equal(
  count(
    runtimeProofSource,
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  ),
  0,
  "baseline proof does not duplicate the literal route path",
);
assert.equal(
  runtimeProofSource.includes("agent_intake_conditional_status=304"),
  true,
);
assert.equal(hasRawEmptyCatch(runtimeSource), false);
assert.equal(hasRawEmptyCatch(runtimeProofSource), false);

for (const forbidden of [
  ".post(",
  ".put(",
  ".patch(",
  ".delete(",
  "wallet.send",
  "ledger.write",
]) {
  assert.equal(runtimeSource.includes(forbidden), false, forbidden);
}

const application = new FakeRuntimeApplicationV1();
mountAiAgentDiscoveryRuntimeRouteV1(application);
mountAiAgentDiscoveryRuntimeRouteV1(application);

assert.equal(
  application.getRegistrations.length,
  voidAiAgentDiscoveryRuntimeRoutesV1.length,
);
assert.equal(application.allRegistrations.length, 1);
assert.equal(
  application.allRegistrations[0]?.path,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
);

const handler = application.allRegistrations[0]?.handler;
assert.notEqual(handler, undefined);

const getExpected = handleExternalOpportunityAgentIntakeDiscoveryV1({
  method: "GET",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
const getActual = invokeV1(handler!, {
  method: "GET",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(getActual.statusCode, 200);
assert.equal(getActual.statusCode, getExpected.status);
assert.deepEqual(getActual.headers, getExpected.headers);
assert.equal(getActual.body, getExpected.body);
assert.equal(Buffer.byteLength(getActual.body, "utf8"), 4728);
assert.equal(
  getActual.headers.etag,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
);

const headActual = invokeV1(handler!, {
  method: "HEAD",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(headActual.statusCode, 200);
assert.equal(headActual.body, "");
assert.equal(headActual.sendCount, 0);
assert.equal(headActual.endCount, 1);

const conditionalActual = invokeV1(handler!, {
  method: "GET",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  headers: {
    "If-None-Match": VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  },
});
assert.equal(conditionalActual.statusCode, 304);
assert.equal(conditionalActual.body, "");
assert.equal(conditionalActual.sendCount, 0);
assert.equal(conditionalActual.endCount, 1);

const methodActual = invokeV1(handler!, {
  method: "POST",
  path: VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
});
assert.equal(methodActual.statusCode, 405);
assert.equal(methodActual.headers.allow, "GET, HEAD");

console.log(`discovery_path=${VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1}`);
console.log(`file_backed_registration_count=${application.getRegistrations.length}`);
console.log(`agent_intake_registration_count=${application.allRegistrations.length}`);
console.log(`get_status=${getActual.statusCode}`);
console.log(`head_status=${headActual.statusCode}`);
console.log(`conditional_status=${conditionalActual.statusCode}`);
console.log(`method_guard_status=${methodActual.statusCode}`);
console.log(`etag=${getActual.headers.etag}`);
console.log(`response_body_bytes=${Buffer.byteLength(getActual.body, "utf8")}`);
console.log("runtime_host_import_count=1");
console.log("runtime_host_mount_count=1");
console.log("runtime_host_idempotent_mount=true");
console.log("src_index_direct_wiring=0");
console.log("production_source_binding=true");
console.log("deployment_performed=false");
console.log("live_service_restart_performed=false");
console.log("external_network_request_performed=false");
console.log("mutation_authority_granted=false");
console.log("credential_access_performed=false");
console.log("journal_file_write_performed=false");
console.log("wallet_or_key_access_performed=false");
console.log("transaction_construction_performed=false");
console.log("transaction_submission_performed=false");
console.log("paid_work_submission_performed=false");
console.log("wc_earning_performed=false");
console.log("live_execution_performed=false");
console.log(`${MARKER}_PROOF_EXACT_GREEN`);
