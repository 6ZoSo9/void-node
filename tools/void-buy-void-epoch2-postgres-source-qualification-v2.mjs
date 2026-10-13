#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  verifyCurrentEpoch2ClaimSourceV1,
} from "./void-buy-void-epoch2-postgres-source-qualification-v1.mjs";
import {
  EVIDENCE_ID_SHA256,
  EVIDENCE_PATH,
  classifyEpoch2SignerControlPublicEvidenceV1,
} from "./void-buy-void-epoch2-signer-control-public-evidence-v1.mjs";

export const MARKER =
  "VOID_BUY_VOID_EPOCH2_CLAIMED_PG_SOURCE_QUALIFICATION_V2";
export const STATUS =
  "EPOCH2_SOURCE_TUPLE_SIGNER_CONTROL_PROVEN_CREDENTIAL_AND_ACTIVATION_HOLD";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const V1="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v1.json";
const V2="ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json";
const V1_BLOB="2c861c021192c034c98404989cd25b26788cd0f0";
const V2_BLOB="6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1";
const EVIDENCE_BLOB="361aea8767f8b049fafd28663b71b177f38f180d";
const V1_TOOL="tools/void-buy-void-epoch2-postgres-source-qualification-v1.mjs";
const V1_TOOL_BLOB="834f17d99c0351c0f2b10fb024f3ee43afae8a42";
const EVIDENCE_TOOL="tools/void-buy-void-epoch2-signer-control-public-evidence-v1.mjs";
const EVIDENCE_TOOL_BLOB="d0f3c575903a44b9a538f0201257584545077be9";
const FULFILLER="0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a";
const PRESALE="0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce";
const SOURCE_HEAD="5bc76c0c1410f8db2f3e759a94a2a3184ab800de";
const SOURCE_TREE="118fa8680937d88db1e8a83a393408123e01f03c";
const MESSAGE_SHA="0492a0ae6b2a3fcbd18c907dc2a847b7f16be07ac49840a420182342b4017dad";

function git(args){
  return execFileSync("git",["-C",ROOT,...args],{
    encoding:"utf8",timeout:7000,maxBuffer:1_000_000,
    stdio:["ignore","pipe","pipe"],env:{...process.env,GIT_OPTIONAL_LOCKS:"0"},
  }).trim();
}
function blobSha(bytes){
  return crypto.createHash("sha1")
    .update("blob "+String(bytes.length)+"\0")
    .update(bytes).digest("hex");
}
function readExact(relative,expected){
  const absolute=path.join(ROOT,relative);
  const before=fs.lstatSync(absolute);
  if(!before.isFile()||before.isSymbolicLink()||before.size<1||before.size>100_000){
    throw new Error("source_file_shape_invalid:"+relative);
  }
  const bytes=fs.readFileSync(absolute);
  const actual=blobSha(bytes);
  if(actual!==expected||git(["rev-parse","HEAD:"+relative])!==expected){
    throw new Error("reviewed_source_drift:"+relative);
  }
  return bytes;
}
function canonical(v){
  if(v===null||typeof v==="boolean"||typeof v==="string")return JSON.stringify(v);
  if(typeof v==="number"){
    if(!Number.isSafeInteger(v))throw new Error("unsafe_number");
    return String(v);
  }
  if(Array.isArray(v))return"["+v.map(canonical).join(",")+"]";
  if(!v||typeof v!=="object")throw new Error("unsupported_value");
  return"{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical(v[k])).join(",")+"}";
}
function exact(a,b){return canonical(a)===canonical(b);}
function exactFields(o,keys){
  return o&&typeof o==="object"&&!Array.isArray(o)&&
    Object.getPrototypeOf(o)===Object.prototype&&
    JSON.stringify(Object.keys(o).sort())===JSON.stringify([...keys].sort());
}

