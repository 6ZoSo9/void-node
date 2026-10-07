#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_AUTHORITY_V1,
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayComparePacketV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_compare_packet_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1,
  buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1,
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayGuardedIssueV1,
  persistBuyVoidAllocationCustodyWitnessLiveReadReplayGuardedTerminalV1,
  testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_writer_v1.js";
import {
  classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1,
} from "../src/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";

const J = "live-read-replay-v1.jsonl";
const H = "live-read-replay-high-water-v1.json";
const I = "live-read-replay-publication-intent-v1.json";

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+canonicalJson(o[k])).join(",") +
      "}"
    );
  }
  throw new Error("test_canonical_json_invalid");
}

const line = (v: unknown) => canonicalJson(v) + "\n";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),"void-replay-guarded-writer-"));
  const j = path.join(root,"journal");
  const h = path.join(root,"high-water");
  fs.mkdirSync(j,{mode:0o700});
  fs.mkdirSync(h,{mode:0o700});
  fs.chmodSync(j,0o700);
  fs.chmodSync(h,0o700);
  const genesis=buildBuyVoidAllocationCustodyWitnessLiveReadReplayGenesisHighWaterV1();
  fs.writeFileSync(path.join(j,J),genesis.journal_bytes,{mode:0o600});
  fs.writeFileSync(path.join(h,H),genesis.high_water_bytes,{mode:0o600});
  return Object.freeze({root,j,h});
}

function snap(f: ReturnType<typeof fixture>) {
  return Object.freeze({
    journal: fs.readFileSync(path.join(f.j,J)),
    high: fs.readFileSync(path.join(f.h,H)),
    journalIntent:fs.existsSync(path.join(f.j,I)),
    highIntent:fs.existsSync(path.join(f.h,I)),
  });
}

function clean(f: ReturnType<typeof fixture>) {
  fs.rmSync(f.root,{recursive:true,force:true});
}

function packet(
  journal: Buffer,
  high: Buffer,
  override: {
    request_id?: string;
    response_request_id?: string;
    comparison_status?: "matched"|"local_ahead"|"witness_ahead";
    response_patch?: Record<string,unknown>;
    request_patch?: Record<string,unknown>;
  } = {},
) {
  const local =
    classifyBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterBindingV1({
      journal_jsonl:journal,
      high_water_json:high,
    });
  assert.equal(local.ok,true);
  if(!local.ok)throw new Error("test_replay_binding_failed");
  const sequence=local.high_water.sequence;
  const comparison=override.comparison_status||"matched";
  const requestId=override.request_id||("voidwlrwreq1_"+"a".repeat(64));
  const request={
    schema:"void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_request_v1",
    marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_REQUEST_V1",
    version:1,
    operation:"compare",
    request_id:requestId,
    source_journal_json_base64:journal.toString("base64"),
    source_high_water_json_base64:high.toString("base64"),
    ...override.request_patch,
  };
  const witnessSeq=comparison==="witness_ahead"?sequence+1:
    comparison==="local_ahead"?Math.max(0,sequence-1):sequence;
  const response={
    schema:"void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_compare_response_v1",
    marker:"VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_COMPARE_RESPONSE_V1",
    version:1,
    request_id:override.response_request_id||requestId,
    comparison_status:comparison,
    initialized:true,
    witness_sha256:"sha256:"+"b".repeat(64),
    witness_bytes:(witnessSeq+1)*1250,
    event_count:witnessSeq+1,
    tip_event_sha256:"sha256:"+"c".repeat(64),
    witnessed_replay_sequence:witnessSeq,
    local_replay_sequence:sequence,
    exact_live_match:comparison==="matched",
    external_witness_update_required:comparison==="local_ahead",
    rollback_regression_candidate:comparison==="witness_ahead",
    rollback_regression_detected:false,
    mutation_admission_allowed:comparison==="matched",
    operation_performed:false,
    recovered_intent:false,
    server_controlled_witness_observed:true,
    external_transport_authenticated:false,
    external_witness_storage_proven:false,
    production_gate_ready:false,
    funds_movement:false,
    ...override.response_patch,
  };
  return Object.freeze({
    request_json:line(request),
    response_json:line(response),
  });
}

function compareLive({journal_jsonl,high_water_json}:{journal_jsonl:Buffer;high_water_json:Buffer}){
  return packet(journal_jsonl,high_water_json);
}

function issue(f:ReturnType<typeof fixture>,callback=compareLive){
  return persistBuyVoidAllocationCustodyWitnessLiveReadReplayGuardedIssueV1({
    journal_root:f.j,
    high_water_root:f.h,
    entropy_sha256:"sha256:"+"1".repeat(64),
    issued_at_ms:1000,
    expires_at_ms:39000,
    compare_live:callback,
  });
}

