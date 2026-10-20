// Source-only HOLD classifier for VOID custody second-control signatures.
// This V1 generation intentionally selects NO trusted approver key or role.
// Never wire a mathematically valid signature directly to rollback authority.
import { types as utilTypes } from "node:util";

export const MARKER="VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_TRUST_ADMISSION_HOLD_V1";
export const VERIFIER_GIT_BLOB_SHA1="72c9c451eb8d949b61a159fc9ffa4753b0bb895a";
export const V2_CONTROLLER_GIT_BLOB_SHA1="7a42e1863f3f4d842dd59060b366901adb402848";

export const UNCONFIGURED_ACCEPTED_TRUST_POLICY_V1=Object.freeze({
  marker:"VOID_BUY_VOID_CUSTODY_ACCEPTED_APPROVER_TRUST_POLICY_UNCONFIGURED_V1",
  version:1,
  trust_root_status:"UNCONFIGURED",
  accepted_trust_root_generation:null,
  accepted_approver_spki_sha256:null,
  operator_principal_separation_qualified:false,
  approver_entitlement_verified:false,
  approved_role_roster_authenticated:false,
  key_rotation_rollback_protected:false,
  revocation_snapshot_authenticated:false,
  trusted_clock_authenticated:false,
  signature_expiry_checked:false,
  durable_one_time_approval_claim_proven:false,
  challenge_lease_storage_authenticated:false,
  independent_physical_custody_proven:false,
  independent_security_review_satisfied:false,
  protected_host_adapter_authorized:false,
  approval_acceptance_enabled:false,
});
export const SOURCE_ONLY_AUTHORITY=Object.freeze({
  source_only_hold_classifier:true,
  current_trust_root_unconfigured:true,
  accepted_second_control_approver:false,
  independently_authenticated_key_pin:false,
  independently_authenticated_principal:false,
  replay_prevention_proven:false,
  approved_second_control_proven:false,
  host_execution_authorized:false,
  filesystem_read_authorized:false,
  filesystem_write_authorized:false,
  storage_mutation_authorized:false,
  rollback_test_authorized:false,
  credential_access_authorized:false,
  private_key_access_authorized:false,
  signing_authorized:false,
  payment_acceptance_authorized:false,
  public_presale_activation_authorized:false,
  wc_void_market_activation_authorized:false,
  funds_movement:false,
});

const RESULT_KEYS=Object.freeze([
  "marker","signature_cryptographically_verified","approval_id",
  "signed_message_sha256","declared_approver_spki_sha256",
  "declaration_of_distinct_operator_key",
  "caller_key_pin_independently_authenticated",
  "distinct_approving_principal_authenticated",
  "replay_prevention_proven","approved_second_control_proven",
  "host_execution_authorized","storage_mutation_authorized",
  "rollback_test_authorized","payment_acceptance_authorized",
  "public_presale_activation_authorized","wc_void_market_activation_authorized",
  "funds_movement",
]);
const SHA=/^sha256:[0-9a-f]{64}$/u;
const APPROVAL=/^voidbuycustodysecondcontrol2_[0-9a-f]{64}$/u;
function hold(reason){throw new Error(reason);}
function record(value,keys,reason){
  if(!value||typeof value!=="object"||utilTypes.isProxy(value)||
     Array.isArray(value))hold(reason);
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null)hold(reason);
  const names=Reflect.ownKeys(value);
  const expected=keys.slice().sort();
  if(names.length!==expected.length||
     names.some(name=>typeof name!=="string")||
     names.slice().sort().some((name,i)=>name!==expected[i]))
    hold(reason);
  const out=Object.create(null);
  for(const key of keys){
    const d=Object.getOwnPropertyDescriptor(value,key);
    if(!d||!("value" in d)||d.enumerable!==true)hold(reason);
    out[key]=d.value;
  }
  return out;
}

// The only possible current outcome is HOLD. Even a forged verifier result
// with mathematically verified=true cannot promote a caller-declared pin.
// A separately reviewed successor is required to select a real trust root.
export function assessBuyVoidCustodySecondControlTrustAdmissionHoldV1(input){
  const top=record(input,["verification"],
    "second_control_trust_admission_input_invalid");
  const v=record(top.verification,RESULT_KEYS,
    "second_control_trust_admission_verification_shape_invalid");
  if(v.marker!=="VOID_BUY_VOID_CUSTODY_SECOND_CONTROL_ED25519_VERIFIER_V1")
    hold("second_control_trust_admission_verifier_domain_invalid");
  if(v.signature_cryptographically_verified!==true)
    hold("second_control_trust_admission_signature_math_not_verified");
  if(typeof v.approval_id!=="string"||!APPROVAL.test(v.approval_id)||
     typeof v.signed_message_sha256!=="string"||!SHA.test(v.signed_message_sha256)||
     typeof v.declared_approver_spki_sha256!=="string"||
       !SHA.test(v.declared_approver_spki_sha256)||
     v.declaration_of_distinct_operator_key!==true)
    hold("second_control_trust_admission_verification_identity_invalid");
  for(const key of RESULT_KEYS.slice(6)){
    if(v[key]!==false)
      hold("second_control_trust_admission_unaccepted_positive_authority:"+key);
  }
  return Object.freeze({
    marker:MARKER,
    status:"HOLD",
    reason:"independently_accepted_approver_root_unconfigured",
    checked_approval_id:v.approval_id,
    mathematical_signature_verification_reported:true,
    trusted_approver_key_pin_verified:false,
    independent_approver_principal_verified:false,
    revocation_and_expiry_verified:false,
    durable_replay_and_lease_proven:false,
    approved_second_control_proven:false,
    host_execution_authorized:false,
    rollback_test_authorized:false,
    payment_acceptance_authorized:false,
    public_presale_activation_authorized:false,
    wc_void_market_activation_authorized:false,
    funds_movement:false,
  });
}
