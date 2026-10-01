#!/usr/bin/env node
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1 =
  "VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1";

export const VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_AUTHORITY_V1 =
  Object.freeze({
    source_only_preflight: true,
    git_repository_identity_read: true,
    exact_head_source_blob_binding: true,
    durable_session_contract_review: true,
    role_authority_contract_review: true,
    participant_http_contract_review: true,
    account_read_contract_review: true,
    composition_gateway_contract_review: true,
    production_rpc: false,
    filesystem_state_read: false,
    filesystem_state_write: false,
    listener_creation: false,
    route_mount: false,
    service_action: false,
    credential_access: false,
    private_key_access: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    work_credit_mutation: false,
    validator_mutation: false,
    production_session_issuance: false,
    funds_movement: false,
  });

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const HEX40=/^[0-9a-f]{40}$/u;

export const VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V1 =
  Object.freeze({
    "ops/public/void-public-participant-session-state-file-v1.mjs":
      "d5da8b40963c7d5c7f0c832ba4b9a7b3a2b40621",
    "ops/public/void-public-participant-read-session-v1.mjs":
      "00fea49e1da53975deba78b69f5776537f6899e8",
    "ops/public/void-public-participant-session-http-v1.mjs":
      "ca30f1e55217581ee933a97b51319447a49d0999",
    "ops/public/void-public-participant-account-read-projection-v1.mjs":
      "985ac993f59d9bfc4f0650853f142bfd398b9e18",
    "ops/public/void-public-participant-account-read-http-edge-v1.mjs":
      "583d2e61115916589e30239d1bf5451a525f2996",
    "ops/public/void-public-app-composition-gateway-v1.mjs":
      "caaaebb8da9e21cf9ac1c429865c931400cb0526",
    "tools/chain2050-role-authority-participant-live-binding-preflight-v1.mjs":
      "684584ad738b18903dff4af2b2edb6dd566a9410",
    "src/security/participant_role_authority_session_adapter_v1.ts":
      "ee6323ec1b94794ca10ea6415a605c5f9f6dbddb",
    "src/security/participant_role_authority_guard_v1.ts":
      "5d263d9fd7319f6c536cb6b469d08f7e2a9a41ae",
    "src/security/chain2050_role_authority_live_rpc_binding_v1.ts":
      "f0e2bcac5440542a03ed7b4da7724077fb475a8a",
  });

function fail(code){throw new Error(code);}

function git(args,code){
  try{
    return execFileSync(
      "git",
      ["-C",ROOT,...args],
      {
        encoding:"utf8",
        stdio:["ignore","pipe","ignore"],
        env:{...process.env,GIT_OPTIONAL_LOCKS:"0",GIT_NO_LAZY_FETCH:"1"},
        maxBuffer:16*1024*1024,
      },
    ).trimEnd();
  }catch{
    fail(code);
  }
}

function canonical(value){
  if(value===null||typeof value!=="object") return JSON.stringify(value);
  if(Array.isArray(value)) return "["+value.map(canonical).join(",")+"]";
  return "{"+Object.keys(value).sort().map(
    (key)=>JSON.stringify(key)+":"+canonical(value[key]),
  ).join(",")+"}";
}

function sha256Text(value){
  return crypto.createHash("sha256").update(value,"utf8").digest("hex");
}

function requireCleanReviewedHeadV1(){
  if(
    git(
      ["status","--porcelain=v1","--untracked-files=all"],
      "participant_composition_repository_status_unavailable",
    )!==""
  ){
    fail("participant_composition_repository_not_clean");
  }
  const head=git(["rev-parse","HEAD"],"participant_composition_head_unavailable");
  const tree=git(
    ["rev-parse","HEAD^{tree}"],
    "participant_composition_tree_unavailable",
  );
  if(!HEX40.test(head)||!HEX40.test(tree)){
    fail("participant_composition_repository_identity_invalid");
  }
  const sources=Object.create(null);
  for(const [relativePath,expectedBlob] of Object.entries(
    VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V1,
  )){
    const blob=git(
      ["rev-parse","HEAD:"+relativePath],
      "participant_composition_source_blob_unavailable:"+relativePath,
    );
    if(blob!==expectedBlob){
      fail("participant_composition_source_blob_mismatch:"+relativePath);
    }
    sources[relativePath]=git(
      ["show","HEAD:"+relativePath],
      "participant_composition_source_read_failed:"+relativePath,
    );
  }
  return Object.freeze({
    repository_head_sha:head,
    repository_tree_sha:tree,
    sources:Object.freeze(sources),
  });
}

