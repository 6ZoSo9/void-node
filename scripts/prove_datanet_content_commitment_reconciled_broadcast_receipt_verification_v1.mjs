import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1,
  VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_AUTHORITY_V1,
} from "../tools/datanet-content-commitment-reconciled-broadcast-receipt-verification-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

const AUTHORIZATION_ID="voiddccba1_"+"a".repeat(64);
const AUTHORIZATION_VERIFICATION_ID="voiddccbav1_"+"b".repeat(64);
const OPAQUE_VERIFICATION_ID="voiddccosrv1_"+"c".repeat(64);
const OPAQUE_ID="voiddccosr1_"+"d".repeat(64);
const SIGNING_REQUEST_ID="voiddccpsreq1_"+"e".repeat(64);
const SIGNING_AUTHORIZATION_ID="voiddccsta1_"+"f".repeat(64);
const SIGNING_CONSUMPTION_ID="voiddccstac1_"+"1".repeat(64);
const FINAL_REVIEW_ID="voiddccfsrp1_"+"2".repeat(64);
const EXTERNAL_SIGNING_KEY="3".repeat(64);
const UNSIGNED_FP="4".repeat(64);
const PUBLISHER="0x1111111111111111111111111111111111111111";
const SIGNED_HASH="0x"+"5".repeat(64);
const CUSTODY_FP="6".repeat(64);
const SOVEREIGN_FP="7".repeat(64);
const INSPECTION_ID="voiddccbair1_"+"8".repeat(64);
const DOMAIN="void.datanet.content-commitment.exact-single-submission.v1";

function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-receipt-verification-v1-"),
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
    broadcast_authorization_id:AUTHORIZATION_ID,
    broadcast_authorization_verification_id:AUTHORIZATION_VERIFICATION_ID,
    opaque_signed_receipt_verification_id:OPAQUE_VERIFICATION_ID,
    opaque_signed_receipt_id:OPAQUE_ID,
    signing_request_id:SIGNING_REQUEST_ID,
    signing_authorization_id:SIGNING_AUTHORIZATION_ID,
    signing_consumption_record_id:SIGNING_CONSUMPTION_ID,
    final_signing_review_preflight_id:FINAL_REVIEW_ID,
    external_signing_idempotency_key_sha256:EXTERNAL_SIGNING_KEY,
    unsigned_transaction_candidate_fingerprint_sha256:UNSIGNED_FP,
    publisher_address:PUBLISHER,
    signed_transaction_hash:SIGNED_HASH,
    custody_handle_fingerprint_sha256:CUSTODY_FP,
    signed_at_utc:"2026-09-22T15:07:00.000Z",
    signer_public_key_der_sha256:SOVEREIGN_FP,
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

