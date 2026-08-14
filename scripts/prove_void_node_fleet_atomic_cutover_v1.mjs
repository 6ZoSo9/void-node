#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildCutoverPlanV1,
  parseLiveInspectionV1,
  parseStageInspectionV1,
  validateCutoverStabilityV1,
  validateLiveInspectionV1,
  validateStageInspectionV1,
  validateTransitionPolicyV1,
} from "../tools/void-node-fleet-atomic-cutover-v1.mjs";

const OLD="5".repeat(40), TARGET="b".repeat(40), TREE="c".repeat(40), INV="d".repeat(32);
const sealedSdk=[
  "integrations/agents/void-agent-sdk-v1/LICENSE",
  "integrations/agents/void-agent-sdk-v1/README.md",
  "integrations/agents/void-agent-sdk-v1/cli.mjs",
  "integrations/agents/void-agent-sdk-v1/index.mjs",
  "integrations/agents/void-agent-sdk-v1/integrity.json",
  "integrations/agents/void-agent-sdk-v1/package.json",
];
const paths=[
  ".ci/VCL_LICENSE.txt","LICENSE","ops/coordination/worker-coordination-state-v3.json",
  "public/void-app-wave1-v1/assets/css/site-theme.css",
  "scripts/prove_void_p2p_udp_swarm_public_relay_introduction_collector_v1.ts",
  ...sealedSdk,
  "src/p2p/udp_swarm_node_runtime_mount_v1.ts",
  "src/p2p/udp_swarm_public_relay_introduction_collector_v1.ts",
  "tools/void-worker-coordination-v3.mjs",
];
const policy=validateTransitionPolicyV1({comparison:{changed_paths:paths}});
assert.deepEqual(policy.runtime_core_paths,[
  "src/p2p/udp_swarm_node_runtime_mount_v1.ts",
  "src/p2p/udp_swarm_public_relay_introduction_collector_v1.ts",
]);
assert.deepEqual(policy.sealed_agent_sdk_distribution_files,sealedSdk);
assert.deepEqual(policy.transition_path_class_counts,{reviewed_support:6,runtime_core:2,sealed_agent_sdk_distribution:6});
assert.equal(Object.values(policy.transition_path_class_counts).reduce((sum,count)=>sum+count,0),paths.length);
for(const bad of [
  "index.ts","release/bin/void-node","unknown/deploy.sh","public/void-app-wave1-v1/assets/js/extra.js","tools/extra.mjs",
  "package.json","package-lock.json","Dockerfile","tsconfig.json","ops/install-void-node-live-user-service-v1.sh",
  "scripts/run_void_public_bootstrap_supervisor_v1.mjs","contracts/Foo.sol","config/mainnet.json","integrations/a.mjs",
  "integrations/agents/void-agent-sdk-v1/extra.mjs","integrations/agents/another-sdk/index.mjs","src/index.ts",
]) assert.throws(()=>validateTransitionPolicyV1({comparison:{changed_paths:[...paths,bad]}}),/unreviewed transition path/);

