import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { PassThrough } from "node:stream";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1,
  testOnlyAssertBuyVoidReplayCompareOnlyForcedCommandContextV1,
  testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandV1,
  testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandStreamV1,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs";

import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
      .join(",") + "}";
  }
  throw new Error("noncanonical_test_fixture");
}
const line = (value) => Buffer.from(canonicalJson(value) + "\n", "utf8");

const REQUEST_ID = "voidwlrwreq1_" + crypto.createHash("sha256")
  .update("compare-only-proof-request", "utf8").digest("hex");
const high = deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1("");
assert.equal(high.ok, true);
if(!high.ok) throw new Error("genesis high-water held");

const request = Object.freeze({
  schema:
    "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_request_v1",
  marker:
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_REQUEST_V1",
  version:1,
  operation:"compare",
  request_id: REQUEST_ID,
  source_journal_json_base64:"",
  source_high_water_json_base64: Buffer.from(high.high_water_json, "utf8").toString("base64"),
});

function response(overrides={}) {
  return line({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_compare_response_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_COMPARE_RESPONSE_V1",
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
  });
}

let called=0;
const reqBytes=line(request);
const matchedResponse=response();
const matched=testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandV1(
  reqBytes,(command,args,options)=>{
    called++;
    assert.equal(command,"/usr/bin/node");
    assert.deepEqual(args,[
      "/usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs",
      "--config=/etc/void/buy-void-allocation-custody-witness-live-read-replay-external-forced-command-v1.json",
    ]);
    assert.deepEqual(options.input,reqBytes);
    assert.equal(options.timeout,10000);
    assert.equal(options.maxBuffer,64*1024);
    assert.equal(options.encoding,null);
    assert.equal(options.windowsHide,true);
    assert.deepEqual(options.env,{
      PATH:"/usr/bin:/bin",
      LANG:"C",
      LC_ALL:"C",
      HOME:"/var/lib/voidwitness",
      VOID_BUY_VOID_REPLAY_EXTERNAL_WITNESS_FORCED_COMMAND_V1:"1",
      SSH_ORIGINAL_COMMAND:"",
    });
    assert.equal(options.shell,undefined);
    return {status:0,signal:null,stdout:matchedResponse,stderr:Buffer.alloc(0)};
  },
);
assert.equal(called,1);
assert.deepEqual(matched.response_json,matchedResponse);
assert.equal(matched.operation_performed,false);
assert.equal(matched.replay_mutation,false);
assert.equal(matched.witness_mutation,false);
assert.equal(matched.funds_movement,false);

// The real entrypoint must finish reading before calling the fixed child.
// A silent SSH peer or a drip-feed that never closes stdin must HOLD on a
// total deadline, irrespective of the child process timeout.
async function expectBoundedInputHold(name, drip) {
  const stream = new PassThrough();
  let childExecutions = 0;
  let trickle = null;
  const started = Date.now();
  try {
    if (drip) {
      trickle = setInterval(() => {
        if (!stream.destroyed) stream.write(Buffer.from("x", "utf8"));
      }, 8);
    }
    await assert.rejects(
      testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandStreamV1(
        stream,
        () => {
          childExecutions += 1;
          return {
            status: 0, signal: null,
            stdout: matchedResponse, stderr: Buffer.alloc(0),
          };
        },
        80,
      ),
      /request_read_timeout/u,
      name,
    );
    assert.equal(childExecutions, 0, name + " must never spawn child");
    assert.equal(stream.destroyed, true, name + " stream must be aborted");
    assert.ok(Date.now() - started < 5_000, name + " deadline too slow");
  } finally {
    if (trickle !== null) clearInterval(trickle);
    stream.destroy();
  }
}

await expectBoundedInputHold("silent_no_eof", false);
await expectBoundedInputHold("continuous_drip_no_eof", true);

