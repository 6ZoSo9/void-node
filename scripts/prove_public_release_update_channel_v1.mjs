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
function replaceReleaseManagerWithValidFailFixture(releaseRoot){
  const managerPath=path.join(releaseRoot,"bin","void-node"),sumsPath=path.join(releaseRoot,"RELEASE-CONTENTS-SHA256");
  fs.writeFileSync(managerPath,"#!/usr/bin/env bash\nprintf 'HISTORICAL_MANAGER_MUST_NOT_RUN\\n' >&2\nexit 97\n",{mode:0o755});
  const digest=crypto.createHash("sha256").update(fs.readFileSync(managerPath)).digest("hex");
  const lines=fs.readFileSync(sumsPath,"utf8").split(/\r?\n/);let hits=0;
  const next=lines.map(line=>{if(/^[0-9a-f]{64}  bin\/void-node$/.test(line)){hits++;return `${digest}  bin/void-node`;}return line;});
  if(hits!==1)fail(`expected one bin/void-node checksum entry, found ${hits}`);
  fs.writeFileSync(sumsPath,next.join("\n"));
}
function build(root,out,version,epoch){run("node",["tools/build-public-release-v1.mjs","--out",out,"--version",version,"--source-date-epoch",String(epoch)],{cwd:root});}
function manifest(out){return JSON.parse(fs.readFileSync(path.join(out,"void-node-release-manifest.json"),"utf8"));}
function channel(root,out,version,tag){run("node",["tools/build-public-release-channel-v1.mjs","--manifest",path.join(out,"void-node-release-manifest.json"),"--checksums",path.join(out,"SHA256SUMS"),"--base-url",pathToFileURL(out+path.sep).toString(),"--release-tag",tag,"--out",path.join(out,"stable-v1.json"),"--test-allow-file"],{cwd:root});run("node",["tools/build-public-release-channel-v1.mjs","--verify",path.join(out,"stable-v1.json"),"--test-allow-file"],{cwd:root});}