function intentFor(root,consumption){
  const submissionKey=sha256(
    canonicalJson({
      domain:DOMAIN,
      broadcast_authorization_id:AUTHORIZATION_ID,
      broadcast_consumption_record_id:
        consumption.broadcast_consumption_record_id,
      inspection_request_id:INSPECTION_ID,
      signed_transaction_hash:SIGNED_HASH,
      custody_handle_fingerprint_sha256:CUSTODY_FP,
      canonical_state_store_realpath_sha256:sha256(root),
    }),
  );
  const material={
    marker:"VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_INTENT_V1",
    version:1,
    status:"claimed_before_exact_single_submit",
    chain_id:"2050",
    domain:DOMAIN,
    broadcast_authorization_id:AUTHORIZATION_ID,
    broadcast_authorization_verification_id:AUTHORIZATION_VERIFICATION_ID,
    broadcast_consumption_record_id:
      consumption.broadcast_consumption_record_id,
    inspection_request_id:INSPECTION_ID,
    opaque_signed_receipt_verification_id:OPAQUE_VERIFICATION_ID,
    opaque_signed_receipt_id:OPAQUE_ID,
    signing_request_id:SIGNING_REQUEST_ID,
    signing_authorization_id:SIGNING_AUTHORIZATION_ID,
    signing_consumption_record_id:SIGNING_CONSUMPTION_ID,
    external_signing_idempotency_key_sha256:EXTERNAL_SIGNING_KEY,
    unsigned_transaction_candidate_fingerprint_sha256:UNSIGNED_FP,
    publisher_address:PUBLISHER,
    signed_transaction_hash:SIGNED_HASH,
    custody_handle_fingerprint_sha256:CUSTODY_FP,
    canonical_state_store_realpath_sha256:sha256(root),
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

function reconciliationFor(root,consumption,intent,status="confirmed"){
  return {
    ok:true,
    marker:"VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1",
    version:1,
    status:"broadcast_reconciled_without_resubmission",
    chain_id:"2050",
    broadcast_authorization_id:AUTHORIZATION_ID,
    broadcast_consumption_record_id:
      consumption.broadcast_consumption_record_id,
    submission_intent_id:intent.submission_intent_id,
    submission_idempotency_key_sha256:
      intent.submission_idempotency_key_sha256,
    signed_transaction_hash:SIGNED_HASH,
    custody_handle_fingerprint_sha256:CUSTODY_FP,
    canonical_state_store_realpath_sha256:sha256(root),
    authorization_expired_at_reconciliation:true,
    reconciled_at_utc:"2026-09-22T15:20:00.000Z",
    inspection:{
      status,
      transaction_hash:SIGNED_HASH,
      provider_submission_id:"provider-observation-1",
      definitive_not_submitted:false,
      submission_may_have_occurred:true,
    },
    authority:{
      durable_consumption_record_verified:true,
      durable_submission_intent_verified:true,
      canonical_state_store_verified:true,
      post_attempt_reconciliation_allowed_after_authorization_expiry:true,
      metadata_only_request:true,
      inspection_method_invoked:true,
      submit_method_invoked:false,
      transaction_submission_authorized:false,
      automatic_retry_authorized:false,
      raw_signed_transaction_accessed:false,
      opaque_custody_handle_accessed:false,
      filesystem_mutation_performed:false,
      sovereign_private_key_access_performed:false,
      wallet_access_performed:false,
      transaction_signing_performed:false,
      direct_rpc_call_performed:false,
      direct_network_call_performed:false,
      chain2050_write_direct_performed:false,
    },
    next_gate:
      status==="confirmed"||status==="reverted"
        ?"reconciled_broadcast_receipt_verification_v1"
        :"broadcast_reconciliation_without_resubmission_v1",
    inspection_method_invoked:true,
    submit_method_invoked:false,
    reconciliation_required:
      status==="unknown"||status==="accepted",
    automatic_retry_allowed:false,
    raw_signed_transaction_accessed:false,
    opaque_custody_handle_accessed:false,
    filesystem_mutation_performed:false,
    sovereign_private_key_access_performed:false,
    wallet_access_performed:false,
    transaction_signing_performed:false,
    direct_rpc_call_performed:false,
    direct_network_call_performed:false,
    chain2050_write_direct_performed:false,
    authority_contract:{},
  };
}

function writeState(root,consumption,intent){
  const consumedDir=path.join(root,"broadcast-consumed");
  const intentsDir=path.join(root,"broadcast-submission-intents");
  fs.mkdirSync(consumedDir,{mode:0o700});
  fs.mkdirSync(intentsDir,{mode:0o700});
  fs.chmodSync(consumedDir,0o700);
  fs.chmodSync(intentsDir,0o700);
  const consumptionFile=path.join(consumedDir,AUTHORIZATION_ID+".json");
  const intentFile=path.join(intentsDir,AUTHORIZATION_ID+".json");
  fs.writeFileSync(consumptionFile,canonicalJson(consumption)+"\n",{mode:0o600});
  fs.writeFileSync(intentFile,canonicalJson(intent)+"\n",{mode:0o600});
  fs.chmodSync(consumptionFile,0o600);
  fs.chmodSync(intentFile,0o600);
  return {consumptionFile,intentFile};
}

function receipt(status="confirmed",override={}){
  const confirmed=status==="confirmed";
  return {
    ok:true,
    status,
    chain_id:"2050",
    transaction_hash:SIGNED_HASH,
    transaction_status:confirmed?"1":"0",
    block_number:"100",
    block_hash:"0x"+"9".repeat(64),
    current_block_number:"104",
    confirmation_count:"5",
    from_address:PUBLISHER,
    provider_observation_id:"receipt-observer-1",
    ...override,
  };
}

function inputFor(root,reconciliation){
  return {
    state_dir:root,
    canonical_state_store_realpath_sha256:sha256(root),
    reconciliation,
  };
}

const now=Date.parse("2026-09-22T15:21:00Z");

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(root,consumption);
    const files=writeState(root,consumption,intent);
    const beforeConsumption=fs.readFileSync(files.consumptionFile);
    const beforeIntent=fs.readFileSync(files.intentFile);
    let observerCalls=0;
    let submitCalls=0;
    let captured=null;
    const observer={
      observe_receipt:async(request)=>{
        observerCalls++;
        captured=request;
        return receipt("confirmed");
      },
      submit_once:async()=>{
        submitCalls++;
        throw new Error("submit_must_not_be_called");
      },
    };
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        inputFor(root,reconciliationFor(root,consumption,intent,"confirmed")),
        observer,
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "reconciled_broadcast_receipt_verified_finality_pending",
    );
    assert.equal(result.reconciliation_status,"confirmed");
    assert.equal(result.receipt.status,"confirmed");
    assert.equal(result.receipt.transaction_status,"1");
    assert.equal(result.receipt.confirmation_count,"5");
    assert.equal(result.verification.confirmation_arithmetic_verified,true);
    assert.equal(
      result.verification.minimum_confirmation_threshold_applied,
      false,
    );
    assert.equal(
      result.verification.accepted_checkpoint_membership_verified,
      false,
    );
    assert.equal(result.verification.chain_finality_verified,false);
    assert.equal(result.receipt_verified,true);
    assert.equal(result.finality_verified,false);
    assert.equal(
      result.next_gate,
      "chain2050_reconciled_receipt_finality_v1",
    );
    assert.equal(result.submit_method_invoked,false);
    assert.equal(result.transaction_submission_authorized,false);
    assert.equal(result.automatic_retry_allowed,false);
    assert.equal(observerCalls,1);
    assert.equal(submitCalls,0);
    assert.ok(captured);
    assert.equal(captured.signed_transaction_hash,SIGNED_HASH);
    assert.equal(captured.expected_terminal_status,"confirmed");
    assert.equal(captured.transaction_submission_authorized,false);
    assert.deepEqual(fs.readFileSync(files.consumptionFile),beforeConsumption);
    assert.deepEqual(fs.readFileSync(files.intentFile),beforeIntent);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(root,consumption);
    writeState(root,consumption,intent);
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        inputFor(root,reconciliationFor(root,consumption,intent,"reverted")),
        {observe_receipt:async()=>receipt("reverted")},
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.reconciliation_status,"reverted");
    assert.equal(result.receipt.status,"reverted");
    assert.equal(result.receipt.transaction_status,"0");
    assert.equal(result.finality_verified,false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(root,consumption);
    writeState(root,consumption,intent);
    let calls=0;
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        inputFor(root,reconciliationFor(root,consumption,intent,"accepted")),
        {observe_receipt:async()=>{calls++;return receipt("confirmed");}},
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_receipt_verification_reconciliation_invalid",
    );
    assert.equal(calls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(root,consumption);
    writeState(root,consumption,intent);
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        inputFor(root,reconciliationFor(root,consumption,intent,"confirmed")),
        {
          observe_receipt:async()=>receipt(
            "confirmed",
            {confirmation_count:"4"},
          ),
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_receipt_verification_confirmation_count_invalid",
    );
    assert.equal(result.receipt_observer_invoked,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(root,consumption);
    writeState(root,consumption,intent);
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        inputFor(root,reconciliationFor(root,consumption,intent,"confirmed")),
        {
          observe_receipt:async()=>receipt(
            "confirmed",
            {transaction_hash:"0x"+"0".repeat(64)},
          ),
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_receipt_verification_receipt_invalid",
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(root,consumption);
    const files=writeState(root,consumption,intent);
    const tampered=JSON.parse(fs.readFileSync(files.intentFile,"utf8"));
    tampered.signed_transaction_hash="0x"+"0".repeat(64);
    fs.writeFileSync(
      files.intentFile,
      canonicalJson(tampered)+"\n",
      {mode:0o600},
    );
    fs.chmodSync(files.intentFile,0o600);
    let calls=0;
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        inputFor(root,reconciliationFor(root,consumption,intent,"confirmed")),
        {observe_receipt:async()=>{calls++;return receipt("confirmed");}},
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_receipt_verification_intent_invalid",
    );
    assert.equal(calls,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot(0o755);
  try{
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        {
          state_dir:root,
          canonical_state_store_realpath_sha256:sha256(root),
          reconciliation:{},
        },
        {observe_receipt:async()=>receipt("confirmed")},
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_receipt_verification_state_root_invalid",
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const consumption=consumptionFor(root);
    const intent=intentFor(root,consumption);
    writeState(root,consumption,intent);
    const result=
      await verifyDatanetContentCommitmentReconciledBroadcastReceiptWithClockV1(
        inputFor(root,reconciliationFor(root,consumption,intent,"confirmed")),
        {},
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_receipt_verification_observer_missing",
    );
    assert.equal(result.receipt_observer_invoked,false);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  source_only_receipt_verification:true,
  terminal_reconciliation_required:true,
  durable_consumption_record_readback_required:true,
  durable_submission_intent_readback_required:true,
  canonical_state_store_fingerprint_required:true,
  injected_receipt_observer_only:true,
  metadata_only_receipt_request:true,
  exact_transaction_hash_required:true,
  exact_publisher_required:true,
  receipt_status_consistency_required:true,
  receipt_block_hash_required:true,
  confirmation_arithmetic_verified:true,
  confirmation_threshold_applied:false,
  accepted_checkpoint_membership_verified:false,
  chain_finality_claimed:false,
  submit_method_access:false,
  transaction_submission_authorized:false,
  automatic_resubmission:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_access:false,
  filesystem_read:true,
  filesystem_mutation:false,
  sovereign_private_key_access:false,
  wallet_access:false,
  transaction_signing:false,
  direct_rpc_transport:false,
  direct_network_transport:false,
  chain2050_write_direct:false,
  automatic_retry:false,
})){
  assert.equal(
    VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-reconciled-broadcast-receipt-verification-v1.mjs",
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
  assert.equal(source.includes(forbidden),false,"source contains "+forbidden);
}

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_RECONCILED_BROADCAST_RECEIPT_VERIFICATION_V1_PROOF_GREEN",
);
console.log("terminal_reconciliation_required=true");
console.log("durable_consumption_record_rederived=true");
console.log("durable_submission_intent_rederived=true");
console.log("exact_transaction_hash_verified=true");
console.log("exact_publisher_verified=true");
console.log("receipt_status_consistency_verified=true");
console.log("confirmation_arithmetic_verified=true");
console.log("sub12_observation_does_not_claim_finality=true");
console.log("accepted_checkpoint_membership_verified=false");
console.log("chain_finality_verified=false");
console.log("submit_method_invoked=false");
console.log("transaction_submission_authorized=false");
console.log("automatic_retry=false");
console.log("filesystem_mutation=false");
console.log("direct_rpc_call=false");
console.log("direct_network_call=false");
console.log("chain2050_write=false");
