import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

const MARKER="VOID_BUY_VOID_OPERATOR_CAPABILITY_PROVENANCE_PLAN_V1";
const ROOT=process.cwd();
const BASE_HEAD="1c7ea1484537ec3259f1833b68fbcb64b130744b";
const BASE_TREE="fad8a97255783832962174bb2d439fc64af8ecc8";
const PLAN_PATH="ops/security/buy-void-operator-capability-provenance-plan-v1.json";
const PLAN_BLOB="d408edbf750f53ba37a6ad7d7e820b80ad61ff8b";
const PLAN_ID="voidbvcred1_accffa0b50b6b682716f3cc943ff5207d6565e71ad0f631718fa1677afbc322e";
const CREDENTIAL_ID="buy-void-operator-capability-v1";
const OWNED=Object.freeze([
  ".github/workflows/buy-void-operator-capability-provenance-plan-v1.yml",
  "docs/architecture/buy-void-operator-capability-provenance-plan-v1.md",
  PLAN_PATH,
  "scripts/prove_buy_void_operator_capability_provenance_plan_v1.mjs",
].sort());
const SOURCE_BINDINGS=Object.freeze({
  "docs/operators/buy-void-user-runtime-custody-hardening-v1.md":"dd52fd68e413fdb03ec5cbe13b95599ac9c3de67",
  "ops/install-void-node-live-user-service-v1.sh":"4b8f67cf3ce6f5011c33289558773547760abf44",
  "scripts/prove_buy_void_operator_local_intent_v1.ts":"b62351d9e48ab1c9654b6368eb0e412305f0b899",
  "src/economic/buy_void_operator_local_intent_v1.ts":"7d1ced8dacb50fd7c7b708fd6587ed7930332bb3",
});
const REQUIRED=Object.freeze([
  "credential_generation_bound_to_operator_principal_authentication_plan",
  "credentials_directory_service_generation_bound_required",
  "csprng_32_byte_token_generation_required",
  "exact_43_char_base64url_payload_required_for_new_generation",
  "exact_credential_id_required",
  "installed_credential_file_metadata_and_ancestry_bound_required",
  "installed_credential_file_sha256_bound_without_raw_bytes_required",
  "live_process_credentials_directory_identity_bound_required",
  "old_credential_generation_rejected_after_rotation_required",
  "operator_private_source_path_outside_repository_required",
  "raw_token_never_logged_or_receipted_required",
  "raw_token_never_stored_in_git_required",
  "revocation_holds_operator_mutation_until_new_generation_accepted",
  "rotation_requires_new_deployed_service_generation_and_restart_evidence",
  "service_hardening_no_new_privileges_and_empty_capability_sets_separate_gate",
  "source_file_canonical_regular_single_link_private_mode_required",
  "systemd_loadcredential_or_equivalent_closed_credential_namespace_required",
].sort());

function git(args){
  return execFileSync("/usr/bin/git",args,{
    cwd:ROOT,encoding:"utf8",
    env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
      GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null"},
  }).trim();
}
function gitGrepFiles(pattern,rev=BASE_HEAD){
  const result=spawnSync("/usr/bin/git",
    ["grep","-l","-F","-e",pattern,rev,"--"],{
      cwd:ROOT,encoding:"utf8",
      env:{PATH:"/usr/bin:/bin",HOME:"/nonexistent",LANG:"C",LC_ALL:"C",
        GIT_CONFIG_NOSYSTEM:"1",GIT_CONFIG_GLOBAL:"/dev/null"},
      timeout:30000,
      maxBuffer:8*1024*1024,
    });
  assert.equal(result.signal,null,"git_grep_signal");
  assert.ok(result.status===0||result.status===1,
    "git_grep_status:"+String(result.status)+":"+String(result.stderr||""));
  if(result.status===1){
    assert.equal(String(result.stdout||"").trim(),"","git_grep_no_match_stdout");
    return [];
  }
  return String(result.stdout||"").trim().split("\n").filter(Boolean)
    .map(line=>{
      const prefix=rev+":";
      assert.ok(line.startsWith(prefix),"git_grep_revision_prefix_missing:"+line);
      return line.slice(prefix.length);
    }).sort();
}
function gitBlob(bytes){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+String(bytes.length)+"\0","utf8"))
    .update(bytes).digest("hex");
}
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value&&typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=stable(value[key]);
    return out;
  }
  return value;
}
function sha256Text(value){
  return crypto.createHash("sha256").update(value,"utf8").digest("hex");
}
function source(path){return fs.readFileSync(path,"utf8");}

assert.equal(git(["rev-parse",BASE_HEAD+"^{tree}"]),BASE_TREE,"base_tree_drift");
assert.equal(git(["merge-base",BASE_HEAD,"HEAD"]),BASE_HEAD,"base_not_ancestor");
const scope=git(["diff","--name-status",BASE_HEAD,"HEAD"]).split("\n")
  .filter(Boolean).map(line=>{
    const parts=line.split("\t");
    assert.equal(parts.length,2,"scope_shape");
    assert.equal(parts[0],"A","scope_not_add:"+line);
    return parts[1];
  }).sort();
assert.deepEqual(scope,OWNED,"exact_four_add_scope_required");

