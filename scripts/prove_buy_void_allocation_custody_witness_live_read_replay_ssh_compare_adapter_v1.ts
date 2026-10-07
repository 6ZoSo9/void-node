import assert from "node:assert/strict";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_V1,
  createBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareAdapterV1,
  testOnlyBuildBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareRequestV1,
  testOnlyCompareBuyVoidAllocationCustodyWitnessLiveReadReplaySshAdapterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_ssh_compare_adapter_v1.js";
import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

const REQUEST_ID="voidwlrwreq1_" + "7".repeat(64);
const journal=Buffer.alloc(0);
const high=deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1("");
assert.equal(high.ok,true);
if(!high.ok) throw new Error("genesis high-water held");
const high_water=Buffer.from(high.high_water_json,"utf8");

const state=Object.freeze({
  journal_jsonl:journal,
  high_water_json:high_water,
});

function canonicalJson(value: unknown): string {
  if(value===null) return "null";
  if(typeof value==="string") return JSON.stringify(value);
  if(typeof value==="boolean") return value?"true":"false";
  if(typeof value==="number" && Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return "["+value.map(canonicalJson).join(",")+"]";
  if(value && typeof value==="object"){
    const raw=value as Record<string,unknown>;
    return "{"+Object.keys(raw).sort()
      .map(k=>JSON.stringify(k)+":"+canonicalJson(raw[k])).join(",")+"}";
  }
  throw new Error("noncanonical");
}

const request=testOnlyBuildBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareRequestV1(state,REQUEST_ID);
const parsedRequest=JSON.parse(request.toString("utf8"));
assert.equal(parsedRequest.operation,"compare");
assert.equal(parsedRequest.request_id,REQUEST_ID);
assert.equal(parsedRequest.source_journal_json_base64,"");
assert.equal(parsedRequest.source_high_water_json_base64,high_water.toString("base64"));
assert.equal(canonicalJson(parsedRequest)+"\n",request.toString("utf8"));

function response(overrides:Record<string,unknown>={}): Buffer {
  const data={
    schema:"void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_compare_response_v1",
    marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_COMPARE_RESPONSE_V1",
    version:1,
    request_id:REQUEST_ID,
    comparison_status:"matched",
    initialized:true,
    witness_sha256:"sha256:"+"a".repeat(64),
    witness_bytes:1249,
    event_count:1,
    tip_event_sha256:"sha256:"+"b".repeat(64),
    witnessed_replay_sequence:0,
    local_replay_sequence:0,
    exact_live_match:true,
    external_witness_update_required:false,
    rollback_regression_candidate:false,
    rollback_regression_detected:false,
    mutation_admission_allowed:true,
    operation_performed:false,
    recovered_intent:false,
    server_controlled_witness_observed:true,
    external_transport_authenticated:false,
    external_witness_storage_proven:false,
    production_gate_ready:false,
    funds_movement:false,
    ...overrides,
  };
  return Buffer.from(canonicalJson(data)+"\n","utf8");
}

let calls=0;
const matched=response();
const roundtrip=testOnlyCompareBuyVoidAllocationCustodyWitnessLiveReadReplaySshAdapterV1(
  state,REQUEST_ID,(command,args,options)=>{
    calls++;
    assert.equal(command,"/usr/bin/ssh");
    assert.equal(args[0],"-F");
    assert.equal(args[1],"/dev/null");
    assert.equal(args.at(-1),"voidwitness@100.91.79.112");
    const expectedArguments=[
      "BatchMode=yes",
      "IdentitiesOnly=yes",
      "IdentityAgent=none",
      "PreferredAuthentications=publickey",
      "PasswordAuthentication=no",
      "KbdInteractiveAuthentication=no",
      "StrictHostKeyChecking=yes",
      "HostKeyAlgorithms=ssh-ed25519",
      "HostKeyAlias=nimo",
      "UserKnownHostsFile=/etc/void/replay-compare-transport-v1/known_hosts",
      "GlobalKnownHostsFile=/dev/null",
      "UpdateHostKeys=no",
      "ClearAllForwardings=yes",
      "ConnectTimeout=4",
      "ConnectionAttempts=1",
      "ControlMaster=no",
      "ProxyCommand=none",
      "ProxyJump=none",
    ];
    for(const option of expectedArguments) {
      assert.ok(args.includes(option),"missing ssh option: "+option);
    }
    assert.ok(args.includes("/var/lib/void-replay-compare-transport-v1/id_ed25519"));
    assert.equal(options.timeout,12000);
    assert.equal(options.maxBuffer,64*1024);
    assert.equal(options.encoding,null);
    assert.equal(options.windowsHide,true);
    assert.equal(options.env.LC_ALL,"C");
    assert.equal(options.env.HOME,"/var/lib/void-replay-compare-transport-v1");
    assert.deepEqual(options.input,request);
    return {status:0,signal:null,stdout:matched,stderr:Buffer.alloc(0)};
  },
);
assert.equal(calls,1);
assert.deepEqual(roundtrip.request_json,request);
assert.deepEqual(roundtrip.response_json,matched);

for (const [name,changed] of [
  ["witness_ahead",{comparison_status:"witness_ahead",witnessed_replay_sequence:1,event_count:2,local_replay_sequence:0,exact_live_match:false,rollback_regression_candidate:true,mutation_admission_allowed:false}],
  ["local_ahead",{comparison_status:"local_ahead",exact_live_match:false,external_witness_update_required:true,mutation_admission_allowed:false}],
  ["request_id",{request_id:"voidwlrwreq1_"+"8".repeat(64)}],
  ["claimed_transport",{external_transport_authenticated:true}],
  ["claimed_recovery",{recovered_intent:true}],
  ["claimed_mutation",{operation_performed:true}],
  ["fake_server_origin",{server_controlled_witness_observed:false}],
] as [string,Record<string,unknown>][]) {
  assert.throws(
    ()=>testOnlyCompareBuyVoidAllocationCustodyWitnessLiveReadReplaySshAdapterV1(
      state,REQUEST_ID,()=>({
        status:0,signal:null,stdout:response(changed),stderr:Buffer.alloc(0),
      })
    ),
    /witness_replay_ssh_compare_adapter_packet_/u,
    name,
  );
}

for (const [name,result] of [
  ["exit",{status:1,signal:null,stdout:matched,stderr:Buffer.alloc(0)}],
  ["timeout",{status:null,signal:"SIGTERM",stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}],
  ["error",{status:null,signal:null,error:new Error("connect failed"),stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}],
] as [string,any][]) {
  assert.throws(
    ()=>testOnlyCompareBuyVoidAllocationCustodyWitnessLiveReadReplaySshAdapterV1(
      state,REQUEST_ID,()=>result,
    ),
    /witness_replay_ssh_compare_adapter_ssh_transport_failed/u,
    name,
  );
}

assert.throws(
  ()=>testOnlyCompareBuyVoidAllocationCustodyWitnessLiveReadReplaySshAdapterV1(
    state,REQUEST_ID,()=>({status:0,signal:null,stdout:matched,stderr:Buffer.from("warning")}),
  ),
  /witness_replay_ssh_compare_adapter_ssh_channel_invalid/u,
);

{
  let runCount=0;
  assert.throws(
    ()=>testOnlyCompareBuyVoidAllocationCustodyWitnessLiveReadReplaySshAdapterV1(
      {journal_jsonl:Buffer.from("bad"),high_water_json:high_water},
      REQUEST_ID,
      ()=>{runCount++;return {status:0,signal:null,stdout:matched,stderr:Buffer.alloc(0)};},
    ),
    /witness_replay_ssh_compare_adapter_local_/u,
  );
  assert.equal(runCount,0);
}

{
  const before=journal.length;
  assert.throws(
    ()=>testOnlyBuildBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareRequestV1(
      state,
      "voidwlrwreq1_BAD",
    ),
    /request_id_invalid/u,
  );
  assert.equal(journal.length,before);
}

assert.equal(typeof createBuyVoidAllocationCustodyWitnessLiveReadReplaySshCompareAdapterV1(),"function");
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_V1",
);
for(const key of [
  "no_caller_selected_host_key_or_target",
  "designated_custody_uid_gid_required",
  "separate_custody_ssh_key_required",
  "root_owned_known_hosts_file_required",
  "exact_nimo_ed25519_host_pin_required",
  "ssh_configuration_discarded",
  "ssh_agent_disabled",
  "fixed_ssh_timeout_and_output_cap",
  "canonical_compare_packet_required",
  "matched_only_callback_result",
]) {
  assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_AUTHORITY_V1[key as keyof typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_AUTHORITY_V1],true,key);
}
for(const key of [
  "server_compare_only_authorization_proven",
  "compare_key_provisioned",
  "runtime_integration",
  "unguarded_entrypoints_retired",
  "guarded_writer_exclusivity_proven",
  "live_authenticated_compare_executed",
  "live_policy_enforcement_proven",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
]) {
  assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_AUTHORITY_V1[key as keyof typeof VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_AUTHORITY_V1],false,key);
}