function requireAll(text,needles,code){
  for(const needle of needles){
    if(!text.includes(needle)) fail(code+":"+needle);
  }
}

function requireNone(text,needles,code){
  for(const needle of needles){
    if(text.includes(needle)) fail(code+":"+needle);
  }
}

function inspectDurableSessionStateV1(text){
  requireAll(text,[
    'marker: "VOID_PUBLIC_PARTICIPANT_SESSION_STATE_STORE_V1"',
    "durable: true",
    "bearer_token_persisted: false",
    "wallet_private_key_access: false",
    "signing_authority: false",
    "transaction_authority: false",
    "work_credit_mutation_authority: false",
    "validator_mutation_authority: false",
    "chain2050_write_authority: false",
    "money_movement_authority: false",
    "atomic_same_directory_replace: true",
    "file_fsync_before_replace: true",
    "directory_fsync_before_ack: true",
    "descriptor_bound_startup_read: true",
    "state_file_nofollow_required: true",
    "parent_dev_inode_custody_retained: true",
    "installed_inode_bound_to_fsynced_descriptor: true",
    "installed_content_revalidated_after_parent_fsync: true",
  ],"participant_composition_durable_state_contract_invalid");
  return true;
}

function inspectReadSessionV1(text){
  requireAll(text,[
    'marker: "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1"',
    'capability: "participant.account.read.v1"',
    "role_authority_supported: true",
    'required_role: "AGENT"',
    "challenge_ttl_ms: 60_000",
    "session_ttl_ms: 15 * 60_000",
    "max_active_challenges: 256",
    "max_active_sessions: 256",
    '"VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1"',
    'typeof raw.admit !== "function"',
    'typeof raw.revalidate !== "function"',
    "wallet_private_key_access: false",
    "signing_authority: false",
    "work_credit_mutation_authority: false",
    "validator_mutation_authority: false",
    "generic_rpc_authority: false",
  ],"participant_composition_read_session_contract_invalid");
  return true;
}

function inspectSessionHttpV1(text){
  requireAll(text,[
    'marker: "VOID_PUBLIC_PARTICIPANT_SESSION_HTTP_V1"',
    'capability: "participant.account.read.v1"',
    "role_authority_required: true",
    'required_role: "AGENT"',
    "durable_state_store_supported: true",
    "durable_state_store_required_for_production: true",
    "cookie_authentication: false",
    "cors_wildcard: false",
    "wallet_private_key_access: false",
    "wallet_send_authority: false",
    "work_credit_mutation_authority: false",
    "validator_mutation_authority: false",
    "generic_rpc_authority: false",
    "money_movement_authority: false",
    "listener_created: false",
    "production_route_mounted: false",
    "roleAuthority,",
    "stateStore,",
    "if (!roleAuthority)",
    "role_authority_adapter_required",
  ],"participant_composition_session_http_contract_invalid");
  return true;
}

function inspectProjectionV1(text){
  requireAll(text,[
    'marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_PROJECTION_V1"',
    'capability: "participant.account.read.v1"',
    'wallet_view: "wallet"',
    'earn_view: "earn"',
    "raw_source_forwarding: false",
    "authorization_forwarded_upstream: false",
    "cookie_forwarding: false",
    "wallet_private_key_access: false",
    "wallet_unlock_authority: false",
    "wallet_send_authority: false",
    "work_credit_mutation_authority: false",
    "validator_mutation_authority: false",
    "generic_rpc_authority: false",
    "transaction_signing: false",
    "money_movement_authority: false",
    "listener_created: false",
    "production_route_mounted: false",
    'parsed.hostname !== "127.0.0.1"',
  ],"participant_composition_projection_contract_invalid");
  return true;
}

function inspectAccountReadEdgeV1(text){
  requireAll(text,[
    'marker: "VOID_PUBLIC_PARTICIPANT_ACCOUNT_READ_HTTP_EDGE_V1"',
    'capability: "participant.account.read.v1"',
    "authorization_forwarded_upstream: false",
    "wallet_private_key_access: false",
    "wallet_send_authority: false",
    "work_credit_mutation_authority: false",
    "validator_mutation_authority: false",
    "generic_rpc_authority: false",
    "transaction_signing: false",
    "money_movement_authority: false",
    "listener_created: false",
    "production_route_mounted: false",
    'typeof sessionHttp.authorizeAccountRead === "function"',
    "sessionHttp.authorizeAccountRead",
    'authority.required_role === "AGENT"',
  ],"participant_composition_account_edge_contract_invalid");
  return true;
}

