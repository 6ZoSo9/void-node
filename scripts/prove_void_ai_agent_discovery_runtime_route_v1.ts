import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import express from "express";
import {
  VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1,
  mountAiAgentDiscoveryRuntimeRouteV1,
  voidAiAgentDiscoveryRuntimeRoutesV1,
} from "../src/ai-agent-discovery-runtime-route-v1.js";
import { mountLocalMultiboxRuntimeRouteV1 } from "../src/local-multibox-runtime-route-v1.js";
import {
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_CACHE_CONTROL_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
} from "../src/external_opportunity/agent_intake_readonly_discovery_route_v1.js";

const proofMarker =
  "VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1_PROOF_GREEN";

const expectedRoutes = [
  {
    route: "/public-node/agents/discovery-v1.json",
    relativePath: "public/public-node/agents/discovery-v1.json",
    marker: "VOID_AI_AGENT_DISCOVERY_CONTRACT_WALL_V1",
  },
  {
    route: "/public-node/agents/discovery-v1.schema.json",
    relativePath: "public/public-node/agents/discovery-v1.schema.json",
    marker: null,
  },
  {
    route: "/.well-known/void-agent-discovery.json",
    relativePath: "public/.well-known/void-agent-discovery.json",
    marker: "VOID_AI_AGENT_WELL_KNOWN_ENTRYPOINT_V1",
  },
  {
    route: "/.well-known/void-agent-discovery.schema.json",
    relativePath: "public/.well-known/void-agent-discovery.schema.json",
    marker: null,
  },
  {
    route: "/public-node/agents/paid-work-v1.json",
    relativePath: "public/public-node/agents/paid-work-v1.json",
    marker: "VOID_AGENT_PAID_WORK_RUNTIME_DISCOVERY_V1",
  },
  {
    route: "/public-node/agents/paid-work-v1.schema.json",
    relativePath: "public/public-node/agents/paid-work-v1.schema.json",
    marker: null,
  },
  {
    route: "/.well-known/void-network-authenticity.json",
    relativePath: "public/.well-known/void-network-authenticity.json",
    marker: "VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1",
  },
  {
    route: "/.well-known/void-network-authenticity.schema.json",
    relativePath: "public/.well-known/void-network-authenticity.schema.json",
    marker: null,
  },
] as const;

assert.equal(
  VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1,
  "VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1",
);
assert.equal(
  voidAiAgentDiscoveryRuntimeRoutesV1.length,
  8,
  "exactly eight runtime routes",
);
assert.deepEqual(
  voidAiAgentDiscoveryRuntimeRoutesV1,
  expectedRoutes.map(({ route, relativePath }) => ({ route, relativePath })),
  "runtime route array is exact",
);
assert.equal(
  new Set(voidAiAgentDiscoveryRuntimeRoutesV1.map((entry) => entry.route)).size,
  8,
  "no duplicate runtime routes",
);
assert.equal(
  new Set(
    voidAiAgentDiscoveryRuntimeRoutesV1.map((entry) => entry.relativePath),
  ).size,
  8,
  "no duplicate runtime relative paths",
);

const runtimeModulePath = path.resolve(
  process.cwd(),
  "src/ai-agent-discovery-runtime-route-v1.ts",
);
const runtimeHostPath = path.resolve(
  process.cwd(),
  "src/local-multibox-runtime-route-v1.ts",
);
const indexPath = path.resolve(process.cwd(), "src/index.ts");

const runtimeModuleSource = fs.readFileSync(runtimeModulePath, "utf8");
const runtimeHostSource = fs.readFileSync(runtimeHostPath, "utf8");
const indexSource = fs.readFileSync(indexPath, "utf8");

const count = (text: string, needle: string): number =>
  text.split(needle).length - 1;

