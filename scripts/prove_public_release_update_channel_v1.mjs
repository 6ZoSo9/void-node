#!/usr/bin/env node
import childProcess from "node:child_process";
import crypto from "node:crypto";
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
function replaceInstalledUpdaterWithLegacy(root){const relative="bin/void-node-update",target=path.join(root,relative),legacy='#!/usr/bin/env node\nconsole.error("LEGACY_UPDATER_HAS_NO_ROLLBACK_JOURNAL_RECOVERY");\nprocess.exit(97);\n';fs.writeFileSync(target,legacy);fs.chmodSync(target,0o755);const digest=crypto.createHash("sha256").update(legacy).digest("hex"),manifestPath=path.join(root,"RELEASE-CONTENTS-SHA256"),lines=fs.readFileSync(manifestPath,"utf8").trimEnd().split("\n");let replaced=0;const next=lines.map(line=>{const match=line.match(/^([0-9a-f]{64})  (.+)$/);if(match?.[2]!==relative)return line;replaced++;return `${digest}  ${relative}`;});if(replaced!==1)fail(`legacy updater checksum replacement count=${replaced}`);fs.writeFileSync(manifestPath,next.join("\n")+"\n");}
function sleepSync(ms){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms);}
function startAdversarialHealthServer(tmp){
  const portFile=path.join(tmp,"health-port"),serverFile=path.join(tmp,"health-server.mjs");
  fs.writeFileSync(serverFile,`import fs from "node:fs";\nimport http from "node:http";\nlet requests=0;\nconst server=http.createServer((_req,res)=>{\n  requests++;\n  res.writeHead(200,{"content-type":"application/json"});\n  if(requests===1){\n    res.end(JSON.stringify({ready:true,gap:0,txroot_live:1,padding:"x".repeat(70000)}));\n    return;\n  }\n  res.write('{"ready":true,"gap":0');\n});\nserver.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[2],String(server.address().port)));\nprocess.on("SIGTERM",()=>server.close(()=>process.exit(0)));\n`);
  const child=childProcess.spawn(process.execPath,[serverFile,portFile],{stdio:["ignore","ignore","inherit"]});
  const deadline=Date.now()+5000;while(!fs.existsSync(portFile)&&Date.now()<deadline){if(child.exitCode!==null)fail("adversarial health server exited before listen");sleepSync(25);}
  if(!fs.existsSync(portFile)){child.kill("SIGTERM");fail("adversarial health server did not start");}
  return {child,url:`http://127.0.0.1:${fs.readFileSync(portFile,"utf8")}/ready`};
}
function startTypedHealthServer(tmp){
  const portFile=path.join(tmp,"typed-health-port"),countFile=path.join(tmp,"typed-health-count"),serverFile=path.join(tmp,"typed-health-server.mjs");
  fs.writeFileSync(serverFile,`import fs from "node:fs";\nimport http from "node:http";\nconst responses=[\n  {ready:true,gap:null,txroot_live:1},\n  {ready:true,gap:"0",txroot_live:1},\n  {ready:true,gap:0,txroot_live:true},\n  {ready:true,gap:0,txroot_live:"1"},\n  {ready:true,gap:0,txroot_live:1},\n];\nlet requests=0;\nconst server=http.createServer((_req,res)=>{\n  requests++;\n  fs.writeFileSync(process.argv[3],String(requests));\n  res.writeHead(200,{"content-type":"application/json"});\n  res.end(JSON.stringify(responses[Math.min(requests-1,responses.length-1)]));\n});\nserver.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[2],String(server.address().port)));\nprocess.on("SIGTERM",()=>server.close(()=>process.exit(0)));\n`);
  const child=childProcess.spawn(process.execPath,[serverFile,portFile,countFile],{stdio:["ignore","ignore","inherit"]});
  const deadline=Date.now()+5000;while(!fs.existsSync(portFile)&&Date.now()<deadline){if(child.exitCode!==null)fail("typed health server exited before listen");sleepSync(25);}
  if(!fs.existsSync(portFile)){child.kill("SIGTERM");fail("typed health server did not start");}
  return {child,countFile,url:`http://127.0.0.1:${fs.readFileSync(portFile,"utf8")}/ready`};
}
function startBoundedDownloadServer(tmp,channelFile,archiveFile){
  const portFile=path.join(tmp,"download-port"),serverFile=path.join(tmp,"download-server.mjs");
  fs.writeFileSync(serverFile,`import fs from "node:fs";\nimport http from "node:http";\nconst channel=fs.readFileSync(process.argv[3]),archive=fs.readFileSync(process.argv[4]);\nconst server=http.createServer((req,res)=>{\n  if(req.url==="/channel-valid"){res.writeHead(200,{"content-type":"application/json","content-length":String(channel.length)});res.end(channel);return;}\n  if(req.url==="/channel-declared-over"){res.writeHead(200,{"content-type":"application/json","content-length":String(2*1024*1024+1)});res.flushHeaders();return;}\n  if(req.url==="/channel-stream-over"){res.writeHead(200,{"content-type":"application/json"});res.write(Buffer.alloc(2*1024*1024+1,120));return;}\n  if(req.url==="/asset-valid"){res.writeHead(200,{"content-type":"application/octet-stream","content-length":String(archive.length)});res.end(archive);return;}\n  if(req.url==="/asset-declared-over"){res.writeHead(200,{"content-type":"application/octet-stream","content-length":String(archive.length+1)});res.flushHeaders();return;}\n  if(req.url==="/asset-declared-under"){res.writeHead(200,{"content-type":"application/octet-stream","content-length":String(Math.max(0,archive.length-1))});res.flushHeaders();return;}\n  if(req.url==="/asset-stream-over"){res.writeHead(200,{"content-type":"application/octet-stream"});res.write(archive);res.write(Buffer.from("x"));return;}\n  res.writeHead(404);res.end();\n});\nserver.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[2],String(server.address().port)));\nprocess.on("SIGTERM",()=>process.exit(0));\n`);
  const child=childProcess.spawn(process.execPath,[serverFile,portFile,channelFile,archiveFile],{stdio:["ignore","ignore","inherit"]});
  const deadline=Date.now()+5000;while(!fs.existsSync(portFile)&&Date.now()<deadline){if(child.exitCode!==null)fail("bounded download server exited before listen");sleepSync(25);}
  if(!fs.existsSync(portFile)){child.kill("SIGTERM");fail("bounded download server did not start");}
  return {child,baseUrl:`http://127.0.0.1:${fs.readFileSync(portFile,"utf8")}`};
}
function channelWithArchiveUrl(source,url,dest){
  const j=JSON.parse(fs.readFileSync(source,"utf8"));j.assets.archive.url=url;fs.writeFileSync(dest,`${JSON.stringify(j)}\n`);
}
function startRedirectHealthServers(tmp){
  const portsFile=path.join(tmp,"redirect-health-ports"),serverFile=path.join(tmp,"redirect-health-server.mjs");
  fs.writeFileSync(serverFile,`import fs from "node:fs";\nimport http from "node:http";\nconst valid=JSON.stringify({ready:true,gap:0,txroot_live:1});\nconst secondary=http.createServer((req,res)=>{if(req.url==="/valid"){res.writeHead(200,{"content-type":"application/json"});res.end(valid);return;}res.writeHead(404);res.end();});\nsecondary.listen(0,"127.0.0.1",()=>{\n  const primary=http.createServer((req,res)=>{\n    if(req.url==="/same"){res.writeHead(302,{location:"/valid"});res.end();return;}\n    if(req.url==="/cross"){res.writeHead(302,{location:"http://127.0.0.1:"+secondary.address().port+"/valid"});res.end();return;}\n    if(req.url==="/valid"){res.writeHead(200,{"content-type":"application/json"});res.end(valid);return;}\n    res.writeHead(404);res.end();\n  });\n  primary.listen(0,"127.0.0.1",()=>fs.writeFileSync(process.argv[2],JSON.stringify({primary:primary.address().port,secondary:secondary.address().port})));\n});\nprocess.on("SIGTERM",()=>process.exit(0));\n`);
  const child=childProcess.spawn(process.execPath,[serverFile,portsFile],{stdio:["ignore","ignore","inherit"]});
  const deadline=Date.now()+5000;while(!fs.existsSync(portsFile)&&Date.now()<deadline){if(child.exitCode!==null)fail("redirect health servers exited before listen");sleepSync(25);}
  if(!fs.existsSync(portsFile)){child.kill("SIGTERM");fail("redirect health servers did not start");}
  const ports=JSON.parse(fs.readFileSync(portsFile,"utf8")),base=`http://127.0.0.1:${ports.primary}`;
  return {child,same:`${base}/same`,cross:`${base}/cross`};
}
function build(root,out,version,epoch){run("node",["tools/build-public-release-v1.mjs","--out",out,"--version",version,"--source-date-epoch",String(epoch)],{cwd:root});}
function manifest(out){return JSON.parse(fs.readFileSync(path.join(out,"void-node-release-manifest.json"),"utf8"));}
function channel(root,out,version,tag){run("node",["tools/build-public-release-channel-v1.mjs","--manifest",path.join(out,"void-node-release-manifest.json"),"--checksums",path.join(out,"SHA256SUMS"),"--base-url",pathToFileURL(out+path.sep).toString(),"--release-tag",tag,"--out",path.join(out,"stable-v1.json"),"--test-allow-file"],{cwd:root});run("node",["tools/build-public-release-channel-v1.mjs","--verify",path.join(out,"stable-v1.json"),"--test-allow-file"],{cwd:root});}