const source=fs.readFileSync("src/economic/buy_void_allocation_custody_witness_live_read_replay_ssh_compare_adapter_v1.ts","utf8");
assert.doesNotMatch(source,/\bexec(?:Sync)?\s*\(/u);
assert.doesNotMatch(source,/fs\.(?:writeFileSync|appendFileSync|renameSync|unlinkSync|mkdirSync|chmodSync|chownSync|linkSync)\(/u);
assert.ok(source.includes("spawnSync(command, args, options)"));
assert.ok(source.includes("requireInstalledCredentials()"));

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_SSH_COMPARE_ADAPTER_V1_GREEN");
console.log("canonical_compare_request=true");
console.log("fixed_ssh_target_and_args=true");
console.log("separate_custody_key_required=true");
console.log("root_owned_known_hosts_required=true");
console.log("pinned_nimo_host_fingerprint_required=true");
console.log("matched_response_revalidated=true");
console.log("witness_ahead_holds=true");
console.log("local_ahead_holds=true");
console.log("request_mismatch_holds=true");
console.log("transport_failure_holds=true");
console.log("timeout_holds=true");
console.log("stderr_holds=true");
console.log("credential_provisioning=false");
console.log("runtime_integration=false");
console.log("unguarded_entrypoints_retired=false");
console.log("rollback_resistance_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
