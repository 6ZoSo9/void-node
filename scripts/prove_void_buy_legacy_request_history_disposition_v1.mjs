#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_AUTHORITY_V1 as AUTH,
  VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_DECISIONS_V1 as D,
  classifyVoidBuyVoidLegacyHistoryDispositionCandidateV1 as classify,
} from "../tools/void-buy-legacy-request-history-disposition-v1.mjs";

const base=()=>({
  metadata_census_sha256:"sha256:"+"a".repeat(64),
  metadata_census_source_head:"b".repeat(40),
  designated_hostname_matches:true,
  designated_runtime_user_matches:true,
  designated_machine_id_matches:true,
  bounded_current_candidate_set_observed:true,
  process_environment_access:false,
  external_network_calls:false,
  loopback_get_only:true,
  candidate_count:7,
  surviving_history_metadata_root_count:0,
  unverified_root_count:0,
  empty_shape_external_anchor_required_count:2,
  request_or_payment_contents_read:false,
  metadata_census_historical_disposition_proven:false,
  decision:D.NO_PREANCHOR_CUSTOMER_LIABILITY_DECLARED,
  operator_id:"economic-owner-review",
  reviewed_at_utc:"2026-10-15T04:45:00.000Z",
});

const clean=classify(base());
assert.equal(clean.ok,true);
assert.match(clean.candidate_id,/^voidblrhdc1_[0-9a-f]{64}$/u);
assert.equal(clean.human_accounting_disposition_declared,true);
assert.equal(clean.technical_historical_origin_proven,false);
assert.equal(clean.technical_candidate_set_completeness_proven,false);
assert.equal(clean.sovereign_signature_verified,false);
assert.equal(clean.external_witness_verified,false);
assert.equal(clean.historical_request_history_disposition_accepted,false);
assert.equal(clean.stable_root_apply_authorized,false);

const surviving=classify({
  ...base(),
  surviving_history_metadata_root_count:1,
  empty_shape_external_anchor_required_count:1,
  decision:D.SURVIVING_HISTORY_REQUIRES_MIGRATION,
});
assert.equal(surviving.ok,true);
assert.equal(surviving.human_accounting_disposition_declared,true);
assert.equal(surviving.migration_authorized,false);

assert.equal(classify({
  ...base(),
  surviving_history_metadata_root_count:1,
}).ok,false);

const incomplete=classify({
  ...base(),
  bounded_current_candidate_set_observed:false,
});
assert.equal(incomplete.ok,false);
assert.equal(
  incomplete.reason,
  "legacy_history_disposition_incomplete_bounded_census_requires_hold",
);
const incompleteHold=classify({
  ...base(),
  bounded_current_candidate_set_observed:false,
  decision:D.UNRESOLVED_HOLD,
});
assert.equal(incompleteHold.ok,true);
assert.equal(incompleteHold.human_accounting_disposition_declared,false);

for(const unsafe of [
  {process_environment_access:true},
  {external_network_calls:true},
  {loopback_get_only:false},
]){
  assert.equal(classify({...base(),...unsafe}).ok,false);
}

const unresolved=classify({
  ...base(),
  unverified_root_count:1,
  empty_shape_external_anchor_required_count:1,
  decision:D.UNRESOLVED_HOLD,
});
assert.equal(unresolved.ok,true);
assert.equal(unresolved.human_accounting_disposition_declared,false);

assert.equal(classify({
  ...base(),
  unverified_root_count:1,
}).ok,false);

assert.equal(classify({
  ...base(),
  metadata_census_historical_disposition_proven:true,
}).ok,false);
assert.equal(classify({
  ...base(),
  designated_runtime_user_matches:false,
}).ok,false);
assert.equal(classify({
  ...base(),
  designated_machine_id_matches:false,
}).ok,false);
assert.equal(classify({
  ...base(),
  request_or_payment_contents_read:true,
}).ok,false);

for(const [key,expected] of Object.entries({
  source_only_candidate:true,
  human_accounting_disposition_may_be_recorded:true,
  technical_historical_origin_proven:false,
  technical_candidate_set_completeness_proven:false,
  bounded_current_candidate_set_required_for_disposition:true,
  designated_runtime_user_required:true,
  process_environment_access_forbidden:true,
  external_network_access_forbidden:true,
  cryptographic_never_used_proof_claimed:false,
  sovereign_signature_required_for_acceptance:true,
  external_witness_required_for_acceptance:true,
  sovereign_signature_verified:false,
  external_witness_verified:false,
  historical_request_history_disposition_accepted:false,
  migration_authorized:false,
  stable_root_apply_authorized:false,
  service_mutation:false,
  filesystem_write:false,
  request_or_payment_contents_read:false,
  payment_acceptance:false,
  public_presale_activation:false,
  funds_movement:false,
})){
  assert.equal(AUTH[key],expected,key);
}

console.log("VOID_BUY_VOID_LEGACY_HISTORY_DISPOSITION_CANDIDATE_V1_PROOF_GREEN");
console.log("technical_never_used_proof_claimed=false");
console.log("human_accounting_disposition_separate_from_technical_origin=true");
console.log("surviving_history_requires_migration_disposition=true");
console.log("unverified_history_requires_hold=true");
console.log("bounded_current_candidate_set_required=true");
console.log("designated_runtime_user_required=true");
console.log("process_environment_access_forbidden=true");
console.log("external_network_access_forbidden=true");
console.log("sovereign_signature_required=true");
console.log("external_witness_required=true");
console.log("historical_request_history_disposition_accepted=false");
console.log("stable_root_apply_authorized=false");
console.log("payment_acceptance=false");
console.log("public_presale_activation=false");
console.log("funds_movement=false");
