#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const MARKER = "VOID_PUBLIC_RELEASE_DISTRIBUTION_V1";
function fail(message) { console.error(`[FAIL] ${message}`); process.exit(1); }
function pass(message) { console.log(`[PASS] ${message}`); }
function run(command, args, options={}) {
  const result=childProcess.spawnSync(command,args,{cwd:options.cwd,env:{...process.env,...(options.env||{})},encoding:"utf8",stdio:options.capture?["ignore","pipe","pipe"]:"inherit",maxBuffer:128*1024*1024});
  if(result.error) throw result.error;
  if(result.status!==0){ if(options.capture){process.stderr.write(result.stdout||"");process.stderr.write(result.stderr||"");} fail(`${command} ${args.join(" ")} rc=${result.status}`); }
  return options.capture?String(result.stdout||""):"";
}
function sha(file){return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");}
function needFile(rel){if(!fs.existsSync(rel))fail(`missing ${rel}`);pass(`file-present-${rel}`);}
function needText(rel, needles){const text=fs.readFileSync(rel,"utf8");for(const n of needles){if(!text.includes(n))fail(`${rel} missing ${JSON.stringify(n)}`);}pass(`markers-${rel}`);return text;}

const full=process.argv.includes("--full");
const required=[
  "release/bin/void-node-run",
  "release/bin/void-node",
  "ops/public/install-void-node-v1.sh",
  "tools/build-public-release-v1.mjs",
  "ops/security/public-release-distribution-v1-proof.sh",
  ".github/workflows/public-release-distribution-v1.yml",
  "docs/public/download-install-release-v1.md",
  "docs/public/release-process-v1.md",
  "docs/security/public-release-distribution-v1-threat-model.md",
  "public/public-node/void-network/release-distribution-v1.json",
  "public/public-node/void-network/release-distribution-v1.html",
];
for(const f of required)needFile(f);

const installer=needText("ops/public/install-void-node-v1.sh",[
  "VOID_PUBLIC_RELEASE_INSTALLER_V1",
  "RELEASE-CONTENTS-SHA256",
  "archive_path_safety_verified=true",
  "service_started_implicitly=false",
  "wallet_key_generated=false",
  "validator_key_generated=false",
  "treasury_key_generated=false",
  "gh attestation verify",
]);
if(/curl[^\n]*\|[^\n]*(?:bash|sh)/.test(installer))fail("installer contains curl-pipe-shell execution");
if(!/if test "\$ENABLE" = 1 \|\| test "\$START" = 1/.test(installer))fail("systemd activation is not explicitly flag-gated");
if(!/if test "\$START" = 1; then systemctl --user start/.test(installer))fail("start operation is not bound to START=1");
pass("installer-no-curl-pipe-and-no-implicit-start");

needText("tools/build-public-release-v1.mjs",[
  "VOID_PUBLIC_RELEASE_BUILDER_V1",
  "SOURCE_DATE_EPOCH",
  "RELEASE-CONTENTS-SHA256",
  "SBOM.spdx.json",
  "packageJson.private !== true",
  "service_started_by_default: false",
  "guarded_lanes_activated: false",
  "fs.mkdirSync(path.join(stage, \"node_modules\")",
]);
const workflow=needText(".github/workflows/public-release-distribution-v1.yml",[
  "actions/checkout@v6",
  "actions/setup-node@v6",
  "actions/upload-artifact@v4",
  "actions/download-artifact@v5",
  "actions/attest@v4",
  "release-v*",
  "gh release create",
]);
if(!workflow.includes("pull_request:"))fail("workflow lacks pull_request proof gate");
pass("workflow-pr-proof-and-tag-publish-contract");

needText("docs/public/download-install-release-v1.md",["sha256sum --check SHA256SUMS","service is not enabled or started","void-node rollback"]);
needText("docs/public/release-process-v1.md",["release-v<package-version>","GitHub artifact attestations","No live deployment"]);
needText("docs/security/public-release-distribution-v1-threat-model.md",["archive traversal","rollback","No private key material"]);
needText("public/public-node/void-network/release-distribution-v1.json",["VOID_PUBLIC_RELEASE_DISTRIBUTION_STATUS_V1","service_started_by_default"]);
needText("docs/site/voidchain/index.html",["VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1","Verified release install"]);
needText("README.md",["VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1","Verified release installer"]);
needText("Makefile",["public-release-distribution-v1-proof","public-release-build-v1"]);

if(!full){
  console.log(`${MARKER}_STATIC_GREEN`);
  process.exit(0);
}

const root=run("git",["rev-parse","--show-toplevel"],{capture:true}).trim();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-release-distribution-proof-"));
try{
  const out1=path.join(tmp,"out1"), out2=path.join(tmp,"out2");
  const fixedEpoch="1700000000", version="0.0.0-walltest";
  run("node",["tools/build-public-release-v1.mjs","--out",out1,"--version",version,"--source-date-epoch",fixedEpoch],{cwd:root});
  run("node",["tools/build-public-release-v1.mjs","--out",out2,"--version",version,"--source-date-epoch",fixedEpoch],{cwd:root});
  const manifest=JSON.parse(fs.readFileSync(path.join(out1,"void-node-release-manifest.json"),"utf8"));
  const a1=path.join(out1,manifest.archive), a2=path.join(out2,manifest.archive);
  if(sha(a1)!==sha(a2))fail(`deterministic archive mismatch ${sha(a1)} != ${sha(a2)}`);
  pass(`deterministic-archive-${sha(a1)}`);
  run("sha256sum",["--check","--strict","SHA256SUMS"],{cwd:out1});
  pass("outer-checksums");
  const listing=run("tar",["-tzf",a1],{capture:true}).split("\n").filter(Boolean);
  if(!listing.length)fail("archive listing empty");
  if(listing.some(x=>x.startsWith("/")||x.split("/").includes("..")))fail("archive traversal member detected");
  pass("archive-member-safety");

  const fakeHome=path.join(tmp,"home");
  const installRoot=path.join(fakeHome,"share","void-node");
  const binDir=path.join(fakeHome,"bin");
  fs.mkdirSync(fakeHome,{recursive:true});
  const env={HOME:fakeHome,VOID_NODE_ALLOW_ROOT_INSTALL:"1",VOID_NODE_INSTALL_ALLOW_UNSUPPORTED_NODE:"1",VOID_NODE_CONFIG_DIR:path.join(fakeHome,"config"),VOID_NODE_STATE_DIR:path.join(fakeHome,"state"),VOID_NODE_SYSTEMD_DIR:path.join(fakeHome,"systemd")};
  run("bash",[path.join(out1,"install-void-node-v1.sh"),"install","--archive",a1,"--checksums",path.join(out1,"SHA256SUMS"),"--manifest",path.join(out1,"void-node-release-manifest.json"),"--install-root",installRoot,"--bin-dir",binDir,"--yes"],{env});
  const current=path.join(installRoot,"current");
  if(!fs.existsSync(current))fail("installer did not create current release pointer");
  if(!fs.existsSync(path.join(binDir,"void-node")))fail("installer did not create manager command");
  run(path.join(binDir,"void-node"),["verify"],{env});
  const unit=fs.readFileSync(path.join(fakeHome,"systemd","void-node.service"),"utf8");
  if(!unit.includes("ExecStart="+installRoot+"/current/bin/void-node-run"))fail("unit does not use current release pointer");
  pass("functional-install-and-verify");
  run("bash",[path.join(out1,"install-void-node-v1.sh"),"uninstall","--install-root",installRoot,"--bin-dir",binDir,"--yes","--purge"],{env});
  if(fs.existsSync(installRoot)||fs.existsSync(path.join(binDir,"void-node")))fail("uninstall left installation artifacts");
  pass("functional-uninstall-purge");
  console.log(`${MARKER}_FULL_GREEN`);
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}