const full=process.argv.includes("--full");
need("release/channel/public-release-channel-v1.schema.json",["VOID_PUBLIC_RELEASE_CHANNEL_V1","rollback_on_health_failure"]);
need("tools/build-public-release-channel-v1.mjs",["VOID_PUBLIC_RELEASE_CHANNEL_BUILDER_V1","github_attestation_required","--test-allow-file"]);
const updater=need("release/bin/void-node-update",[
  "VOID_NODE_RELEASE_UPDATE_V1",
  "VOID_NODE_RELEASE_ROLLBACK_TRANSACTION_V1",
  "ROLLBACK_PREP_RECOVERED",
  "ROLLBACK_RECOVERED",
  "restart_if_active",
  "restart_before_invocation_id",
  "ROLLBACK_RESTART_ALREADY_SATISFIED",
  "VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_SERVICE_RESTART",
  "escapes canonical releases directory",
  "downgrade refused",
  "HEALTH_FAIL_ROLLBACK_BEGIN",
  "service_started_implicitly=false",
  'redirect:"error"',
  "canonicalContentLength",
  "readHttpBytesBounded",
  "downloadHttpsAssetToFile",
  'fs.openSync(dest,"wx"',
  'typeof j?.gap==="number"',
  'typeof j?.txroot_live==="number"',
]);
for(const forbidden of ['redirect:"follow"',"arrayBuffer()","Number(j?.gap)","Number(j?.txroot_live)"]){
  if(updater.includes(forbidden))fail(`updater reintroduced forbidden transport/evidence pattern ${forbidden}`);
}
if(!updater.includes('readHttpBytesBounded(u,64*1024,3000,"health response")'))fail("health response byte ceiling not bound");
if(!updater.includes("hash.update(chunk)"))fail("asset stream hashing contract missing");
if(updater.includes('commandExists("systemctl")'))fail("systemd availability probe must honor inherited PATH directly");
if(!updater.includes('spawnSync("systemctl",["--user","show-environment"]'))fail("direct systemd user-manager probe missing");
pass("bounded-network-transport-contract");
const manager=need("release/bin/void-node",["void-node update check","void-node update apply","bin/void-node-update",'exec "$RELEASE_ROOT/bin/void-node-update" rollback']);
need("ops/public/install-void-node-v1.sh",[
  "VOID_NODE_STABLE_MANAGER_V1",
  'CONTROL_UPDATER="$INSTALL_ROOT/control/void-node-update"',
  ".rollback.update-transaction-v1.json",
  "recovery_outcome=rollback_committed",
  'if test "${1:-}" = rollback; then shift; exec_control_rollback "$@"; fi',
  'if test "${1:-}" = update && test "${2:-}" = rollback; then shift 2; exec_control_rollback "$@"; fi',
]);
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
  const out1=path.join(tmp,"release1"),out2=path.join(tmp,"release2"),out3=path.join(tmp,"release3");
  const v1="0.0.1-walltest",v2="0.0.2-walltest",v3="0.0.3-walltest";
  build(root,out1,v1,1700000100);build(root,out2,v2,1700000200);build(root,out3,v3,1700000300);
  channel(root,out1,v1,`release-v${v1}`);channel(root,out2,v2,`release-v${v2}`);channel(root,out3,v3,`release-v${v3}`);
  const home=path.join(tmp,"home"),installRoot=path.join(home,"share","void-node"),binDir=path.join(home,"bin"),fakeBin=path.join(tmp,"fake-bin");fs.mkdirSync(home,{recursive:true});fs.mkdirSync(fakeBin,{recursive:true});
  const restartLog=path.join(tmp,"systemd-restart.log"),activeFile=path.join(tmp,"systemd-active.txt"),invocationFile=path.join(tmp,"systemd-invocation-id.txt"),fakeSystemctl=path.join(fakeBin,"systemctl");
  fs.writeFileSync(fakeSystemctl,`#!/usr/bin/env bash
set -euo pipefail
case "$*" in
  "--user show-environment")
    test "\${VOID_TEST_SYSTEMD_MANAGER_AVAILABLE:-0}" = 1
    exit 0
    ;;
  "--user is-active --quiet void-node.service")
    test "\${VOID_TEST_SYSTEMD_MANAGER_AVAILABLE:-0}" = 1
    if [ -n "\${VOID_TEST_SYSTEMD_ACTIVE_FILE:-}" ]; then
      test "$(cat "$VOID_TEST_SYSTEMD_ACTIVE_FILE" 2>/dev/null || true)" = 1
    else
      test "\${VOID_TEST_SYSTEMD_ACTIVE:-0}" = 1
    fi
    exit 0
    ;;
  "--user show void-node.service --property=InvocationID --value")
    test "\${VOID_TEST_SYSTEMD_MANAGER_AVAILABLE:-0}" = 1
    : "\${VOID_TEST_SYSTEMD_INVOCATION_FILE:?}"
    cat "$VOID_TEST_SYSTEMD_INVOCATION_FILE"
    exit 0
    ;;
  "--user restart void-node.service")
    test "\${VOID_TEST_SYSTEMD_MANAGER_AVAILABLE:-0}" = 1
    : "\${VOID_TEST_SYSTEMD_RESTART_LOG:?}"
    printf 'restart\\n' >> "$VOID_TEST_SYSTEMD_RESTART_LOG"
    if [ -n "\${VOID_TEST_SYSTEMD_ACTIVE_FILE:-}" ]; then printf '1\\n' > "$VOID_TEST_SYSTEMD_ACTIVE_FILE"; fi
    if [ -n "\${VOID_TEST_SYSTEMD_INVOCATION_FILE:-}" ]; then : "\${VOID_TEST_SYSTEMD_NEXT_INVOCATION_ID:?}"; printf '%s\\n' "$VOID_TEST_SYSTEMD_NEXT_INVOCATION_ID" > "$VOID_TEST_SYSTEMD_INVOCATION_FILE"; fi
    exit 0
    ;;
esac
exit 2
`,{mode:0o755});
  const e={HOME:home,PATH:`${fakeBin}:${process.env.PATH||""}`,VOID_NODE_ALLOW_ROOT_INSTALL:"1",VOID_NODE_INSTALL_ALLOW_UNSUPPORTED_NODE:"1",VOID_NODE_CONFIG_DIR:path.join(home,"config"),VOID_NODE_STATE_DIR:path.join(home,"state"),VOID_NODE_SYSTEMD_DIR:path.join(home,"systemd"),VOID_NODE_UPDATE_TEST_ALLOW_FILE:"1"};
  const m1=manifest(out1);

  const aliasHome=path.join(tmp,"alias-home"),aliasInstallRoot=path.join(aliasHome,"share","void-node"),aliasBinDir=path.join(aliasInstallRoot,"bin");
  fs.mkdirSync(aliasHome,{recursive:true});
  const aliasEnv={...e,HOME:aliasHome,VOID_NODE_CONFIG_DIR:path.join(aliasHome,"config"),VOID_NODE_STATE_DIR:path.join(aliasHome,"state"),VOID_NODE_SYSTEMD_DIR:path.join(aliasHome,"systemd")};
  run("bash",[path.join(out1,"install-void-node-v1.sh"),"install","--archive",path.join(out1,m1.archive),"--checksums",path.join(out1,"SHA256SUMS"),"--manifest",path.join(out1,"void-node-release-manifest.json"),"--install-root",aliasInstallRoot,"--bin-dir",aliasBinDir,"--yes"],{env:aliasEnv});
  const aliasCommand=path.join(aliasBinDir,"void-node"),aliasStat=fs.lstatSync(aliasCommand);
  if(!aliasStat.isFile()||aliasStat.isSymbolicLink())fail("bin-dir alias replaced stable manager with a symlink");
  const aliasVersion=run(aliasCommand,["version"],{env:aliasEnv,capture:true});
  if(!aliasVersion.includes(v1))fail("bin-dir alias stable manager did not dispatch current release");
  pass("bin-dir-alias-preserves-stable-manager");
  run("bash",[path.join(aliasInstallRoot,"current","install-void-node-v1.sh"),"uninstall","--install-root",aliasInstallRoot,"--bin-dir",aliasBinDir,"--yes","--purge"],{env:aliasEnv});
  if(fs.existsSync(aliasInstallRoot))fail("bin-dir alias uninstall left install root");

  run("bash",[path.join(out1,"install-void-node-v1.sh"),"install","--archive",path.join(out1,m1.archive),"--checksums",path.join(out1,"SHA256SUMS"),"--manifest",path.join(out1,"void-node-release-manifest.json"),"--install-root",installRoot,"--bin-dir",binDir,"--yes"],{env:e});
  if(versionAt(installRoot)!==v1)fail("initial release install mismatch");pass("initial-release-installed");
  const managerPath=path.join(binDir,"void-node");
  const stableManagerPath=path.join(installRoot,"bin","void-node"),controlUpdaterPath=path.join(installRoot,"control","void-node-update");
  if(fs.realpathSync(managerPath)!==stableManagerPath||!fs.existsSync(controlUpdaterPath))fail("stable recovery manager/control updater not installed outside current release");
  pass("stable-recovery-manager-installed");
  const check=run(managerPath,["update","check","--channel",path.join(out2,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file"],{env:e,capture:true});
  if(!check.includes("update_available=true"))fail("update check did not report update");pass("verified-update-check");
  run(managerPath,["update","apply","--channel",path.join(out2,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e});
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v1)fail("apply did not establish current/previous pointers");pass("verified-apply-current-previous");

  const historicalPrevious=fs.realpathSync(path.join(installRoot,"previous"));
  const previousPointer=path.join(installRoot,"previous"),externalPrevious=path.join(tmp,"external-previous-release");
  fs.cpSync(historicalPrevious,externalPrevious,{recursive:true});
  fs.unlinkSync(previousPointer);fs.symlinkSync(externalPrevious,previousPointer);
  const externalRollback=run(managerPath,["rollback"],{env:e,capture:true,allowFail:true});
  const externalRollbackOutput=`${externalRollback.stdout}${externalRollback.stderr}`;
  if(externalRollback.status===0||!externalRollbackOutput.includes("previous release pointer escapes canonical releases directory"))fail("rollback accepted a previous pointer outside canonical releases");
  if(versionAt(installRoot)!==v2||fs.realpathSync(previousPointer)!==fs.realpathSync(externalPrevious))fail("external-pointer rejection mutated canonical rollback state");
  for(const artifact of [".rollback.update-transaction-v1.json",".rollback.update-transaction-v1.json.next",".current.update-next",".previous.update-next"]){
    if(fs.existsSync(path.join(installRoot,artifact)))fail(`external-pointer rejection left rollback artifact ${artifact}`);
  }
  fs.unlinkSync(previousPointer);fs.symlinkSync(historicalPrevious,previousPointer);
  pass("rollback-rejects-external-release-pointer-before-mutation");

  replaceReleaseManagerWithValidFailFixture(historicalPrevious);
  run(managerPath,["rollback"],{env:e});
  if(versionAt(installRoot)!==v1||previousVersion(installRoot)!==v2)fail("first downgrade-safety rollback did not enter historical release");
  const historicalRollback=run(managerPath,["rollback"],{env:e,capture:true});
  if(historicalRollback.includes("HISTORICAL_MANAGER_MUST_NOT_RUN"))fail("stable manager dispatched rollback into historical release manager");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v1)fail("stable manager did not roll back out of historical release through control updater");
  pass("stable-manager-intercepts-rollback-across-historical-release");

  const same=run(managerPath,["update","apply","--channel",path.join(out2,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e,capture:true});
  if(!same.includes("ALREADY_CURRENT"))fail("same-version apply was not idempotent");pass("same-version-idempotent");
  const down=run(managerPath,["update","apply","--channel",path.join(out1,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e,capture:true,allowFail:true});
  if(down.status===0||!`${down.stdout}${down.stderr}`.includes("downgrade refused"))fail("downgrade was not refused");if(versionAt(installRoot)!==v2)fail("downgrade refusal changed current release");pass("anti-downgrade");
  const m3=manifest(out3),archive3=path.join(out3,m3.archive),backup=fs.readFileSync(archive3);fs.appendFileSync(archive3,"tamper");
  const tamper=run(managerPath,["update","apply","--channel",path.join(out3,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes"],{env:e,capture:true,allowFail:true});
  if(tamper.status===0||!/size mismatch|checksum mismatch/.test(`${tamper.stdout}${tamper.stderr}`))fail("tampered archive was not rejected");if(versionAt(installRoot)!==v2)fail("tamper rejection changed current release");pass("tampered-asset-rejected");fs.writeFileSync(archive3,backup);
  const health=run(managerPath,["update","apply","--channel",path.join(out3,"stable-v1.json"),"--install-root",installRoot,"--bin-dir",binDir,"--test-allow-file","--skip-attestation","--yes","--health-command","false"],{env:e,capture:true,allowFail:true});
  if(health.status===0||!`${health.stdout}${health.stderr}`.includes("HEALTH_FAIL_ROLLBACK_BEGIN"))fail("failed health gate did not trigger rollback");if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3)fail(`health rollback failed; current=${versionAt(installRoot)} previous=${previousVersion(installRoot)}`);pass("health-gated-automatic-rollback");

  const interrupted=run(managerPath,["update","rollback","--install-root",installRoot,"--test-allow-file"],{
    env:{...e,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_CURRENT:"1"},capture:true,allowFail:true,
  });
  if(interrupted.status===0||!`${interrupted.stdout}${interrupted.stderr}`.includes("test interruption after current rollback pointer publication"))fail("rollback interruption seam did not stop after current pointer publication");
  const rollbackJournal=path.join(installRoot,".rollback.update-transaction-v1.json");
  const previousNext=path.join(installRoot,".previous.update-next");
  if(versionAt(installRoot)!==v3||previousVersion(installRoot)!==v3||!fs.existsSync(rollbackJournal)||!fs.existsSync(previousNext))fail("interrupted rollback did not preserve the expected reconstructable partial state");
  pass("rollback-interruption-journal-preserved");

  const recoveredRollback=run(managerPath,["rollback"],{env:e,capture:true});
  if(!recoveredRollback.includes("ROLLBACK_RECOVERED")||!recoveredRollback.includes("recovery_outcome=rollback_committed"))fail("stable manager did not classify committed rollback recovery");
  if(versionAt(installRoot)!==v3||previousVersion(installRoot)!==v2)fail("committed rollback recovery was accidentally applied twice");
  for(const artifact of [".rollback.update-transaction-v1.json",".rollback.update-transaction-v1.json.next",".current.update-next",".previous.update-next"]){
    if(fs.existsSync(path.join(installRoot,artifact)))fail(`rollback recovery left transaction artifact ${artifact}`);
  }
  pass("stable-manager-committed-recovery-satisfies-rollback-once");

  const postRecoveryVersion=run(managerPath,["version"],{env:e,capture:true});
  if(!postRecoveryVersion.includes(v3))fail("stable manager did not resume normal current-release dispatch after recovery");
  run(managerPath,["rollback"],{env:e});
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3)fail("post-recovery explicit rollback did not restore expected pointer pair");
  pass("post-recovery-explicit-rollback");

  const invocationBefore="11111111111111111111111111111111",invocationAfter="22222222222222222222222222222222";
  fs.rmSync(restartLog,{force:true});
  fs.writeFileSync(activeFile,"1\n");
  fs.writeFileSync(invocationFile,invocationBefore+"\n");
  const restartWindowEnv={...e,VOID_TEST_SYSTEMD_MANAGER_AVAILABLE:"1",VOID_TEST_SYSTEMD_ACTIVE_FILE:activeFile,VOID_TEST_SYSTEMD_INVOCATION_FILE:invocationFile,VOID_TEST_SYSTEMD_NEXT_INVOCATION_ID:invocationAfter,VOID_TEST_SYSTEMD_RESTART_LOG:restartLog,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_BEFORE_SERVICE_RESTART:"1"};
  const restartInterrupted=run(managerPath,["update","rollback","--install-root",installRoot,"--test-allow-file"],{env:restartWindowEnv,capture:true,allowFail:true});
  const restartInterruptedOutput=`${restartInterrupted.stdout||""}${restartInterrupted.stderr||""}`;
  if(restartInterrupted.status===0||!restartInterruptedOutput.includes("test interruption after rollback pointer publication before service restart")){
    throw new Error(
      "restart-window rollback interruption seam did not fire "+
      `status=${JSON.stringify(restartInterrupted.status)} output=${JSON.stringify(restartInterruptedOutput.slice(-2000))}`
    );
  }
  const restartJournal=JSON.parse(fs.readFileSync(rollbackJournal,"utf8"));
  const restartWindowCurrent=versionAt(installRoot),restartWindowPrevious=previousVersion(installRoot);
  if(restartJournal.schema_version!==2||restartJournal.restart_if_active!==true||restartJournal.restart_before_invocation_id!==invocationBefore||restartWindowCurrent!==v3||restartWindowPrevious!==v2){
    throw new Error(
      "restart-window interruption did not persist invocation-bound restart intent with completed pointer pair "+
      `restart_if_active=${JSON.stringify(restartJournal.restart_if_active)} witness=${JSON.stringify(restartJournal.restart_before_invocation_id)} current=${restartWindowCurrent} previous=${restartWindowPrevious}`
    );
  }
  if(fs.existsSync(restartLog))fail("service restart occurred before restart-window interruption");
  pass("rollback-restart-intent-journal-preserved");

  const managerUnavailableRecovery=run(managerPath,["version"],{env:e,capture:true,allowFail:true});
  const managerUnavailableOutput=`${managerUnavailableRecovery.stdout}${managerUnavailableRecovery.stderr}`;
  if(managerUnavailableRecovery.status===0||!managerUnavailableOutput.includes("requires systemd user manager")||!fs.existsSync(rollbackJournal))fail("restart obligation was lost while systemd manager was unavailable");
  if(fs.existsSync(restartLog))fail("systemd-unavailable recovery unexpectedly restarted service");
  pass("rollback-restart-obligation-held-without-systemd");

  fs.writeFileSync(activeFile,"0\n");
  const restartRecoveryEnv={...e,VOID_TEST_SYSTEMD_MANAGER_AVAILABLE:"1",VOID_TEST_SYSTEMD_ACTIVE_FILE:activeFile,VOID_TEST_SYSTEMD_INVOCATION_FILE:invocationFile,VOID_TEST_SYSTEMD_NEXT_INVOCATION_ID:invocationAfter,VOID_TEST_SYSTEMD_RESTART_LOG:restartLog};
  const restartRecovered=run(managerPath,["version"],{env:restartRecoveryEnv,capture:true});
  if(!restartRecovered.includes("ROLLBACK_RECOVERED")||!restartRecovered.includes("recovery_outcome=rollback_committed")||!restartRecovered.includes(v3))fail("restart-window recovery did not replay committed rollback transaction before dispatch");
  if(!fs.existsSync(restartLog)||fs.readFileSync(restartLog,"utf8")!=="restart\n")fail("restart-window recovery did not restore previously active service after it became inactive");
  if(fs.readFileSync(invocationFile,"utf8").trim()!==invocationAfter||fs.readFileSync(activeFile,"utf8").trim()!=="1")fail("restart-window recovery did not publish a new active invocation witness");
  if(fs.existsSync(rollbackJournal)||versionAt(installRoot)!==v3||previousVersion(installRoot)!==v2)fail("restart-window recovery did not finalize coherent pointer state");
  pass("rollback-restart-intent-replayed-before-journal-cleanup");

  run(managerPath,["rollback"],{env:e});
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3)fail("post-restart-recovery rollback did not restore expected pointer pair");

  const crashBeforeInvocation="33333333333333333333333333333333",crashAfterInvocation="44444444444444444444444444444444";
  fs.rmSync(restartLog,{force:true});
  fs.writeFileSync(activeFile,"1\n");
  fs.writeFileSync(invocationFile,crashBeforeInvocation+"\n");
  const postRestartCrashEnv={...e,VOID_TEST_SYSTEMD_MANAGER_AVAILABLE:"1",VOID_TEST_SYSTEMD_ACTIVE_FILE:activeFile,VOID_TEST_SYSTEMD_INVOCATION_FILE:invocationFile,VOID_TEST_SYSTEMD_NEXT_INVOCATION_ID:crashAfterInvocation,VOID_TEST_SYSTEMD_RESTART_LOG:restartLog,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_SERVICE_RESTART:"1"};
  const postRestartCrash=run(managerPath,["update","rollback","--install-root",installRoot,"--test-allow-file"],{env:postRestartCrashEnv,capture:true,allowFail:true});
  const postRestartCrashOutput=`${postRestartCrash.stdout||""}${postRestartCrash.stderr||""}`;
  if(postRestartCrash.status===0||!postRestartCrashOutput.includes("test interruption after successful service restart before rollback journal cleanup"))fail("post-restart crash seam did not fire");
  if(!fs.existsSync(rollbackJournal)||fs.readFileSync(restartLog,"utf8")!=="restart\n"||fs.readFileSync(invocationFile,"utf8").trim()!==crashAfterInvocation||versionAt(installRoot)!==v3||previousVersion(installRoot)!==v2)fail("post-restart crash did not preserve one completed restart plus committed rollback journal");
  const postRestartRecovered=run(managerPath,["version"],{env:{...postRestartCrashEnv,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_SERVICE_RESTART:"0"},capture:true});
  if(!postRestartRecovered.includes("ROLLBACK_RESTART_ALREADY_SATISFIED")||!postRestartRecovered.includes("ROLLBACK_RECOVERED")||!postRestartRecovered.includes(v3))fail("post-restart recovery did not recognize already-satisfied invocation witness");
  if(fs.readFileSync(restartLog,"utf8")!=="restart\n")fail("post-restart recovery replayed service restart twice");
  if(fs.existsSync(rollbackJournal))fail("post-restart recovery did not clear completed rollback journal");
  pass("rollback-post-restart-crash-does-not-restart-twice");

  run(managerPath,["rollback"],{env:e});
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3)fail("post-restart-dedupe rollback did not restore expected pointer pair");

  const prepInterrupted=run(managerPath,["update","rollback","--install-root",installRoot,"--test-allow-file"],{
    env:{...e,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_FIRST_STAGE:"1"},capture:true,allowFail:true,
  });
  if(prepInterrupted.status===0||!`${prepInterrupted.stdout}${prepInterrupted.stderr}`.includes("test interruption after first rollback staging link"))fail("pre-journal rollback interruption seam did not stop after first staging link");
  const currentNext=path.join(installRoot,".current.update-next");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3||!fs.existsSync(currentNext)||fs.existsSync(rollbackJournal))fail("pre-journal interruption did not preserve exact staged-only state");
  pass("rollback-prejournal-interruption-preserved");

  const prepRecovered=run(managerPath,["version"],{env:e,capture:true});
  if(!prepRecovered.includes("ROLLBACK_PREP_RECOVERED")||!prepRecovered.includes("recovery_outcome=rollback_aborted_before_publication")||!prepRecovered.includes(v2))fail("stable manager did not classify and continue after pre-journal rollback cleanup");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3)fail("pre-journal rollback recovery changed canonical pointers");
  for(const artifact of [".rollback.update-transaction-v1.json",".rollback.update-transaction-v1.json.next",".current.update-next",".previous.update-next"]){
    if(fs.existsSync(path.join(installRoot,artifact)))fail(`pre-journal rollback recovery left artifact ${artifact}`);
  }
  pass("stable-manager-recovered-prejournal-rollback");

  const journalStageInterrupted=run(managerPath,["update","rollback","--install-root",installRoot,"--test-allow-file"],{
    env:{...e,VOID_NODE_UPDATE_TEST_INTERRUPT_ROLLBACK_AFTER_STAGING_JOURNAL:"1"},capture:true,allowFail:true,
  });
  if(journalStageInterrupted.status===0||!`${journalStageInterrupted.stdout}${journalStageInterrupted.stderr}`.includes("test interruption after rollback staging journal fsync"))fail("staged-journal rollback interruption seam did not fire");
  const rollbackJournalNext=path.join(installRoot,".rollback.update-transaction-v1.json.next");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3||!fs.existsSync(currentNext)||!fs.existsSync(previousNext)||!fs.existsSync(rollbackJournalNext)||fs.existsSync(rollbackJournal))fail("staged-journal interruption did not preserve exact prepared rollback state");
  pass("rollback-staging-journal-interruption-preserved");

  const journalStageRecovered=run(managerPath,["version"],{env:e,capture:true});
  if(!journalStageRecovered.includes("ROLLBACK_PREP_RECOVERED")||!journalStageRecovered.includes("recovery_outcome=rollback_aborted_before_publication")||!journalStageRecovered.includes(v2))fail("stable manager did not classify and continue after staged rollback-journal cleanup");
  if(versionAt(installRoot)!==v2||previousVersion(installRoot)!==v3)fail("staged-journal recovery changed canonical pointers");
  for(const artifact of [".rollback.update-transaction-v1.json",".rollback.update-transaction-v1.json.next",".current.update-next",".previous.update-next"]){
    if(fs.existsSync(path.join(installRoot,artifact)))fail(`staged-journal recovery left artifact ${artifact}`);
  }
  pass("stable-manager-recovered-staging-journal");

  run(managerPath,["verify"],{env:e});
  run("bash",[path.join(installRoot,"current","install-void-node-v1.sh"),"uninstall","--install-root",installRoot,"--bin-dir",binDir,"--yes","--purge"],{env:e});
  if(fs.existsSync(installRoot)||fs.existsSync(managerPath))fail("uninstall left update-wall artifacts");pass("uninstall-purge-after-update-chain");
  console.log(`${MARKER}_FULL_GREEN`);console.log("service_started_implicitly=false");console.log("guarded_lanes_activated=false");
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
