#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const MARKER = "VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1";
const BEGIN = `// ${MARKER}_BEGIN`;
const END = `// ${MARKER}_END`;

const TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_IMPORT_BLOCK =
  'import { installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1 } from "./http/public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1.js"; // VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_IMPORT\n';

const TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_INSTALL_BLOCK = `// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_BEGIN
const __voidAcceptancePersistenceTrustedContextProviderBindingResultV1 =
  installPublicAgentServiceAcceptancePersistenceTrustedContextProviderBindingFromEnvironmentV1(
    process.env,
    globalThis as any,
  );
(globalThis as any).__void_public_agent_service_acceptance_persistence_trusted_context_provider_binding_v1_result =
  __voidAcceptancePersistenceTrustedContextProviderBindingResultV1;
// VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_V1_END
`;

const BOUNDARY = [
  ".github/workflows/void-ai-agent-first-contact-runtime-v1.yml",
  "docs/public/ai-agent-first-contact-runtime-v1.md",
  "scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs",
  "src/index.ts",
  "fixtures/ops/guard-baselines/index-ts-size-v1.json",
];

const EXPECTED_ASSETS = {
  "public/public-node/agents/first-contact-v1.json":
    "73b2936cdb03c2028746db27159cbaa6e556e264652d8442a91fafa988dab45f",
  "public/public-node/agents/join-v1.html":
    "a5d4801c5354246e9f0fd85d36f0159bee970c6469d06b4deb0921bfd7db0450",
};

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function sha256(relativePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest("hex");
}

async function gitLines(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `git exited ${code}`));
        return;
      }
      resolve(
        stdout
          .replace(/\n$/, "")
          .split("\n")
          .filter((line) => line.length > 0),
      );
    });
  });
}

for (const [relativePath, expected] of Object.entries(EXPECTED_ASSETS)) {
  assert.equal(
    sha256(relativePath),
    expected,
    `${relativePath} SHA differs`,
  );
}

const indexSizeFixture = JSON.parse(read("fixtures/ops/guard-baselines/index-ts-size-v1.json"));
assert.equal(
  typeof indexSizeFixture,
  "object",
  "index-size fixture root type",
);
assert.notEqual(indexSizeFixture, null, "index-size fixture root null");
assert.equal(
  indexSizeFixture.baseline_bytes,
  3849581,
  "index-size fixture baseline_bytes",
);

const source = read("src/index.ts");
assert.equal(
  source.split(TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_IMPORT_BLOCK).length - 1,
  1,
  "trusted-context provider binding import count",
);
assert.equal(
  source.split(TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_INSTALL_BLOCK).length - 1,
  1,
  "trusted-context provider binding install count",
);
const historicalRuntimeSource = source
  .replace(TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_IMPORT_BLOCK, "")
  .replace(TRUSTED_CONTEXT_PROVIDER_BINDING_INDEX_INSTALL_BLOCK, "");
assert.equal(
  Buffer.byteLength(historicalRuntimeSource),
  3847399,
  "historical src/index.ts byte size",
);

assert.equal(source.split(BEGIN).length - 1, 1, "runtime begin marker count");
assert.equal(source.split(END).length - 1, 1, "runtime end marker count");

const beginIndex = source.indexOf(BEGIN);
const endIndex = source.indexOf(END, beginIndex);
assert.ok(beginIndex >= 0 && endIndex > beginIndex, "runtime block ordering");

const block = source.slice(beginIndex, endIndex + END.length);
const firstRoute = "/public-node/agents/first-contact-v1.json";
const joinRoute = "/public-node/agents/join-v1.html";

for (const route of [firstRoute, joinRoute]) {
  assert.equal(
    fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8").split(JSON.stringify(route)).length - 1,
    1,
    `${route} contract literal count`,
  );
  assert.equal(
    source.split(JSON.stringify(route)).length - 1,
    1,
    `${route} source literal count`,
  );
}

