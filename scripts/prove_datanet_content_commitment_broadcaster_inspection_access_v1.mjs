import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  inspectDatanetContentCommitmentBroadcasterAccessWithClockV1,
  VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-broadcaster-inspection-access-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-broadcaster-access-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}

function recordFor(root){
  const material={
    marker:
      "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_AUTHORIZATION_CONSUMPTION_V1",
    version:1,
    status:"broadcast_authorization_consumed_before_broadcaster_access",
    chain_id:"2050",
    broadcast_authorization_id:"voiddccba1_"+"a".repeat(64),
    broadcast_authorization_verification_id:
      "voiddccbav1_"+"b".repeat(64),
    opaque_signed_receipt_verification_id:
      "voiddccosrv1_"+"c".repeat(64),
    opaque_signed_receipt_id:"voiddccosr1_"+"d".repeat(64),
    signing_request_id:"voiddccpsreq1_"+"e".repeat(64),
    signing_authorization_id:"voiddccsta1_"+"f".repeat(64),
    signing_consumption_record_id:"voiddccstac1_"+"1".repeat(64),
    final_signing_review_preflight_id:"voiddccfsrp1_"+"2".repeat(64),
    external_signing_idempotency_key_sha256:"3".repeat(64),
    unsigned_transaction_candidate_fingerprint_sha256:"4".repeat(64),
    publisher_address:"0x1111111111111111111111111111111111111111",
    signed_transaction_hash:"0x"+"5".repeat(64),
    custody_handle_fingerprint_sha256:"6".repeat(64),
    signed_at_utc:"2026-09-22T15:07:00.000Z",
    signer_public_key_der_sha256:"7".repeat(64),
    issued_at_utc:"2026-09-22T15:08:00Z",
    expires_at_utc:"2026-09-22T15:13:00Z",
    consumed_at_utc:"2026-09-22T15:09:00.000Z",
    state_store_realpath_sha256:sha256(root),
    consumption:{
      single_use:true,
      authorization_consumed:true,
      immutable_consumption_record:true,
      replay_rejected_within_exact_state_store:true,
      replay_prevention_scope:"exact_state_store_realpath",
      global_replay_prevention_claimed:false,
      canonical_broadcast_state_store_runtime_binding_required:true,
      expiry_rechecked_at_consumption:true,
      consumption_precedes_any_broadcaster_access:true,
      signed_transaction_hash_bound:true,
      custody_handle_fingerprint_bound:true,
      raw_signed_transaction_remains_inaccessible:true,
      broadcaster_access_remains_disabled:true,
    },
    authority:{
      filesystem_mutation_performed:true,
      sovereign_private_key_access_performed:false,
      raw_signed_transaction_accessed:false,
      opaque_custody_handle_accessed:false,
      broadcaster_access_performed:false,
      rpc_call_performed:false,
      transaction_broadcast_authorized_by_this_gate:false,
      transaction_broadcast_performed:false,
      chain2050_write_authorized:false,
      chain2050_write_performed:false,
      validator_mutation_authorized:false,
      governance_mutation_authorized:false,
      work_credit_mutation_authorized:false,
      service_action_authorized:false,
      funds_action_authorized:false,
      automatic_retry_authorized:false,
    },
    next_gate:
      "exact_broadcaster_access_from_consumed_broadcast_authorization_v1",
  };
  return {
    ...material,
    broadcast_consumption_record_id:
      "voiddccbac1_"+sha256(canonicalJson(material)),
  };
}

function writeRecord(root,record){
  const dir=path.join(root,"broadcast-consumed");
  fs.mkdirSync(dir,{mode:0o700});
  fs.chmodSync(dir,0o700);
  const file=path.join(dir,record.broadcast_authorization_id+".json");
  fs.writeFileSync(file,canonicalJson(record)+"\n",{mode:0o600});
  fs.chmodSync(file,0o600);
  return file;
}

function inputFor(root,record,stateHash=sha256(root)){
  return {
    state_dir:root,
    canonical_state_store_realpath_sha256:stateHash,
    broadcast_authorization_id:record.broadcast_authorization_id,
    broadcast_consumption_record_id:record.broadcast_consumption_record_id,
  };
}