const planBytes=fs.readFileSync(PLAN_PATH);
assert.equal(gitBlob(planBytes),PLAN_BLOB,"plan_blob_drift");
const plan=JSON.parse(planBytes.toString("utf8"));
assert.equal(plan.schema,"void_buy_void_operator_capability_provenance_plan_v1");
assert.equal(plan.repository,"6ZoSo9/void-node");
assert.equal(plan.base_head,BASE_HEAD);
assert.equal(plan.base_tree,BASE_TREE);
assert.equal(plan.status,"HOLD");
assert.equal(plan.plan_id,PLAN_ID);
const core={...plan}; delete core.plan_id;
assert.equal("voidbvcred1_"+sha256Text(JSON.stringify(stable(core))),
  PLAN_ID,"plan_id_recompute_mismatch");
assert.deepEqual(plan.source_bindings,SOURCE_BINDINGS,"source_bindings_drift");
assert.deepEqual([...plan.future_requirements].sort(),REQUIRED,
  "future_requirements_drift");

for(const [path,expected] of Object.entries(SOURCE_BINDINGS)){
  assert.equal(gitBlob(fs.readFileSync(path)),expected,"source_blob_drift:"+path);
}

assert.deepEqual(
  gitGrepFiles("LoadCredential="+CREDENTIAL_ID+":"),
  [],
  "base_repository_operator_capability_loadcredential_must_be_absent",
);
assert.deepEqual(
  gitGrepFiles(CREDENTIAL_ID),
  ["src/economic/buy_void_operator_local_intent_v1.ts"],
  "base_repository_credential_id_occurrence_set_drift",
);

const consumer=source("src/economic/buy_void_operator_local_intent_v1.ts");
for(const text of [
  'process.env.CREDENTIALS_DIRECTORY',
  'path.isAbsolute(rawDir)',
  'path.resolve(rawDir) !== rawDir',
  'fs.constants.O_NOFOLLOW',
  'fs.constants.O_DIRECTORY',
  'visibleDirectoryBefore.mode & 0o022',
  'visibleBefore.nlink !== 1',
  'visibleBefore.size > MAX_CAPABILITY_FILE_BYTES',
  'visibleBefore.mode & 0o077',
  'before.size > MAX_CAPABILITY_FILE_BYTES',
  'before.mode & 0o077',
  'crypto.timingSafeEqual',
  'const MAX_CAPABILITY_FILE_BYTES = 256',
  '^voidbvo1\\.[A-Za-z0-9_-]{43,128}$',
]) assert.ok(consumer.includes(text),"consumer_contract_missing:"+text);

const installer=source("ops/install-void-node-live-user-service-v1.sh");
assert.equal(installer.includes("LoadCredential="+CREDENTIAL_ID+":"),false,
  "current_service_installer_unexpectedly_provisions_operator_capability");
assert.equal(installer.includes("CREDENTIALS_DIRECTORY"),false,
  "current_service_installer_unexpectedly_sets_credentials_directory");

const hardening=source("docs/operators/buy-void-user-runtime-custody-hardening-v1.md");
for(const text of [
  "source-only drop-in candidate; not installed",
  "NoNewPrivileges=yes",
  "CapabilityBoundingSet=",
  "AmbientCapabilities=",
]) assert.ok(hardening.includes(text),"runtime_hardening_contract_missing:"+text);

const observations=plan.current_observations;
assert.equal(observations.credential_id,CREDENTIAL_ID);
assert.equal(observations.credentials_directory_environment_required,true);
assert.equal(observations.repository_loadcredential_provisioning_present,false);
assert.equal(observations.current_service_installer_loadcredential_present,false);
assert.equal(observations.token_prefix,"voidbvo1.");
assert.equal(observations.token_min_base64url_chars,43);
assert.equal(observations.token_max_base64url_chars,128);
assert.equal(observations.credential_file_max_bytes,256);
assert.equal(observations.credential_file_group_world_permissions_forbidden,true);
assert.equal(observations.credential_file_single_link_required,true);
assert.equal(observations.credential_file_symlink_forbidden,true);
assert.equal(observations.credentials_directory_group_world_writable_forbidden,true);
assert.equal(observations.descriptor_relative_open_required,true);
assert.equal(observations.directory_and_file_generation_revalidation_required,true);

const authority=plan.authority;
assert.equal(authority.source_plan_only,true);
for(const key of [
  "credential_generated","credential_read","credential_installed",
  "service_mutation","operator_principal_authenticated",
  "mounted_operator_route_verified","payment_acceptance","presale_activation",
  "signing","transaction_broadcast","funds_movement",
]) assert.equal(authority[key],false,key);

console.log(MARKER+"_GREEN");
console.log("plan_id="+PLAN_ID);
console.log("source_binding_count="+Object.keys(SOURCE_BINDINGS).length);
console.log("future_requirement_count="+REQUIRED.length);
console.log("base_repository_loadcredential_provisioning_present=false");
console.log("current_service_installer_loadcredential_present=false");
console.log("credential_id_consumer_only_on_base=true");
console.log("credential_token_prefix=voidbvo1.");
console.log("new_generation_exact_payload_chars=43");
console.log("raw_token_in_git_allowed=false");
console.log("raw_token_in_logs_allowed=false");
console.log("credential_generated=false");
console.log("credential_read=false");
console.log("credential_installed=false");
console.log("service_mutation=false");
console.log("operator_principal_authenticated=false");
console.log("payment_acceptance=false");
console.log("presale_activation=false");
console.log("funds_movement=false");
