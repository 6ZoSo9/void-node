#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const MARKER="VOID_PUBLIC_RELEASE_QUALIFICATION_V1";
function fail(m){console.error(`[FAIL] ${m}`);process.exit(1);}
function pass(m){console.log(`[PASS] ${m}`);}
function text(p){if(!fs.existsSync(p))fail(`missing file: ${p}`);return fs.readFileSync(p,"utf8");}
function need(p,needles){const t=text(p);for(const n of needles)if(!t.includes(n))fail(`${p} missing marker: ${n}`);pass(p);return t;}

const required=[
  "release/qualification/public-release-qualification-v1.schema.json",
  "release/qualification/templates/qualification-plan-v1.json",
  "release/qualification/templates/qualification-result-v1.json",
  "release/qualification/templates/qualification-approval-v1.json",
  "tools/void-release-qualification-v1.mjs",
  "ops/release/void-release-qualification-runner-v1.sh",
  "ops/release/void-release-qualification-dispatch-v1.sh",
  "ops/release/void-release-qualification-pr-v1.py",
  ".github/workflows/public-release-qualification-v1.yml",
  "scripts/prove_public_release_qualification_v1.mjs",
  "ops/security/public-release-qualification-v1-proof.sh",
  "docs/public/release-qualification-v1.md",
  "docs/operators/release-qualification-v1.md",
  "docs/security/public-release-qualification-v1-threat-model.md",
  "public/public-node/void-network/qualification/index.json",
  "public/public-node/void-network/qualification/index.html",
];
for(const p of required)if(!fs.existsSync(p))fail(`missing required wall file: ${p}`);
pass("required-qualification-files");

const tool=need("tools/void-release-qualification-v1.mjs",[
  "VOID_RELEASE_QUALIFICATION_PLAN_V1",
  "VOID_RELEASE_QUALIFICATION_RESULT_V1",
  "VOID_RELEASE_QUALIFICATION_RECEIPT_V1",
  "VOID_RELEASE_QUALIFICATION_APPROVAL_V1",
  "ubuntu-22.04-x64",
  "ubuntu-24.04-x64",
  "debian-12-x64",
  "windows-wsl2-ubuntu-24.04-x64",
  "upgrade-from-current-stable",
  "rollback-health-failure",
  "two-node-sync",
  "participant-ui-smoke",
  "reviewer must be distinct",
  "APPROVE RELEASE QUALIFICATION",
]);
for(const forbidden of ["release_tag_published_by_qualification: true","live_deployment: true","guarded_lanes_activated: true"]){if(tool.includes(forbidden))fail(`unsafe qualification control marker: ${forbidden}`);}
pass("qualification-control-fail-closed");

const promotion=need("tools/void-release-promotion-v1.mjs",[
  "VOID_RELEASE_QUALIFICATION_RECEIPT_V1",
  "VOID_RELEASE_QUALIFICATION_APPROVAL_V1",
  "qualificationReceipt",
  "qualificationApproval",
  "stable promotion requires qualification",
  "qualification_receipt_sha256",
  "qualification_approval_sha256",
]);
if(!promotion.includes("stable_promotion_requires_qualification: true"))fail("publication packet does not require qualification");
pass("stable-promotion-qualification-gate");

const updater=need("release/bin/void-node-update",[
  "qualification_receipt_sha256",
  "qualification_approval_sha256",
  "stable promotion requires qualification receipt and approval binding",
]);
if(!updater.includes("service_started_implicitly=false"))fail("updater safety marker missing");
pass("stable-channel-qualification-binding");

const workflow=need(".github/workflows/public-release-qualification-v1.yml",[
  "environment: void-release-qualification",
  "actions/checkout@v5",
  "actions/setup-node@v5",
  "actions/upload-artifact@v7",
  "QUALIFY VOID RELEASE",
  "external-target-boundary",
  "windows-wsl2-ubuntu-24.04-x64",
]);
if(/gh\s+release\s+create/.test(workflow)||/gh\s+pr\s+merge/.test(workflow))fail("qualification workflow publishes or merges directly");
pass("qualification-workflow-no-release-publish");

const runner=need("ops/release/void-release-qualification-runner-v1.sh",[
  "VOID_RELEASE_QUALIFICATION_RUNNER_V1",
  "gh release verify",
  "gh release verify-asset",
  "service_started_implicitly=false",
  "release_tag_published_by_qualification=false",
  "guarded_lanes_activated=false",
]);
if(/systemctl\s+(?:--user\s+)?(?:enable|start)/.test(runner))fail("qualification runner starts or enables service");
pass("qualification-runner-isolated-boundary");

need("ops/release/void-release-qualification-pr-v1.py",[
  "PUBLISH VOID RELEASE QUALIFICATION",
  "--match-head-commit",
  "release_tag_publish=false",
  "live_deployment=false",
  "money_movement=false",
]);

const schema=need("release/qualification/public-release-qualification-v1.schema.json",[
  "VOID_RELEASE_QUALIFICATION_PLAN_V1",
  "VOID_RELEASE_QUALIFICATION_RESULT_V1",
  "VOID_RELEASE_QUALIFICATION_RECEIPT_V1",
  "VOID_RELEASE_QUALIFICATION_APPROVAL_V1",
]);
JSON.parse(schema);
pass("qualification-schema-json");

need("docs/public/release-qualification-v1.md",[
  "Ubuntu 22.04",
  "Windows WSL2",
  "two-node",
  "distinct reviewer",
  "Stable promotion",
]);
need("docs/operators/release-qualification-v1.md",[
  "APPROVE RELEASE QUALIFICATION",
  "qualification-receipt-v1.json",
  "qualification-approval-v1.json",
  "--qualification-receipt",
  "--qualification-approval",
]);
need("docs/security/public-release-qualification-v1-threat-model.md",[
  "Single-host false confidence",
  "Evidence substitution",
  "One-person run and approval",
  "Stable-promotion bypass",
]);
need("public/public-node/void-network/qualification/index.json",[
  "VOID_PUBLIC_RELEASE_QUALIFICATION_INDEX_V1",
  "implemented_proof_gated",
  "stable_promotion_requires_qualification",
]);

for(const p of ["README.md","docs/public/README.md","docs/public/quick-start.md","docs/site/voidchain/index.html"]){
  if(!text(p).includes("VOID_PUBLIC_RELEASE_QUALIFICATION_CANARY_WALL_V1"))fail(`${p} lacks qualification wall discoverability marker`);
}
pass("public-discoverability");

const make=text("Makefile");
for(const n of ["public-release-qualification-v1-proof:","public-release-qualification-v1-static-proof:"]){if(!make.includes(n))fail(`Makefile missing ${n}`);}
pass("makefile-wiring");

console.log(`${MARKER}_STATIC_GREEN`);
