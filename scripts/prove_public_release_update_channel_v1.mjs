#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {pathToFileURL} from "node:url";

const MARKER="VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_V1";
function fail(m){console.error(`[FAIL] ${m}`);process.exit(1);}
function pass(m){console.log(`[PASS] ${m}`);}
function run(c,a,opt={}){const r=childProcess.spawnSync(c,a,{cwd:opt.cwd,env:{...process.env,...(opt.env||{})},encoding:"utf8",stdio:opt.capture?["ignore","pipe","pipe"]:"inherit",maxBuffer:128*1024*1024});if(r.error)throw r.error;if(r.status!==0){if(opt.capture){process.stderr.write(r.stdout||"");process.stderr.write(r.stderr||"");}if(opt.allowFail)return r;fail(`${c} ${a.join(" ")} rc=${r.status}`);}return opt.capture?String(r.stdout||""):r;}
function need(rel,needles=[]){if(!fs.existsSync(rel))fail(`missing ${rel}`);const t=fs.readFileSync(rel,"utf8");for(const n of needles)if(!t.includes(n))fail(`${rel} missing ${JSON.stringify(n)}`);pass(`markers-${rel}`);return t;}
function versionAt(root){return JSON.parse(fs.readFileSync(path.join(root,"current","BUILD-INFO.json"),"utf8")).version;}
function previousVersion(root){return JSON.parse(fs.readFileSync(path.join(root,"previous","BUILD-INFO.json"),"utf8")).version;}
function sleepSync(ms){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);}
function startAdversarialHealthServer(tmp){
  const portFile=path.join(tmp,"health-port"),serverFile=path.join(tmp,"health-server.mjs");
  fs.writeFileSync(serverFile,`import fs from "node:fs";\nimport http from "node:http";\nlet requests=0;\nconst server=http.createServer((_req,res)=>{\n  requests++;\n  res.writeHead(200,{"content-type":"application/json"});\n  if(requests===1){\n    res.end(JSON.stringify({ready:true,gap:0,txroot_live:1,padding:"x".repeat(70000)}));\n    return;\n  }\n  res.write('{"ready":true,"gap":0');\n});\nserver.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[2],String(server.address().port)));\nprocess.on("SIGTERM",()=>server.close(()=>process.exit(0)));\n`);
  const child=childProcess.spawn(process.execPath,[serverFile,portFile],{stdio:["ignore","ignore","inherit"]});
  const deadline=Date.now()+5000;while(!fs.existsSync(portFile)&&Date.now()<deadline){if(child.exitCode!==null)fail("adversarial health server exited before listen");sleepSync(25);}
  if(!fs.existsSync(portFile)){child.kill("SIGTERM");fail("adversarial health server did not start");}
  return {child,url:`http://127.0.0.1:${fs.readFileSync(portFile,"utf8")}/ready`};
}
function build(root,out,version,epoch){run("node",["tools/build-public-release-v1.mjs","--out",out,"--version",version,"--source-date-epoch",String(epoch)],{cwd:root});}
function manifest(out){return JSON.parse(fs.readFileSync(path.join(out,"void-node-release-manifest.json"),"utf8"));}
function channel(root,out,version,tag){run("node",["tools/build-public-release-channel-v1.mjs","--manifest",path.join(out,"void-node-release-manifest.json"),"--checksums",path.join(out,"SHA256SUMS"),"--base-url",pathToFileURL(out+path.sep).toString(),"--release-tag",tag,"--out",path.join(out,"stable-v1.json"),"--test-allow-file"],{cwd:root});run("node",["tools/build-public-release-channel-v1.mjs","--verify",path.join(out,"stable-v1.json"),"--test-allow-file"],{cwd:root});}

const full=process.argv.includes("--full");
need("release/channel/public-release-channel-v1.schema.json",["VOID_PUBLIC_RELEASE_CHANNEL_V1","rollback_on_health_failure"]);
need("tools/build-public-release-channel-v1.mjs",["VOID_PUBLIC_RELEASE_CHANNEL_BUILDER_V1","github_attestation_required","--test-allow-file"]);
need("release/bin/void-node-update",["VOID_NODE_RELEASE_UPDATE_V1","downgrade refused","HEALTH_FAIL_ROLLBACK_BEGIN","HEALTH_RESPONSE_MAX_BYTES","health response exceeds size limit","service_started_implicitly=false"]);
const manager=need("release/bin/void-node",["void-node update check","void-node update apply","bin/void-node-update"]);
need("ops/security/public-release-update-channel-v1-proof.sh",["VOID public release update channel wall v1 proof"]);
const workflow=need(".github/workflows/public-release-distribution-v1.yml",["public-release-update-channel-v1-proof","build-public-release-channel-v1.mjs","stable-v1.json","(cd dist-release && sha256sum --check --strict SHA256SUMS)"]);
const checksumCwd=(workflow.match(/\(cd dist-release && sha256sum --check --strict SHA256SUMS\)/g)||[]).length;if(checksumCwd<2)fail(`expected two artifact-directory checksum checks, found ${checksumCwd}`);pass("workflow-checksum-directory-regression");
need("docs/public/release-update-channel-v1.md",["anti-downgrade","health-gated rollback","GitHub attestation"]);
need("docs/security/public-release-update-channel-v1-threat-model.md",["channel substitution","rollback","No service is started implicitly"]);
need("public/public-node/void-network/release-update-channel-v1.json",["VOID_PUBLIC_RELEASE_UPDATE_CHANNEL_STATUS_V1","guarded_lanes_activated"]);
need("Makefile",["public-release-update-channel-v1-proof","public-release-channel-build-v1"]);
if(!full){console.log(`${MARKER}_STATIC_GREEN`);process.exit(0);}