function inspectRoleAdapterV1(adapter,guard,binding){
  requireAll(adapter,[
    'marker: "VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1"',
    'required_role: "AGENT"',
    "wallet_private_key_access: false",
    "signing_authority: false",
    "work_credit_mutation_authority: false",
    "validator_mutation_authority: false",
    "chain2050_write_authority: false",
    "money_movement_authority: false",
    "admitParticipantRoleAuthorityV1",
    "revalidateParticipantRoleAuthorityV1",
  ],"participant_composition_role_adapter_contract_invalid");
  requireAll(guard,[
    'VOID_PARTICIPANT_ROLE_AUTHORITY_REQUIRED_ROLE =',
    '"AGENT" as const',
    "expectedBindingDescriptorSha256",
    "role_registry_binding_descriptor_sha256",
    "subject_binding_sha256",
    "role_authority_generation",
    "role_record_sha256",
  ],"participant_composition_role_guard_contract_invalid");
  requireAll(binding,[
    '"void.chain2050-role-authority-live-rpc-binding.v1"',
    "binding_descriptor_sha256",
    "createChain2050RoleAuthorityRegistryReadSourceBindingV1",
    "readContractSnapshotV1",
  ],"participant_composition_live_binding_contract_invalid");
  return true;
}

function inspectLivePreflightV1(text){
  requireAll(text,[
    '"VOID_CHAIN2050_ROLE_AUTHORITY_PARTICIPANT_LIVE_BINDING_PREFLIGHT_V1"',
    "chain_id: 2050",
    '"participant-role-authority-mainnet0-live-v1"',
    'confirmation_depth: "12"',
    "read_only_live_rpc_preflight: true",
    "fixed_block_revalidation_required: true",
    "canonical_binding_descriptor_required: true",
    "bound_sovereign_read_required: true",
    "durable_participant_session_state_required_separately: true",
    "public_session_route_mount_authorized: false",
    "runtime_activation_authorized: false",
    "credential_access: false",
    "private_key_access: false",
    "wallet_or_signer_access: false",
    "transaction_signing: false",
    "transaction_broadcast: false",
    "chain2050_write: false",
    "work_credit_mutation: false",
    "validator_mutation: false",
    "service_action: false",
    "funds_action: false",
    '"LIVE_CHAIN_ROLE_AUTHORITY_BOUND_HELD_FOR_DURABLE_SESSION_AND_COMPOSITION_WIRING"',
    "participant_role_source_ready: true",
    "durable_participant_session_state_bound: false",
  ],"participant_composition_live_role_preflight_invalid");
  return true;
}

function inspectGatewayV1(text){
  requireAll(text,[
    '"VOID_PUBLIC_PARTICIPANT_COMPOSITION_INTEGRATION_V1"',
    'process.env.VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE === "1"',
    'process.env.VOID_PUBLIC_PARTICIPANT_BINDING_REGISTRY_FILE || ""',
    "if (PARTICIPANT_COMPOSITION_ACTIVE)",
    "participant composition requires binding registry file",
    "createVoidPublicParticipantSessionHttpV1({",
    "bindingRegistryFile: PARTICIPANT_BINDING_REGISTRY_FILE",
    "createVoidPublicParticipantAccountReadHttpEdgeV1({",
    "sessionHttp: PARTICIPANT_SESSION_HTTP",
    "PARTICIPANT_SESSION_HTTP.handle(request)",
    "PARTICIPANT_ACCOUNT_READ_EDGE.handle(request)",
  ],"participant_composition_gateway_contract_invalid");
  requireNone(text,[
    'process.env.VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE || "1"',
    'VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE = "1"',
  ],"participant_composition_gateway_default_on_forbidden");

  const sessionCall=text.match(
    /createVoidPublicParticipantSessionHttpV1\(\{([\s\S]*?)\}\);/u,
  );
  if(!sessionCall) fail("participant_composition_session_wiring_call_missing");
  const args=sessionCall[1];
  const roleAuthorityInjected=/\broleAuthority\s*:/u.test(args);
  const stateStoreInjected=/\bstateStore\s*:/u.test(args);
  return Object.freeze({
    role_authority_injected:roleAuthorityInjected,
    durable_state_store_injected:stateStoreInjected,
  });
}