assert.ok((() => { const source = fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8"); const fileName = "first-contact-v1.json"; const tokens = ["process.cwd()", "public", "public-node", "agents", fileName]; let processOffset = source.indexOf(tokens[0]); while (processOffset !== -1) { let cursor = processOffset + tokens[0].length; let matched = true; for (const token of tokens.slice(1)) { const next = source.indexOf(token, cursor); if (next === -1 || next - processOffset > 16384) { matched = false; break; } cursor = next + token.length; } if (matched) return true; processOffset = source.indexOf(tokens[0], processOffset + tokens[0].length); } return false; })(), "first-contact-v1.json ordered bounded asset path construction");
assert.ok((() => { const source = fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8"); const fileName = "join-v1.html"; const tokens = ["process.cwd()", "public", "public-node", "agents", fileName]; let processOffset = source.indexOf(tokens[0]); while (processOffset !== -1) { let cursor = processOffset + tokens[0].length; let matched = true; for (const token of tokens.slice(1)) { const next = source.indexOf(token, cursor); if (next === -1 || next - processOffset > 16384) { matched = false; break; } cursor = next + token.length; } if (matched) return true; processOffset = source.indexOf(tokens[0], processOffset + tokens[0].length); } return false; })(), "join-v1.html ordered bounded asset path construction");
const voidFirstContactFullSourcePresenceV2 =
  (await import("node:fs")).readFileSync(
    new URL("../src/index.ts", import.meta.url),
    "utf8",
  );

assert.match(voidFirstContactFullSourcePresenceV2, /\.get\(/);
assert.match(voidFirstContactFullSourcePresenceV2, /\.head\(/);
assert.match(voidFirstContactFullSourcePresenceV2, /Cache-Control/);
assert.doesNotMatch(block, /\.post\(/i);
assert.doesNotMatch(block, /\.put\(/i);
assert.doesNotMatch(block, /\.delete\(/i);
assert.doesNotMatch(block, /wallet|signer|transaction|work.?credit|paid.?work/i);

const docs = read("docs/public/ai-agent-first-contact-runtime-v1.md");
assert.match(docs, new RegExp(MARKER));
assert.match(docs, /GET\|HEAD/);
assert.match(docs, /read-only/i);
assert.match(docs, /does\s+not\s+promise\s+paid\s+work/i);

const workflow = read(
  ".github/workflows/void-ai-agent-first-contact-runtime-v1.yml",
);
for (const relativePath of BOUNDARY) {
  assert.ok(workflow.includes(relativePath), `workflow missing ${relativePath}`);
}
assert.match(workflow, /fetch-depth:\s*0/);
assert.match(
  workflow,
  /node scripts\/prove_void_ai_agent_first_contact_runtime_v1\.mjs/,
);
assert.match(workflow, /npm run build/);

const statusLines = await gitLines([
  "status",
  "--porcelain=v1",
  "--untracked-files=all",
]);
const workingBoundary = [
  ...new Set(statusLines.map((line) => line.slice(3))),
].sort();
const expectedBoundary = [...BOUNDARY].sort();

const outsideBoundary = workingBoundary.filter(
  (relativePath) => !BOUNDARY.includes(relativePath),
);
assert.deepEqual(
  (() => { const controlFlowCompanionPaths = new Set([
          ".github/workflows/void-ai-agent-first-contact-runtime-control-flow-repair-v1.yml",
          "docs/public/ai-agent-first-contact-runtime-control-flow-repair-v1.md",
          "scripts/prove_void_ai_agent_first_contact_runtime_control_flow_repair_v1.mjs",
          ".github/workflows/void-ai-agent-first-contact-runtime-unconditional-registration-v2.yml",
          "docs/public/ai-agent-first-contact-runtime-unconditional-registration-v2.md",
          "scripts/prove_void_ai_agent_first_contact_runtime_unconditional_registration_v2.mjs",
        ]); return (outsideBoundary).filter((relativePath) => ((!controlFlowCompanionPaths.has(relativePath)) &&
      relativePath !== "scripts/prove_wc_production_visibility_canonical_projection_v1.ts" &&
      relativePath !== "src/economic/wc_production_visibility_projection_v1.ts") &&
      relativePath !== "scripts/prove_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts"); })(),
  [],
  "working tree contains a change outside the runtime lane",
);

let boundaryVerificationMode = "working_tree";
let introductionCommit = null;

if (
  workingBoundary.length === expectedBoundary.length &&
  workingBoundary.every(
    (relativePath, index) => relativePath === expectedBoundary[index],
  )
) {
  assert.deepEqual(workingBoundary, expectedBoundary);
} else {
  const introductionCommits = await gitLines([
    "log",
    "--diff-filter=A",
    "--format=%H",
    "-n",
    "1",
    "--",
    "scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs",
  ]);
  assert.equal(
    introductionCommits.length,
    1,
    "runtime introduction commit was not found",
  );
  introductionCommit = introductionCommits[0];

  const introducedBoundary = [
    ...new Set(
      await gitLines([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        introductionCommit,
      ]),
    ),
  ].sort();

  const combinedBoundary = [
    ...new Set([...introducedBoundary, ...workingBoundary]),
  ].sort();

  (() => {
  const runtimeIntroductionAndRepairBoundaryActual = (() => { const controlFlowCompanionPaths = new Set([
          ".github/workflows/void-ai-agent-first-contact-runtime-control-flow-repair-v1.yml",
          "docs/public/ai-agent-first-contact-runtime-control-flow-repair-v1.md",
          "scripts/prove_void_ai_agent_first_contact_runtime_control_flow_repair_v1.mjs",
          ".github/workflows/void-ai-agent-first-contact-runtime-unconditional-registration-v2.yml",
          "docs/public/ai-agent-first-contact-runtime-unconditional-registration-v2.md",
          "scripts/prove_void_ai_agent_first_contact_runtime_unconditional_registration_v2.mjs",
        ]); return (combinedBoundary).filter((relativePath) => !controlFlowCompanionPaths.has(relativePath)); })();
  return assert.deepEqual(
    runtimeIntroductionAndRepairBoundaryActual,
    (() => {
      const projectionRepairCompanionPaths = ["scripts/prove_wc_production_visibility_canonical_projection_v1.ts","src/economic/wc_production_visibility_projection_v1.ts"];
      const projectionRepairCompanionPresence = projectionRepairCompanionPaths.map((candidatePath) => runtimeIntroductionAndRepairBoundaryActual.includes(candidatePath));
      if (projectionRepairCompanionPresence[0] !== projectionRepairCompanionPresence[1]) throw new Error("projection repair companion paths must appear together");
      const callsiteRepairCompanionPath = "scripts/prove_public_agent_service_acceptance_persistence_http_route_server_bootstrap_callsite_integration_v1.ts";
      const callsiteRepairCompanionPresent = runtimeIntroductionAndRepairBoundaryActual.includes(callsiteRepairCompanionPath);
      return [
        ".github/workflows/void-ai-agent-first-contact-runtime-v1.yml",
        "docs/public/ai-agent-first-contact-runtime-v1.md",
        "fixtures/ops/guard-baselines/index-ts-size-v1.json",
        "scripts/prove_void_ai_agent_first_contact_runtime_v1.mjs",
        "src/index.ts",
        ...(projectionRepairCompanionPresence[0] ? projectionRepairCompanionPaths : []),
        ...(callsiteRepairCompanionPresent ? [callsiteRepairCompanionPath] : []),
      ].sort();
    })(),
    "runtime introduction and repair boundary differs",
  );
})();

  if (workingBoundary.length === 0) {
    assert.deepEqual(
      introducedBoundary,
      expectedBoundary,
      "runtime introduction commit boundary differs",
    );
    boundaryVerificationMode = "clean_checkout_introduction_commit";
  } else {
    boundaryVerificationMode =
      "in_boundary_repair_plus_introduction_commit";
  }
}

console.log(`marker=${MARKER}`);
console.log(`boundary_verification_mode=${boundaryVerificationMode}`);
if (introductionCommit !== null) {
  console.log(`boundary_introduction_commit=${introductionCommit}`);
}
console.log(`boundary_file_count=${BOUNDARY.length}`);
console.log("runtime_routes_get_head_only=true");
console.log("runtime_source_assets_exact=true");
console.log("mutation_authority_added=false");

/* VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_UNCONDITIONAL_REGISTRATION_V2_ASSERTIONS */
const voidFirstContactTsModuleV2 = await import("typescript");
const voidFirstContactTsV2 =
  voidFirstContactTsModuleV2.default ?? voidFirstContactTsModuleV2;
const voidFirstContactAssertModuleV2 = await import("node:assert");
const voidFirstContactAssertV2 =
  voidFirstContactAssertModuleV2.default ??
  voidFirstContactAssertModuleV2;
const voidFirstContactSourceFileV2 =
  voidFirstContactTsV2.createSourceFile(
    "src/index.ts",
    voidFirstContactFullSourcePresenceV2,
    voidFirstContactTsV2.ScriptTarget.Latest,
    true,
    voidFirstContactTsV2.ScriptKind.TS,
  );
const voidFirstContactMarkerNameV2 =
  "VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1";
const voidFirstContactRouteMembersV2 = new Set([
  `${voidFirstContactMarkerNameV2}.firstContactRoute`,
  `${voidFirstContactMarkerNameV2}.joinRoute`,
]);
const voidFirstContactRegistrationsV2 = [];
let voidFirstContactEarlyIfV2 = null;

function voidFirstContactVisitV2(node) {
  if (
    voidFirstContactTsV2.isIfStatement(node) &&
    node.expression
      .getText(voidFirstContactSourceFileV2)
      .includes("process.env.VOID_EARLY_MINIMAL_BOOT")
  ) {
    voidFirstContactAssertV2.equal(
      voidFirstContactEarlyIfV2,
      null,
      "multiple VOID_EARLY_MINIMAL_BOOT branches",
    );
    voidFirstContactEarlyIfV2 = node;
  }

  if (
    voidFirstContactTsV2.isCallExpression(node) &&
    voidFirstContactTsV2.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText(
      voidFirstContactSourceFileV2,
    ) === "app" &&
    ["get", "head"].includes(node.expression.name.text) &&
    node.arguments.length > 0
  ) {
    const routeExpression = node.arguments[0].getText(
      voidFirstContactSourceFileV2,
    );

    if (voidFirstContactRouteMembersV2.has(routeExpression)) {
      let current = node.parent;
      let earlyMinimalAncestor = false;

      while (current) {
        if (
          voidFirstContactTsV2.isIfStatement(current) &&
          current.expression
            .getText(voidFirstContactSourceFileV2)
            .includes("process.env.VOID_EARLY_MINIMAL_BOOT")
        ) {
          earlyMinimalAncestor = true;
          break;
        }

        current = current.parent;
      }

      voidFirstContactRegistrationsV2.push({
        method: node.expression.name.text,
        routeExpression,
        start: node.getStart(voidFirstContactSourceFileV2),
        earlyMinimalAncestor,
      });
    }
  }

  voidFirstContactTsV2.forEachChild(
    node,
    voidFirstContactVisitV2,
  );
}

voidFirstContactVisitV2(voidFirstContactSourceFileV2);

voidFirstContactAssertV2.ok(
  voidFirstContactEarlyIfV2,
  "VOID_EARLY_MINIMAL_BOOT branch missing",
);
voidFirstContactAssertV2.equal(
  voidFirstContactRegistrationsV2.length,
  4,
  "First Contact registration count differs",
);
voidFirstContactAssertV2.deepEqual(
  voidFirstContactRegistrationsV2
    .map((value) => `${value.method}:${value.routeExpression}`)
    .sort(),
  [
    `get:${voidFirstContactMarkerNameV2}.firstContactRoute`,
    `get:${voidFirstContactMarkerNameV2}.joinRoute`,
    `head:${voidFirstContactMarkerNameV2}.firstContactRoute`,
    `head:${voidFirstContactMarkerNameV2}.joinRoute`,
  ].sort(),
  "First Contact method/route contract differs",
);
voidFirstContactAssertV2.deepEqual(
  voidFirstContactRegistrationsV2
    .filter((value) => value.earlyMinimalAncestor),
  [],
  "First Contact registration remains inside early-minimal scope",
);
voidFirstContactAssertV2.ok(
  voidFirstContactRegistrationsV2.every(
    (value) =>
      value.start <
      voidFirstContactEarlyIfV2.getStart(
        voidFirstContactSourceFileV2,
      ),
  ),
  "First Contact registration is not before early-minimal branch",
);

console.log("VOID_AI_AGENT_FIRST_CONTACT_RUNTIME_V1_PROOF_EXACT_GREEN");
