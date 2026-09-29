#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";

import {
  BESU_IMAGE_V1,
  EXPECTED_GENESIS_SHA256_V1,
  BESU_RELEASE_COMMIT_V1,
  PLUGIN_NAME_V1,
  PLUGIN_SHA256_V1,
  P2P_PORT_V1,
  PRECISION_RPC_PORT_V1,
  QBFT_EXTRA_DATA_SHA256_V1,
  STATE_MANIFEST_SHA256_V1,
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
const SHA40=/^[0-9a-f]{40}$/u;
const IPV4=/^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/u;
const EXPECTED_IDENTITIES=Object.freeze({
  precision:Object.freeze({
    validator_address:"0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
    public_key:
      "0x048216236da44fd8fef2e52114d191a7b588537bafc46c70a9c75bb05ee688f806f0d4d619d6c30c533147d3d3c258c6c7b134653d6291f0b71e7462551532a436",
  }),
  nimo:Object.freeze({
    validator_address:"0x02f967953386188397b992c208239d3a25180db6",
    public_key:
      "0x042a748293a1959a5dbabd8e504ae2f09f0e1b3807e6353b1d9114ad581c6ea805419d7e8707576449ad35b12519f209a2d8f160343b3a139fec1665bf2e2c41fe",
  }),
  xiphos:Object.freeze({
    validator_address:"0x461bf06270d9d28962f7570182c061b828799b66",
    public_key:
      "0x04f4e3b8a08d7f22c88652e000ad5e94fcbe8e883d0dc677fe2e2e676d02fafa79f5e8d6678f52b7641bb57882571931377b5e6694bcc3035cce0ba19d438d6935",
  }),
});

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

function tailscaleIpv4(value) {
  if(typeof value!=="string") return "";
  const m=IPV4.exec(value);
  if(!m) return "";
  const bytes=m.slice(1).map(Number);
  if(bytes.some((x)=>x<0||x>255)) return "";
  const n=((bytes[0]<<24)>>>0)+(bytes[1]<<16)+(bytes[2]<<8)+bytes[3];
  const lo=((100<<24)>>>0)+(64<<16);
  const hi=((100<<24)>>>0)+(127<<16)+(255<<8)+255;
  return n>=lo&&n<=hi?value:"";
}
function enodeFor(publicKey,ip) {
  return "enode://"+
    publicKey.toLowerCase().replace(/^0x04/u,"")+
    "@"+ip+":"+String(P2P_PORT_V1);
}
function expectedBesuArgs(role,ip) {
  const common=[
    "--Xplugins-external-enabled=true",
    "--plugins="+PLUGIN_NAME_V1,
    "--node-private-key-file=/key/nodekey",
    "--genesis-file=/config/genesis.json",
    "--data-path=/data",
    "--network-id=2050",
    "--p2p-enabled=true",
    "--discovery-enabled=false",
    "--static-nodes-file=/config/static-nodes.json",
    "--p2p-host="+ip,
    "--p2p-interface=0.0.0.0",
    "--p2p-port="+String(P2P_PORT_V1),
    "--max-peers=2",
    "--sync-mode=FULL",
    "--sync-min-peers=1",
    "--min-gas-price=0",
    "--tx-pool-enable-balance-check=false",
    "--logging=INFO",
    "--revert-reason-enabled=true",
  ];
  return role==="precision"
    ?[
        ...common,
        "--rpc-http-enabled=true",
        "--rpc-http-host=0.0.0.0",
        "--rpc-http-port=8545",
        "--rpc-http-api=ETH,NET,WEB3,QBFT",
        "--host-allowlist=127.0.0.1,localhost",
      ]
    :[...common,"--rpc-http-enabled=false"];
}

export function validateVoidEconomicEpoch2QbftPrivateRuntimePlanForMaterializationV1(plan) {
  if(!plan||typeof plan!=="object"||Array.isArray(plan)) {
    throw new Error("private_runtime_plan_invalid");
  }
  const planMaterial=structuredClone(plan);
  delete planMaterial.plan_id;
  const expectedPlanId=
    "voide2qprp1_"+sha256(Buffer.from(canonicalJson(planMaterial)));
  if(plan.plan_id!==expectedPlanId) throw new Error("private_runtime_plan_id_mismatch");
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
    !SHA40.test(String(plan.source_head||""))||
    plan.topology?.tailscale_addresses_source_committed!==false||
    plan.topology?.private_plan_contains_live_tailnet_addresses!==true||
    plan.chain?.genesis?.state_manifest_sha256!==STATE_MANIFEST_SHA256_V1||
    plan.chain?.genesis?.qbft_extra_data_file_sha256!==QBFT_EXTRA_DATA_SHA256_V1||
    plan.chain?.genesis?.expected_genesis_sha256!==EXPECTED_GENESIS_SHA256_V1||
    plan.runtime?.besu_image!==BESU_IMAGE_V1||
    plan.runtime?.besu_release_commit!==BESU_RELEASE_COMMIT_V1||
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
    plan.activation?.required_confirmation!=="startPrivateEpoch2QbftSuccessorV1"||
    plan.activation?.requires_fresh_topology_revalidation!==true||
    plan.activation?.requires_exact_genesis_rebuild_on_each_host!==true||
    plan.activation?.requires_exact_plugin_revalidation_on_each_host!==true||
    plan.activation?.requires_exact_nodekey_public_identity_revalidation_on_each_host!==true||
    plan.activation?.requires_static_peer_revalidation!==true||
    plan.activation?.requires_two_of_three_quorum_before_any_transaction_submission!==true||
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
    const expected=EXPECTED_IDENTITIES[host.role];
    const ip=tailscaleIpv4(host.tailscale_ipv4);
    const expectedEnode=
      expected&&ip?enodeFor(expected.public_key,ip):"";
    const expectedArgs=
      expected&&ip?expectedBesuArgs(host.role,ip):[];
    if(
      !ROLES.has(host.role)||
      !expected||
      !ip||
      host.validator_address!==expected.validator_address||
      host.besu_public_key!==expected.public_key||
      host.enode!==expectedEnode||
      host.service_name!=="void-economic-epoch2-qbft-validator-v1.service"||
      host.container_name!=="void-e2-qbft-"+host.role+"-v1"||
      host.nodekey_path_relative!==
        ".local/share/void/epoch2-qbft-validator-identity-v1/"+host.role+"/nodekey"||
      host.plugin_path_relative!==
        "Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar"||
      host.runtime_root_relative!==
        ".local/share/void/epoch2-qbft-private-runtime-v1/"+host.role||
      host.p2p?.host_publish!==ip+":30313:30313/tcp"||
      host.p2p?.advertised_host!==ip||
      host.p2p?.container_interface!=="0.0.0.0"||
      host.p2p?.port!==P2P_PORT_V1||
      host.p2p?.discovery_enabled!==false||
      host.p2p?.max_peers!==2||
      host.p2p?.sync_min_peers!==1||
      !Array.isArray(host.peer_enodes)||
      host.peer_enodes.length!==2||
      !host.peer_enodes.every((x)=>ENODE.test(String(x)))||
      host.peer_enodes.includes(host.enode)||
      JSON.stringify(host.besu_args)!==JSON.stringify(expectedArgs)
    ) {
      throw new Error("plan_host_contract_mismatch:"+String(host.role));
    }
    if(host.role==="precision") {
      if(
        host.rpc?.enabled!==true||
        host.rpc?.loopback_url!=="http://127.0.0.1:18553/"||
        host.rpc?.host_publish!=="127.0.0.1:18553:8545/tcp"||
        JSON.stringify(host.rpc?.apis)!==JSON.stringify(["ETH","NET","WEB3","QBFT"])
      ) throw new Error("precision_rpc_contract_mismatch");
    } else if(
      host.rpc?.enabled!==false||
      host.rpc?.loopback_url!==null||
      host.rpc?.host_publish!==null||
      JSON.stringify(host.rpc?.apis)!==JSON.stringify([])
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
    "Restart=no",
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
      persistent_restart_policy_promoted:false,
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