assert.equal(
  count(
    runtimeHostSource,
    'import { mountAiAgentDiscoveryRuntimeRouteV1 } from "./ai-agent-discovery-runtime-route-v1.js";',
  ),
  1,
  "runtime host import count",
);
assert.equal(
  count(runtimeHostSource, "mountAiAgentDiscoveryRuntimeRouteV1(app);"),
  1,
  "runtime host mount count",
);
assert.equal(
  count(indexSource, "mountAiAgentDiscoveryRuntimeRouteV1"),
  0,
  "src/index.ts remains free of direct agent-route wiring",
);
assert.equal(
  count(
    runtimeModuleSource,
    'from "./external_opportunity/agent_intake_runtime_adapter_v1.js";',
  ),
  1,
  "agent-intake adapter import path count",
);
assert.equal(
  count(
    runtimeModuleSource,
    "mountExternalOpportunityAgentIntakeRuntimeAdapterV1(app);",
  ),
  1,
  "agent-intake adapter mount count",
);
assert.equal(
  count(runtimeModuleSource, "mountExternalOpportunityAgentIntakeRuntimeAdapterV1"),
  2,
  "agent-intake adapter symbol count",
);
assert.equal(
  count(indexSource, "mountExternalOpportunityAgentIntakeRuntimeAdapterV1"),
  0,
  "src/index.ts remains free of direct agent-intake adapter wiring",
);
assert.equal(
  count(indexSource, VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1),
  0,
  "src/index.ts remains free of direct agent-intake path wiring",
);

for (const forbidden of [
  ".post(",
  ".put(",
  ".patch(",
  ".delete(",
  "wallet.send",
  "treasury",
  "ledger.write",
  "validator",
]) {
  assert.equal(
    runtimeModuleSource.includes(forbidden),
    false,
    `runtime module forbids ${forbidden}`,
  );
}

assert.equal(
  count(
    runtimeModuleSource,
    'route: "/public-node/agents/paid-work-v1.json"',
  ),
  1,
  "paid-work discovery route appears exactly once",
);
assert.equal(
  count(
    runtimeModuleSource,
    'route: "/public-node/agents/paid-work-v1.schema.json"',
  ),
  1,
  "paid-work discovery schema route appears exactly once",
);

assert.equal(
  count(
    runtimeModuleSource,
    'route: "/.well-known/void-network-authenticity.json"',
  ),
  1,
  "authenticity route appears exactly once",
);
assert.equal(
  count(
    runtimeModuleSource,
    'route: "/.well-known/void-network-authenticity.schema.json"',
  ),
  1,
  "authenticity schema route appears exactly once",
);

const app = express();
mountLocalMultiboxRuntimeRouteV1(app);
mountAiAgentDiscoveryRuntimeRouteV1(app);

