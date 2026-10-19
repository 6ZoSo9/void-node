#!/usr/bin/env python3
"""Fail-closed source-only plan V2 proof. No host/credential/process/network calls."""
from __future__ import annotations
import copy,hashlib,json,os,stat,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PLAN=ROOT/"ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v2.json"
MARKER="VOID_BUY_VOID_PRESALE_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V2_PROOF"
PARENT="60a6fffc0fd8de576769f4bc090b3a12ca4ba526"
OLD_ID="voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006"
NEW_ID="voidbuycustodychallengeplan2_8969a5b3e91e20cc42b6d81dc6d51c0148bb878c2b36a0db5ff2f4704ee6fc01"
TREE="71c67e62a2b21a98f3f5135ee6aa56e0ef97d262"
EVIDENCE=["non_customer_canary_domain_required","operation_bound_authorization_required","exact_current_policy_binding_required","reviewed_source_generation_binding_required","challenge_entropy_and_unpredictability_required","live_journal_challenge_append_required","live_high_water_advance_required","journal_and_high_water_sync_close_reopen_required","external_witness_post_challenge_append_required","controlled_rollback_attempt_required","reviewed_rollback_controller_required","high_water_second_control_approval_required","post_rollback_high_water_non_decrease_required","stale_journal_refusal_required","post_rollback_external_witness_continuity_required","distinct_physical_storage_reobservation_required","post_test_policy_rebind_required","allocation_ledger_unchanged_required","customer_request_state_unchanged_required","evidence_origin_authentication_required"]
UPGRADES=["durable_create_once_authorization_claim_required","same_authorization_replay_rejected_before_mutation_required","authorization_claim_rollback_mutation_forbidden","authorization_claim_survival_and_terminal_revalidation_required","exclusive_operation_wide_lease_before_observation_required","lease_identity_bound_to_every_challenge_phase_required","lease_survival_and_terminal_exclusivity_revalidation_required","canonical_controller_transcript_digest_bound_to_origin_required","adapter_authenticates_capabilities_entitlements_and_evidence_origin_required"]
AUTHORITY=["host_execution_authorized","filesystem_read_authorized","filesystem_write_authorized","storage_mutation_authorized","rollback_test_authorized","service_mutation_authorized","credential_access_authorized","wallet_or_signer_access_authorized","signing_authorized","transaction_submission_authorized","payment_acceptance_authorized","public_presale_activation_authorized","wc_void_market_activation_authorized","treasury_or_liquidity_action_authorized","funds_movement","production_host_evidence_authority"]
PINS={"ops/security/buy-void-presale-custody-durability-rollback-challenge-plan-v1.json":"5face2022dc2cbc573e32e99f88623f381a8a174","tools/void-buy-allocation-custody-rollback-controller-candidate-v1.mjs":"96d4ac3499d222841f1f7a3c53e14900b68ae8cf","scripts/prove_buy_void_allocation_custody_rollback_controller_candidate_v1.mjs":"b196fcaa77a6bdc465baacb3387aa949f47bc956"}
class Hold(Exception):pass
def need(ok,reason):
 if not ok:raise Hold(reason)
def closed(x,keys,label):
 need(type(x) is dict and set(x)==set(keys),label+"_shape_invalid")
 return x
def canonical(x):
 return json.dumps(x,sort_keys=True,separators=(",",":"),ensure_ascii=True,allow_nan=False).encode("ascii")
def sha1blob(data):
 return hashlib.sha1(b"blob "+str(len(data)).encode("ascii")+b"\0"+data).hexdigest()
def read(p):
 st=p.lstat()
 need(stat.S_ISREG(st.st_mode) and st.st_nlink==1 and 0<st.st_size<=1024*1024,"source_invalid")
 fd=os.open(p,os.O_RDONLY|os.O_CLOEXEC|os.O_NOFOLLOW|os.O_NONBLOCK)
 try:
  opened=os.fstat(fd)
  attrs=("st_dev","st_ino","st_mode","st_size","st_mtime_ns","st_ctime_ns")
  need(all(getattr(st,k)==getattr(opened,k) for k in attrs),"open_generation_changed")
  buf=bytearray()
  while len(buf)<opened.st_size:
   x=os.read(fd,min(65536,opened.st_size-len(buf)))
   need(bool(x),"short_read")
   buf.extend(x)
  need(os.read(fd,1)==b"","grew")
  after=os.fstat(fd);visible=p.lstat()
  need(all(getattr(after,k)==getattr(visible,k)==getattr(opened,k) for k in attrs),"terminal_generation_changed")
  return bytes(buf)
 finally:os.close(fd)
