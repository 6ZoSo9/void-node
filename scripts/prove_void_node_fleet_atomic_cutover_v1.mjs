#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  buildCutoverPlanV1,
  parseLiveInspectionV1,
  parseStageInspectionV1,
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
assert.deepEqual(validateTransitionPolicyV1({comparison:{changed_paths:paths.filter(p=>!p.startsWith("src/"))}}).runtime_core_paths,[]);
for(const bad of [
  "package.json","package-lock.json","Dockerfile","tsconfig.json","ops/install-void-node-live-user-service-v1.sh",
  "scripts/run_void_public_bootstrap_supervisor_v1.mjs","contracts/Foo.sol","config/mainnet.json","integrations/a.mjs",
  "integrations/agents/void-agent-sdk-v1/extra.mjs","integrations/agents/another-sdk/index.mjs","src/index.ts",
]){
  assert.throws(()=>validateTransitionPolicyV1({comparison:{changed_paths:[...paths,bad]}}),/broader deployment|required|unreviewed runtime/);
}

const c={node:{name:"precision",transport:"local",repo:"/tmp/live",service:"void-node-live.service",http_base:"http://127.0.0.1:4100",min_peers:1,expected_remote_url:"https://github.com/6ZoSo9/void-node.git",git_remote:"origin",ssh_target:null}};
const live=parseLiveInspectionV1([
  `head\t${OLD}`,"branch\tmain","status\t","remote\thttps://github.com/6ZoSo9/void-node.git","shallow\tfalse",
  "active\tactive","pid\t4242",`inv\t${INV}`,"cwd\t/tmp/live",`pc\t${OLD}`,`pt\t${TREE}`,"pb\tmain",
  `health\t${Buffer.from('{"ok":true}').toString("base64")}`,
  `ready\t${Buffer.from('{"ready":true,"gap":0,"txroot_live":1}').toString("base64")}`,
  `peer\t${Buffer.from('{"connected":[{},{}]}').toString("base64")}`,
].join("\n"));
const lf=validateLiveInspectionV1(live,c,OLD);
assert.equal(lf.old_process_invocation_id,INV);
assert.equal(lf.peer_count,2);

const stage=parseStageInspectionV1([
  `head\t${TARGET}`,"branch\t","status\t","common\t/tmp/live/.git","live_common\t/tmp/live/.git","nm\t0","tx\t1","p0\t1","p1\t1","p2\t1",
].join("\n"));
assert.equal(validateStageInspectionV1(stage,TARGET),true);
for(const invalid of [
  { ...stage, node_modules:true },
  { ...stage, proof_runner:false },
  { ...stage, proof0:false },
  { ...stage, proof1:false },
  { ...stage, proof2:false },
]) assert.throws(()=>validateStageInspectionV1(invalid,TARGET),/stage is not exact detached proof-green target/);

const facts={audit_id_sha256:"a".repeat(64),from_sha:OLD,to_sha:TARGET};
const plan=buildCutoverPlanV1(c,facts,policy,"/tmp/stage",lf,stage);
assert.equal(plan.outcome,"READY_FOR_SEPARATE_CUTOVER_AUTHORIZATION");
assert.equal(plan.mutation_authority_granted,false);
assert.deepEqual(plan.required_order,[
  "quiesce_selected_service","exact_fast_forward_to_target","start_selected_service_once","prove_new_process_identity_and_health",
]);
assert.equal(plan.automatic_retry,false);
assert.equal(plan.automatic_rollback,false);
assert.equal(plan.next_node_automatic,false);
assert.deepEqual(plan.authority,{
  git_mutation:false,service_mutation:false,package_install:false,build:false,deployment:false,network_configuration:false,
  credential_read:false,wallet_or_signer:false,validator_mutation:false,work_credit_mutation:false,transaction:false,funds_moved:false,
});
assert.match(plan.plan_id_sha256,/^[0-9a-f]{64}$/);

const source=await import("node:fs").then(m=>m.readFileSync(new URL("../tools/void-node-fleet-atomic-cutover-v1.mjs",import.meta.url),"utf8"));
assert.doesNotMatch(source,/systemctl\s+--user\s+(?:stop|start|restart)/);
assert.doesNotMatch(source,/merge\s+--ff-only|git\s+(?:pull|reset|checkout)/);
assert.doesNotMatch(source,/--apply|confirm-operation/);

console.log("VOID_NODE_FLEET_ATOMIC_CUTOVER_V1_PROOF_GREEN");
console.log("planner_read_only=1");
console.log("full_fleet_audit_required=1");
console.log("live_process_identity_required=1");
console.log("stage_runtime_proofs=3");
console.log(`sealed_sdk_distribution_files=${sealedSdk.length}`);
console.log("arbitrary_integrations_allowed=0");
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