const now=Date.parse("2026-09-22T15:10:00Z");

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    const file=writeRecord(root,record);
    const before=fs.readFileSync(file);
    let inspectCalls=0;
    let submitCalls=0;
    let captured=null;
    const broadcaster={
      inspect_submission:async(request)=>{
        inspectCalls++;
        captured=request;
        return {
          ok:true,
          status:"not_submitted",
          transaction_hash:record.signed_transaction_hash,
          provider_submission_id:"",
          definitive_not_submitted:true,
          submission_may_have_occurred:false,
        };
      },
      submit_once:async()=>{
        submitCalls++;
        throw new Error("submit_once_must_not_be_called");
      },
    };
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        broadcaster,
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "exact_consumed_broadcast_authorization_inspected_submission_disabled",
    );
    assert.match(result.inspection_request_id,/^voiddccbair1_[0-9a-f]{64}$/);
    assert.equal(result.inspection.status,"not_submitted");
    assert.equal(result.inspection.definitive_not_submitted,true);
    assert.equal(result.inspection.submission_may_have_occurred,false);
    assert.equal(result.inspection.reconciliation_required,false);
    assert.equal(
      result.inspection.later_single_submission_gate_candidate,
      true,
    );
    assert.equal(
      result.next_gate,
      "exact_single_submission_from_inspected_consumed_broadcast_authorization_v1",
    );
    assert.equal(result.broadcaster_access_performed,true);
    assert.equal(result.inspection_method_invoked,true);
    assert.equal(result.submit_method_invoked,false);
    assert.equal(result.raw_signed_transaction_accessed,false);
    assert.equal(result.opaque_custody_handle_accessed,false);
    assert.equal(result.transaction_broadcast_performed,false);
    assert.equal(result.chain2050_write_performed,false);
    assert.equal(result.filesystem_mutation_performed,false);
    assert.equal(inspectCalls,1);
    assert.equal(submitCalls,0);
    assert.ok(captured);
    assert.equal(
      captured.custody_handle_fingerprint_sha256,
      record.custody_handle_fingerprint_sha256,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(captured,"custody_handle"),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(captured,"raw_signed_transaction"),
      false,
    );
    assert.deepEqual(fs.readFileSync(file),before);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    let inspectCalls=0;
    let submitCalls=0;
    const broadcaster={
      inspect_submission:async()=>{
        inspectCalls++;
        return {
          ok:true,
          status:"accepted",
          transaction_hash:record.signed_transaction_hash,
          provider_submission_id:"synthetic-provider-1",
          definitive_not_submitted:false,
          submission_may_have_occurred:true,
        };
      },
      submit_once:async()=>{
        submitCalls++;
        throw new Error("submit_once_must_not_be_called");
      },
    };
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        broadcaster,
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.inspection.status,"accepted");
    assert.equal(result.inspection.reconciliation_required,true);
    assert.equal(
      result.inspection.later_single_submission_gate_candidate,
      false,
    );
    assert.equal(
      result.next_gate,
      "broadcast_reconciliation_without_resubmission_v1",
    );
    assert.equal(inspectCalls,1);
    assert.equal(submitCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    let inspectCalls=0;
    const broadcaster={
      inspect_submission:async()=>{
        inspectCalls++;
        return {
          ok:true,
          status:"not_submitted",
          transaction_hash:record.signed_transaction_hash,
          provider_submission_id:"",
          definitive_not_submitted:true,
          submission_may_have_occurred:false,
        };
      },
    };
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        broadcaster,
        Date.parse("2026-09-22T15:13:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_broadcaster_access_authorization_expired",
    );
    assert.equal(inspectCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    let inspectCalls=0;
    const broadcaster={
      inspect_submission:async()=>{
        inspectCalls++;
        throw new Error("must_not_run");
      },
    };
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        broadcaster,
        Date.parse("2026-09-22T15:08:59Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_broadcaster_access_before_consumption_time",
    );
    assert.equal(inspectCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    let inspectCalls=0;
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record,"0".repeat(64)),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            throw new Error("must_not_run");
          },
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_broadcaster_access_canonical_state_store_mismatch",
    );
    assert.equal(inspectCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    const file=writeRecord(root,record);
    const tampered=JSON.parse(fs.readFileSync(file,"utf8"));
    tampered.signed_transaction_hash="0x"+"8".repeat(64);
    fs.writeFileSync(file,canonicalJson(tampered)+"\n",{mode:0o600});
    fs.chmodSync(file,0o600);
    let inspectCalls=0;
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            throw new Error("must_not_run");
          },
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_broadcaster_access_consumption_record_id_mismatch",
    );
    assert.equal(inspectCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        {
          inspect_submission:async()=>({
            ok:true,
            status:"not_submitted",
            transaction_hash:record.signed_transaction_hash,
            provider_submission_id:"",
            definitive_not_submitted:true,
            submission_may_have_occurred:false,
            raw_signed_transaction:"0x1234",
          }),
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_broadcaster_access_secret_response_rejected",
    );
    assert.equal(result.broadcaster_access_performed,true);
    assert.equal(result.inspection_method_invoked,true);
    assert.equal(result.submit_method_invoked,false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot(0o755);
  try{
    const record=recordFor(root);
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        {inspect_submission:async()=>{throw new Error("must_not_run");}},
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_broadcaster_access_state_root_mode_must_be_0700",
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const result=
      await inspectDatanetContentCommitmentBroadcasterAccessWithClockV1(
        inputFor(root,record),
        {},
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_broadcaster_access_inspector_missing",
    );
    assert.equal(result.broadcaster_access_performed,false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  durable_broadcast_consumption_record_readback_required:true,
  canonical_broadcast_state_store_fingerprint_required:true,
  runtime_expiry_recheck_required:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
  metadata_only_broadcaster_request:true,
  injected_broadcaster_inspection_only:true,
  broadcaster_inspection_access_allowed:true,
  submit_method_access:false,
  transaction_submission_authorized_by_this_gate:false,
  automatic_resubmission:false,
  raw_signed_transaction_input:false,
  raw_signed_transaction_output:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_input:false,
  opaque_custody_handle_output:false,
  opaque_custody_handle_access:false,
  filesystem_read:true,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  transaction_broadcast_performed:false,
  chain2050_write_performed:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-broadcaster-inspection-access-v1.mjs",
  ),
  "utf8",
);
for(const forbidden of [
  ".submit_once(",
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "sendRawTransaction(",
  "sendTransaction(",
  "broadcastTransaction(",
  "node:net",
  "node:http",
  "node:https",
  "fetch(",
  "writeFileSync(",
  "mkdirSync(",
  "linkSync(",
  "renameSync(",
  "unlinkSync(",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "source contains "+forbidden,
  );
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_BROADCASTER_INSPECTION_ACCESS_V1_PROOF_GREEN",
);
console.log("durable_consumption_record_rederived=true");
console.log("canonical_broadcast_state_store_verified=true");
console.log("runtime_expiry_rechecked_before_access=true");
console.log("metadata_only_broadcaster_request=true");
console.log("inspection_method_invoked=true");
console.log("submit_method_invoked=false");
console.log("secret_bearing_inspection_response_rejected=true");
console.log("tampered_consumption_record_rejected=true");
console.log("raw_signed_transaction_access=false");
console.log("opaque_custody_handle_access=false");
console.log("filesystem_mutation=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
