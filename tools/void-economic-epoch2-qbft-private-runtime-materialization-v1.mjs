#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";

import {
  BESU_IMAGE_V1,
  EXPECTED_GENESIS_SHA256_V1,
  PLUGIN_NAME_V1,
  PLUGIN_SHA256_V1,
  P2P_PORT_V1,
  PRECISION_RPC_PORT_V1,
  VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1,
} from "./void-economic-epoch2-qbft-private-runtime-plan-v1.mjs";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_MATERIALIZATION_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_MATERIALIZATION_V1";

const ROLES=new Set(["precision","nimo","xiphos"]);
const PLAN_ID=/^voide2qprp1_[0-9a-f]{64}$/u;
const SHA256=/^[0-9a-f]{64}$/u;
const ABSOLUTE=/^\//u;
const SAFE_ROLE=/^(?:precision|nimo|xiphos)$/u;
const ENODE=/^enode:\/\/[0-9a-f]{128}@[0-9.]+:30313$/u;

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
function exactKeys(value,keys,label) {
  if(!value||typeof value!=="object"||Array.isArray(value)) {
    throw new Error(label+"_invalid");
  }
  const a=Object.keys(value).sort();
  const b=[...keys].sort();
  if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error(label+"_keys_invalid");
}
function abs(value,label) {
  const text=String(value||"");
  if(!ABSOLUTE.test(text)||text.includes("\0")||text.includes("\n")||text.includes("\r")) {
    throw new Error(label+"_invalid");
  }
  const normalized=path.posix.normalize(text);
  if(normalized!==text) throw new Error(label+"_not_normalized");
  return text;
}
function shArg(value) {
  const text=String(value);
  if(!/^[A-Za-z0-9_./:@,=+*-]+$/u.test(text)) {
    throw new Error("unsafe_exec_argument:"+text);
  }
  return text;
}
function unitExec(args) {
  return args.map(shArg).join(" ");
}