{
  const stream = new PassThrough();
  let childExecutions = 0;
  stream.end(reqBytes);
  const result = await testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandStreamV1(
    stream,
    () => {
      childExecutions += 1;
      return {
        status: 0, signal: null,
        stdout: matchedResponse, stderr: Buffer.alloc(0),
      };
    },
    1_000,
  );
  assert.equal(childExecutions, 1);
  assert.deepEqual(result.response_json, matchedResponse);
}

function mustRejectRequest(name, payload, pattern) {
  let executions=0;
  assert.throws(
    () => testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandV1(
      payload,()=>{
        executions++;
        return {status:0,signal:null,stdout:matchedResponse,stderr:Buffer.alloc(0)};
      },
    ),
    pattern,
    name,
  );
  assert.equal(executions,0,name+" must hold before child execution");
}

for(const operation of ["append","read","shell"]) {
  mustRejectRequest(operation,line({...request,operation}),/noncompare_operation_forbidden/u);
}
mustRejectRequest("unknown_field",line({...request,authority_root:"/tmp/evil"}),/request_shape_invalid/u);
mustRejectRequest("bad_marker",line({...request,marker:"BAD"}),/request_identity_invalid/u);
mustRejectRequest("bad_request_id",line({...request,request_id:"not-safe"}),/request_identity_invalid/u);
mustRejectRequest("missing_payload",line({...request,source_high_water_json_base64:null}),/high_water_payload_invalid/u);
mustRejectRequest("bad_base64",line({...request,source_high_water_json_base64:"A="}),/high_water_payload_invalid/u);
mustRejectRequest("empty_high_water",line({...request,source_high_water_json_base64:""}),/high_water_payload_invalid/u);
mustRejectRequest("noncanonical",Buffer.from(JSON.stringify(request)+"\n"),/request_invalid/u);
mustRejectRequest("extra_newline",Buffer.concat([reqBytes,Buffer.from("\n")]),/request_invalid/u);
mustRejectRequest("empty",Buffer.alloc(0),/request_invalid/u);
mustRejectRequest("garbled_utf8",Buffer.from([0xff,0x0a]),/request_invalid/u);

function mustRejectResponse(name, value, pattern) {
  assert.throws(
    () => testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandV1(
      reqBytes,()=>({
        status:0,signal:null,stdout:value,stderr:Buffer.alloc(0),
      }),
    ),
    pattern,
    name,
  );
}

for(const [name,patch] of [
  ["mismatched_request",{request_id:"voidwlrwreq1_"+"9".repeat(64)}],
  ["forged_transport",{external_transport_authenticated:true}],
  ["forged_storage",{external_witness_storage_proven:true}],
  ["forged_production",{production_gate_ready:true}],
  ["attempted_mutation",{operation_performed:true}],
  ["attempted_recovery",{recovered_intent:true}],
  ["false_witness_origin",{server_controlled_witness_observed:false}],
  ["unknown_field",{extra_untrusted_field:true}],
  ["ahead_without_hold",{comparison_status:"witness_ahead",witnessed_replay_sequence:1,event_count:2,local_replay_sequence:0,exact_live_match:false,rollback_regression_candidate:true,mutation_admission_allowed:true}],
  ["no_match_but_admitted",{comparison_status:"matched",exact_live_match:false}],
]){
  mustRejectResponse(name,response(patch),/response_/u);
}
mustRejectResponse("trailing_line",Buffer.concat([matchedResponse,matchedResponse]),/response_invalid/u);

for(const [name,data] of [
  ["witness_ahead",{comparison_status:"witness_ahead",witnessed_replay_sequence:1,event_count:2,local_replay_sequence:0,exact_live_match:false,rollback_regression_candidate:true,mutation_admission_allowed:false}],
  ["local_ahead",{comparison_status:"local_ahead",witnessed_replay_sequence:0,event_count:1,local_replay_sequence:1,exact_live_match:false,external_witness_update_required:true,mutation_admission_allowed:false}],
]){
  const responseBytes=response(data);
  const result=testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandV1(
    reqBytes,()=>({
      status:0,signal:null,stdout:responseBytes,stderr:Buffer.alloc(0),
    }),
  );
  assert.deepEqual(result.response_json,responseBytes,name);
  assert.equal(result.operation_performed,false,name);
}

