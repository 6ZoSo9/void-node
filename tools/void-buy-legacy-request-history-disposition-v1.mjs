#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";

export const VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1 =
  "VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1";

export const VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1 =
  Object.freeze({
    NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED:
      "NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED",
    SURVIVING_HISTORY_REQUIRES_MIGRATION:
      "SURVIVING_HISTORY_REQUIRES_MIGRATION",
    UNRESOLVED_HOLD:
      "UNRESOLVED_HOLD",
  });

export const VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_PARENT_V1 =
  Object.freeze({
    marker: "VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1",
    version: 1,
    accepted_source_head: "a8e3b930a98eeef0f19f3df94822c2c104bfdde8",
    source_path: "ops/precision/void_buy_void_legacy_request_root_census_v1.py",
    accepted_source_blob_sha1: "be5b0034de608c6803eb09c80491afff89c7bf39",
  });

export const VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_only_candidate: true,
    human_accounting_disposition_may_be_recorded: true,
    exact_census_evidence_bytes_required: true,
    exact_census_source_head_required: true,
    exact_census_source_blob_required: true,
    census_sha256_computed_internally: true,
    census_partitions_derived_internally: true,
    bounded_current_candidate_set_required_for_no_liability: true,
    designated_runtime_user_required: true,
    process_environment_access_forbidden: true,
    external_network_access_forbidden: true,
    technical_historical_origin_proven: false,
    technical_candidate_set_completeness_proven: false,
    cryptographic_never_used_proof_claimed: false,
    sovereign_signature_required_for_acceptance: true,
    external_witness_required_for_acceptance: true,
    sovereign_signature_verified: false,
    external_witness_verified: false,
    historical_request_history_disposition_accepted: false,
    migration_authorized: false,
    stable_root_apply_authorized: false,
    service_mutation: false,
    filesystem_write: false,
    request_or_payment_contents_read: false,
    payment_acceptance: false,
    public_presale_activation: false,
    funds_movement: false,
  });

const D=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1;
const PARENT=VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_PARENT_V1;
const MAX_CENSUS_JSON_BYTES=8*1024*1024;
const SAFE_OPERATOR=/^[A-Za-z0-9_.:@/-]{1,128}$/u;
const UTC=/^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{3})?Z$/u;
const SHA1=/^[0-9a-f]{40}$/u;
const REPO_DEFAULT=
  "/home/zoso/dev/void-node/.runtime/public-buy-void-requests-v1";
const STABLE_ROOT="/var/lib/void-buy-request-journal-v1";
const DEFAULT_RELATIVE=".runtime/public-buy-void-requests-v1";
const RELEASE_DEFAULT=
  /^\/opt\/void-node-live\/releases\/[0-9a-f]{40}\/\.runtime\/public-buy-void-requests-v1$/u;
const KNOWN_SOURCES=Object.freeze([
  "repo_default",
  "unit_working_directory_default",
  "live_process_cwd_default",
  "live_status_explicit_request_dir",
  "immutable_release_default",
  "selected_future_stable_root",
]);
const INPUT_KEYS=Object.freeze([
  "metadata_census_json",
  "metadata_census_source_head",
  "decision",
  "operator_id",
  "reviewed_at_utc",
]);
const CENSUS_KEYS=Object.freeze([
  "marker","version","read_only",
  "designated_hostname_matches","designated_runtime_user_matches","effective_uid",
  "designated_machine_id_matches","service",
  "process_environment_access","external_network_calls","loopback_get_only",
  "runtime_process_generation_stable","runtime_http_listener_stable",
  "confirmed_closeout_request_root_status",
  "confirmed_closeout_request_root_status_stable",
  "immutable_release_count","immutable_release_inventory_complete",
  "immutable_release_inventory_stable","candidate_observations_stable",
  "candidate_set_completeness_proven","bounded_current_candidate_set_observed",
  "candidate_count","candidates","historical_candidate_count",
  "surviving_history_metadata_root_count","surviving_history_metadata_roots",
  "unverified_root_count","unverified_roots",
  "empty_shape_external_anchor_required_count",
  "empty_shape_external_anchor_required_roots","absent_root_count",
  "historical_request_history_disposition_proven","historical_origin_authenticated",
  "filesystem_rollback_prevention_proven","migration_authorized",
  "request_or_payment_contents_read","directory_entry_names_output",
  "host_mutation","payment_acceptance","public_presale_activation",
  "funds_movement","production_gate_ready","next_action",
]);
const SERVICE_KEYS=Object.freeze([
  "status","load_state","active_state","sub_state","main_pid",
  "working_directory","live_process_cwd",
]);
const STATUS_KEYS=Object.freeze(["observed","source","request_dir"]);
const CANDIDATE_KEYS=Object.freeze([
  "path","sources","metadata","symlink_ancestor_observed",
  "directory_enumerated_for_count_only","directory_entry_names_output",
  "request_or_payment_contents_read","direct_entry_count",
  "other_direct_entry_count","fixed_journals","classification",
]);

