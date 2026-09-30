#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  EXPECTED_GENESIS_SHA256_V1,
  PLUGIN_SHA256_V1,
} from "./void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";
import {
  renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1,
  validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1,
} from "./void-economic-epoch2-qbft-private-runtime-materialization-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1";

const ROLE_ORDER=["precision","nimo","xiphos"];
const MATERIALIZATION_ID=/^voide2qmat1_[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if(value===null||typeof value==="string"||typeof value==="boolean") return value;
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(Array.isArray(value)) return value.map(canonical);
  if(value&&typeof value==="object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported_canonical_value");
}
function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}
function regularFile(file,label,maxBytes) {
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()) throw new Error(label+"_not_regular");
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1||st.size<1||st.size>maxBytes) {
    throw new Error(label+"_size_invalid");
  }
  return st;
}
function readBytes(file,label,maxBytes) {
  regularFile(file,label,maxBytes);
  return fs.readFileSync(file);
}
function readJson(file,label,maxBytes) {
  const raw=readBytes(file,label,maxBytes);
  return {raw,value:JSON.parse(raw.toString("utf8"))};
}

export function verifyVoidEconomicEpoch2QbftPrivateRuntimeBundleSetV1(input) {
  const plan=validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(
    input?.plan,
  );
  const planFileSha256=String(input?.plan_file_sha256||"");
  if(!SHA256.test(planFileSha256)) {
    throw new Error("plan_file_sha256_invalid");
  }
  const bundles=input?.bundles;
  if(!bundles||typeof bundles!=="object"||Array.isArray(bundles)) {
    throw new Error("bundle_set_invalid");
  }
  if(JSON.stringify(Object.keys(bundles).sort())!==
     JSON.stringify([...ROLE_ORDER].sort())) {
    throw new Error("bundle_role_set_invalid");
  }

  const rows=[];
  const seenMaterializationIds=new Set();
  const genesisShas=new Set();
  const planFileShas=new Set();

  for(const role of ROLE_ORDER) {
    const bundle=bundles[role];
    if(!bundle||typeof bundle!=="object") {
      throw new Error("bundle_missing:"+role);
    }
    const manifest=bundle.materialization;
    if(
      manifest?.marker!=="VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_MATERIALIZATION_V1"||
      manifest?.version!==1||
      manifest?.status!=="HOST_RUNTIME_PREPARED_INSTALL_AND_START_HOLD"||
      manifest?.role!==role||
      manifest?.plan_id!==plan.plan_id||
      manifest?.source_head!==plan.source_head||
      !MATERIALIZATION_ID.test(String(manifest?.materialization_id||""))||
      manifest?.activation?.authorized!==false||
      manifest?.activation?.service_start!==false||
      manifest?.activation?.automatic_retry!==false||
      manifest?.authority?.service_installation!==false||
      manifest?.authority?.service_start!==false||
      manifest?.authority?.docker_mutation!==false||
      manifest?.authority?.private_key_access!==false||
      manifest?.authority?.authoritative_chain2050_write!==false||
      manifest?.authority?.funds_movement!==false
    ) {
      throw new Error("bundle_manifest_contract_mismatch:"+role);
    }

    if(seenMaterializationIds.has(manifest.materialization_id)) {
      throw new Error("bundle_materialization_id_duplicate");
    }
    seenMaterializationIds.add(manifest.materialization_id);

    const expectedRendered=
      renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1({
        plan,
        role,
        home:"/home/zoso",
        docker_bin:manifest.docker_bin,
        uid:manifest.docker_runtime?.host_uid,
        gid:manifest.docker_runtime?.host_gid,
      });
    if(
      expectedRendered.manifest.materialization_id!==manifest.materialization_id||
      manifest.docker_runtime?.rootless_required!==true||
      manifest.docker_runtime?.container_uid!==0||
      manifest.docker_runtime?.container_gid!==0||
      manifest.docker_runtime?.docker_host!==
        "unix:///run/user/"+
          String(manifest.docker_runtime?.host_uid)+
          "/docker.sock"||
      expectedRendered.manifest.rendered_unit_sha256!==
        manifest.rendered_unit_sha256||
      expectedRendered.manifest.files.static_nodes.sha256!==
        manifest.files?.static_nodes?.sha256||
      expectedRendered.manifest.runtime_root!==manifest.runtime_root||
      expectedRendered.manifest.unit_install_path!==manifest.unit_install_path
    ) {
      throw new Error("bundle_materialization_rebuild_mismatch:"+role);
    }

    if(
      manifest.prepared_on_host!==manifest.hostname||
      !/^[0-9a-f]{40}$/u.test(String(manifest.prepared_repo_head||""))
    ) {
      throw new Error("bundle_prepare_identity_mismatch:"+role);
    }
    const expectedPreparationAuthority={
      local_output_directory_write:true,
      target_runtime_root_write:false,
      service_unit_installation:false,
      systemd_reload:false,
      service_enable:false,
      service_start:false,
      docker_inspection:true,
      rootless_docker_required:true,
      docker_mutation:false,
      nodekey_metadata_read:true,
      nodekey_content_read:false,
      private_key_access:false,
      transaction_construction:false,
      transaction_signing:false,
      transaction_submission:false,
      transaction_broadcast:false,
      authoritative_chain2050_write:false,
      validator_mutation:false,
      token_movement:false,
      funds_movement:false,
      migration_authorized:false,
      public_activation_authorized:false,
    };
    const observedPreparationAuthority=manifest.preparation_authority;
    if(
      !observedPreparationAuthority||
      JSON.stringify(Object.keys(observedPreparationAuthority).sort())!==
        JSON.stringify(Object.keys(expectedPreparationAuthority).sort())
    ) {
      throw new Error("bundle_preparation_authority_schema_mismatch:"+role);
    }
    for(const [key,value] of Object.entries(expectedPreparationAuthority)) {
      if(observedPreparationAuthority[key]!==value) {
        throw new Error(
          "bundle_preparation_authority_mismatch:"+role+":"+key,
        );
      }
    }

    if(
      manifest.local_checks?.repo_main_clean!==true||
      manifest.local_checks?.plan_source_head_ancestor!==true||
      manifest.local_checks?.nodekey_regular_private_mode!==true||
      manifest.local_checks?.nodekey_content_read!==false||
      manifest.local_checks?.plugin_sha256_exact!==true||
      manifest.local_checks?.besu_image_identity_exact!==true||
      manifest.local_checks?.rootless_docker_verified!==true||
      manifest.local_checks?.rootless_docker_socket_exact!==true||
      manifest.local_checks?.rootless_docker_socket_owner_exact!==true||
      manifest.local_checks?.container_root_maps_to_host_operator_required!==true||
      manifest.local_checks?.p2p_port_vacant!==true||
      manifest.local_checks?.genesis_sha256_exact!==true||
      manifest.local_checks?.static_nodes_sha256_exact!==true||
      manifest.local_checks?.rendered_unit_sha256_exact!==true
    ) {
      throw new Error("bundle_local_checks_not_green:"+role);
    }
    if(
      role==="precision" &&
      manifest.local_checks.precision_rpc_port_vacant!==true
    ) {
      throw new Error("bundle_precision_rpc_check_not_green");
    }
    if(
      role!=="precision" &&
      manifest.local_checks.precision_rpc_port_vacant!==null
    ) {
      throw new Error("bundle_nonprecision_rpc_check_invalid:"+role);
    }

    const genesisSha=sha256(bundle.genesis_raw);
    const staticSha=sha256(bundle.static_nodes_raw);
    const unitSha=sha256(bundle.systemd_unit_raw);

    const genesisEvidence=bundle.genesis_evidence;
    if(
      genesisEvidence?.marker!=="VOID_ECONOMIC_EPOCH2_BESU_GENESIS_BUILDER_V1"||
      genesisEvidence?.status!==
        "BESU_PRODUCTION_GENESIS_CANDIDATE_BUILT_VALIDATOR_RUNTIME_HOLD"||
      genesisEvidence?.genesis_file_sha256!==genesisSha||
      genesisEvidence?.gates?.production_qbft_extra_data_bound_into_genesis!==true||
      genesisEvidence?.gates?.production_validator_set_bound!==false||
      genesisEvidence?.gates?.migration_authorized!==false||
      genesisEvidence?.gates?.public_activation_authorized!==false
    ) {
      throw new Error("bundle_genesis_evidence_mismatch:"+role);
    }

    if(genesisSha!==EXPECTED_GENESIS_SHA256_V1) {
      throw new Error("bundle_genesis_sha_mismatch:"+role);
    }
    if(staticSha!==manifest.files?.static_nodes?.sha256) {
      throw new Error("bundle_static_nodes_sha_mismatch:"+role);
    }
    if(unitSha!==manifest.rendered_unit_sha256) {
      throw new Error("bundle_unit_sha_mismatch:"+role);
    }
    if(manifest.files?.plugin?.expected_sha256!==PLUGIN_SHA256_V1) {
      throw new Error("bundle_plugin_binding_mismatch:"+role);
    }

    const peers=JSON.parse(bundle.static_nodes_raw.toString("utf8"));
    const planHost=plan.hosts.find((x)=>x.role===role);
    if(JSON.stringify(peers)!==JSON.stringify(planHost.peer_enodes)) {
      throw new Error("bundle_static_peer_set_mismatch:"+role);
    }

    if(!SHA256.test(String(manifest.private_plan_file_sha256||""))) {
      throw new Error("bundle_plan_file_sha_invalid:"+role);
    }
    if(manifest.private_plan_file_sha256!==planFileSha256) {
      throw new Error("bundle_plan_file_sha_mismatch:"+role);
    }
    genesisShas.add(genesisSha);
    planFileShas.add(manifest.private_plan_file_sha256);

    rows.push({
      role,
      hostname:manifest.hostname,
      materialization_id:manifest.materialization_id,
      prepared_repo_head:manifest.prepared_repo_head,
      genesis_sha256:genesisSha,
      static_nodes_sha256:staticSha,
      systemd_unit_sha256:unitSha,
      private_plan_file_sha256:manifest.private_plan_file_sha256,
    });
  }

  if(genesisShas.size!==1) throw new Error("bundle_genesis_not_common");
  if(planFileShas.size!==1) throw new Error("bundle_private_plan_bytes_not_common");

  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1,
    version:1,
    status:"THREE_HOST_PREPARED_BUNDLE_SET_GREEN_INSTALL_AND_START_HOLD",
    plan_id:plan.plan_id,
    source_head:plan.source_head,
    validator_count:3,
    required_quorum:2,
    common_genesis_sha256:EXPECTED_GENESIS_SHA256_V1,
    common_private_plan_file_sha256:[...planFileShas][0],
    roles:rows,
    verification:{
      exactly_three_roles:true,
      unique_materialization_ids:true,
      common_genesis_exact:true,
      common_private_plan_bytes_exact:true,
      role_static_peers_exact:true,
      role_systemd_unit_hashes_exact:true,
      all_local_prepare_checks_green:true,
      service_installation:false,
      service_start:false,
      authoritative_chain2050_write:false,
      funds_movement:false,
    },
    next_gate:
      "separate_explicit_operator_authorization_for_installation_of_reviewed_host_bundles",
  };
  return Object.freeze({
    ...material,
    bundle_set_id:
      "voide2qbsv1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export function readVoidEconomicEpoch2PreparedBundleV1(directory) {
  const root=path.resolve(directory);
  const st=fs.lstatSync(root);
  if(st.isSymbolicLink()||!st.isDirectory()) {
    throw new Error("bundle_directory_invalid");
  }
  const names=fs.readdirSync(root).sort();
  const expected=[
    "genesis-evidence.json",
    "genesis.json",
    "materialization.json",
    "static-nodes.json",
    "void-economic-epoch2-qbft-validator-v1.service",
  ].sort();
  if(JSON.stringify(names)!==JSON.stringify(expected)) {
    throw new Error("bundle_file_set_invalid");
  }

  const genesisPath=path.join(root,"genesis.json");
  const staticNodesPath=path.join(root,"static-nodes.json");
  const unitPath=path.join(
    root,
    "void-economic-epoch2-qbft-validator-v1.service",
  );
  const genesis=readBytes(genesisPath,"genesis",8*1024*1024);
  const staticNodes=readBytes(staticNodesPath,"static_nodes",64*1024);
  const unit=readBytes(unitPath,"systemd_unit",128*1024);
  const manifest=readJson(
    path.join(root,"materialization.json"),
    "materialization",
    1024*1024,
  ).value;
  const genesisEvidence=readJson(
    path.join(root,"genesis-evidence.json"),
    "genesis_evidence",
    1024*1024,
  ).value;

  return Object.freeze({
    materialization:manifest,
    genesis_evidence:genesisEvidence,
    genesis_raw:genesis,
    static_nodes_raw:staticNodes,
    systemd_unit_raw:unit,
  });
}