for(const [name,options] of [
  ["failure",{status:3,signal:null,stdout:matchedResponse,stderr:Buffer.alloc(0)}],
  ["timeout",{status:null,signal:"SIGTERM",stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}],
  ["error",{status:null,signal:null,error:new Error("failed"),stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)}],
  ["stderr",{status:0,signal:null,stdout:matchedResponse,stderr:Buffer.from("diagnostic")}],
  ["text_stdout",{status:0,signal:null,stdout:matchedResponse.toString("utf8"),stderr:Buffer.alloc(0)}],
  ["nonempty_stderr",{status:0,signal:null,stdout:matchedResponse,stderr:Buffer.from("stderr")}],
]){
  assert.throws(
    ()=>testOnlyHandleBuyVoidReplayCompareOnlyForcedCommandV1(reqBytes,()=>options),
    /child_execution_failed/u,
    name,
  );
}

const validContext={
  marker:"1",original_command:"",argv:[],uid:997,gid:984,
};
assert.equal(testOnlyAssertBuyVoidReplayCompareOnlyForcedCommandContextV1(validContext),true);
for(const [name,change] of [
  ["no_marker",{marker:""}],
  ["remote_command",{original_command:"cat /etc/passwd"}],
  ["extra_argument",{argv:["--config=/tmp/evil"]}],
  ["wrong_user",{uid:0}],
  ["wrong_group",{gid:0}],
]){
  assert.throws(
    ()=>testOnlyAssertBuyVoidReplayCompareOnlyForcedCommandContextV1({...validContext,...change}),
    /execution_identity_invalid/u,
    name,
  );
}

const source=fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs",
  "utf8",
);
assert.ok(source.includes('if (raw.operation !== "compare")'));
assert.ok(source.includes("spawnSync(command, args, options)"));
assert.ok(source.includes("requireForcedCommandContext"));
assert.doesNotMatch(source,/\bexec(?:Sync)?\s*\(/u);
assert.doesNotMatch(source,/fs\.(?:writeFileSync|appendFileSync|renameSync|unlinkSync|mkdirSync|chmodSync|chownSync|linkSync)\(/u);

for(const field of [
  "source_only_forced_command",
  "only_compare_operation_allowed",
  "append_operation_forbidden",
  "read_operation_forbidden",
  "canonical_request_required",
  "original_remote_command_forbidden",
  "no_caller_selected_paths_or_command",
  "fixed_child_handler_and_config",
  "fixed_child_environment",
  "fixed_ssh_user_identity_required",
  "bounded_stdin_stdout_and_child_duration",
  "child_response_rebound_to_request",
  "no_ssh_shell_or_subsystem",
]){
  assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_AUTHORITY_V1[field],true,field);
}
for(const field of [
  "source_filesystem_write",
  "generic_witness_write",
  "replay_mutation",
  "key_provisioning",
  "authorized_keys_mutation",
  "sshd_mutation",
  "live_nimo_installed",
  "server_compare_only_authorization_proven",
  "trusted_transport_authenticated",
  "runtime_guard_integration",
  "unguarded_entrypoints_retired",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "funds_movement",
]){
  assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_AUTHORITY_V1[field],false,field);
}

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1",
);
console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1_GREEN");
console.log("compare_only_request_required=true");
console.log("append_and_read_rejected_before_child=true");
console.log("fixed_handler_and_config_path=true");
console.log("fixed_child_environment=true");
console.log("exact_canonical_request_and_response=true");
console.log("server_response_bounds_checked=true");
console.log("failure_and_timeout_hold=true");
console.log("silent_and_drip_feed_stdin_timeout_hold=true");
console.log("stdin_deadline_rejects_before_child=true");
console.log("forced_command_identity_restricted=true");
console.log("key_provisioning=false");
console.log("server_compare_only_authorization_proven=false");
console.log("runtime_guard_integration=false");
console.log("rollback_resistance_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
