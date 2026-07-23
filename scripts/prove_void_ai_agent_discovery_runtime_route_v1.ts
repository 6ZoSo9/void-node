import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import {
  VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1,
  mountAiAgentDiscoveryRuntimeRouteV1,
  voidAiAgentDiscoveryRuntimeRoutesV1,
} from "../src/ai-agent-discovery-runtime-route-v1.js";
import { mountLocalMultiboxRuntimeRouteV1 } from "../src/local-multibox-runtime-route-v1.js";

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
] as const;

assert.equal(
  VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1,
  "VOID_AI_AGENT_DISCOVERY_RUNTIME_ROUTE_V1",
);
assert.deepEqual(
  voidAiAgentDiscoveryRuntimeRoutesV1,
  expectedRoutes.map(({ route, relativePath }) => ({ route, relativePath })),
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
  }

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

  assert.equal(pointer.network.chain_id, 2050);
  assert.equal(pointer.authority.mutation_authority_granted, false);
  assert.equal(
    pointer.canonical_discovery,
    "/public-node/agents/discovery-v1.json",
  );

  assert.equal(canonical.network.chain_id, 2050);
  assert.equal(canonical.authority.mutation_authority_granted, false);
  assert.deepEqual(canonical.authority.granted_http_methods, ["GET", "HEAD"]);
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

console.log("canonical_discovery_get=200");
console.log("canonical_discovery_head=200");
console.log("canonical_schema_get=200");
console.log("canonical_schema_head=200");
console.log("well_known_pointer_get=200");
console.log("well_known_pointer_head=200");
console.log("well_known_schema_get=200");
console.log("well_known_schema_head=200");
console.log("mutation_authority_granted=false");
console.log("buy_void_automatic_fulfillment_enabled=false");
console.log("validator_activation_enabled=false");
console.log("src_index_direct_wiring=0");
console.log(proofMarker);