{
  const f=fixture();
  try{
    const before=snap(f);
    const raw=packet(before.journal,before.high);
    const eligible=classifyBuyVoidAllocationCustodyWitnessLiveReadReplayComparePacketV1({
      current_journal_jsonl:before.journal,
      current_high_water_json:before.high,
      ...raw,
    });
    assert.equal(eligible.ok,true);
    if(!eligible.ok)throw new Error("synthetic packet held");
    assert.equal(eligible.status,"source_compare_packet_eligible");
    assert.equal(eligible.packet_eligible,true);
    assert.equal(eligible.authenticated_transport_proven,false);
    assert.equal(eligible.protected_replay_mutation_admitted,false);

    const issued=issue(f);
    assert.equal(issued.ok,true);
    if(!issued.ok)throw new Error("guarded issue held");
    assert.equal(issued.status,"persisted_issue");
    assert.equal(issued.sequence,1);
    assert.equal(issued.pending,true);
    assert.equal(issued.recovery_performed,false);
    assert.equal(snap(f).journalIntent,false);
    assert.equal(snap(f).highIntent,false);

    const terminal=persistBuyVoidAllocationCustodyWitnessLiveReadReplayGuardedTerminalV1({
      journal_root:f.j,
      high_water_root:f.h,
      outcome:"consumed",
      request_id:"voidwreq1_"+"a".repeat(64),
      response_sha256:"sha256:"+"b".repeat(64),
      terminal_at_ms:2000,
      compare_live:compareLive,
    });
    assert.equal(terminal.ok,true);
    if(!terminal.ok)throw new Error("guarded terminal held");
    assert.equal(terminal.status,"persisted_consumed");
    assert.equal(terminal.sequence,2);
    assert.equal(terminal.pending,false);
    assert.equal(terminal.last_terminal_state,"consumed");
    assert.equal(snap(f).journalIntent,false);
    assert.equal(snap(f).highIntent,false);
  }finally{clean(f);}
}

for(const [label,callback] of [
  ["witness_ahead", ({journal_jsonl,high_water_json}: {journal_jsonl:Buffer;high_water_json:Buffer}) =>
    packet(journal_jsonl,high_water_json,{comparison_status:"witness_ahead"})],
  ["local_ahead", ({journal_jsonl,high_water_json}: {journal_jsonl:Buffer;high_water_json:Buffer}) =>
    packet(journal_jsonl,high_water_json,{comparison_status:"local_ahead"})],
  ["request_mismatch", ({journal_jsonl,high_water_json}: {journal_jsonl:Buffer;high_water_json:Buffer}) =>
    packet(journal_jsonl,high_water_json,{response_request_id:"voidwlrwreq1_"+"b".repeat(64)})],
  ["server_transport_claim", ({journal_jsonl,high_water_json}: {journal_jsonl:Buffer;high_water_json:Buffer}) =>
    packet(journal_jsonl,high_water_json,{response_patch:{external_transport_authenticated:true}})],
  ["request_payload_mismatch", ({journal_jsonl,high_water_json}: {journal_jsonl:Buffer;high_water_json:Buffer}) =>
    packet(journal_jsonl,high_water_json,{request_patch:{source_journal_json_base64:"Zm9yZ2Vk"}})],
  ["callback_error", (_: {journal_jsonl:Buffer;high_water_json:Buffer})=>{
    throw new Error("simulated_network_failure");
  }],
  ["uncanonical_response", ({journal_jsonl,high_water_json}: {journal_jsonl:Buffer;high_water_json:Buffer})=>{
    const p=packet(journal_jsonl,high_water_json);
    return {...p,response_json:p.response_json+" "};
  }],
] as const){
  const f=fixture();
  try{
    const before=snap(f);
    const decision=issue(f,callback);
    assert.equal(decision.ok,false,label);
    const after=snap(f);
    assert.deepEqual(after,before,label+": mutation observed");
  }finally{clean(f);}
}

{
  const f=fixture();
  try{
    const before=snap(f);
    const decision=persistBuyVoidAllocationCustodyWitnessLiveReadReplayGuardedIssueV1({
      journal_root:f.j,
      high_water_root:f.h,
      entropy_sha256:"sha256:"+"1".repeat(64),
      issued_at_ms:1000,
      expires_at_ms:39000,
      compare_live:null as unknown as typeof compareLive,
    });
    assert.equal(decision.ok,false);
    assert.deepEqual(snap(f),before);
  }finally{clean(f);}
}

{
  const f=fixture();
  try{
    const crash=testOnlyPersistBuyVoidAllocationCustodyWitnessLiveReadReplayIssueCrashV1({
      journal_root:f.j,high_water_root:f.h,
      entropy_sha256:"sha256:"+"1".repeat(64),
      issued_at_ms:1000,expires_at_ms:39000,
    },"after_journal_intent");
    assert.equal(crash.ok,false);
    assert.equal(fs.existsSync(path.join(f.j,I)),true);
    const before=snap(f);
    let invoked=false;
    const decision=issue(f,({journal_jsonl,high_water_json})=>{
      invoked=true;
      return packet(journal_jsonl,high_water_json);
    });
    assert.equal(decision.ok,false);
    assert.equal(invoked,false);
    assert.deepEqual(snap(f),before);
  }finally{clean(f);}
}

for(const key of [
  "guarded_compare_entrypoints_available",
  "guarded_compare_inside_dual_lock",
  "guarded_compare_precedes_any_recovery_or_transition_write",
  "guarded_compare_postcheck_required",
] as const)assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1[key],true,key);
for(const key of [
  "guarded_compare_transport_origin_proven",
  "unguarded_entrypoints_retired",
  "runtime_guard_integration",
  "rollback_resistance_proven",
  "production_gate_ready",
] as const)assert.equal(VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_WRITER_AUTHORITY_V1[key],false,key);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_COMPARE_PACKET_AUTHORITY_V1.authenticated_transport_proven,
  false,
);

console.log("VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_GUARDED_COMPARE_WRITER_V1_GREEN");
console.log("canonical_compare_packet_rebound=true");
console.log("matched_guarded_issue_and_terminal=true");
console.log("witness_ahead_holds_without_mutation=true");
console.log("local_ahead_holds_without_mutation=true");
console.log("request_mismatch_holds_without_mutation=true");
console.log("transport_error_holds_without_mutation=true");
console.log("pending_intent_holds_before_recovery=true");
console.log("guarded_compare_inside_dual_lock=true");
console.log("unguarded_entrypoints_retired=false");
console.log("authenticated_transport_proven=false");
console.log("runtime_guard_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