const server = http.createServer(app);
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => resolve());
});

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://127.0.0.1:${address.port}`;

  for (const expected of expectedRoutes) {
    const sourcePath = path.resolve(process.cwd(), expected.relativePath);
    const sourceBytes = fs.readFileSync(sourcePath);

    const getResponse = await fetch(base + expected.route);
    const getBytes = Buffer.from(await getResponse.arrayBuffer());

    assert.equal(getResponse.status, 200, `${expected.route} GET status`);
    assert.match(
      getResponse.headers.get("content-type") || "",
      /^application\/json/i,
      `${expected.route} content type`,
    );
    assert.equal(
      getResponse.headers.get("cache-control"),
      "no-store",
      `${expected.route} cache control`,
    );
    assert.deepEqual(getBytes, sourceBytes, `${expected.route} exact bytes`);

    const parsed = JSON.parse(getBytes.toString("utf8"));
    if (expected.marker) {
      assert.equal(parsed.marker, expected.marker, `${expected.route} marker`);
    }

    const headResponse = await fetch(base + expected.route, {
      method: "HEAD",
    });
    assert.equal(headResponse.status, 200, `${expected.route} HEAD status`);
    assert.equal(
      Buffer.from(await headResponse.arrayBuffer()).length,
      0,
      `${expected.route} HEAD body empty`,
    );

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const mutationResponse = await fetch(base + expected.route, {
        method,
      });
      assert.equal(
        mutationResponse.status,
        404,
        `${expected.route} ${method} is not mounted`,
      );
    }
  }

  const agentIntakeGetResponse = await fetch(
    base + VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
  );
  const agentIntakeGetBytes = Buffer.from(
    await agentIntakeGetResponse.arrayBuffer(),
  );
  assert.equal(agentIntakeGetResponse.status, 200);
  assert.equal(
    agentIntakeGetResponse.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  assert.equal(
    agentIntakeGetResponse.headers.get("access-control-allow-origin"),
    "*",
  );
  assert.equal(
    agentIntakeGetResponse.headers.get("cache-control"),
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_CACHE_CONTROL_V1,
  );
  assert.equal(
    agentIntakeGetResponse.headers.get("etag"),
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  );
  assert.equal(
    agentIntakeGetResponse.headers.get("content-length"),
    String(agentIntakeGetBytes.length),
  );
  assert.equal(agentIntakeGetBytes.length, 4728);
  assert.equal(
    JSON.parse(agentIntakeGetBytes.toString("utf8")).marker,
    "VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_CAPABILITY_V1",
  );

  const agentIntakeHeadResponse = await fetch(
    base + VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    { method: "HEAD" },
  );
  assert.equal(agentIntakeHeadResponse.status, 200);
  assert.equal(
    Buffer.from(await agentIntakeHeadResponse.arrayBuffer()).length,
    0,
  );
  assert.equal(
    agentIntakeHeadResponse.headers.get("etag"),
    VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
  );

  const agentIntakeConditionalResponse = await fetch(
    base + VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    {
      headers: {
        "If-None-Match":
          VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_ETAG_V1,
      },
    },
  );
  assert.equal(agentIntakeConditionalResponse.status, 304);
  assert.equal(
    Buffer.from(await agentIntakeConditionalResponse.arrayBuffer()).length,
    0,
  );

  const agentIntakeMethodResponse = await fetch(
    base + VOID_EXTERNAL_OPPORTUNITY_AGENT_INTAKE_DISCOVERY_PATH_V1,
    { method: "POST" },
  );
  assert.equal(agentIntakeMethodResponse.status, 405);
  assert.equal(agentIntakeMethodResponse.headers.get("allow"), "GET, HEAD");

  const pointer = JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "public/.well-known/void-agent-discovery.json",
      ),
      "utf8",
    ),
  );
  const canonical = JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "public/public-node/agents/discovery-v1.json",
      ),
      "utf8",
    ),
  );

  const paidWork = JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "public/public-node/agents/paid-work-v1.json",
      ),
      "utf8",
    ),
  );

  assert.equal(pointer.network.chain_id, 2050);
  assert.equal(pointer.authority.mutation_authority_granted, false);
  assert.equal(
    pointer.canonical_discovery,
    "/public-node/agents/discovery-v1.json",
  );
  assert.equal(
    pointer.network_authenticity,
    "/.well-known/void-network-authenticity.json",
  );

  assert.equal(canonical.network.chain_id, 2050);
  assert.equal(canonical.authority.mutation_authority_granted, false);
  assert.deepEqual(canonical.authority.granted_http_methods, ["GET", "HEAD"]);
  assert.equal(
    canonical.entrypoints.paid_work_protocol,
    "/public-node/agents/paid-work-v1.json",
  );
  assert.equal(
    canonical.capabilities.find(
      (entry: any) => entry.id === "paid_work_protocol_discovery",
    )?.state,
    "live",
  );
  assert.equal(
    canonical.capabilities.find(
      (entry: any) => entry.id === "paid_work_protocol_discovery",
    )?.authority,
    "read_only",
  );
  assert.equal(
    canonical.capabilities.find(
      (entry: any) => entry.id === "paid_work_protocol_discovery",
    )?.discovery,
    "/public-node/agents/paid-work-v1.json",
  );

  assert.equal(
    paidWork.marker,
    "VOID_AGENT_PAID_WORK_RUNTIME_DISCOVERY_V1",
  );
  assert.equal(
    paidWork.protocol,
    "void-agent-paid-work-runtime-discovery/1",
  );
  assert.equal(
    paidWork.runtime_discovery_id,
    "voidawprd1_556277132f4a43da05dd025b624e500b0dc460593a6120675da8947987c50e7e",
  );
  assert.equal(
    paidWork.repository_binding.manifest_id,
    "voidawpd1_cfe29c4adaf977ceda8b00a5425cda09cf4eb751463521379e25fe08c2ff4b2d",
  );
  assert.equal(paidWork.repository_binding.stage_count, 12);
  assert.equal(paidWork.repository_binding.artifact_count, 60);
  assert.equal(paidWork.authority.default, "read_only");
  assert.deepEqual(
    paidWork.authority.granted_http_methods,
    ["GET", "HEAD"],
  );
  assert.equal(paidWork.authority.mutation_authority_granted, false);
  assert.equal(
    paidWork.runtime_capabilities.live_work_order_submission,
    "unavailable",
  );
  assert.equal(
    paidWork.runtime_capabilities.live_payment_execution,
    "unavailable",
  );
  assert.equal(
    paidWork.runtime_capabilities.live_wc_ledger_write,
    "unavailable",
  );
  assert.equal(
    paidWork.runtime_capabilities.wc_to_void_settlement,
    "unavailable",
  );
  assert.equal(
    paidWork.runtime_capabilities.buy_void_auto_fulfillment,
    "unavailable",
  );

  assert.equal(
    canonical.capabilities.find(
      (entry: any) => entry.id === "buy_void_automatic_fulfillment",
    )?.enabled,
    false,
  );
  assert.equal(
    canonical.capabilities.find(
      (entry: any) => entry.id === "validator_activation",
    )?.enabled,
    false,
  );
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function withTemporaryCwd(
  files: Record<string, string>,
  check: (base: string) => Promise<void>,
): Promise<void> {
  const previous = process.cwd();
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-agent-route-proof-"),
  );

  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(temporary, relativePath);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
    }

    process.chdir(temporary);
    const isolated = express();
    mountAiAgentDiscoveryRuntimeRouteV1(isolated);
    const isolatedServer = http.createServer(isolated);

    await new Promise<void>((resolve, reject) => {
      isolatedServer.once("error", reject);
      isolatedServer.listen(0, "127.0.0.1", () => resolve());
    });

    try {
      const address = isolatedServer.address();
      assert.ok(address && typeof address === "object");
      await check(`http://127.0.0.1:${address.port}`);
    } finally {
      await new Promise<void>((resolve, reject) => {
        isolatedServer.close((error) =>
          error ? reject(error) : resolve(),
        );
      });
    }
  } finally {
    process.chdir(previous);
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

await withTemporaryCwd({}, async (base) => {
  const response = await fetch(
    base + "/.well-known/void-network-authenticity.json",
  );
  assert.equal(response.status, 404, "missing artifact returns 404");
  const payload = await response.json();
  assert.equal(payload.error, "missing_public_artifact");
});

await withTemporaryCwd(
  {
    "public/.well-known/void-network-authenticity.json": "{not-json",
  },
  async (base) => {
    const response = await fetch(
      base + "/.well-known/void-network-authenticity.json",
    );
    assert.equal(response.status, 500, "malformed JSON returns 500");
    const payload = await response.json();
    assert.equal(payload.ok, false);
  },
);

console.log("runtime_route_count=8");
console.log("runtime_route_duplicates=0");
console.log("runtime_relative_path_duplicates=0");
console.log("canonical_discovery_get=200");
console.log("canonical_discovery_head=200");
console.log("canonical_schema_get=200");
console.log("canonical_schema_head=200");
console.log("well_known_pointer_get=200");
console.log("well_known_pointer_head=200");
console.log("well_known_schema_get=200");
console.log("well_known_schema_head=200");
console.log("paid_work_discovery_get=200");
console.log("paid_work_discovery_head=200");
console.log("paid_work_schema_get=200");
console.log("paid_work_schema_head=200");
console.log(
  "paid_work_runtime_discovery_id=voidawprd1_556277132f4a43da05dd025b624e500b0dc460593a6120675da8947987c50e7e",
);
console.log(
  "paid_work_repository_manifest_id=voidawpd1_cfe29c4adaf977ceda8b00a5425cda09cf4eb751463521379e25fe08c2ff4b2d",
);
console.log("paid_work_repository_stage_count=12");
console.log("paid_work_repository_artifact_count=60");
console.log("paid_work_live_submission=unavailable");
console.log("paid_work_live_payment_execution=unavailable");
console.log("paid_work_live_wc_ledger_write=unavailable");
console.log("paid_work_wc_to_void_settlement=unavailable");
console.log("paid_work_buy_void_auto_fulfillment=unavailable");
console.log("authenticity_get=200");
console.log("authenticity_head=200");
console.log("authenticity_schema_get=200");
console.log("authenticity_schema_head=200");
console.log("missing_artifact_status=404");
console.log("malformed_json_status=500");
console.log("mutation_routes_mounted=0");
console.log("agent_intake_get=200");
console.log("agent_intake_head=200");
console.log("agent_intake_conditional_status=304");
console.log("agent_intake_method_guard_status=405");
console.log("agent_intake_response_body_bytes=4728");
console.log("agent_intake_runtime_mount_count=1");
console.log("agent_intake_src_index_direct_wiring=0");
console.log("mutation_authority_granted=false");
console.log("buy_void_automatic_fulfillment_enabled=false");
console.log("validator_activation_enabled=false");
console.log("src_index_direct_wiring=0");
console.log(proofMarker);
