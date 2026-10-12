#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const gatewayPath = path.join(
  repo,
  "ops/void-ai-agent-public-gateway-v1.mjs",
);
const gatewaySource = readFileSync(gatewayPath, "utf8");

const expectedPairs = [
  [
    "/public-node/agents/paid-work-v1.json",
    "public/public-node/agents/paid-work-v1.json",
  ],
  [
    "/public-node/agents/paid-work-v1.schema.json",
    "public/public-node/agents/paid-work-v1.schema.json",
  ],
];

const pairPattern =
  /\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,?\s*\]/g;
const observed = [
  ...gatewaySource.matchAll(pairPattern),
].map((match) => [match[1], match[2]]);

for (const [route, relativePath] of expectedPairs) {
  const matches = observed.filter(
    ([observedRoute, observedRelativePath]) =>
      observedRoute === route &&
      observedRelativePath === relativePath,
  );
  assert.equal(
    matches.length,
    1,
    `expected exactly one gateway route pair for ${route}`,
  );

  const payloadPath = path.join(repo, relativePath);
  const payload = JSON.parse(
    readFileSync(payloadPath, "utf8"),
  );
  assert.equal(
    typeof payload,
    "object",
    `expected JSON object payload for ${route}`,
  );
  assert.notEqual(
    payload,
    null,
    `expected non-null JSON payload for ${route}`,
  );
  assert.equal(
    Array.isArray(payload),
    false,
    `expected non-array JSON payload for ${route}`,
  );
}

const targetRoutes = new Set(
  expectedPairs.map(([route]) => route),
);
assert.equal(targetRoutes.size, 2);
assert.equal(
  expectedPairs.every(([route]) =>
    route.startsWith("/public-node/agents/paid-work-v1"),
  ),
  true,
);

console.log(
  "VOID_AGENT_PAID_WORK_GATEWAY_STATIC_ROUTES_V1",
);
console.log("target_route_pair_count=2");
console.log("target_route_pairs_exact=yes");
console.log("target_payloads_parse=yes");
console.log("read_only_routes=yes");
