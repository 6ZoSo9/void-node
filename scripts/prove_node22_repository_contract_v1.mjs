import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MARKER = "VOID_NODE22_REPOSITORY_CONTRACT_V1";
const EXPECTED_ENGINE = ">=22 <23";
const ROOT = process.cwd();

const migratedWorkflows = [
  ".github/workflows/buy-void-native-execution-runtime-v1.yml",
  ".github/workflows/buy-void-native-execution-worker-v1.yml",
  ".github/workflows/external-opportunity-paper-classification-journal-file-store-v1.yml",
  ".github/workflows/external-opportunity-paper-classification-journal-v1.yml",
  ".github/workflows/external-opportunity-paper-risk-classification-adapter-v1.yml",
  ".github/workflows/external-opportunity-provider-risk-registry-v1.yml",
  ".github/workflows/paid-datanet-fulfillment-receipt-v1.yml",
  ".github/workflows/paid-datanet-object-integrity-fulfillment-cli-v1.yml",
  ".github/workflows/paid-datanet-operator-workflow-cli-v1.yml",
  ".github/workflows/paid-datanet-public-pilot-admission-decision-cli-v1.yml",
  ".github/workflows/paid-datanet-public-pilot-intake-v1.yml",
  ".github/workflows/paid-datanet-public-pilot-payment-confirmation-cli-v1.yml",
  ".github/workflows/paid-datanet-public-pilot-quote-approval-cli-v1.yml",
  ".github/workflows/paid-datanet-public-pilot-quote-bridge-cli-v1.yml",
  ".github/workflows/paid-datanet-public-pilot-triage-cli-v1.yml",
  ".github/workflows/paid-datanet-quote-cli-v1.yml",
  ".github/workflows/paid-datanet-quote-packet-v1.yml",
  ".github/workflows/paid-datanet-request-admission-v1.yml",
  ".github/workflows/public-agent-service-order-status-readonly-accepted-for-review-producer-v1.yml",
  ".github/workflows/public-agent-service-order-status-readonly-disabled-deployment-v1.yml",
  ".github/workflows/public-agent-service-order-status-readonly-disabled-runtime-readiness-v1.yml",
  ".github/workflows/public-agent-service-order-status-readonly-http-integration-v1.yml",
  ".github/workflows/public-agent-service-order-status-readonly-request-handler-v1.yml",
  ".github/workflows/public-agent-service-order-status-readonly-route-registrar-v1.yml",
  ".github/workflows/public-agent-service-order-status-readonly-source-resolver-v1.yml",
  ".github/workflows/void-datanet-paid-read-explicit-public-routes-v1.yml",
  ".github/workflows/void-datanet-paid-read-quote-public-discovery-v1.yml",
  ".github/workflows/void-datanet-paid-read-quote-v1.yml",
  ".github/workflows/void-tor-order-status-onion-readonly-v1.yml",
];

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function walk(directory) {
  const absolute = join(ROOT, directory);
  const files = [];

  for (const entry of readdirSync(absolute).sort()) {
    const entryPath = join(absolute, entry);
    if (statSync(entryPath).isDirectory()) {
      files.push(...walk(relative(ROOT, entryPath)));
    } else {
      files.push(relative(ROOT, entryPath).split("\\").join("/"));
    }
  }

  return files;
}

const rootPackage = readJson("package.json");
const sourcePackage = readJson("src/package.json");
const nvmVersion = read(".nvmrc").trim();
const dockerfile = read("Dockerfile");

assert.equal(rootPackage.engines?.node, EXPECTED_ENGINE);
assert.equal(sourcePackage.engines?.node, EXPECTED_ENGINE);
assert.match(rootPackage.devDependencies?.["@types/node"] ?? "", /^\^22\./);
assert.match(sourcePackage.devDependencies?.["@types/node"] ?? "", /^\^22\./);
assert.equal(nvmVersion, "22");
assert.equal((dockerfile.match(/^FROM node:22-alpine(?:\s|$)/gm) ?? []).length, 2);
assert.equal(dockerfile.includes("FROM node:20"), false);

const workflowPaths = walk(".github/workflows").filter((path) =>
  /\.ya?ml$/.test(path),
);
const staticNode20 =
  /^\s*node-version:\s*(?:"20(?:\.[^"]*)?"|'20(?:\.[^']*)?'|20(?:\.[0-9A-Za-z*+_.-]+)?)\s*(?:#.*)?$/m;
const node20Violations = [];

for (const workflowPath of workflowPaths) {
  if (staticNode20.test(read(workflowPath))) {
    node20Violations.push(workflowPath);
  }
}

assert.deepEqual(
  node20Violations,
  [],
  `static Node.js 20 workflow declarations remain: ${node20Violations.join(", ")}`,
);

for (const workflowPath of migratedWorkflows) {
  const workflow = read(workflowPath);
  assert.ok(workflow.includes("uses: actions/checkout@v6"), workflowPath);
  assert.ok(workflow.includes("uses: actions/setup-node@v6"), workflowPath);
  assert.match(workflow, /^\s*node-version:\s*(?:"22"|'22'|22)\s*$/m, workflowPath);
  assert.equal(workflow.includes("actions/checkout@v4"), false, workflowPath);
  assert.equal(workflow.includes("actions/setup-node@v4"), false, workflowPath);
}

const intakeProof = read("scripts/prove_paid_datanet_public_pilot_intake_v1.ts");
for (const expected of [
  "uses: actions/checkout@v6",
  "uses: actions/setup-node@v6",
  'node-version: "22"',
]) {
  assert.ok(intakeProof.includes(expected), `intake proof missing ${expected}`);
}

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      expected_engine: EXPECTED_ENGINE,
      nvm_version: nvmVersion,
      docker_node22_stage_count: 2,
      workflow_count: workflowPaths.length,
      migrated_workflow_count: migratedWorkflows.length,
      static_node20_workflow_count: node20Violations.length,
      status: "GREEN",
    },
    null,
    2,
  ),
);
