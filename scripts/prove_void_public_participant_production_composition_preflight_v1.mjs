#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createVoidPublicParticipantSessionStateFileV1,
  isVoidPublicParticipantSessionStateFileStoreV1,
} from "../ops/public/void-public-participant-session-state-file-v1.mjs";
import {
  createVoidPublicParticipantSessionHttpV1,
} from "../ops/public/void-public-participant-session-http-v1.mjs";
import {
  createVoidPublicParticipantAccountReadHttpEdgeV1,
} from "../ops/public/void-public-participant-account-read-http-edge-v1.mjs";
import {
  VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_AUTHORITY_V1,
  VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1,
  VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V1,
  buildVoidPublicParticipantProductionCompositionPreflightV1,
} from "../tools/void-public-participant-production-composition-preflight-v1.mjs";

const temp=fs.mkdtempSync(
  path.join(os.tmpdir(),"void-participant-production-composition-preflight-"),
);
fs.chmodSync(temp,0o700);

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fingerprint(publicKey){
  return sha256(publicKey.export({type:"spki",format:"der"}));
}

function roleAdmission(subject){
  return Object.freeze({
    schema:"void.participant-role-authority-admission.v1",
    chain_id:2050,
    identity_id:subject.identity_id,
    account_id:subject.account_id,
    role:"AGENT",
    subject_binding_sha256:"11".repeat(32),
    authority_policy_sha256:"22".repeat(32),
    role_authority_generation:"7",
    role_record_sha256:"33".repeat(32),
    role_registry_binding_descriptor_sha256:"44".repeat(32),
  });
}

const login=crypto.generateKeyPairSync("ed25519");
const account="participant-a";
const registryDir=path.join(temp,"registry");
const stateDir=path.join(temp,"state");
fs.mkdirSync(registryDir,{mode:0o700});
fs.mkdirSync(stateDir,{mode:0o700});
const registryFile=path.join(registryDir,"participant-login-bindings-v1.json");
const stateFile=path.join(stateDir,"participant-session-state-v1.json");

fs.writeFileSync(
  registryFile,
  JSON.stringify({
    marker:"VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
    version:1,
    bindings:[{
      account,
      status:"active",
      key_type:"ed25519",
      public_key_pem:String(
        login.publicKey.export({type:"spki",format:"pem"}),
      ),
      public_key_fingerprint_sha256:fingerprint(login.publicKey),
      capabilities:["participant.account.read.v1"],
    }],
  },null,2)+"\n",
  {mode:0o600},
);
fs.chmodSync(registryFile,0o600);

const roleAuthority=Object.freeze({
  marker:"VOID_PARTICIPANT_ROLE_AUTHORITY_SESSION_ADAPTER_V1",
  chain_id:2050,
  required_role:"AGENT",
  wallet_private_key_access:false,
  signing_authority:false,
  work_credit_mutation_authority:false,
  validator_mutation_authority:false,
  chain2050_write_authority:false,
  money_movement_authority:false,
  admit(subject){
    return Object.freeze({ok:true,admission:roleAdmission(subject)});
  },
  revalidate(admission){
    return Object.freeze({
      ok:true,
      context:Object.freeze({
        identity_id:admission.identity_id,
        account_id:admission.account_id,
        role:"AGENT",
        subject_binding_sha256:admission.subject_binding_sha256,
        role_authority_generation:admission.role_authority_generation,
        role_record_sha256:admission.role_record_sha256,
      }),
    });
  },
});

