#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = path.join(ROOT, ".github", "workflows", "apollyon-readonly-sentry-node-collector-v1.yml");
const source = fs.readFileSync(WORKFLOW, "utf8");

const requiredPaths = [
  ".github/workflows/apollyon-readonly-sentry-node-collector-v1.yml",
  "docs/security/apollyon-readonly-sentry-node-collector-v1.md",
  "src/security/apollyon_readonly_sentry_node_collector_v1.ts",
  "scripts/prove_apollyon_readonly_sentry_node_collector_v1.ts",
  "scripts/prove_apollyon_readonly_sentry_node_collector_ci_self_enforcement_v1.mjs",
  "src/security/apollyon_readonly_sentry_observation_v1.ts",
  "scripts/prove_apollyon_readonly_sentry_observation_v1.ts",
  "src/security/chain2050_role_authority_record_v1.ts",
  "src/index.js",
  "src/node_core.ts",
  "scripts/ci_diff_hygiene_v1.sh",
  "scripts/prove_ci_diff_hygiene_v1.mjs",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
];

for (const item of requiredPaths) {
  assert.equal(
    source.includes(`- \"${item}\"`) || source.includes(`- '${item}'`),
    true,
    `workflow must watch ${item}`,
  );
}

assert.match(source, /pull_request:/);
assert.match(source, /push:\s*\n\s*branches:\s*\n\s*- main/);
assert.doesNotMatch(source, /workflow_dispatch:/);
assert.match(source, /node:\s*\[22, 24, 26\]/);
assert.match(
  source,
  /npx --no-install tsx scripts\/prove_apollyon_readonly_sentry_node_collector_v1\.ts/,
);
assert.match(
  source,
  /npx --no-install tsx scripts\/prove_apollyon_readonly_sentry_observation_v1\.ts/,
);
assert.match(
  source,
  /node scripts\/prove_apollyon_readonly_sentry_node_collector_ci_self_enforcement_v1\.mjs/,
);
assert.match(source, /npm run typecheck/);
assert.match(source, /node scripts\/prove_ci_diff_hygiene_v1\.mjs/);
assert.match(source, /bash scripts\/ci_diff_hygiene_v1\.sh/);
assert.match(source, /CI_DIFF_PR_BASE_SHA:\s*\$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
assert.match(source, /persist-credentials:\s*false/);
assert.match(source, /actions\/checkout@[a-f0-9]{40}/);
assert.match(source, /actions\/setup-node@[a-f0-9]{40}/);

for (const name of [
  "Re-prove Apollyon sentry observation",
  "Typecheck repository",
  "Prove collector CI self-enforcement",
  "Prove committed-range hygiene contract",
]) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(source, new RegExp(`- name: ${escaped}\\n\\s*if: matrix\\.node == 24`));
}

console.log("VOID_APOLLYON_READONLY_SENTRY_NODE_COLLECTOR_CI_SELF_ENFORCEMENT_V1_GREEN");
console.log("workflow_self_watched=true");
console.log("node_matrix_22_24_26=true");
console.log("node_route_surfaces_watched=true");
console.log("sentry_dependency_watched=true");
console.log("diff_hygiene_fail_closed=true");
console.log("model_invoked=false");
console.log("authority_granted=false");