const argv=(repo="/tmp/live",exe="/usr/bin/node")=>[
  exe,
  "--conditions=void-process-source-identity-v1",
  `--conditions=void-process-source-commit-${OLD}`,
  `--conditions=void-process-source-tree-${TREE}`,
  "--conditions=void-process-source-branch-main",
  "--require",`${repo}/node_modules/tsx/dist/preflight.cjs`,"--import",`file://${repo}/node_modules/tsx/dist/loader.mjs`,`${repo}/src/index.ts`,
];
const b64=(v)=>Buffer.from(typeof v==="string"?v:JSON.stringify(v)).toString("base64");
const liveOutput=(overrides={})=>{
  const repo=overrides.repo??"/tmp/live";
  const exe=overrides.exe??"/usr/bin/node";
  const args=overrides.argv??argv(repo,exe);
  const version=overrides.version??{process_source:{marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",commit:OLD,tree:TREE,branch:"main",immutable:true}};
  return [
    `repo_real\t${overrides.repo_real??repo}`,`head\t${overrides.head??OLD}`,`branch\t${overrides.branch??"main"}`,"status\t",
    "remote\thttps://github.com/6ZoSo9/void-node.git","shallow\tfalse","active\tactive",`pid\t${overrides.pid??4242}`,
    `inv\t${overrides.inv??INV}`,`cwd\t${overrides.cwd??repo}`,`exe\t${exe}`,`argv\t${b64(args.join("\n"))}`,
    `pc\t${overrides.pc??OLD}`,`pt\t${overrides.pt??TREE}`,`pb\t${overrides.pb??"main"}`,
    `health\t${b64({ok:true})}`,`ready\t${b64({ready:true,gap:0,txroot_live:1})}`,`version\t${b64(version)}`,
    `peer\t${b64({connected:[{},{}]})}`,
  ].join("\n");
};
const local={node:{name:"precision",transport:"local",repo:"/tmp/live",service:"void-node-live.service",http_base:"http://127.0.0.1:4100",min_peers:1,expected_remote_url:"https://github.com/6ZoSo9/void-node.git",git_remote:"origin",ssh_target:null}};
const ssh={node:{...local.node,name:"nimo",transport:"ssh",ssh_target:"nimo"}};
const live=parseLiveInspectionV1(liveOutput());
const lf=validateLiveInspectionV1(live,local,OLD);
assert.equal(lf.old_process_invocation_id,INV);
assert.equal(lf.peer_count,2);
assert.match(lf.process_identity_sha256,/^[0-9a-f]{64}$/);
assert.doesNotThrow(()=>validateLiveInspectionV1(parseLiveInspectionV1(liveOutput()),ssh,OLD));
assert.throws(()=>validateLiveInspectionV1(parseLiveInspectionV1(liveOutput({cwd:"/tmp/other"})),ssh,OLD),/live process\/source/);
assert.throws(()=>validateLiveInspectionV1(parseLiveInspectionV1(liveOutput({exe:"/usr/bin/python3",argv:argv("/tmp/live","/usr/bin/python3")})),ssh,OLD),/live process\/source/);
assert.throws(()=>validateLiveInspectionV1(parseLiveInspectionV1(liveOutput({argv:argv().slice(0,-1)})),ssh,OLD),/live process\/source/);
assert.throws(()=>validateLiveInspectionV1(parseLiveInspectionV1(liveOutput({version:{process_source:{marker:"VOID_NODE_PROCESS_SOURCE_IDENTITY_V1",commit:TARGET,tree:TREE,branch:"main",immutable:true}}})),ssh,OLD),/live process\/source/);

const before=parseLiveInspectionV1(liveOutput());
const after=parseLiveInspectionV1(liveOutput());
assert.doesNotThrow(()=>validateCutoverStabilityV1(TARGET,TARGET,TARGET,before,after,ssh,OLD));
assert.throws(()=>validateCutoverStabilityV1(TARGET,OLD,TARGET,before,after,ssh,OLD),/remote main moved/);
assert.throws(()=>validateCutoverStabilityV1(TARGET,TARGET,TARGET,before,parseLiveInspectionV1(liveOutput({inv:"e".repeat(32)})),ssh,OLD),/live process identity changed/);

const stageOutput=(o={})=>[
  `head_before\t${o.head_before??TARGET}`,`branch_before\t${o.branch_before??""}`,"status\t",
  `common_before\t${o.common_before??"/tmp/live/.git"}`,`live_common_before\t${o.live_common_before??"/tmp/live/.git"}`,
  `head_after\t${o.head_after??TARGET}`,`branch_after\t${o.branch_after??""}`,
  `common_after\t${o.common_after??"/tmp/live/.git"}`,`live_common_after\t${o.live_common_after??"/tmp/live/.git"}`,
  `nm\t${o.nm??0}`,`tx\t${o.tx??1}`,`p0\t${o.p0??1}`,`p1\t${o.p1??1}`,`p2\t${o.p2??1}`,
].join("\n");
const stage=parseStageInspectionV1(stageOutput());
assert.equal(validateStageInspectionV1(stage,TARGET),true);
assert.throws(()=>validateStageInspectionV1(parseStageInspectionV1(stageOutput({head_after:OLD})),TARGET),/stage is not stable/);
assert.throws(()=>validateStageInspectionV1(parseStageInspectionV1(stageOutput({common_after:"/tmp/other/.git"})),TARGET),/stage is not stable/);
assert.throws(()=>validateStageInspectionV1(parseStageInspectionV1(stageOutput({nm:1})),TARGET),/stage is not stable/);

const facts={audit_id_sha256:"a".repeat(64),from_sha:OLD,to_sha:TARGET};
const plan=buildCutoverPlanV1(local,facts,policy,"/tmp/stage",lf,stage);
assert.equal(plan.outcome,"READY_FOR_SEPARATE_CUTOVER_AUTHORIZATION");
assert.equal(plan.mutation_authority_granted,false);
assert.deepEqual(plan.stability,{remote_main_stable:true,live_process_identity_stable:true,stage_identity_stable:true});
assert.deepEqual(plan.required_order,["quiesce_selected_service","exact_fast_forward_to_target","start_selected_service_once","prove_new_process_identity_and_health"]);
assert.equal(plan.automatic_retry,false);
assert.equal(plan.automatic_rollback,false);
assert.equal(plan.next_node_automatic,false);
assert.deepEqual(plan.authority,{git_mutation:false,service_mutation:false,package_install:false,build:false,deployment:false,network_configuration:false,credential_read:false,wallet_or_signer:false,validator_mutation:false,work_credit_mutation:false,transaction:false,funds_moved:false});

const source=await import("node:fs").then(m=>m.readFileSync(new URL("../tools/void-node-fleet-atomic-cutover-v1.mjs",import.meta.url),"utf8"));
const proof2Index=source.indexOf('p2=0; (cd "$stage"&&node');
const postProofNodeModulesIndex=source.indexOf('nm=0; test -e "$stage/node_modules"&&nm=1');
const stageAfterIndex=source.indexOf('head_after="$(git -C "$stage" rev-parse HEAD');
assert.ok(proof2Index>=0);
assert.ok(postProofNodeModulesIndex>proof2Index);
assert.ok(stageAfterIndex>postProofNodeModulesIndex);
assert.match(source,/post-proof live inspection failed/);
assert.match(source,/remote main moved during stage proofs/);
assert.doesNotMatch(source,/systemctl\s+--user\s+(?:stop|start|restart)/);
assert.doesNotMatch(source,/merge\s+--ff-only|git\s+(?:pull|reset|checkout)/);
assert.doesNotMatch(source,/--apply|confirm-operation/);

console.log("VOID_NODE_FLEET_ATOMIC_CUTOVER_V1_PROOF_GREEN");
console.log("planner_read_only=1");
console.log("full_fleet_audit_required=1");
console.log("live_process_identity_required=1");
console.log("remote_ssh_process_identity_exact=1");
console.log("proof_interval_live_identity_stable=1");
console.log("proof_interval_remote_main_stable=1");
console.log("stage_identity_bracketed=1");
console.log("stage_runtime_proofs=3");
console.log(`sealed_sdk_distribution_files=${sealedSdk.length}`);
console.log("arbitrary_integrations_allowed=0");
console.log("transition_policy_default_deny=1");
console.log(`reviewed_transition_paths=${paths.length}`);
console.log("stage_node_modules_mutation_required=0");
console.log("mutation_authority_granted=0");
console.log("automatic_retry=0");
console.log("automatic_rollback=0");
console.log("next_node_automatic=0");
console.log("package_install=0");
console.log("build=0");
console.log("wallet_or_signer=0");
console.log("transaction=0");
console.log("funds_moved=0");