try{
  assert.throws(
    ()=>createVoidPublicParticipantSessionHttpV1({
      bindingRegistryFile:registryFile,
      roleAuthority,
    }),
    /durable_state_store_required/u,
    "production session HTTP accepted memory-only state",
  );

  const store=createVoidPublicParticipantSessionStateFileV1({stateFile});
  assert.equal(store.durable,true);
  assert.equal(store.bearer_token_persisted,false);
  assert.equal(store.wallet_private_key_access,false);
  assert.equal(store.signing_authority,false);
  assert.equal(store.transaction_authority,false);
  assert.equal(store.work_credit_mutation_authority,false);
  assert.equal(store.validator_mutation_authority,false);
  assert.equal(store.chain2050_write_authority,false);
  assert.equal(store.money_movement_authority,false);
  assert.equal(isVoidPublicParticipantSessionStateFileStoreV1(store),true);

  const forgedStore=Object.freeze({...store});
  assert.equal(isVoidPublicParticipantSessionStateFileStoreV1(forgedStore),false);
  assert.throws(
    ()=>createVoidPublicParticipantSessionHttpV1({
      bindingRegistryFile:registryFile,
      roleAuthority,
      stateStore:forgedStore,
      now:()=>1_800_000_000_000,
      randomBytes:(size)=>Buffer.alloc(size,7),
    }),
    /durable_state_store_required/u,
    "production composition accepted forged durable store",
  );

  const sessionHttp=createVoidPublicParticipantSessionHttpV1({
    bindingRegistryFile:registryFile,
    roleAuthority,
    stateStore:store,
    now:()=>1_800_000_000_000,
    randomBytes:(size)=>Buffer.alloc(size,7),
  });
  assert.equal(sessionHttp.role_authority_required,true);
  assert.equal(sessionHttp.state_store_durable,true);
  assert.equal(sessionHttp.authority.production_route_mounted,false);

  const sessionStatus=await sessionHttp.handle({
    url:"/__void/participant/session/v1/status.json",
    method:"GET",
    headers:{},
    body:null,
  });
  assert.equal(sessionStatus.status,200);
  assert.equal(sessionStatus.body.role_authority_required,true);
  assert.equal(sessionStatus.body.required_role,"AGENT");
  assert.equal(sessionStatus.body.durable_state_store,true);
  assert.equal(
    sessionStatus.body.durable_state_store_required_for_production,
    true,
  );
  assert.equal(sessionStatus.body.production_route_mounted,false);
  assert.equal(sessionStatus.body.signing_authority,false);
  assert.equal(sessionStatus.body.money_movement_authority,false);

  const accountEdge=createVoidPublicParticipantAccountReadHttpEdgeV1({
    sessionHttp,
    sourceBase:"http://127.0.0.1:4100",
    fetchImpl:async()=>{throw new Error("source_fetch_not_expected");},
  });
  assert.equal(
    accountEdge.authority.capability,
    "participant.account.read.v1",
  );
  assert.equal(accountEdge.authority.authorization_forwarded_upstream,false);
  assert.equal(accountEdge.authority.wallet_private_key_access,false);
  assert.equal(accountEdge.authority.wallet_send_authority,false);
  assert.equal(accountEdge.authority.work_credit_mutation_authority,false);
  assert.equal(accountEdge.authority.validator_mutation_authority,false);
  assert.equal(accountEdge.authority.generic_rpc_authority,false);
  assert.equal(accountEdge.authority.transaction_signing,false);
  assert.equal(accountEdge.authority.money_movement_authority,false);
  assert.equal(accountEdge.authority.production_route_mounted,false);

  const edgeStatus=await accountEdge.handle({
    url:"/__void/participant/account-read/v1/status.json",
    method:"GET",
    headers:{},
    body:null,
  });
  assert.equal(edgeStatus.status,200);
  assert.equal(edgeStatus.body.capability,"participant.account.read.v1");
  assert.equal(edgeStatus.body.wallet_mutation_authority,false);
  assert.equal(edgeStatus.body.work_credit_mutation_authority,false);
  assert.equal(edgeStatus.body.money_movement_authority,false);
  assert.equal(edgeStatus.body.production_route_mounted,false);

  const preflight=
    buildVoidPublicParticipantProductionCompositionPreflightV1();
  assert.equal(
    preflight.marker,
    VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1,
  );
  assert.equal(preflight.version,1);
  assert.equal(
    preflight.status,
    "PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_WIRING_HOLD",
  );
  assert.match(preflight.preflight_id,/^voidppcp1_[0-9a-f]{64}$/u);
  assert.match(preflight.repository_head_sha,/^[0-9a-f]{40}$/u);
  assert.match(preflight.repository_tree_sha,/^[0-9a-f]{40}$/u);
  assert.equal(preflight.capability,"participant.account.read.v1");
  assert.equal(preflight.required_role,"AGENT");
  assert.equal(preflight.chain_id,2050);
  assert.equal(
    preflight.role_binding_id,
    "participant-role-authority-mainnet0-live-v1",
  );
  for(const key of [
    "durable_session_state_contract_bound",
    "read_session_contract_bound",
    "session_http_contract_bound",
    "account_read_projection_contract_bound",
    "account_read_edge_contract_bound",
    "live_role_authority_contract_bound",
    "composition_gateway_contract_bound",
    "composition_activation_default_off",
    "composition_shared_session_instance_bound",
  ]){
    assert.equal(preflight[key],true,key);
  }
  assert.equal(preflight.composition_role_authority_injection_present,false);
  assert.equal(preflight.composition_durable_state_injection_present,false);
  assert.equal(preflight.source_composition_ready,false);
  assert.equal(preflight.production_session_issuance,false);
  assert.equal(preflight.public_session_route_mount_authorized,false);
  assert.equal(preflight.runtime_activation_authorized,false);
  assert.equal(preflight.service_action,false);
  assert.equal(preflight.credential_access,false);
  assert.equal(preflight.private_key_access,false);
  assert.equal(preflight.wallet_or_signer_access,false);
  assert.equal(preflight.transaction_signing,false);
  assert.equal(preflight.transaction_broadcast,false);
  assert.equal(preflight.chain2050_write,false);
  assert.equal(preflight.work_credit_mutation,false);
  assert.equal(preflight.validator_mutation,false);
  assert.equal(preflight.funds_movement,false);
  assert.equal(
    preflight.next_gate,
    "wire_live_role_authority_and_durable_state_store_into_composition",
  );

  assert.equal(
    Object.keys(
      VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V1,
    ).length,
    10,
  );
  for(const sha of Object.values(
    VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_SOURCE_BLOBS_V1,
  )){
    assert.match(sha,/^[0-9a-f]{40}$/u);
  }

  for(const [key,value] of Object.entries(
    VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_AUTHORITY_V1,
  )){
    const allowed=new Set([
      "source_only_preflight",
      "git_repository_identity_read",
      "exact_head_source_blob_binding",
      "reviewed_git_executable_required",
      "minimal_git_environment_required",
      "git_override_state_ignored",
      "captured_commit_source_reads_required",
      "git_identity_revalidated",
      "durable_session_contract_review",
      "role_authority_contract_review",
      "participant_http_contract_review",
      "account_read_contract_review",
      "composition_gateway_contract_review",
    ]);
    assert.equal(value,allowed.has(key),key);
  }


  const hostileGitDir=path.join(temp,"hostile-git-env");
  fs.mkdirSync(hostileGitDir,{mode:0o700});
  const fakeGit=path.join(hostileGitDir,"git");
  const sentinel=path.join(hostileGitDir,"sentinel");
  const fsmonitor=path.join(hostileGitDir,"fsmonitor.sh");
  const globalConfig=path.join(hostileGitDir,"gitconfig");
  fs.writeFileSync(
    fakeGit,
    "#!/bin/sh\\nprintf '%s\\n' fake-git > "+JSON.stringify(sentinel)+"\\nexit 91\\n",
    {mode:0o700},
  );
  fs.writeFileSync(
    fsmonitor,
    "#!/bin/sh\\nprintf '%s\\n' fsmonitor >> "+JSON.stringify(sentinel)+"\\nexit 91\\n",
    {mode:0o700},
  );
  fs.writeFileSync(
    globalConfig,
    "[core]\\n  fsmonitor = "+fsmonitor+"\\n",
    {mode:0o600},
  );
  const hostileRun=spawnSync(
    process.execPath,
    ["tools/void-public-participant-production-composition-preflight-v1.mjs"],
    {
      cwd:process.cwd(),
      encoding:"utf8",
      stdio:["ignore","pipe","pipe"],
      env:{
        ...process.env,
        PATH:hostileGitDir,
        HOME:hostileGitDir,
        XDG_CONFIG_HOME:hostileGitDir,
        GIT_DIR:path.join(hostileGitDir,"not-a-repository"),
        GIT_WORK_TREE:hostileGitDir,
        GIT_COMMON_DIR:path.join(hostileGitDir,"common"),
        GIT_INDEX_FILE:path.join(hostileGitDir,"index"),
        GIT_OBJECT_DIRECTORY:path.join(hostileGitDir,"objects"),
        GIT_ALTERNATE_OBJECT_DIRECTORIES:path.join(hostileGitDir,"alternate"),
        GIT_NAMESPACE:"hostile",
        GIT_REPLACE_REF_BASE:"refs/hostile/",
        GIT_EXEC_PATH:hostileGitDir,
        GIT_EXTERNAL_DIFF:fsmonitor,
        GIT_PAGER:fsmonitor,
        GIT_EDITOR:fsmonitor,
        GIT_SEQUENCE_EDITOR:fsmonitor,
        GIT_ASKPASS:fsmonitor,
        SSH_ASKPASS:fsmonitor,
        GIT_CONFIG_GLOBAL:globalConfig,
        GIT_CONFIG_SYSTEM:globalConfig,
        GIT_CONFIG_COUNT:"1",
        GIT_CONFIG_KEY_0:"core.fsmonitor",
        GIT_CONFIG_VALUE_0:fsmonitor,
        GIT_NO_REPLACE_OBJECTS:"0",
      },
      timeout:60_000,
      maxBuffer:4*1024*1024,
    },
  );
  assert.equal(
    hostileRun.status,
    0,
    "hostile Git environment changed preflight execution: "+hostileRun.stderr,
  );
  assert.match(
    hostileRun.stdout,
    new RegExp("preflight_id="+preflight.preflight_id+"(?:\\\\n|$)","u"),
    "hostile Git environment changed preflight identity",
  );
  assert.equal(
    fs.existsSync(sentinel),
    false,
    "ambient Git executable/config hook was executed",
  );

  const gateway=fs.readFileSync(
    "ops/public/void-public-app-composition-gateway-v1.mjs",
    "utf8",
  );
  assert.match(
    gateway,
    /VOID_PUBLIC_PARTICIPANT_COMPOSITION_ACTIVE === "1"/u,
  );
  assert.match(
    gateway,
    /createVoidPublicParticipantSessionHttpV1\(\{\s*bindingRegistryFile:/u,
  );
  assert.doesNotMatch(
    gateway,
    /createVoidPublicParticipantSessionHttpV1\(\{[\s\S]{0,300}\broleAuthority\s*:/u,
  );
  assert.doesNotMatch(
    gateway,
    /createVoidPublicParticipantSessionHttpV1\(\{[\s\S]{0,300}\bstateStore\s*:/u,
  );

  const tool=fs.readFileSync(
    "tools/void-public-participant-production-composition-preflight-v1.mjs",
    "utf8",
  );
  for(const forbidden of [
    "createServer(",
    "listen(",
    "fetch(",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "new Wallet(",
    "systemctl",
    "writeFileSync",
    "appendFileSync",
    "renameSync",
  ]){
    assert.equal(tool.includes(forbidden),false,forbidden);
  }
  assert.equal(
    tool.includes(
      'import "../ops/public/void-public-app-composition-gateway-v1.mjs"',
    ),
    false,
  );

  console.log(
    "VOID_PUBLIC_PARTICIPANT_PRODUCTION_COMPOSITION_PREFLIGHT_V1_PROOF_GREEN",
  );
  console.log("session_http_memory_state_rejected=true");
  console.log("forged_durable_store_shape_rejected=true");
  console.log("reviewed_durable_store_factory_identity_required=true");
  console.log("reviewed_git_executable_required=true");
  console.log("minimal_git_environment_required=true");
  console.log("git_override_state_ignored=true");
  console.log("captured_commit_source_reads_required=true");
  console.log("git_identity_revalidated=true");
  console.log("hostile_git_environment_ignored=true");
  console.log("fake_git_or_fsmonitor_execution=false");
  console.log("merged_durable_session_contract_bound=true");
  console.log("merged_live_role_source_contract_bound=true");
  console.log("hermetic_durable_role_bound_session_http_green=true");
  console.log("account_read_edge_shared_session_contract_green=true");
  console.log("composition_activation_default_off=true");
  console.log("composition_role_authority_injection_present=false");
  console.log("composition_durable_state_injection_present=false");
  console.log("source_composition_ready=false");
  console.log("production_session_issuance=false");
  console.log("public_session_route_mount_authorized=false");
  console.log("runtime_activation_authorized=false");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
