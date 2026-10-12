import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1,
  VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-broadcast-reconciliation-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const SUBMISSION_DOMAIN=
  "void.datanet.content-commitment.exact-single-submission.v1";

function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-reconciliation-v1-"),
  );
  fs.chmodSync(root,mode);
  return root;
}

function consumptionFor(root){
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

function intentFor(consumption){
  const submissionKey=sha256(
    canonicalJson({
      domain:SUBMISSION_DOMAIN,
      broadcast_authorization_id:
        consumption.broadcast_authorization_id,
      broadcast_consumption_record_id:
        consumption.broadcast_consumption_record_id,
      inspection_request_id:"voiddccbair1_"+"8".repeat(64),
      signed_transaction_hash:consumption.signed_transaction_hash,
      custody_handle_fingerprint_sha256:
        consumption.custody_handle_fingerprint_sha256,
      canonical_state_store_realpath_sha256:
        consumption.state_store_realpath_sha256,
    }),
  );
  const material={
    marker:
      "VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_INTENT_V1",
    version:1,
    status:"claimed_before_exact_single_submit",
    chain_id:"2050",
    domain:SUBMISSION_DOMAIN,
    broadcast_authorization_id:
      consumption.broadcast_authorization_id,
    broadcast_authorization_verification_id:
      consumption.broadcast_authorization_verification_id,
    broadcast_consumption_record_id:
      consumption.broadcast_consumption_record_id,
    inspection_request_id:"voiddccbair1_"+"8".repeat(64),
    opaque_signed_receipt_verification_id:
      consumption.opaque_signed_receipt_verification_id,
    opaque_signed_receipt_id:consumption.opaque_signed_receipt_id,
    signing_request_id:consumption.signing_request_id,
    signing_authorization_id:consumption.signing_authorization_id,
    signing_consumption_record_id:
      consumption.signing_consumption_record_id,
    external_signing_idempotency_key_sha256:
      consumption.external_signing_idempotency_key_sha256,
    unsigned_transaction_candidate_fingerprint_sha256:
      consumption.unsigned_transaction_candidate_fingerprint_sha256,
    publisher_address:consumption.publisher_address,
    signed_transaction_hash:consumption.signed_transaction_hash,
    custody_handle_fingerprint_sha256:
      consumption.custody_handle_fingerprint_sha256,
    canonical_state_store_realpath_sha256:
      consumption.state_store_realpath_sha256,
    submission_idempotency_key_sha256:submissionKey,
    claimed_at_utc:"2026-09-22T15:10:00.000Z",
    automatic_retry_authorized:false,
  };
  return {
    ...material,
    submission_intent_id:
      "voiddccbasi1_"+sha256(canonicalJson(material)),
  };
}

function writeState(root,consumption,intent){
  const consumedDir=path.join(root,"broadcast-consumed");
  const intentDir=path.join(root,"broadcast-submission-intents");
  fs.mkdirSync(consumedDir,{mode:0o700});
  fs.mkdirSync(intentDir,{mode:0o700});
  fs.chmodSync(consumedDir,0o700);
  fs.chmodSync(intentDir,0o700);
  const consumedFile=path.join(
    consumedDir,
    consumption.broadcast_authorization_id+".json",
  );
  const intentFile=path.join(
    intentDir,
    consumption.broadcast_authorization_id+".json",
  );
  fs.writeFileSync(
    consumedFile,
    canonicalJson(consumption)+"\n",
    {mode:0o600},
  );
  fs.writeFileSync(
    intentFile,
    canonicalJson(intent)+"\n",
    {mode:0o600},
  );
  fs.chmodSync(consumedFile,0o600);
  fs.chmodSync(intentFile,0o600);
  return {consumedFile,intentFile};
}

function inputFor(root,consumption,stateHash=sha256(root)){
  return {
    state_dir:root,
    canonical_state_store_realpath_sha256:stateHash,
    broadcast_authorization_id:
      consumption.broadcast_authorization_id,
    broadcast_consumption_record_id:
      consumption.broadcast_consumption_record_id,
  };
}

function decision(status,consumption,provider="synthetic-provider"){
  if(status==="not_submitted"){
    return {
      ok:true,
      status,
      transaction_hash:consumption.signed_transaction_hash,
      provider_submission_id:provider,
      definitive_not_submitted:true,
      submission_may_have_occurred:false,
    };
  }
  return {
    ok:true,
    status,
    transaction_hash:consumption.signed_transaction_hash,
    provider_submission_id:provider,
    definitive_not_submitted:false,
    submission_may_have_occurred:true,
  };
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    const files=writeState(root,consumption,intent);
    const consumedBefore=fs.readFileSync(files.consumedFile);
    const intentBefore=fs.readFileSync(files.intentFile);
    let inspectCalls=0;
    let submitCalls=0;
    let captured=null;
    const inspector={
      inspect_submission:async(request)=>{
        inspectCalls++;
        captured=request;
        return decision("unknown",consumption);
      },
      submit_once:async()=>{
        submitCalls++;
        throw new Error("reconciliation_must_never_submit");
      },
    };
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption),
        inspector,
        Date.parse("2026-09-22T15:20:00Z"),
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.status,"broadcast_reconciled_without_resubmission");
    assert.equal(result.authorization_expired_at_reconciliation,true);
    assert.equal(result.inspection.status,"unknown");
    assert.equal(result.reconciliation_required,true);
    assert.equal(result.submit_method_invoked,false);
    assert.equal(result.automatic_retry_allowed,false);
    assert.equal(
      result.next_gate,
      "broadcast_reconciliation_without_resubmission_v1",
    );
    assert.equal(inspectCalls,1);
    assert.equal(submitCalls,0);
    assert.ok(captured);
    assert.equal(
      captured.submission_intent_id,
      intent.submission_intent_id,
    );
    assert.equal(
      captured.submission_idempotency_key_sha256,
      intent.submission_idempotency_key_sha256,
    );
    assert.equal(captured.reconciliation_only,true);
    assert.equal(captured.transaction_submission_authorized,false);
    assert.equal(captured.automatic_retry_authorized,false);
    assert.equal(
      Object.prototype.hasOwnProperty.call(captured,"raw_signed_transaction"),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(captured,"custody_handle"),
      false,
    );
    assert.deepEqual(fs.readFileSync(files.consumedFile),consumedBefore);
    assert.deepEqual(fs.readFileSync(files.intentFile),intentBefore);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    writeState(root,consumption,intent);
    let inspectCalls=0;
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            return decision("confirmed",consumption,"confirmed-provider");
          },
        },
        Date.parse("2026-09-22T15:30:00Z"),
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.authorization_expired_at_reconciliation,true);
    assert.equal(result.inspection.status,"confirmed");
    assert.equal(result.reconciliation_required,false);
    assert.equal(
      result.next_gate,
      "reconciled_broadcast_receipt_verification_v1",
    );
    assert.equal(inspectCalls,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    writeState(root,consumption,intent);
    let inspectCalls=0;
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            return decision("not_submitted",consumption,"no-submit-provider");
          },
        },
        Date.parse("2026-09-22T15:30:00Z"),
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.inspection.status,"not_submitted");
    assert.equal(result.inspection.definitive_not_submitted,true);
    assert.equal(result.reconciliation_required,false);
    assert.equal(result.automatic_retry_allowed,false);
    assert.equal(
      result.next_gate,
      "explicit_submission_claim_release_after_definitive_not_submitted_v1",
    );
    assert.equal(inspectCalls,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    writeState(root,consumption,intent);
    let inspectCalls=0;
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            return decision("accepted",consumption,"accepted-provider");
          },
        },
        Date.parse("2026-09-22T15:12:00Z"),
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.authorization_expired_at_reconciliation,false);
    assert.equal(result.inspection.status,"accepted");
    assert.equal(result.reconciliation_required,true);
    assert.equal(
      result.next_gate,
      "broadcast_reconciliation_without_resubmission_v1",
    );
    assert.equal(inspectCalls,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    const files=writeState(root,consumption,intent);
    fs.rmSync(files.intentFile);
    let inspectCalls=0;
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            throw new Error("must_not_run");
          },
        },
        Date.parse("2026-09-22T15:20:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_reconciliation_durable_state_read_failed",
    );
    assert.equal(inspectCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    const files=writeState(root,consumption,intent);
    const tampered=JSON.parse(fs.readFileSync(files.intentFile,"utf8"));
    tampered.signed_transaction_hash="0x"+"9".repeat(64);
    fs.writeFileSync(files.intentFile,canonicalJson(tampered)+"\n",{mode:0o600});
    fs.chmodSync(files.intentFile,0o600);
    let inspectCalls=0;
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            throw new Error("must_not_run");
          },
        },
        Date.parse("2026-09-22T15:20:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_reconciliation_submission_intent_invalid",
    );
    assert.equal(inspectCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    writeState(root,consumption,intent);
    let inspectCalls=0;
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption,"0".repeat(64)),
        {
          inspect_submission:async()=>{
            inspectCalls++;
            throw new Error("must_not_run");
          },
        },
        Date.parse("2026-09-22T15:20:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_reconciliation_canonical_state_store_mismatch",
    );
    assert.equal(inspectCalls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(consumption);
    writeState(root,consumption,intent);
    const result=
      await reconcileDatanetContentCommitmentBroadcastWithoutResubmissionWithClockV1(
        inputFor(root,consumption),
        {
          inspect_submission:async()=>({
            ok:true,
            status:"unknown",
            transaction_hash:consumption.signed_transaction_hash,
            provider_submission_id:"secret-provider",
            definitive_not_submitted:false,
            submission_may_have_occurred:true,
            custody_handle:"secret-handle",
          }),
        },
        Date.parse("2026-09-22T15:20:00Z"),
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_reconciliation_secret_response_rejected",
    );
    assert.equal(result.inspection_method_invoked,true);
    assert.equal(result.submit_method_invoked,false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  source_only_reconciliation:true,
  durable_consumption_record_readback_required:true,
  durable_submission_intent_readback_required:true,
  canonical_state_store_fingerprint_required:true,
  post_attempt_reconciliation_allowed_after_authorization_expiry:true,
  authorization_expiry_does_not_grant_resubmission:true,
  injected_inspection_only:true,
  submit_method_access:false,
  automatic_resubmission:false,
  metadata_only_inspection_request:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
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
  direct_rpc_transport:false,
  direct_network_transport:false,
  production_broadcaster_activation:false,
  runtime_route_mount:false,
  service_action:false,
  chain2050_write_direct:false,
  funds_action_direct:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-broadcast-reconciliation-v1.mjs",
  ),
  "utf8",
);
assert.equal(
  source.includes(".submit_once("),
  false,
  "reconciliation source must not contain a submit_once call",
);
for(const forbidden of [
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
  "VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1_PROOF_GREEN",
);
console.log("post_expiry_reconciliation=true");
console.log("authorization_expiry_does_not_enable_retry=true");
console.log("durable_consumption_record_verified=true");
console.log("durable_submission_intent_verified=true");
console.log("canonical_state_store_verified=true");
console.log("inspection_only=true");
console.log("submit_call_sites=0");
console.log("automatic_resubmission=false");
console.log("secret_bearing_inspection_response_rejected=true");
console.log("raw_signed_transaction_access=false");
console.log("opaque_custody_handle_access=false");
console.log("filesystem_mutation=false");
console.log("direct_rpc_call=false");
console.log("direct_network_call=false");