export function classifyEpoch2ClaimSourceV2(v2,v1,evidence){
  const bad=reason=>Object.freeze({
    ok:false,status:"HOLD",reason,
    signer_offchain_control_proven:false,
    credential_binding_established:false,
    runtime_source_binding_proven:false,
    runtime_or_payment_activation_authorized:false,
    historical_v1_authority_inherited:false,
  });
  if(!exactFields(v2,[
    "marker","version","status","canonical_chain_id","execution_epoch",
    "predecessor_candidate_path","predecessor_candidate_git_blob_sha1",
    "selected_production_target_path","epoch2_presale_contract",
    "epoch2_fulfiller_public_address","candidate_configuration",
    "signer_credential_state","explicit_remaining_gates","authority",
  ]))return bad("candidate_v2_schema_changed");
  if(v2.marker!=="VOID_BUY_VOID_PAYMENT_KEYED_EPOCH2_DORMANT_CANDIDATE_V2"||
     v2.version!==2||
     v2.status!=="EPOCH2_SOURCE_CANDIDATE_SIGNER_CONTROL_PROVEN_CREDENTIAL_AND_ACTIVATION_HOLD"||
     v2.canonical_chain_id!==2050||v2.execution_epoch!==2||
     v2.predecessor_candidate_path!==V1||
     v2.predecessor_candidate_git_blob_sha1!==V1_BLOB||
     v2.selected_production_target_path!==v1.selected_production_target_path||
     v2.epoch2_presale_contract!==PRESALE||
     v2.epoch2_fulfiller_public_address!==FULFILLER){
    return bad("candidate_v2_identity_mismatch");
  }
  if(!exact(v2.candidate_configuration,v1.candidate_configuration)){
    return bad("candidate_runtime_configuration_changed");
  }
  const s=v2.signer_credential_state;
  if(!exactFields(s,[
    "signer_offchain_control_proven","signer_control_evidence_path",
    "signer_control_evidence_id_sha256","signer_control_message_sha256",
    "signer_control_source_head","signer_control_source_tree",
    "systemd_credential_identity_proven","epoch2_credential_binding_evidence_id",
    "legacy_wallet_credential_reuse_authorized","credential_path_selected",
    "private_key_material_read",
  ]))return bad("candidate_signer_state_schema_changed");
  if(s.signer_offchain_control_proven!==true||
     s.signer_control_evidence_path!==EVIDENCE_PATH||
     s.signer_control_evidence_id_sha256!==EVIDENCE_ID_SHA256||
     s.signer_control_message_sha256!==MESSAGE_SHA||
     s.signer_control_source_head!==SOURCE_HEAD||
     s.signer_control_source_tree!==SOURCE_TREE||
     s.systemd_credential_identity_proven!==false||
     s.epoch2_credential_binding_evidence_id!==null||
     s.legacy_wallet_credential_reuse_authorized!==false||
     s.credential_path_selected!==false||
     s.private_key_material_read!==false){
    return bad("candidate_signer_state_invalid");
  }
  const evidenceResult=classifyEpoch2SignerControlPublicEvidenceV1(evidence);
  if(!evidenceResult.ok||
     evidenceResult.evidence_id_sha256!==EVIDENCE_ID_SHA256||
     evidenceResult.signer_address!==FULFILLER){
    return bad("accepted_signer_evidence_invalid");
  }
  if(!exact(v2.authority,v1.authority)||
     v2.authority.candidate_only!==true||
     Object.entries(v2.authority).some(([k,v])=>k!=="candidate_only"&&v!==false)){
    return bad("candidate_authority_changed");
  }
  const expectedGates=v1.explicit_remaining_gates.slice(1);
  if(!exact(v2.explicit_remaining_gates,expectedGates)||
     v2.explicit_remaining_gates.length!==5||
     v2.explicit_remaining_gates.includes(
       "prove_launch_operator_signer_controls_exact_immutable_epoch2_fulfiller"
     )||
     !v2.explicit_remaining_gates.includes(
       "independently_attest_systemd_credential_identity_and_active_signing_capability"
     )){
    return bad("candidate_remaining_gates_invalid");
  }
  return Object.freeze({
    ok:true,status:STATUS,reason:null,
    signer_offchain_control_proven:true,
    credential_binding_established:false,
    runtime_source_binding_proven:false,
    runtime_or_payment_activation_authorized:false,
    historical_v1_authority_inherited:false,
  });
}

export function verifyCurrentEpoch2ClaimSourceV2(){
  const predecessor=verifyCurrentEpoch2ClaimSourceV1();
  if(!predecessor.ok)throw new Error("historical_v1_source_qualification_failed");
  readExact(V1_TOOL,V1_TOOL_BLOB);
  readExact(EVIDENCE_TOOL,EVIDENCE_TOOL_BLOB);
  const v1=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(
    readExact(V1,V1_BLOB)
  ));
  const v2=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(
    readExact(V2,V2_BLOB)
  ));
  const evidence=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(
    readExact(EVIDENCE_PATH,EVIDENCE_BLOB)
  ));
  const result=classifyEpoch2ClaimSourceV2(v2,v1,evidence);
  if(!result.ok)throw new Error(result.reason);
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const out=verifyCurrentEpoch2ClaimSourceV2();
    console.log("marker="+MARKER);
    console.log("status="+out.status);
    console.log("historical_v1_source_qualification_preserved=true");
    console.log("signer_offchain_control_proven=true");
    console.log("signer_control_evidence_id_sha256="+EVIDENCE_ID_SHA256);
    console.log("remaining_gate_count=5");
    console.log("credential_binding_established=false");
    console.log("runtime_source_binding_proven=false");
    console.log("runtime_or_payment_activation_authorized=false");
    console.log("historical_v1_authority_inherited=false");
    console.log("transaction_sign_or_broadcast=false");
    console.log("public_presale_activation=false");
    console.log("funds_movement=false");
  }catch(e){
    console.error("marker="+MARKER+"_HOLD");
    console.error("reason="+String(e?.message||"source_qualification_error"));
    process.exitCode=2;
  }
}