const full=process.argv.includes("--full");
need("release/channel/public-release-channel-v1.schema.json",["VOID_PUBLIC_RELEASE_CHANNEL_V1","rollback_on_health_failure"]);
need("tools/build-public-release-channel-v1.mjs",["VOID_PUBLIC_RELEASE_CHANNEL_BUILDER_V1","github_attestation_required","--test-allow-file"]);
need("release/bin/void-node-update",["VOID_NODE_RELEASE_UPDATE_V1","VOID_NODE_RELEASE_ROLLBACK_TRANSACTION_V1","ROLLBACK_RECOVERED","downgrade refused","HEALTH_FAIL_ROLLBACK_BEGIN","HEALTH_RESPONSE_MAX_BYTES","readBoundedResponseBytes(response,HEALTH_RESPONSE_MAX_BYTES,\"health response\",ac)","readBoundedResponseBytes","streamExactResponseToFile","VOID_NODE_UPDATE_TEST_ALLOW_HTTP_LOOPBACK","redirect:\"error\"","normalizedUrlIdentity","service_started_implicitly=false"]);
const manager=need("release/bin/void-node",["void-node update check","void-node update apply","exec \"$RELEASE_ROOT/bin/void-node-update\" rollback"]);
need("release/portable/bin/void-node",["void-node update check","exec \"$RUNTIME_NODE\" \"$RELEASE_ROOT/bin/void-node-update\" rollback"]);
need("ops/public/install-void-node-v1.sh",["VOID_NODE_STABLE_MANAGER_V1","$INSTALL_ROOT/control/void-node-update"]);
need("ops/public/install-void-node-portable-runtime-v1.sh",["VOID_NODE_STABLE_MANAGER_V1","$INSTALL_ROOT/control/void-node-update"]);
need("ops/security/public-release-update-channel-v1-proof.sh",["VOID public release update channel wall v1 proof"]);
const workflow=need(".github/workflows/public-release-distribution-v1.yml",["public-release-update-channel-v1-proof","build-public-release-channel-v1.mjs","stable-v1.json","(cd dist-release && sha256sum --check --strict SHA256SUMS)"]);
const checksumCwd=(workflow.match(/\(cd dist-release && sha256sum --check --strict SHA256SUMS\)/g)||[]).length;if(checksumCwd<2)fail(`expected two artifact-directory checksum checks, found ${checksumCwd}`);pass("workflow-checksum-directory-regression");
need("docs/public/release-update-channel-v1.md",["anti-downgrade","journaled rollback","ROLLBACK_RECOVERED","GitHub attestation"]);
need("docs/security/public-release-update-channel-v1-threat-model.md",["channel substitution","journaled rollback","canonical pointer mutation","No service is started implicitly"]);
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
  const managerPath=path.join(binDir,"void-node"),stableManagerPath=path.join(installRoot,"bin","void-node"),controlUpdaterPath=path.join(installRoot,"control","void-node-update");
  if(fs.realpathSync(managerPath)!==stableManagerPath||!fs.existsSync(controlUpdaterPath))fail("installer did not establish the stable recovery entrypoint");pass("stable-recovery-entrypoint-installed");
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
  const downloads=startBoundedDownloadServer(tmp,path.join(out3,"stable-v1.json"),archive3),httpEnv={...e,VOID_NODE_UPDATE_TEST_ALLOW_HTTP_LOOPBACK:"1"};
  try{
    const ungated=run(managerPath,["update","check","--channel",`${downloads.baseUrl}/channel-valid`,"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:e,capture:true,allowFail:true});
    if(ungated.status===0||!`${ungated.stdout}${ungated.stderr}`.includes("channel URL must use HTTPS"))fail("loopback HTTP test transport was not fail-closed without its explicit test gate");
    pass("loopback-http-test-transport-explicitly-gated");
    for(const [route,label] of [["channel-declared-over","declared-oversize"],["channel-stream-over","streamed-oversize"]]){
      const started=Date.now(),r=run(managerPath,["update","check","--channel",`${downloads.baseUrl}/${route}`,"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:httpEnv,capture:true,allowFail:true}),elapsed=Date.now()-started;
      if(r.status===0||!`${r.stdout}${r.stderr}`.includes("download exceeds size limit"))fail(`${label} channel response was not rejected`);
      if(elapsed>=5000)fail(`${label} channel response exceeded bounded settlement: ${elapsed}ms`);
      if(versionAt(installRoot)!==v2)fail(`${label} channel response changed current release`);
      pass(`${label}-channel-response-bounded`);
    }
    const remoteCheck=run(managerPath,["update","check","--channel",`${downloads.baseUrl}/channel-valid`,"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:httpEnv,capture:true});
    if(!remoteCheck.includes("update_available=true"))fail("valid exact-size remote channel was not accepted");pass("valid-exact-size-remote-channel");
    const assetCases=[["asset-declared-over","declared-oversize"],["asset-declared-under","declared-undersize"],["asset-stream-over","streamed-oversize"]];
    for(const [route,label] of assetCases){
      const channelPath=path.join(tmp,`${route}.json`);channelWithArchiveUrl(path.join(out3,"stable-v1.json"),`${downloads.baseUrl}/${route}`,channelPath);
      const started=Date.now(),r=run(managerPath,["update","apply","--channel",channelPath,"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:httpEnv,capture:true,allowFail:true}),elapsed=Date.now()-started;
      if(r.status===0||!`${r.stdout}${r.stderr}`.includes("asset size mismatch"))fail(`${label} remote asset was not rejected`);
      if(elapsed>=5000)fail(`${label} remote asset exceeded bounded settlement: ${elapsed}ms`);
      if(versionAt(installRoot)!==v2)fail(`${label} remote asset changed current release`);
      pass(`${label}-remote-asset-bounded`);
    }
    const exactAssetChannel=path.join(tmp,"asset-valid.json");channelWithArchiveUrl(path.join(out3,"stable-v1.json"),`${downloads.baseUrl}/asset-valid`,exactAssetChannel);
    run(managerPath,["update","apply","--channel",exactAssetChannel,"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:httpEnv});
    if(versionAt(installRoot)!==v3||previousVersion(installRoot)!==v2)fail("valid exact-size remote asset did not install v3");pass("valid-exact-size-remote-asset");
    run(managerPath,["rollback"],{env:e,capture:true});
    if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3)fail("post-download-bound rollback did not restore v2 baseline");pass("remote-download-proof-baseline-restored");
  }finally{downloads.child.kill("SIGTERM");}
  const health=run(managerPath,["update","apply","--channel",path.join(out3,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes","--health-command","false"],{env:e,capture:true,allowFail:true});
  if(health.status===0||!`${health.stdout}${health.stderr}`.includes("HEALTH_FAIL_ROLLBACK_BEGIN"))fail("failed health gate did not trigger rollback");if(versionAt(installRoot)!==v2)fail(`health rollback failed; current=${versionAt(installRoot)}`);pass("health-gated-automatic-rollback");
  const redirects=startRedirectHealthServers(tmp);
  try{
    for(const [url,label] of [[redirects.same,"same-origin"],[redirects.cross,"cross-origin"]]){
      const redirected=run(managerPath,["update","apply","--channel",path.join(out4,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes","--health-url",url],{env:{...e,VOID_NODE_UPDATE_TEST_HEALTH_ATTEMPTS:"1",VOID_NODE_UPDATE_TEST_HEALTH_TIMEOUT_MS:"300",VOID_NODE_UPDATE_TEST_HEALTH_RETRY_DELAY_MS:"0"},capture:true,allowFail:true});
      if(redirected.status===0||!`${redirected.stdout}${redirected.stderr}`.includes("HEALTH_FAIL_ROLLBACK_BEGIN"))fail(`${label} redirected health evidence suppressed rollback`);
      if(versionAt(installRoot)!==v2)fail(`${label} redirect rollback failed; current=${versionAt(installRoot)}`);
      pass(`${label}-health-redirect-rejected`);
    }
  }finally{redirects.child.kill("SIGTERM");}
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
  const typed=startTypedHealthServer(tmp);
  try{
    const typedApply=run(managerPath,["update","apply","--channel",path.join(out4,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes","--health-url",typed.url],{env:{...e,VOID_NODE_UPDATE_TEST_HEALTH_ATTEMPTS:"5",VOID_NODE_UPDATE_TEST_HEALTH_TIMEOUT_MS:"300",VOID_NODE_UPDATE_TEST_HEALTH_RETRY_DELAY_MS:"0"},capture:true,allowFail:true});
    const requests=Number(fs.readFileSync(typed.countFile,"utf8"));
    if(typeof typedApply!=="string")fail(`strict typed health apply failed after ${requests} requests`);
    if(requests!==5)fail(`wrong-typed health evidence accepted after ${requests} requests`);
    if(versionAt(installRoot)!==v4)fail(`strict typed health acceptance failed; current=${versionAt(installRoot)}`);
    pass("wrong-typed-health-evidence-rejected");
  }finally{typed.child.kill("SIGTERM");}
  const poisoned=path.join(installRoot,".previous.update-next");fs.mkdirSync(poisoned);
  const poisonedRollback=run(managerPath,["update","rollback","--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:e,capture:true,allowFail:true});
  if(poisonedRollback.status===0||!`${poisonedRollback.stdout}${poisonedRollback.stderr}`.includes("unexpected rollback artifact"))fail("poisoned rollback staging path was not rejected");
  if(versionAt(installRoot)!==v4||previousVersion(installRoot)!==v2)fail("poisoned staging path changed canonical release pointers");
  fs.rmdirSync(poisoned);pass("poisoned-rollback-staging-rejected-before-pointer-mutation");
  const interrupted=run(managerPath,["update","rollback","--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:{...e,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_CURRENT:"1"},capture:true,allowFail:true});
  if(interrupted.status===0||!`${interrupted.stdout}${interrupted.stderr}`.includes("test interruption after current rollback pointer publication"))fail("rollback interruption fixture did not stop after first pointer publication");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v2)fail("rollback interruption did not expose the expected detectable partial pointer state");
  const recovered=run(managerPath,["update","rollback","--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:e,capture:true,allowFail:true});
  if(recovered.status!==2||!`${recovered.stdout}${recovered.stderr}`.includes("ROLLBACK_RECOVERED"))fail("interrupted rollback was not recovered before command re-entry");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v4)fail("rollback recovery did not restore both exact canonical release identities");
  for(const artifact of [".current.update-next",".previous.update-next",".rollback.update-transaction-v1.json",".rollback.update-transaction-v1.json.next"]){if(fs.existsSync(path.join(installRoot,artifact)))fail(`rollback recovery left artifact ${artifact}`);}
  pass("interrupted-rollback-transaction-recovered-exactly-once");
  const wrapperRollback=run(managerPath,["rollback"],{env:e,capture:true});
  if(!wrapperRollback.includes("ROLLBACK_GREEN")||versionAt(installRoot)!==v4||previousVersion(installRoot)!==v2)fail("manager rollback did not delegate to the exact updater transaction");
  pass("manager-rollback-delegates-to-updater-transaction");
  const legacyRoot=fs.realpathSync(path.join(installRoot,"previous"));replaceInstalledUpdaterWithLegacy(legacyRoot);
  const legacyInterrupted=run(managerPath,["update","rollback","--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:{...e,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_CURRENT:"1"},capture:true,allowFail:true});
  if(legacyInterrupted.status===0||!`${legacyInterrupted.stdout}${legacyInterrupted.stderr}`.includes("test interruption after current rollback pointer publication"))fail("legacy-target rollback interruption fixture did not stop after current publication");
  if(fs.realpathSync(path.join(installRoot,"current"))!==legacyRoot)fail("legacy rollback target was not published before interruption");
  const legacyRecovered=run(managerPath,["version"],{env:e,capture:true,allowFail:true});
  if(legacyRecovered.status!==2||!`${legacyRecovered.stdout}${legacyRecovered.stderr}`.includes("ROLLBACK_RECOVERED"))fail("stable manager did not recover through the repaired control updater");
  if(`${legacyRecovered.stdout}${legacyRecovered.stderr}`.includes("LEGACY_UPDATER_HAS_NO_ROLLBACK_JOURNAL_RECOVERY"))fail("recovery delegated to the legacy rollback target updater");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v4)fail("stable recovery did not complete the legacy-target rollback transaction");
  for(const artifact of [".current.update-next",".previous.update-next",".rollback.update-transaction-v1.json",".rollback.update-transaction-v1.json.next"]){if(fs.existsSync(path.join(installRoot,artifact)))fail(`stable legacy recovery left artifact ${artifact}`);}
  pass("stable-manager-recovers-interrupted-rollback-to-legacy-target");
  run(managerPath,["verify"],{env:e});
  run("bash",[path.join(installRoot,"current","install-void-node-v1.sh"),"uninstall","--install-root",installRoot,"--bin-dir",binDir,"--yes","--purge"],{env:e});
  if(fs.existsSync(installRoot)||fs.existsSync(managerPath))fail("uninstall left update-wall artifacts");pass("uninstall-purge-after-update-chain");
  console.log(`${MARKER}_FULL_GREEN`);console.log("service_started_implicitly=false");console.log("guarded_lanes_activated=false");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
