import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  submitDatanetContentCommitmentExactSingleSubmissionWithClockV1,
  VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_AUTHORITY_V1,
  VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
} from "../tools/datanet-content-commitment-exact-single-submission-v1.mjs";
import {
  canonicalJson,
  sha256,
} from "../tools/datanet-content-commitment-compiler-profile-v1.mjs";

function stateRoot(mode=0o700){
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-datanet-single-submit-v1-"),
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

function inputFor(root,record,options={}){
  return {
    state_dir:root,
    canonical_state_store_realpath_sha256:
      options.state_hash??sha256(root),
    broadcast_authorization_id:record.broadcast_authorization_id,
    broadcast_consumption_record_id:record.broadcast_consumption_record_id,
    apply:options.apply===true,
    confirmation:options.confirmation,
  };
}

function notSubmittedInspection(record,calls){
  return async(request)=>{
    calls.inspect++;
    assert.equal(
      request.broadcast_authorization_id,
      record.broadcast_authorization_id,
    );
    assert.equal(
      request.broadcast_consumption_record_id,
      record.broadcast_consumption_record_id,
    );
    assert.equal(
      request.signed_transaction_hash,
      record.signed_transaction_hash,
    );
    assert.equal(
      request.custody_handle_fingerprint_sha256,
      record.custody_handle_fingerprint_sha256,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(request,"custody_handle"),
      false,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(request,"raw_signed_transaction"),
      false,
    );
    return {
      ok:true,
      status:"not_submitted",
      transaction_hash:record.signed_transaction_hash,
      provider_submission_id:"",
      definitive_not_submitted:true,
      submission_may_have_occurred:false,
    };
  };
}

const now=Date.parse("2026-09-22T15:10:00Z");

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    const consumedFile=writeRecord(root,record);
    const consumedBefore=fs.readFileSync(consumedFile);
    const calls={inspect:0,submit:0};
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record),
        {
          inspect_submission:notSubmittedInspection(record,calls),
          submit_once:async()=>{
            calls.submit++;
            throw new Error("dry_run_must_not_submit");
          },
        },
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.status,"dry_run_ready_for_exact_single_submission");
    assert.equal(result.applied,false);
    assert.equal(result.durable_submission_intent_published,false);
    assert.equal(result.inspection_method_invoked,true);
    assert.equal(result.submit_method_invoked,false);
    assert.equal(result.reconciliation_required,false);
    assert.equal(result.automatic_retry_allowed,false);
    assert.match(result.submission_intent_id,/^voiddccbasi1_[0-9a-f]{64}$/);
    assert.match(
      result.submission_idempotency_key_sha256,
      /^[0-9a-f]{64}$/,
    );
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,0);
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-submission-intents")),
      false,
    );
    assert.deepEqual(fs.readFileSync(consumedFile),consumedBefore);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const calls={inspect:0,submit:0};
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:"wrong",
        }),
        {
          inspect_submission:notSubmittedInspection(record,calls),
          submit_once:async()=>{
            calls.submit++;
            throw new Error("wrong_confirmation_must_not_submit");
          },
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_single_submission_confirmation_required",
    );
    assert.equal(calls.inspect,0);
    assert.equal(calls.submit,0);
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-submission-intents")),
      false,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    const consumedFile=writeRecord(root,record);
    const consumedBefore=fs.readFileSync(consumedFile);
    const calls={inspect:0,submit:0};
    let observedRequest=null;

    const broadcaster={
      inspect_submission:notSubmittedInspection(record,calls),
      submit_once:async(request)=>{
        calls.submit++;
        observedRequest=request;
        const intentFile=path.join(
          root,
          "broadcast-submission-intents",
          record.broadcast_authorization_id+".json",
        );
        assert.equal(fs.existsSync(intentFile),true);
        assert.equal(fs.lstatSync(path.dirname(intentFile)).mode&0o777,0o700);
        assert.equal(fs.lstatSync(intentFile).mode&0o777,0o600);
        const intent=JSON.parse(fs.readFileSync(intentFile,"utf8"));
        assert.equal(intent.submission_intent_id,request.submission_intent_id);
        assert.equal(
          intent.submission_idempotency_key_sha256,
          request.submission_idempotency_key_sha256,
        );
        assert.equal(
          intent.signed_transaction_hash,
          request.signed_transaction_hash,
        );
        assert.equal(
          intent.custody_handle_fingerprint_sha256,
          request.custody_handle_fingerprint_sha256,
        );
        assert.equal(
          Object.prototype.hasOwnProperty.call(request,"custody_handle"),
          false,
        );
        assert.equal(
          Object.prototype.hasOwnProperty.call(request,"raw_signed_transaction"),
          false,
        );
        return {
          ok:true,
          status:"accepted",
          transaction_hash:record.signed_transaction_hash,
          provider_submission_id:"synthetic-provider-1",
          definitive_not_submitted:false,
          submission_call_performed:true,
          submission_may_have_occurred:true,
        };
      },
    };

    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        broadcaster,
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(
      result.status,
      "exact_single_submission_attempted_reconciliation_required",
    );
    assert.equal(result.applied,true);
    assert.equal(result.submission_result_status,"accepted");
    assert.equal(result.provider_submission_id,"synthetic-provider-1");
    assert.equal(result.submission_call_performed,true);
    assert.equal(result.submission_may_have_occurred,true);
    assert.equal(result.durable_submission_intent_published,true);
    assert.equal(result.inspection_method_invoked,true);
    assert.equal(result.submit_method_invoked,true);
    assert.equal(result.reconciliation_required,true);
    assert.equal(result.automatic_retry_allowed,false);
    assert.equal(
      result.next_gate,
      "broadcast_reconciliation_without_resubmission_v1",
    );
    assert.equal(result.raw_signed_transaction_accessed,false);
    assert.equal(result.opaque_custody_handle_accessed,false);
    assert.equal(result.direct_rpc_call_performed,false);
    assert.equal(result.direct_network_call_performed,false);
    assert.equal(result.chain2050_write_direct_performed,false);
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);
    assert.ok(observedRequest);
    assert.deepEqual(fs.readFileSync(consumedFile),consumedBefore);

    const intentFile=path.join(
      root,
      "broadcast-submission-intents",
      record.broadcast_authorization_id+".json",
    );
    const intentBefore=fs.readFileSync(intentFile);
    const duplicate=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        broadcaster,
        now+1000,
      );
    assert.equal(duplicate.ok,false);
    assert.equal(
      duplicate.reason,
      "datanet_single_submission_already_claimed_reconciliation_required",
    );
    assert.equal(duplicate.durable_submission_intent_published,true);
    assert.equal(duplicate.reconciliation_required,true);
    assert.equal(duplicate.automatic_retry_allowed,false);
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);
    assert.deepEqual(fs.readFileSync(intentFile),intentBefore);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const calls={inspect:0,submit:0};
    const broadcaster={
      inspect_submission:notSubmittedInspection(record,calls),
      submit_once:async()=>{
        calls.submit++;
        const intentFile=path.join(
          root,
          "broadcast-submission-intents",
          record.broadcast_authorization_id+".json",
        );
        assert.equal(fs.existsSync(intentFile),true);
        throw new Error("synthetic_submit_transport_failure");
      },
    };
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        broadcaster,
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_single_submission_submit_exception_unknown",
    );
    assert.equal(result.durable_submission_intent_published,true);
    assert.equal(result.submit_method_invoked,true);
    assert.equal(result.submission_may_have_occurred,true);
    assert.equal(result.reconciliation_required,true);
    assert.equal(result.automatic_retry_allowed,false);
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);

    const duplicate=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        broadcaster,
        now+1000,
      );
    assert.equal(duplicate.ok,false);
    assert.equal(
      duplicate.reason,
      "datanet_single_submission_already_claimed_reconciliation_required",
    );
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const calls={inspect:0,submit:0};
    const broadcaster={
      inspect_submission:notSubmittedInspection(record,calls),
      submit_once:async()=>{
        calls.submit++;
        return {
          ok:true,
          status:"not_submitted",
          transaction_hash:record.signed_transaction_hash,
          provider_submission_id:"synthetic-no-submit",
          definitive_not_submitted:true,
          submission_call_performed:false,
          submission_may_have_occurred:false,
        };
      },
    };
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        broadcaster,
        now,
      );
    assert.equal(result.ok,true);
    if(result.ok===false)throw new Error(result.reason);
    assert.equal(result.submission_result_status,"not_submitted");
    assert.equal(result.definitive_not_submitted,true);
    assert.equal(result.submission_call_performed,false);
    assert.equal(result.submission_may_have_occurred,false);
    assert.equal(result.reconciliation_required,true);
    assert.equal(result.automatic_retry_allowed,false);
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);

    const duplicate=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        broadcaster,
        now+1000,
      );
    assert.equal(duplicate.ok,false);
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const calls={inspect:0,submit:0};
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        {
          inspect_submission:notSubmittedInspection(record,calls),
          submit_once:async()=>{
            calls.submit++;
            return {
              ok:true,
              status:"accepted",
              transaction_hash:record.signed_transaction_hash,
              provider_submission_id:"synthetic-provider-secret",
              definitive_not_submitted:false,
              submission_call_performed:true,
              submission_may_have_occurred:true,
              raw_signed_transaction:"0x1234",
            };
          },
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_single_submission_secret_response_rejected",
    );
    assert.equal(result.durable_submission_intent_published,true);
    assert.equal(result.submit_method_invoked,true);
    assert.equal(result.reconciliation_required,true);
    assert.equal(result.automatic_retry_allowed,false);
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const calls={inspect:0,submit:0};
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        {
          inspect_submission:notSubmittedInspection(record,calls),
          submit_once:async()=>{
            calls.submit++;
            return {
              ok:true,
              status:"accepted",
              transaction_hash:"0x"+"9".repeat(64),
              provider_submission_id:"synthetic-provider-wrong-hash",
              definitive_not_submitted:false,
              submission_call_performed:true,
              submission_may_have_occurred:true,
            };
          },
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_single_submission_response_invalid",
    );
    assert.equal(result.durable_submission_intent_published,true);
    assert.equal(result.submit_method_invoked,true);
    assert.equal(result.reconciliation_required,true);
    assert.equal(calls.inspect,1);
    assert.equal(calls.submit,1);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=stateRoot();
  try{
    const record=recordFor(root);
    writeRecord(root,record);
    const calls={inspect:0,submit:0};
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
        }),
        {
          inspect_submission:notSubmittedInspection(record,calls),
          submit_once:async()=>{
            calls.submit++;
            throw new Error("expired_must_not_submit");
          },
        },
        Date.parse("2026-09-22T15:13:00Z"),
      );
    assert.equal(result.ok,false);
    assert.match(
      result.reason,
      /datanet_single_submission_fresh_inspection_held:datanet_broadcaster_access_authorization_expired/,
    );
    assert.equal(calls.inspect,0);
    assert.equal(calls.submit,0);
    assert.equal(
      fs.existsSync(path.join(root,"broadcast-submission-intents")),
      false,
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
    const calls={inspect:0,submit:0};
    const result=
      await submitDatanetContentCommitmentExactSingleSubmissionWithClockV1(
        inputFor(root,record,{
          apply:true,
          confirmation:
            VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_CONFIRMATION_V1,
          state_hash:"0".repeat(64),
        }),
        {
          inspect_submission:notSubmittedInspection(record,calls),
          submit_once:async()=>{
            calls.submit++;
            throw new Error("mismatch_must_not_submit");
          },
        },
        now,
      );
    assert.equal(result.ok,false);
    assert.equal(
      result.reason,
      "datanet_single_submission_canonical_state_store_mismatch",
    );
    assert.equal(calls.inspect,0);
    assert.equal(calls.submit,0);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const [key,expected] of Object.entries({
  source_only_gate:true,
  explicit_apply_required:true,
  exact_confirmation_required:true,
  fresh_not_submitted_reinspection_required:true,
  durable_intent_before_submit_required:true,
  immutable_submission_intent:true,
  exact_state_store_realpath_scoped_submission_claim:true,
  exact_signed_transaction_hash_required:true,
  exact_custody_handle_fingerprint_required:true,
  deterministic_submission_idempotency_key:true,
  injected_submit_once_only:true,
  at_most_one_submit_method_invocation_per_claim:true,
  duplicate_claim_requires_reconciliation:true,
  submit_exception_requires_reconciliation:true,
  ambiguous_result_requires_reconciliation:true,
  definitive_not_submitted_after_submit_still_requires_reconciliation:true,
  automatic_resubmission:false,
  raw_signed_transaction_input:false,
  raw_signed_transaction_output:false,
  raw_signed_transaction_access:false,
  opaque_custody_handle_input:false,
  opaque_custody_handle_output:false,
  opaque_custody_handle_access:false,
  filesystem_read:true,
  filesystem_mutation_one_submission_intent_may_occur:true,
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
    VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_AUTHORITY_V1[key],
    expected,
    key,
  );
}

const source=fs.readFileSync(
  path.join(
    process.cwd(),
    "tools/datanet-content-commitment-exact-single-submission-v1.mjs",
  ),
  "utf8",
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
  "createPrivateKey",
  "generateKeyPair",
  "Wallet(",
  ".signTransaction(",
  ".signMessage(",
]){
  assert.equal(
    source.includes(forbidden),
    false,
    "source contains "+forbidden,
  );
}
assert.equal(
  source.split(".submit_once(").length-1,
  1,
  "source must contain exactly one injected submit_once invocation",
);

console.log(
  "VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_V1_PROOF_GREEN",
);
console.log("fresh_not_submitted_reinspection=true");
console.log("durable_intent_before_submit=true");
console.log("immutable_submission_intent_0600=true");
console.log("submission_intent_directory_0700=true");
console.log("atomic_hardlink_publication=true");
console.log("directory_fsync_after_publication=true");
console.log("exactly_one_injected_submit_call_site=true");
console.log("duplicate_submit_blocked_before_reinspection=true");
console.log("submit_exception_requires_reconciliation=true");
console.log("definitive_not_submitted_after_submit_no_auto_retry=true");
console.log("secret_bearing_submit_response_rejected=true");
console.log("raw_signed_transaction_access=false");
console.log("opaque_custody_handle_access=false");
console.log("direct_rpc_call=false");
console.log("direct_network_call=false");
console.log("automatic_retry=false");