export function validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(plan) {
  if(
    !plan||
    plan.marker!==VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1||
    plan.version!==1||
    plan.status!=="PRIVATE_QBFT_RUNTIME_PLAN_READY_ACTIVATION_HOLD"||
    !PLAN_ID.test(String(plan.plan_id||""))||
    plan.chain?.chain_id!==2050||
    plan.chain?.execution_epoch!==2||
    plan.chain?.consensus!=="QBFT"||
    plan.chain?.validator_count!==3||
    plan.chain?.required_quorum!==2||
    plan.chain?.byzantine_fault_tolerance!==0||
    plan.chain?.genesis?.expected_genesis_sha256!==EXPECTED_GENESIS_SHA256_V1||
    plan.runtime?.besu_image!==BESU_IMAGE_V1||
    plan.runtime?.plugin_name!==PLUGIN_NAME_V1||
    plan.runtime?.plugin_sha256!==PLUGIN_SHA256_V1||
    plan.runtime?.static_nodes_mode!=="explicit_static_nodes_file"||
    plan.runtime?.static_nodes_path_in_container!=="/config/static-nodes.json"||
    plan.runtime?.p2p_port!==P2P_PORT_V1||
    plan.runtime?.precision_loopback_rpc_port!==PRECISION_RPC_PORT_V1||
    plan.runtime?.discovery_enabled!==false||
    plan.runtime?.raw_public_rpc_allowed!==false||
    plan.runtime?.public_activation!==false||
    plan.activation?.authorized!==false||
    plan.activation?.automatic_retry!==false||
    plan.authority?.source_plan_only!==true
  ) {
    throw new Error("private_runtime_plan_contract_mismatch");
  }

  const expectedAuthority={
    source_plan_only:true,
    filesystem_secret_read:false,
    private_key_access:false,
    credential_content_access:false,
    service_installation:false,
    service_start:false,
    docker_mutation:false,
    validator_mutation:false,
    transaction_construction:false,
    transaction_signing:false,
    transaction_submission:false,
    transaction_broadcast:false,
    authoritative_chain2050_write:false,
    token_movement:false,
    funds_movement:false,
    migration_authorized:false,
    public_activation_authorized:false,
  };
  exactKeys(plan.authority,Object.keys(expectedAuthority),"plan_authority");
  for(const [key,value] of Object.entries(expectedAuthority)) {
    if(plan.authority[key]!==value) throw new Error("plan_authority_mismatch:"+key);
  }

  if(!Array.isArray(plan.hosts)||plan.hosts.length!==3) {
    throw new Error("plan_host_count_invalid");
  }
  if(JSON.stringify(plan.hosts.map((x)=>x.role))!==JSON.stringify(["precision","nimo","xiphos"])) {
    throw new Error("plan_role_order_invalid");
  }

  for(const host of plan.hosts) {
    if(
      !ROLES.has(host.role)||
      host.service_name!=="void-economic-epoch2-qbft-validator-v1.service"||
      host.container_name!=="void-e2-qbft-"+host.role+"-v1"||
      host.p2p?.port!==P2P_PORT_V1||
      host.p2p?.discovery_enabled!==false||
      host.p2p?.max_peers!==2||
      host.p2p?.sync_min_peers!==1||
      !Array.isArray(host.peer_enodes)||
      host.peer_enodes.length!==2||
      !host.peer_enodes.every((x)=>ENODE.test(String(x)))||
      host.peer_enodes.includes(host.enode)
    ) {
      throw new Error("plan_host_contract_mismatch:"+String(host.role));
    }
    if(host.role==="precision") {
      if(
        host.rpc?.enabled!==true||
        host.rpc?.loopback_url!=="http://127.0.0.1:18553/"||
        host.rpc?.host_publish!=="127.0.0.1:18553:8545/tcp"
      ) throw new Error("precision_rpc_contract_mismatch");
    } else if(
      host.rpc?.enabled!==false||
      host.rpc?.loopback_url!==null||
      host.rpc?.host_publish!==null
    ) {
      throw new Error(host.role+"_rpc_must_be_disabled");
    }
  }
  return plan;
}