export function buildVoidPublicParticipantProductionCompositionPreflightV1(){
  const reviewed=requireCleanReviewedHeadV1();
  const s=reviewed.sources;
  inspectDurableSessionStateV1(
    s["ops/public/void-public-participant-session-state-file-v1.mjs"],
  );
  inspectReadSessionV1(
    s["ops/public/void-public-participant-read-session-v1.mjs"],
  );
  inspectSessionHttpV1(
    s["ops/public/void-public-participant-session-http-v1.mjs"],
  );
  inspectProjectionV1(
    s["ops/public/void-public-participant-account-read-projection-v1.mjs"],
  );
  inspectAccountReadEdgeV1(
    s["ops/public/void-public-participant-account-read-http-edge-v1.mjs"],
  );
  inspectRoleAdapterV1(
    s["src/security/participant_role_authority_session_adapter_v1.ts"],
    s["src/security/participant_role_authority_guard_v1.ts"],
    s["src/security/chain2050_role_authority_live_rpc_binding_v1.ts"],
  );
  inspectLivePreflightV1(
    s["tools/chain2050-role-authority-participant-live-binding-preflight-v1.mjs"],
  );
  const gateway=inspectGatewayV1(
    s["ops/public/void-public-app-composition-gateway-v1.mjs"],
  );

  const sourceReady=
    gateway.role_authority_injected&&gateway.durable_state_store_injected;
  const material=Object.freeze({
    marker:VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1,
    version:1,
    status:sourceReady
      ?"PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BOUND_HOST_LIFECYCLE_HOLD"
      :"PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_WIRING_HOLD",
    repository_head_sha:reviewed.repository_head_sha,
    repository_tree_sha:reviewed.repository_tree_sha,
    reviewed_source_blobs:
      VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V1,
    capability:"participant.account.read.v1",
    required_role:"AGENT",
    chain_id:2050,
    role_binding_id:"participant-role-authority-mainnet0-live-v1",
    durable_session_state_contract_bound:true,
    read_session_contract_bound:true,
    session_http_contract_bound:true,
    account_read_projection_contract_bound:true,
    account_read_edge_contract_bound:true,
    live_role_authority_contract_bound:true,
    composition_gateway_contract_bound:true,
    composition_activation_default_off:true,
    composition_shared_session_instance_bound:true,
    composition_role_authority_injection_present:
      gateway.role_authority_injected,
    composition_durable_state_injection_present:
      gateway.durable_state_store_injected,
    source_composition_ready:sourceReady,
    production_session_issuance:false,
    public_session_route_mount_authorized:false,
    runtime_activation_authorized:false,
    service_action:false,
    credential_access:false,
    private_key_access:false,
    wallet_or_signer_access:false,
    transaction_signing:false,
    transaction_broadcast:false,
    chain2050_write:false,
    work_credit_mutation:false,
    validator_mutation:false,
    funds_movement:false,
    next_gate:sourceReady
      ?"designated_host_participant_composition_configuration_startup_restart_rollback_preflight"
      :"wire_live_role_authority_and_durable_state_store_into_composition",
    authority:VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_AUTHORITY_V1,
  });
  return Object.freeze({
    ...material,
    preflight_id:"voidppcp1_"+sha256Text(canonical(material)),
  });
}

const direct=
  process.argv[1]&&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);

if(direct){
  try{
    const result=buildVoidPublicParticipantProductionCompositionPreflightV1();
    console.log(VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1);
    console.log("status="+result.status);
    console.log("preflight_id="+result.preflight_id);
    console.log(
      "composition_role_authority_injection_present="+
      result.composition_role_authority_injection_present,
    );
    console.log(
      "composition_durable_state_injection_present="+
      result.composition_durable_state_injection_present,
    );
    console.log("source_composition_ready="+result.source_composition_ready);
    console.log("production_session_issuance=false");
    console.log("public_session_route_mount_authorized=false");
    console.log("runtime_activation_authorized=false");
    console.log("next_gate="+result.next_gate);
  }catch(error){
    console.error(
      "VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1_HOLD",
    );
    console.error(error instanceof Error?error.message:String(error));
    process.exitCode=2;
  }
}
