#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";

const MARKER="VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_V1";
function fail(m){console.error(`[FAIL] ${m}`);process.exit(1);}
function pass(m){console.log(`[PASS] ${m}`);}
function text(p){if(!fs.existsSync(p))fail(`missing file: ${p}`);return fs.readFileSync(p,"utf8");}
function need(p,needles){const t=text(p);for(const n of needles)if(!t.includes(n))fail(`${p} missing marker: ${n}`);pass(p);return t;}

const required=[
  "release/promotion/public-release-promotion-v1.schema.json",
  "release/promotion/templates/publication-receipt-v1.json",
  "release/promotion/templates/canary-receipt-v1.json",
  "tools/void-release-promotion-v1.mjs",
  "ops/release/void-release-dispatch-v1.sh",
  "ops/release/void-release-promotion-pr-v1.py",
  ".github/workflows/public-release-publication-promotion-v1.yml",
  ".github/workflows/public-release-canary-v1.yml",
  "scripts/prove_public_release_publication_promotion_v1.mjs",
  "ops/security/public-release-publication-promotion-v1-proof.sh",
  "docs/public/release-publication-promotion-v1.md",
  "docs/operators/release-publication-promotion-v1.md",
  "docs/security/public-release-publication-promotion-v1-threat-model.md",
  "public/public-node/void-network/release-publication-promotion-v1.json",
  "public/public-node/void-network/release-publication-promotion-v1.html",
];
for(const p of required)if(!fs.existsSync(p))fail(`missing required wall file: ${p}`);
pass("required-publication-promotion-files");

const control=need("tools/void-release-promotion-v1.mjs",[
  "VOID_RELEASE_PUBLICATION_PACKET_V1","VOID_RELEASE_PUBLICATION_RECEIPT_V1","VOID_RELEASE_CANARY_RECEIPT_V1",
  "VOID_RELEASE_PROMOTION_LEDGER_V1","PROMOTE ${packet.release_tag} TO","FREEZE VOID RELEASE CHANNELS",
  "REVOKE ${tag}","ROLL BACK VOID STABLE TO ${tag}","history_tip_sha256",
]);
if(control.includes("tag_replacement_allowed: true")||control.includes("asset_replacement_allowed: true"))fail("control plane allows replacement");
pass("control-plane-fail-closed-contract");

const workflow=need(".github/workflows/public-release-publication-promotion-v1.yml",[
  "environment: void-release-publication","VOID_RELEASE_ADMIN_TOKEN","repos/${GITHUB_REPOSITORY}/immutable-releases",
  "actions/checkout@v5","actions/setup-node@v5","actions/attest@v4","actions/upload-artifact@v7",
  "gh release create","--verify-tag","--latest=false","gh release verify","gh release verify-asset",
  "PUBLISH VOID RELEASE ${TAG} AT ${SOURCE_COMMIT}","stable_promoted=false",
]);
for(const forbidden of ["gh release upload","--clobber","git tag -f","gh release delete","--latest=true"]){if(workflow.includes(forbidden))fail(`publication workflow contains forbidden mutation: ${forbidden}`);}
pass("immutable-workflow-no-replacement-contract");

const canary=need(".github/workflows/public-release-canary-v1.yml",[
  "environment: void-release-canary","gh release verify","gh release verify-asset","VOID_RELEASE_CANARY_RECEIPT_V1",
  "make public-release-update-channel-v1-proof","service_started_implicitly","guarded_lanes_activated",
]);
if(/systemctl\s+(?:--user\s+)?(?:enable|start)/.test(canary))fail("canary workflow starts or enables a service");
pass("canary-no-live-deployment-contract");

const dispatcher=need("ops/release/void-release-dispatch-v1.sh",[
  "VOID_RELEASE_PUBLICATION_DISPATCH_V1_GREEN","VOID_RELEASE_CANARY_DISPATCH_V1_GREEN",
  "immutable-releases","gh workflow run","PUBLISH VOID RELEASE",
]);
if(dispatcher.includes("gh release create"))fail("dispatcher directly publishes a release");
pass("dispatcher-protected-workflow-only");

need("ops/release/void-release-promotion-pr-v1.py",[
  "PUBLISH VOID RELEASE CHANNEL STATE","stale_outer_status_repaired","--match-head-commit",
  "release_tag_publish=false","live_deployment=false","money_movement=false",
]);

const updater=need("release/bin/void-node-update",[
  "publication.release_immutable","publication.revoked","--allow-candidate",
  "candidate channel apply requires --allow-candidate","channel_frozen",
]);
if(!updater.includes("service_started_implicitly=false"))fail("updater safety marker missing");
const channelSchema=need("release/channel/public-release-channel-v1.schema.json",[
  '"publication"','"promotion"','"channel_frozen"','"release_immutable"','"revoked"',
]);
JSON.parse(channelSchema);
pass("update-channel-publication-binding");

need("docs/public/release-publication-promotion-v1.md",[
  "immutable GitHub Release","candidate","stable","freeze","revocation","rollback","raw.githubusercontent.com",
]);
need("docs/operators/release-publication-promotion-v1.md",[
  "VOID_RELEASE_ADMIN_TOKEN","void-release-publication","void-release-canary","exact confirmation",
]);
need("docs/security/public-release-publication-promotion-v1-threat-model.md",[
  "Tag replacement","Asset replacement","stale outer","hash-chained",
]);
need("public/public-node/void-network/release-publication-promotion-v1.json",[
  "VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_STATUS_V1","implemented_proof_gated","release_tag_published",
]);

for(const p of ["README.md","docs/public/README.md","docs/public/quick-start.md","docs/site/voidchain/index.html"]){
  if(!text(p).includes("VOID_PUBLIC_RELEASE_PUBLICATION_PROMOTION_WALL_V1"))fail(`${p} lacks publication wall discoverability marker`);
}
pass("public-discoverability");

const make=text("Makefile");
for(const n of ["public-release-publication-promotion-v1-proof:","public-release-publication-promotion-v1-static-proof:"]){if(!make.includes(n))fail(`Makefile missing ${n}`);}
pass("makefile-wiring");

console.log(`${MARKER}_STATIC_GREEN`);