export function renderVoidEconomicEpoch2QbftPrivateRuntimeHostV1(input) {
  const plan=validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(
    input?.plan,
  );
  const role=String(input?.role||"");
  if(!SAFE_ROLE.test(role)) throw new Error("role_invalid");
  const host=plan.hosts.find((x)=>x.role===role);
  if(!host) throw new Error("plan_role_missing");

  const home=abs(input?.home,"home");
  const dockerBin=abs(input?.docker_bin,"docker_bin");
  const uid=Number(input?.uid);
  const gid=Number(input?.gid);
  if(!Number.isSafeInteger(uid)||uid<1) throw new Error("uid_invalid");
  if(!Number.isSafeInteger(gid)||gid<1) throw new Error("gid_invalid");

  const runtimeRoot=
    home+"/.local/share/void/epoch2-qbft-private-runtime-v1/"+role;
  const nodekey=
    home+"/.local/share/void/epoch2-qbft-validator-identity-v1/"+role+"/nodekey";
  const plugin=
    home+"/Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar";
  const genesis=runtimeRoot+"/genesis.json";
  const staticNodes=runtimeRoot+"/static-nodes.json";
  const data=runtimeRoot+"/data";

  const staticNodesText=JSON.stringify(host.peer_enodes,null,2)+"\n";
  const ports=["-p",host.p2p.host_publish];
  if(host.rpc.enabled) ports.push("-p",host.rpc.host_publish);

  const dockerArgs=[
    dockerBin,"run","--rm",
    "--name",host.container_name,
    "--user",String(uid)+":"+String(gid),
    "--entrypoint","/opt/besu/bin/besu",
    "--cap-drop=ALL",
    "--security-opt=no-new-privileges:true",
    "-e","BESU_OPTS=-Dbesu.plugins.dir=/plugins",
    ...ports,
    "-v",nodekey+":/key/nodekey:ro",
    "-v",genesis+":/config/genesis.json:ro",
    "-v",staticNodes+":/config/static-nodes.json:ro",
    "-v",plugin+":/plugins/void-epoch2-raw-transaction-domain-plugin-v1.jar:ro",
    "-v",data+":/data",
    BESU_IMAGE_V1,
    ...host.besu_args,
  ];

  const unit=[
    "[Unit]",
    "Description=VOID Epoch-2 private QBFT validator v1 ("+role+")",
    "After=network-online.target",
    "Wants=network-online.target",
    "",
    "[Service]",
    "Type=simple",
    "ExecStartPre=-"+unitExec([dockerBin,"rm","-f",host.container_name]),
    "ExecStart="+unitExec(dockerArgs),
    "ExecStop=-"+unitExec([dockerBin,"stop","-t","10",host.container_name]),
    "Restart=on-failure",
    "RestartSec=3",
    "TimeoutStartSec=120",
    "TimeoutStopSec=30",
    "NoNewPrivileges=true",
    "UMask=0077",
    "",
    "[Install]",
    "WantedBy=default.target",
    "",
  ].join("\n");

  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_MATERIALIZATION_V1,
    version:1,
    status:"HOST_RUNTIME_MATERIAL_READY_INSTALL_AND_START_HOLD",
    plan_id:plan.plan_id,
    source_head:plan.source_head,
    role,
    hostname:host.hostname,
    runtime_root:runtimeRoot,
    service_name:host.service_name,
    unit_install_path:
      home+"/.config/systemd/user/"+host.service_name,
    docker_bin:dockerBin,
    docker_uid:uid,
    docker_gid:gid,
    files:{
      genesis:{
        path:genesis,
        expected_sha256:EXPECTED_GENESIS_SHA256_V1,
      },
      static_nodes:{
        path:staticNodes,
        sha256:sha256(Buffer.from(staticNodesText)),
        peer_count:2,
      },
      plugin:{
        path:plugin,
        expected_sha256:PLUGIN_SHA256_V1,
      },
      nodekey:{
        path:nodekey,
        content_read_by_materialization:false,
        expected_mode:["400","600"],
      },
      data:{
        path:data,
      },
    },
    p2p:{
      host_publish:host.p2p.host_publish,
      advertised_host:host.p2p.advertised_host,
      port:P2P_PORT_V1,
      discovery_enabled:false,
      static_peer_count:2,
    },
    rpc:host.rpc,
    rendered_unit_sha256:sha256(Buffer.from(unit)),
    activation:{
      authorized:false,
      required_confirmation:plan.activation.required_confirmation,
      fresh_revalidation_required:true,
      service_start:false,
      automatic_retry:false,
    },
    authority:{
      pure_render:true,
      output_write_by_caller:false,
      service_installation:false,
      systemd_reload:false,
      service_enable:false,
      service_start:false,
      docker_mutation:false,
      private_key_access:false,
      credential_content_access:false,
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
    },
  };
  const materializationId=
    "voide2qmat1_"+sha256(Buffer.from(canonicalJson(material)));
  return Object.freeze({
    manifest:Object.freeze({...material,materialization_id:materializationId}),
    static_nodes_json:staticNodesText,
    systemd_unit:unit,
  });
}

export function validateGeneratedMaterializationHashesV1(rendered) {
  if(
    !rendered?.manifest||
    !/^voide2qmat1_[0-9a-f]{64}$/u.test(
      String(rendered.manifest.materialization_id||""),
    )||
    !SHA256.test(rendered.manifest.files?.static_nodes?.sha256||"")||
    !SHA256.test(rendered.manifest.rendered_unit_sha256||"")||
    sha256(Buffer.from(rendered.static_nodes_json))!==
      rendered.manifest.files.static_nodes.sha256||
    sha256(Buffer.from(rendered.systemd_unit))!==
      rendered.manifest.rendered_unit_sha256
  ) {
    throw new Error("generated_materialization_hash_mismatch");
  }
  return true;
}
