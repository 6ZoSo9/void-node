import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const MARKER = "VOID_NODE_COMPATIBILITY_REPOSITORY_CONTRACT_V2";
const EXPECTED_ENGINE = "^22.0.0 || ^24.0.0 || ^26.0.0";
const SUPPORTED_MAJORS = Object.freeze([22, 24, 26]);
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

const coreActionWorkflows = [
  ".github/workflows/beta-proof-guards.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/guard-index.yml",
  ".github/workflows/license-guard.yml",
  ".github/workflows/ops-guards-autostart.yml",
  ".github/workflows/ops-guards-header3-gap.yml",
  ".github/workflows/ops-guards-proposer-loop.yml",
  ".github/workflows/ops-guards.yml",
  ".github/workflows/ops-verify.yml",
  ".github/workflows/prom-guards.yml",
  ".github/workflows/prom-verify.yml",
  ".github/workflows/public-first-official-release-rehearsal-v1.yml",
  ".github/workflows/public-release-canary-v1.yml",
  ".github/workflows/public-release-qualification-v1.yml",
  ".github/workflows/public-repo-hygiene.yml",
  ".github/workflows/secret-check.yml",
];

const retiredSelfHostedBetaWorkflow = ".github/workflows/self-hosted-beta-proof.yml";

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
const rootLock = readJson("package-lock.json");
const sourcePackage = readJson("src/package.json");
const nvmVersion = read(".nvmrc").trim();
const dockerfile = read("Dockerfile");
const launcher = read("run-void-node.sh");
const participant = read("void-participant.sh");

assert.equal(
  existsSync(join(ROOT, retiredSelfHostedBetaWorkflow)),
  false,
  `${retiredSelfHostedBetaWorkflow} must remain retired`,
);

assert.equal(rootPackage.engines?.node, EXPECTED_ENGINE);
assert.equal(rootLock.packages?.[""]?.engines?.node, EXPECTED_ENGINE);
assert.equal(sourcePackage.engines?.node, EXPECTED_ENGINE);
assert.match(rootPackage.devDependencies?.["@types/node"] ?? "", /^\^22\./);
assert.match(sourcePackage.devDependencies?.["@types/node"] ?? "", /^\^22\./);
assert.equal(nvmVersion, "24");
assert.equal((dockerfile.match(/^FROM node:24-alpine(?:\s|$)/gm) ?? []).length, 2);
assert.equal(dockerfile.includes("FROM node:20"), false);
assert.ok(launcher.includes('SUPPORTED_NODE_MAJORS="22 24 26"'));
assert.ok(launcher.includes('NODE_VERSION="v24.18.0"'));
assert.ok(launcher.includes('RUNTIME_SOURCE="repo_local_node24"'));
assert.equal(launcher.includes("v22.23.2"), false);
assert.ok(participant.includes("node-v24.18.0-linux-x64/bin/node"));
assert.equal(participant.includes("node-v22.23.2"), false);

const workflowPaths = walk(".github/workflows").filter((path) => /\.ya?ml$/.test(path));
const unsupportedStaticNodeVersions = [];
const staticNodeVersion = /^\s*node-version:\s*(?:"([0-9]+)(?:\.[^"]*)?"|'([0-9]+)(?:\.[^']*)?'|([0-9]+)(?:\.[0-9A-Za-z*+_.-]+)?)\s*(?:#.*)?$/gm;

for (const workflowPath of workflowPaths) {
  const workflow = read(workflowPath);
  let match;
  while ((match = staticNodeVersion.exec(workflow)) !== null) {
    const major = Number(match[1] ?? match[2] ?? match[3]);
    if (!SUPPORTED_MAJORS.includes(major)) {
      unsupportedStaticNodeVersions.push(`${workflowPath}:${major}`);
    }
  }
}
assert.deepEqual(
  unsupportedStaticNodeVersions,
  [],
  `unsupported static Node.js workflow declarations remain: ${unsupportedStaticNodeVersions.join(", ")}`,
);

for (const workflowPath of migratedWorkflows) {
  const workflow = read(workflowPath);
  assert.ok(workflow.includes("uses: actions/checkout@v6"), workflowPath);
  assert.ok(workflow.includes("uses: actions/setup-node@v6"), workflowPath);
  assert.equal(workflow.includes("actions/checkout@v4"), false, workflowPath);
  assert.equal(workflow.includes("actions/setup-node@v4"), false, workflowPath);
}

const legacyCoreActions = [
  "actions/checkout@v4",
  "actions/checkout@v5",
  "actions/setup-node@v4",
  "actions/setup-node@v5",
];
for (const workflowPath of coreActionWorkflows) {
  const workflow = read(workflowPath);
  assert.ok(workflow.includes("uses: actions/checkout@v6"), workflowPath);
  for (const legacyAction of legacyCoreActions) {
    assert.equal(workflow.includes(legacyAction), false, `${workflowPath}: ${legacyAction}`);
  }
}

const compatibilityWorkflow = read(".github/workflows/node22-repository-contract-v1.yml");
assert.ok(compatibilityWorkflow.includes("node-version: ${{ matrix.node }}"));
assert.ok(compatibilityWorkflow.includes("node: [22, 24, 26]"));
assert.ok(compatibilityWorkflow.includes("npm ci --ignore-scripts --no-audit --no-fund"));
assert.ok(compatibilityWorkflow.includes("npm run build"));
assert.ok(compatibilityWorkflow.includes("npm run typecheck"));

const cloneWorkflow = read(".github/workflows/void-node-clone-and-run-v1.yml");
assert.ok(cloneWorkflow.includes("host-node: [20, 22, 24, 26]"));
assert.ok(cloneWorkflow.includes("runtime_source=repo_local_node24"));
assert.ok(cloneWorkflow.includes("runtime_source=host_node${{ matrix.host-node }}"));

console.log(
  JSON.stringify(
    {
      marker: MARKER,
      expected_engine: EXPECTED_ENGINE,
      root_lockfile_engine: rootLock.packages?.[""]?.engines?.node,
      supported_node_majors: SUPPORTED_MAJORS,
      default_node_major: Number(nvmVersion),
      docker_node24_stage_count: 2,
      workflow_count: workflowPaths.length,
      migrated_workflow_count: migratedWorkflows.length,
      core_action_workflow_count: coreActionWorkflows.length,
      retired_self_hosted_beta_workflow_absent: true,
      unsupported_static_node_workflow_count: unsupportedStaticNodeVersions.length,
      invalid_fallback_pin_removed: true,
      status: "GREEN",
    },
    null,
    2,
  ),
);