const root=run("git",["rev-parse","--show-toplevel"],{capture:true}).trim();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"void-update-channel-proof-"));
try{
  const out1=path.join(tmp,"release1"),out2=path.join(tmp,"release2"),out3=path.join(tmp,"release3"),out4=path.join(tmp,"release4");
  const v1="0.0.1-walltest",v2="0.0.2-walltest",v3="0.0.3-walltest",v4="0.0.4-walltest";
  build(root,out1,v1,1700000100);build(root,out2,v2,1700000200);build(root,out3,v3,1700000300);build(root,out4,v4,1700000400);
  channel(root,out1,v1,`release-v${v1}`);channel(root,out2,v2,`release-v${v2}`);channel(root,out3,v3,`release-v${v3}`);channel(root,out4,v4,`release-v${v4}`);
  const home=path.join(tmp,"home"),installRoot=path.join(home,"share","void-node"),binDir=path.join(home,"bin");fs.mkdirSync(home,{recursive:true});
  const e={HOME:home,VOID_NODE_ALLOW_ROOT_INSTALL:"1",VOID_NODE_INSTALL_ALLOW_UNSUPPORTED_NODE:"1",VOID_NODE_CONFIG_DIR:path.join(home,"config"),VOID_NODE_STATE_DIR:path.join(home,"state"),VOID_NODE_SYSTEMD_DIR:path.join(home,"systemd"),VOID_NODE_UPDATE_TEST_ALLOW_FILE:"1"};
  const m1=manifest(out1);
  run("bash",[path.join(out1,"install-void-node-v1.sh"),"install","--archive",path.join(out1,m1.archive),"--checksums",path.join(out1,"SHA256SUMS"),"--manifest",path.join(out1,"void-node-release-manifest.json"),"--install-root",installRoot,"--bin-dir",binDir,"--yes"],{env:e});
  if(versionAt(installRoot)!==v1)fail("initial release install mismatch");pass("initial-release-installed");
  const managerPath=path.join(binDir,"void-node");
  const check=run(managerPath,["update","check","--channel",path.join(out2,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:e,capture:true});
  if(!check.includes("update_available=true"))fail("update check did not report update");pass("verified-update-check");
  run(managerPath,["update","apply","--channel",path.join(out2,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e});
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v1)fail("apply did not establish current/previous pointers");pass("verified-apply-current-previous");
  const same=run(managerPath,["update","apply","--channel",path.join(out2,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e,capture:true});
  if(!same.includes("ALREADY_CURRENT"))fail("same-version apply was not idempotent");pass("same-version-idempotent");
  const down=run(managerPath,["update","apply","--channel",path.join(out1,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e,capture:true,allowFail:true});
  if(down.status===0||!`${down.stdout}${down.stderr}`.includes("downgrade refused"))fail("downgrade was not refused");if(versionAt(installRoot)!==v2)fail("downgrade refusal changed current release");pass("anti-downgrade");
  const m3=manifest(out3),archive3=path.join(out3,m3.archive),backup=fs.readFileSync(archive3);fs.appendFileSync(archive3,"tamper");
  const tamper=run(managerPath,["update","apply","--channel",path.join(out3,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e,capture:true,allowFail:true});
  if(tamper.status===0||!/size mismatch|checksum mismatch/.test(`${tamper.stdout}${tamper.stderr}`))fail("tampered archive was not rejected");if(versionAt(installRoot)!==v2)fail("tamper rejection changed current release");pass("tampered-asset-rejected");fs.writeFileSync(archive3,backup);
  const health=run(managerPath,["update","apply","--channel",path.join(out3,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes","--health-command","false"],{env:e,capture:true,allowFail:true});
  if(health.status===0||!`${health.stdout}${health.stderr}`.includes("HEALTH_FAIL_ROLLBACK_BEGIN"))fail("failed health gate did not trigger rollback");if(versionAt(installRoot)!==v2)fail(`health rollback failed; current=${versionAt(installRoot)}`);pass("health-gated-automatic-rollback");
  const adversarial=startAdversarialHealthServer(tmp);
  try{
    const started=Date.now();
    const bounded=run(managerPath,["update","apply","--channel",path.join(out4,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes","--health-url",adversarial.url],{env:{...e,VOID_NODE_UPDATE_TEST_HEALTH_ATTEMPTS:"2",VOID_NODE_UPDATE_TEST_HEALTH_TIMEOUT_MS:"300",VOID_NODE_UPDATE_TEST_HEALTH_RETRY_DELAY_MS:"0"},capture:true,allowFail:true});
    const elapsed=Date.now()-started;
    if(bounded.status===0||!`${bounded.stdout}${bounded.stderr}`.includes("HEALTH_FAIL_ROLLBACK_BEGIN"))fail("oversized/stalled health body did not trigger rollback");
    if(elapsed>=5000)fail(`oversized/stalled health body exceeded bounded settlement: ${elapsed}ms`);
    if(versionAt(installRoot)!==v2)fail(`bounded health rollback failed; current=${versionAt(installRoot)}`);
    pass("oversized-and-stalled-health-body-bounded-rollback");
  }finally{adversarial.child.kill("SIGTERM");}
  run(managerPath,["verify"],{env:e});
  run("bash",[path.join(installRoot,"current","install-void-node-v1.sh"),"uninstall","--install-root",installRoot,"--bin-dir",binDir,"--yes","--purge"],{env:e});
  if(fs.existsSync(installRoot)||fs.existsSync(managerPath))fail("uninstall left update-wall artifacts");pass("uninstall-purge-after-update-chain");
  console.log(`${MARKER}_FULL_GREEN`);console.log("service_started_implicitly=false");console.log("guarded_lanes_activated=false");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