function fail(code){throw new Error(code);}
function exactObject(value,keys,code){
  if(!value||typeof value!=="object"||Array.isArray(value))fail(code);
  const got=Object.keys(value).sort(),want=[...keys].sort();
  if(got.length!==want.length||got.some((x,i)=>x!==want[i]))fail(code);
  return value;
}
function count(value,code){
  if(!Number.isSafeInteger(value)||value<0||value>1000000)fail(code);
  return value;
}
function asciiJsonString(value){
  return JSON.stringify(value).replace(/[\u007f-\uffff]/g,(ch)=>
    "\\u"+ch.charCodeAt(0).toString(16).padStart(4,"0")
  );
}
function canonical(value){
  if(value===null)return "null";
  if(typeof value==="string")return asciiJsonString(value);
  if(typeof value==="boolean")return value?"true":"false";
  if(typeof value==="number"&&Number.isSafeInteger(value))return String(value);
  if(Array.isArray(value))return "["+value.map(canonical).join(",")+"]";
  if(value&&typeof value==="object"&&!Array.isArray(value)){
    return "{"+Object.keys(value).sort()
      .map(key=>asciiJsonString(key)+":"+canonical(value[key])).join(",")+"}";
  }
  fail("legacy_history_disposition_noncanonical_value");
}
function sha256(value){
  return crypto.createHash("sha256").update(value,"utf8").digest("hex");
}
function requireBool(value,expected,code){
  if(value!==expected)fail(code);
}
function requireStringArray(value,code){
  if(!Array.isArray(value)||value.some(x=>typeof x!=="string"))fail(code);
  return value;
}
function sameStringArray(actual,expected,code){
  const a=requireStringArray(actual,code);
  if(a.length!==expected.length||a.some((x,i)=>x!==expected[i]))fail(code);
}
function deriveCensus(raw,sourceHead){
  if(typeof raw!=="string"||raw.length===0||
     Buffer.byteLength(raw,"utf8")>MAX_CENSUS_JSON_BYTES){
    fail("legacy_history_disposition_census_bytes_invalid");
  }
  if(!SHA1.test(String(sourceHead||""))||
     sourceHead!==PARENT.accepted_source_head){
    fail("legacy_history_disposition_census_source_head_unaccepted");
  }
  let census;
  try{census=JSON.parse(raw);}catch{fail("legacy_history_disposition_census_json_invalid");}
  if(!census||typeof census!=="object"||Array.isArray(census)){
    fail("legacy_history_disposition_census_shape_invalid");
  }
  exactObject(
    census,
    CENSUS_KEYS,
    "legacy_history_disposition_census_top_level_shape_invalid",
  );
  if(canonical(census)!==raw){
    fail("legacy_history_disposition_census_json_noncanonical");
  }
  if(census.marker!==PARENT.marker||census.version!==PARENT.version){
    fail("legacy_history_disposition_census_identity_invalid");
  }
  if(census.effective_uid!==1000){
    fail("legacy_history_disposition_effective_uid_invalid");
  }
  const service=exactObject(
    census.service,
    SERVICE_KEYS,
    "legacy_history_disposition_service_shape_invalid",
  );
  if(
    !Number.isSafeInteger(service.status)||
    ![service.load_state,service.active_state,service.sub_state]
      .every(value=>value===null||typeof value==="string")||
    !(service.main_pid===null||Number.isSafeInteger(service.main_pid))||
    !(service.working_directory===null||
      typeof service.working_directory==="string")||
    !(service.live_process_cwd===null||
      typeof service.live_process_cwd==="string")
  ){
    fail("legacy_history_disposition_service_state_invalid");
  }
  const requestStatus=exactObject(
    census.confirmed_closeout_request_root_status,
    STATUS_KEYS,
    "legacy_history_disposition_request_status_shape_invalid",
  );
  if(typeof requestStatus.observed!=="boolean"){
    fail("legacy_history_disposition_request_status_invalid");
  }
  if(requestStatus.observed===true){
    if(
      !["server_default","VOID_BUY_REQUEST_DIR"].includes(requestStatus.source)||
      typeof requestStatus.request_dir!=="string"||
      !requestStatus.request_dir.startsWith("/")
    ){
      fail("legacy_history_disposition_request_status_invalid");
    }
  }else if(requestStatus.source!==null||requestStatus.request_dir!==null){
    fail("legacy_history_disposition_request_status_invalid");
  }
  requireBool(census.read_only,true,"legacy_history_disposition_census_not_read_only");
  requireBool(census.designated_hostname_matches,true,
    "legacy_history_disposition_designated_host_unbound");
  requireBool(census.designated_runtime_user_matches,true,
    "legacy_history_disposition_designated_runtime_user_unbound");
  requireBool(census.designated_machine_id_matches,true,
    "legacy_history_disposition_designated_machine_unbound");
  requireBool(census.process_environment_access,false,
    "legacy_history_disposition_process_environment_access_forbidden");
  requireBool(census.external_network_calls,false,
    "legacy_history_disposition_external_network_forbidden");
  requireBool(census.loopback_get_only,true,
    "legacy_history_disposition_loopback_boundary_invalid");
  requireBool(census.request_or_payment_contents_read,false,
    "legacy_history_disposition_request_content_read_forbidden");
  requireBool(census.directory_entry_names_output,false,
    "legacy_history_disposition_directory_names_output_forbidden");
  requireBool(census.candidate_set_completeness_proven,false,
    "legacy_history_disposition_census_overclaim");
  requireBool(census.historical_request_history_disposition_proven,false,
    "legacy_history_disposition_census_overclaim");
  requireBool(census.historical_origin_authenticated,false,
    "legacy_history_disposition_census_overclaim");
  requireBool(census.filesystem_rollback_prevention_proven,false,
    "legacy_history_disposition_census_overclaim");
  requireBool(census.migration_authorized,false,
    "legacy_history_disposition_census_authority_invalid");
  requireBool(census.host_mutation,false,
    "legacy_history_disposition_census_authority_invalid");
  requireBool(census.payment_acceptance,false,
    "legacy_history_disposition_census_authority_invalid");
  requireBool(census.public_presale_activation,false,
    "legacy_history_disposition_census_authority_invalid");
  requireBool(census.funds_movement,false,
    "legacy_history_disposition_census_authority_invalid");
  requireBool(census.production_gate_ready,false,
    "legacy_history_disposition_census_authority_invalid");

  if(!Number.isSafeInteger(census.immutable_release_count)||
     census.immutable_release_count<0||
     census.immutable_release_count>1000000){
    fail("legacy_history_disposition_release_count_invalid");
  }
  if(typeof census.immutable_release_inventory_complete!=="boolean"){
    fail("legacy_history_disposition_release_inventory_complete_invalid");
  }
  for(const key of [
    "runtime_process_generation_stable",
    "runtime_http_listener_stable",
    "confirmed_closeout_request_root_status_stable",
    "immutable_release_inventory_stable",
    "candidate_observations_stable",
    "bounded_current_candidate_set_observed",
  ]){
    if(typeof census[key]!=="boolean"){
      fail("legacy_history_disposition_census_boolean_invalid_"+key);
    }
  }
  const boundedExpected=
    census.runtime_process_generation_stable===true&&
    census.runtime_http_listener_stable===true&&
    census.confirmed_closeout_request_root_status_stable===true&&
    census.immutable_release_inventory_stable===true&&
    census.candidate_observations_stable===true;
  if(census.bounded_current_candidate_set_observed!==boundedExpected){
    fail("legacy_history_disposition_bounded_census_flag_inconsistent");
  }
  if(census.bounded_current_candidate_set_observed===true&&(
    census.immutable_release_inventory_complete!==true||
    service.status!==0||
    service.load_state!=="loaded"||
    service.active_state!=="active"||
    service.sub_state!=="running"||
    !Number.isSafeInteger(service.main_pid)||
    service.main_pid<=1||
    typeof service.working_directory!=="string"||
    !service.working_directory.startsWith("/")||
    typeof service.live_process_cwd!=="string"||
    !service.live_process_cwd.startsWith("/")||
    requestStatus.observed!==true
  )){
    fail("legacy_history_disposition_bounded_census_runtime_invalid");
  }

  if(!Array.isArray(census.candidates)){
    fail("legacy_history_disposition_candidates_invalid");
  }
  const candidateCount=count(
    census.candidate_count,
    "legacy_history_disposition_candidate_count_invalid",
  );
  if(candidateCount!==census.candidates.length){
    fail("legacy_history_disposition_candidate_count_mismatch");
  }
  const paths=new Set();
  const historical=[];
  const sourceCounts=Object.fromEntries(KNOWN_SOURCES.map(source=>[source,0]));
  for(const row of census.candidates){
    if(!row||typeof row!=="object"||Array.isArray(row)){
      fail("legacy_history_disposition_candidate_row_invalid");
    }
    exactObject(
      row,
      CANDIDATE_KEYS,
      "legacy_history_disposition_candidate_row_shape_invalid",
    );
    if(typeof row.path!=="string"||!row.path.startsWith("/")||
       typeof row.classification!=="string"||
       !row.metadata||typeof row.metadata!=="object"||Array.isArray(row.metadata)||
       !row.fixed_journals||typeof row.fixed_journals!=="object"||
       Array.isArray(row.fixed_journals)){
      fail("legacy_history_disposition_candidate_row_invalid");
    }
    const sources=requireStringArray(
      row.sources,
      "legacy_history_disposition_candidate_sources_invalid",
    );
    if(sources.length===0)fail("legacy_history_disposition_candidate_sources_invalid");
    const canonicalSources=[...new Set(sources)].sort();
    if(canonicalSources.length!==sources.length||
       canonicalSources.some((source,index)=>source!==sources[index])||
       sources.some(source=>!KNOWN_SOURCES.includes(source))){
      fail("legacy_history_disposition_candidate_sources_invalid");
    }
    if(paths.has(row.path))fail("legacy_history_disposition_duplicate_candidate_path");
    paths.add(row.path);

    const expectedDefault=(base)=>{
      if(typeof base!=="string"||!base.startsWith("/"))return null;
      return path.posix.resolve(base,DEFAULT_RELATIVE);
    };
    for(const source of sources){
      sourceCounts[source]+=1;
      if(source==="repo_default"&&row.path!==REPO_DEFAULT){
        fail("legacy_history_disposition_repo_source_path_mismatch");
      }
      if(source==="unit_working_directory_default"&&
         row.path!==expectedDefault(service.working_directory)){
        fail("legacy_history_disposition_working_directory_source_path_mismatch");
      }
      if(source==="live_process_cwd_default"&&
         row.path!==expectedDefault(service.live_process_cwd)){
        fail("legacy_history_disposition_live_cwd_source_path_mismatch");
      }
      if(source==="live_status_explicit_request_dir"&&(
        requestStatus.observed!==true||
        requestStatus.source!=="VOID_BUY_REQUEST_DIR"||
        row.path!==requestStatus.request_dir
      )){
        fail("legacy_history_disposition_status_source_path_mismatch");
      }
      if(source==="immutable_release_default"&&!RELEASE_DEFAULT.test(row.path)){
        fail("legacy_history_disposition_release_source_path_mismatch");
      }
      if(source==="selected_future_stable_root"&&row.path!==STABLE_ROOT){
        fail("legacy_history_disposition_stable_source_path_mismatch");
      }
    }
    if(sources.includes("selected_future_stable_root")&&sources.length!==1){
      fail("legacy_history_disposition_future_stable_root_mixed_provenance");
    }

    requireBool(row.request_or_payment_contents_read,false,
      "legacy_history_disposition_candidate_content_read_forbidden");
    requireBool(row.directory_entry_names_output,false,
      "legacy_history_disposition_candidate_names_output_forbidden");
    if(!sources.includes("selected_future_stable_root"))historical.push(row);
  }
  if(sourceCounts.repo_default!==1||
     sourceCounts.selected_future_stable_root!==1||
     sourceCounts.immutable_release_default!==census.immutable_release_count||
     sourceCounts.unit_working_directory_default!==
       (service.working_directory===null?0:1)||
     sourceCounts.live_process_cwd_default!==
       (service.live_process_cwd===null?0:1)||
     sourceCounts.live_status_explicit_request_dir!==
       (requestStatus.observed===true&&
        requestStatus.source==="VOID_BUY_REQUEST_DIR"?1:0)){
    fail("legacy_history_disposition_candidate_source_coverage_invalid");
  }
  if(count(census.historical_candidate_count,
      "legacy_history_disposition_historical_count_invalid")!==historical.length){
    fail("legacy_history_disposition_historical_count_mismatch");
  }

  const surviving=[],unverified=[],emptyShape=[],absent=[];
  for(const row of historical){
    if(row.classification==="SURVIVING_HISTORY_METADATA_OBSERVED"){
      surviving.push(row.path);
    }else if(row.classification.startsWith("HOLD_")||
             row.classification.startsWith("UNVERIFIED_")){
      unverified.push(row.path);
    }else if(row.classification.includes("EXTERNAL_ANCHOR_REQUIRED")){
      emptyShape.push(row.path);
    }else if(row.classification==="ABSENT_OBSERVED"){
      absent.push(row.path);
    }else{
      fail("legacy_history_disposition_candidate_partition_unknown");
    }
  }
  const summary=[
    ["surviving_history_metadata_root_count",surviving],
    ["unverified_root_count",unverified],
    ["empty_shape_external_anchor_required_count",emptyShape],
  ];
  for(const [key,derived] of summary){
    if(count(census[key],"legacy_history_disposition_summary_count_invalid")!==derived.length){
      fail("legacy_history_disposition_summary_count_mismatch_"+key);
    }
  }
  if(count(census.absent_root_count,
      "legacy_history_disposition_absent_count_invalid")!==absent.length){
    fail("legacy_history_disposition_absent_count_mismatch");
  }
  sameStringArray(
    census.surviving_history_metadata_roots,
    surviving,
    "legacy_history_disposition_surviving_roots_mismatch",
  );
  sameStringArray(
    census.unverified_roots,
    unverified,
    "legacy_history_disposition_unverified_roots_mismatch",
  );
  sameStringArray(
    census.empty_shape_external_anchor_required_roots,
    emptyShape,
    "legacy_history_disposition_empty_roots_mismatch",
  );
  const expectedNextAction=
    surviving.length>0||unverified.length>0
      ?"REVIEW_SURVIVING_HISTORY_BEFORE_DISPOSITION"
      :"EXPLICIT_LEGACY_HISTORY_DISPOSITION_AND_EXTERNAL_WITNESS_REQUIRED";
  if(census.next_action!==expectedNextAction){
    fail("legacy_history_disposition_next_action_mismatch");
  }

  return Object.freeze({
    census,
    metadata_census_sha256:"sha256:"+sha256(raw),
    candidate_count:candidateCount,
    surviving,
    unverified,
    emptyShape,
    absent,
    bounded_current_candidate_set_observed:
      census.bounded_current_candidate_set_observed===true,
  });
}