def validate(p):
 closed(p,("schema","marker","version","repository","stack_parent_head","superseded_v1","controller_candidate","historical_live_evidence_required","v2_controller_upgrade_required","canary_and_authorization","evidence_state","authority","next_gate","plan_id"),"plan")
 need(p["schema"]=="void_buy_void_presale_custody_durability_rollback_challenge_plan_v2" and p["marker"]=="VOID_BUY_VOID_PRESALE_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V2","schema")
 need(type(p["version"]) is int and p["version"]==2 and p["repository"]=="6ZoSo9/void-node" and p["stack_parent_head"]==PARENT,"lineage")
 v=closed(p["superseded_v1"],("path","git_blob_sha1","plan_id","still_requires_twenty_live_evidence_fields","not_live_execution_authority"),"v1")
 need(v["path"] in PINS and v["git_blob_sha1"]==PINS[v["path"]] and v["plan_id"]==OLD_ID,"v1_pin")
 need(v["still_requires_twenty_live_evidence_fields"] is True and v["not_live_execution_authority"] is True,"v1_false_authority")
 c=closed(p["controller_candidate"],("path","git_blob_sha1","proof_path","proof_git_blob_sha1","review_head","accepted_economic_tree","controller_v1_plan_id","controller_does_not_authenticate_injected_capabilities","protected_host_adapter_required","source_only_controller_candidate"),"controller")
 need(c["path"] in PINS and c["git_blob_sha1"]==PINS[c["path"]] and c["proof_path"] in PINS and c["proof_git_blob_sha1"]==PINS[c["proof_path"]],"controller_pin")
 need(c["review_head"]==PARENT and c["accepted_economic_tree"]==TREE and c["controller_v1_plan_id"]==OLD_ID,"controller_lineage")
 for k in ("controller_does_not_authenticate_injected_capabilities","protected_host_adapter_required","source_only_controller_candidate"):need(c[k] is True,"controller_claim")
 for section,ks in (("historical_live_evidence_required",EVIDENCE),("v2_controller_upgrade_required",UPGRADES)):
  data=closed(p[section],ks,section)
  for k in ks:need(data[k] is True,"missing_requirement:"+k)
 a=closed(p["authority"],AUTHORITY,"authority")
 for k in AUTHORITY:need(a[k] is False,"forbidden_authority:"+k)
 scope=closed(p["canary_and_authorization"],("exact_canary_domain","unpredictable_entropy_must_be_generated_at_execution","exact_operation_bound_reviewed_authorization_required","accepted_economic_tree","external_witness_second_control_required","no_customer_ledger_or_requests_mutation"),"canary")
 need(scope["exact_canary_domain"]=="void.buyvoid.presale.noncustomer.canary.v1" and scope["accepted_economic_tree"]==TREE,"canary_identity")
 for k in set(scope)-{"exact_canary_domain","accepted_economic_tree"}:need(scope[k] is True,"canary_required")
 state=closed(p["evidence_state"],("read_only_prerequisite_collection_is_not_durability_proof","controller_callback_self_report_is_not_host_authority","live_challenge_not_executed","adapter_not_implemented_or_authenticated","independent_review_outstanding"),"state")
 for k in state:need(state[k] is True,"unproven_state")
 need(p["next_gate"]=="DISTINCT_REVIEW_V2_CHALLENGE_PLAN_THEN_PROTECTED_ADAPTER_CANDIDATE","next_gate")
 obj=copy.deepcopy(p);del obj["plan_id"]
 need(p["plan_id"]=="voidbuycustodychallengeplan2_"+hashlib.sha256(canonical(obj)).hexdigest() and p["plan_id"]==NEW_ID,"content_identity")
def main():
 need(sys.argv[1:] in (["--self-test"],["--run"]),"mode")
 p=json.loads(read(PLAN));validate(p)
 rejected=0
 for section,ks,badvalue in (("historical_live_evidence_required",EVIDENCE,False),("v2_controller_upgrade_required",UPGRADES,False),("authority",AUTHORITY,True)):
  for k in ks:
   x=copy.deepcopy(p);x[section][k]=badvalue
   try:validate(x)
   except Hold:rejected+=1
   else:raise Hold("adversary_accepted:"+k)
 for change in ("id","controller","v1","extra"):
  x=copy.deepcopy(p)
  if change=="id":x["plan_id"]="voidbuycustodychallengeplan2_"+"0"*64
  elif change=="controller":x["controller_candidate"]["git_blob_sha1"]="0"*40
  elif change=="v1":x["superseded_v1"]["git_blob_sha1"]="0"*40
  else:x["authority"]["unexpected"]=True
  try:validate(x)
  except Hold:rejected+=1
  else:raise Hold("structural_adversary_accepted")
 if sys.argv[1]=="--run":
  for rel,digest in PINS.items():need(sha1blob(read(ROOT/rel))==digest,"inherited_blob:"+rel)
  prior=json.loads(read(ROOT/p["superseded_v1"]["path"]))
  need(prior.get("plan_id")==OLD_ID and prior.get("durability_contract",{}).get("required_future_evidence")==p["historical_live_evidence_required"],"historical_evidence_changed")
  need(set(prior.get("authority",{}))==set(AUTHORITY) and all(x is False for x in prior["authority"].values()),"historical_authority_changed")
 print(MARKER+"_GREEN")
 print("plan_id="+NEW_ID)
 print("source_only=true")
 print("inherited_live_evidence_requirements="+str(len(EVIDENCE)))
 print("new_controller_requirements="+str(len(UPGRADES)))
 print("rejected_adversaries="+str(rejected))
 print("inherited_blob_validation="+("true" if sys.argv[1]=="--run" else "not_requested"))
 print("production_host_evidence_authority=false")
 print("payment_acceptance_authorized=false")
 print("public_presale_activation_authorized=false")
 print("funds_movement=false")
 print("next_gate="+p["next_gate"])
if __name__=="__main__":
 try:main()
 except (Hold,ValueError,TypeError,OSError,UnicodeError,RecursionError) as exc:
  print(MARKER)
  print("status=HOLD")
  print("reason="+str(exc)[:160])
  print("payment_acceptance_authorized=false")
  print("public_presale_activation_authorized=false")
  print("funds_movement=false")
  raise SystemExit(2)