export function classifyVoidBuyVoidLegacyHistoryDispositionCandidateV1(input){
  try{
    const v=exactObject(
      input,
      INPUT_KEYS,
      "legacy_history_disposition_input_shape_invalid",
    );
    if(!SAFE_OPERATOR.test(String(v.operator_id||""))){
      fail("legacy_history_disposition_operator_id_invalid");
    }
    if(!UTC.test(String(v.reviewed_at_utc||""))||
       !Number.isFinite(Date.parse(v.reviewed_at_utc))){
      fail("legacy_history_disposition_review_time_invalid");
    }
    if(!Object.values(D).includes(v.decision)){
      fail("legacy_history_disposition_decision_invalid");
    }

    const derived=deriveCensus(
      v.metadata_census_json,
      v.metadata_census_source_head,
    );
    const surviving=derived.surviving.length;
    const unverified=derived.unverified.length;

    if(unverified>0&&v.decision!==D.UNRESOLVED_HOLD){
      fail("legacy_history_disposition_unverified_requires_hold");
    }
    if(surviving>0&&unverified===0&&
       v.decision!==D.SURVIVING_HISTORY_REQUIRES_MIGRATION){
      fail("legacy_history_disposition_surviving_requires_migration");
    }
    if(surviving===0&&unverified===0&&
       v.decision===D.SURVIVING_HISTORY_REQUIRES_MIGRATION){
      fail("legacy_history_disposition_migration_without_surviving_history");
    }
    if(!derived.bounded_current_candidate_set_observed&&
       surviving===0&&unverified===0&&
       v.decision!==D.UNRESOLVED_HOLD){
      fail("legacy_history_disposition_incomplete_bounded_census_requires_hold");
    }
    if(v.decision===D.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED&&
       (surviving!==0||unverified!==0||
        !derived.bounded_current_candidate_set_observed)){
      fail("legacy_history_disposition_no_liability_requires_clean_bounded_census");
    }

    const body=Object.freeze({
      schema:"void_buy_void_legacy_history_disposition_candidate_v1",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
      version:1,
      metadata_census_sha256:derived.metadata_census_sha256,
      metadata_census_source_head:PARENT.accepted_source_head,
      metadata_census_source_blob_sha1:PARENT.accepted_source_blob_sha1,
      metadata_census_marker:PARENT.marker,
      metadata_census_version:PARENT.version,
      designated_hostname_matches:true,
      designated_runtime_user_matches:true,
      designated_machine_id_matches:true,
      bounded_current_candidate_set_observed:
        derived.bounded_current_candidate_set_observed,
      process_environment_access:false,
      external_network_calls:false,
      loopback_get_only:true,
      candidate_count:derived.candidate_count,
      surviving_history_metadata_root_count:surviving,
      unverified_root_count:unverified,
      empty_shape_external_anchor_required_count:derived.emptyShape.length,
      absent_root_count:derived.absent.length,
      technical_candidate_set_completeness_proven:false,
      technical_historical_origin_proven:false,
      filesystem_rollback_prevention_proven:false,
      decision:v.decision,
      operator_id:v.operator_id,
      reviewed_at_utc:v.reviewed_at_utc,
      human_accounting_disposition_declared:
        v.decision!==D.UNRESOLVED_HOLD,
      sovereign_signature_required:true,
      external_witness_required:true,
      sovereign_signature_verified:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      migration_authorized:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
    });
    return Object.freeze({
      ok:true,
      status:
        v.decision===D.UNRESOLVED_HOLD
          ?"UNRESOLVED_HOLD_CANDIDATE"
          :"DISPOSITION_CANDIDATE_REQUIRES_SOVEREIGN_SIGNATURE_AND_EXTERNAL_WITNESS",
      ...body,
      candidate_id:"voidblrhdc1_"+sha256(canonical(body)),
      authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
    });
  }catch(error){
    return Object.freeze({
      ok:false,
      status:"HOLD",
      marker:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1,
      reason:error instanceof Error?error.message:String(error),
      sovereign_signature_verified:false,
      external_witness_verified:false,
      historical_request_history_disposition_accepted:false,
      stable_root_apply_authorized:false,
      payment_acceptance:false,
      public_presale_activation:false,
      funds_movement:false,
      authority:VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1,
    });
  }
}
