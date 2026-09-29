#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1";
export const BESU_IMAGE_V1 =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
export const BESU_RELEASE_COMMIT_V1 =
  "d97cbd61976a52bb109e637196fef9a8ebf2b617";
export const PLUGIN_NAME_V1 =
  "VoidEpoch2RawTransactionDomainPlugin";
export const PLUGIN_SHA256_V1 =
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518";
export const EXPECTED_GENESIS_SHA256_V1 =
  "6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941";
export const STATE_MANIFEST_SHA256_V1 =
  "affe08799c73320c6fc4efe4a91772cc1c64f6a3ff6e75c2698ea87d27e306d9";
export const QBFT_EXTRA_DATA_SHA256_V1 =
  "c4a98142cc09ddc2c2a2036ffe5a59a1f7e06ff4b213a2d09f39d20bb698adee";
export const P2P_PORT_V1 = 30313;
export const PRECISION_RPC_PORT_V1 = 18553;

const ROLE_ORDER=Object.freeze(["precision","nimo","xiphos"]);
const EXPECTED=Object.freeze({
  precision:Object.freeze({
    hostname:"zoso-Precision-Tower-7810",
    validator_address:"0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
    public_key:
      "0x048216236da44fd8fef2e52114d191a7b588537bafc46c70a9c75bb05ee688f806f0d4d619d6c30c533147d3d3c258c6c7b134653d6291f0b71e7462551532a436",
  }),
  nimo:Object.freeze({
    hostname:"Nimo",
    validator_address:"0x02f967953386188397b992c208239d3a25180db6",
    public_key:
      "0x042a748293a1959a5dbabd8e504ae2f09f0e1b3807e6353b1d9114ad581c6ea805419d7e8707576449ad35b12519f209a2d8f160343b3a139fec1665bf2e2c41fe",
  }),
  xiphos:Object.freeze({
    hostname:"Xiphos",
    validator_address:"0x461bf06270d9d28962f7570182c061b828799b66",
    public_key:
      "0x04f4e3b8a08d7f22c88652e000ad5e94fcbe8e883d0dc677fe2e2e676d02fafa79f5e8d6678f52b7641bb57882571931377b5e6694bcc3035cce0ba19d438d6935",
  }),
});

const SHA40=/^[0-9a-f]{40}$/u;
const ID=/^voide2qltp1_[0-9a-f]{64}$/u;
const ENODE=/^enode:\/\/[0-9a-f]{128}@([0-9.]+):30313$/u;
const IPV4=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u;
const REQUIRED_CHECKS=Object.freeze([
  "hostname_exact",
  "user_exact",
  "tailscale_ipv4_valid",
  "nodekey_present",
  "nodekey_mode_private",
  "nodekey_content_not_read",
  "plugin_present",
  "plugin_sha256_exact",
  "docker_reachable",
  "besu_image_present",
  "p2p_port_vacant",
  "rpc_port_vacant",
  "repo_branch_main",
  "repo_clean",
  "repo_head_exact",
]);

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
  const key=publicKey.toLowerCase().replace(/^0x04/u,"");
  return "enode://"+key+"@"+ip+":"+String(P2P_PORT_V1);
}
function exactKeys(value,keys,label) {
  if(!value||typeof value!=="object"||Array.isArray(value)) {
    throw new Error(label+"_invalid");
  }
  const a=Object.keys(value).sort();
  const b=[...keys].sort();
  if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error(label+"_keys_invalid");
}
function sourceArgs(role,ip) {
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
  if(role==="precision") {
    return [
      ...common,
      "--rpc-http-enabled=true",
      "--rpc-http-host=0.0.0.0",
      "--rpc-http-port=8545",
      "--rpc-http-api=ETH,NET,WEB3,QBFT",
      "--host-allowlist=127.0.0.1,localhost",
    ];
  }
  return [...common,"--rpc-http-enabled=false"];
}

export function compileVoidEconomicEpoch2QbftPrivateRuntimePlanV1(input) {
  const receipt=input?.topology_receipt;
  const sourceHead=String(input?.source_head||"").toLowerCase();
  if(!SHA40.test(sourceHead)) throw new Error("source_head_invalid");
  if(!receipt||typeof receipt!=="object"||Array.isArray(receipt)) {
    throw new Error("topology_receipt_invalid");
  }
  if(
    receipt.marker!=="VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1"||
    receipt.version!==1||
    !ID.test(String(receipt.topology_preflight_id||""))||
    receipt.ready_for_private_successor_runtime_plan!==true||
    !Array.isArray(receipt.hold_reasons)||
    receipt.hold_reasons.length!==0||
    receipt.chain_id!==2050||
    receipt.execution_epoch!==2||
    receipt.consensus!=="QBFT"||
    receipt.validator_count!==3||
    receipt.required_quorum!==2||
    receipt.p2p_port!==P2P_PORT_V1||
    receipt.precision_loopback_rpc_port!==PRECISION_RPC_PORT_V1||
    receipt.besu_image!==BESU_IMAGE_V1||
    receipt.plugin_sha256!==PLUGIN_SHA256_V1||
    !SHA40.test(String(receipt.expected_head||""))
  ) {
    throw new Error("topology_receipt_contract_mismatch");
  }
  if(!Array.isArray(receipt.observations)||receipt.observations.length!==3) {
    throw new Error("topology_observation_count_invalid");
  }

  if(
    receipt.observed_by_host!=="zoso-Precision-Tower-7810"||
    receipt.evidence_file_write_performed!==true||
    receipt.expected_besu_image!==BESU_IMAGE_V1||
    receipt.expected_plugin_sha256!==PLUGIN_SHA256_V1
  ) {
    throw new Error("topology_receipt_observer_binding_mismatch");
  }
  const expectedAuthority={
    observation_only:true,
    remote_read_only_commands:true,
    nodekey_content_read:false,
    private_key_access:false,
    service_action:false,
    docker_mutation:false,
    p2p_listener_creation:false,
    rpc_listener_creation:false,
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
  exactKeys(receipt.authority,Object.keys(expectedAuthority),"topology_authority");
  for(const [key,value] of Object.entries(expectedAuthority)) {
    if(receipt.authority[key]!==value) {
      throw new Error("topology_authority_mismatch:"+key);
    }
  }

  const seenIps=new Set();
  const seenEnodes=new Set();
  const hosts=[];

  for(let i=0;i<ROLE_ORDER.length;i+=1) {
    const role=ROLE_ORDER[i];
    const expected=EXPECTED[role];
    const row=receipt.observations[i];
    if(!row||row.role!==role||row.hostname!==expected.hostname) {
      throw new Error("topology_role_identity_mismatch:"+role);
    }
    const ip=tailscaleIpv4(row.tailscale_ipv4);
    if(!ip||seenIps.has(ip)) throw new Error("topology_tailnet_ip_invalid:"+role);
    seenIps.add(ip);

    const expectedEnode=enodeFor(expected.public_key,ip);
    if(row.enode!==expectedEnode||!ENODE.test(row.enode)||seenEnodes.has(row.enode)) {
      throw new Error("topology_enode_invalid:"+role);
    }
    seenEnodes.add(row.enode);

    exactKeys(row.checks,REQUIRED_CHECKS,"topology_checks_"+role);
    for(const key of REQUIRED_CHECKS) {
      if(row.checks[key]!==true) throw new Error("topology_check_not_green:"+role+":"+key);
    }
    if(String(row.repo_head||"")!==receipt.expected_head) {
      throw new Error("topology_repo_head_binding_mismatch:"+role);
    }

    hosts.push({
      role,
      hostname:expected.hostname,
      tailscale_ipv4:ip,
      validator_address:expected.validator_address,
      besu_public_key:expected.public_key,
      enode:expectedEnode,
      peer_enodes:[],
      service_name:"void-economic-epoch2-qbft-validator-v1.service",
      container_name:"void-e2-qbft-"+role+"-v1",
      nodekey_path_relative:
        ".local/share/void/epoch2-qbft-validator-identity-v1/"+role+"/nodekey",
      plugin_path_relative:
        "Downloads/void-epoch2-raw-transaction-domain-plugin-v1.jar",
      runtime_root_relative:
        ".local/share/void/epoch2-qbft-private-runtime-v1/"+role,
      p2p:{
        host_publish:ip+":"+String(P2P_PORT_V1)+":"+String(P2P_PORT_V1)+"/tcp",
        advertised_host:ip,
        container_interface:"0.0.0.0",
        port:P2P_PORT_V1,
        discovery_enabled:false,
        max_peers:2,
        sync_min_peers:1,
      },
      rpc:role==="precision"
        ?{
            enabled:true,
            host_publish:"127.0.0.1:"+String(PRECISION_RPC_PORT_V1)+":8545/tcp",
            loopback_url:"http://127.0.0.1:"+String(PRECISION_RPC_PORT_V1)+"/",
            apis:["ETH","NET","WEB3","QBFT"],
          }
        :{
            enabled:false,
            host_publish:null,
            loopback_url:null,
            apis:[],
          },
      besu_args:sourceArgs(role,ip),
    });
  }

  for(const host of hosts) {
    host.peer_enodes=hosts.filter((x)=>x.role!==host.role).map((x)=>x.enode);
  }

  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1,
    version:1,
    status:"PRIVATE_QBFT_RUNTIME_PLAN_READY_ACTIVATION_HOLD",
    source_head:sourceHead,
    topology:{
      topology_preflight_id:receipt.topology_preflight_id,
      observed_at_utc:receipt.observed_at_utc,
      expected_head:receipt.expected_head,
      tailscale_addresses_source_committed:false,
      private_plan_contains_live_tailnet_addresses:true,
    },
    chain:{
      chain_id:2050,
      execution_epoch:2,
      consensus:"QBFT",
      validator_count:3,
      required_quorum:2,
      byzantine_fault_tolerance:0,
      genesis:{
        builder:"tools/void-economic-epoch2-besu-genesis-builder-v1.mjs",
        builder_confirmation:"buildEpoch2BesuGenesisCandidate",
        state_manifest:
          "public/public-node/evidence/economic-epoch2-client-neutral-state-manifest-v1.json",
        state_manifest_sha256:STATE_MANIFEST_SHA256_V1,
        qbft_extra_data:
          "ops/mainnet0/economic-epoch2-qbft-production-extra-data-v1.json",
        qbft_extra_data_file_sha256:QBFT_EXTRA_DATA_SHA256_V1,
        expected_genesis_sha256:EXPECTED_GENESIS_SHA256_V1,
      },
    },
    runtime:{
      besu_image:BESU_IMAGE_V1,
      besu_release_commit:BESU_RELEASE_COMMIT_V1,
      plugin_name:PLUGIN_NAME_V1,
      plugin_sha256:PLUGIN_SHA256_V1,
      static_nodes_mode:"explicit_static_nodes_file",
      static_nodes_path_in_container:"/config/static-nodes.json",
      p2p_port:P2P_PORT_V1,
      precision_loopback_rpc_port:PRECISION_RPC_PORT_V1,
      discovery_enabled:false,
      raw_public_rpc_allowed:false,
      public_activation:false,
    },
    hosts,
    activation:{
      authorized:false,
      required_confirmation:
        "startPrivateEpoch2QbftSuccessorV1",
      requires_fresh_topology_revalidation:true,
      requires_exact_genesis_rebuild_on_each_host:true,
      requires_exact_plugin_revalidation_on_each_host:true,
      requires_exact_nodekey_public_identity_revalidation_on_each_host:true,
      requires_static_peer_revalidation:true,
      requires_two_of_three_quorum_before_any_transaction_submission:true,
      automatic_retry:false,
    },
    authority:{
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
    },
    next_gate:
      "separate_explicit_operator_authorization_to_materialize_and_start_private_qbft_runtime_after_fresh_revalidation",
  };

  const planId="voide2qprp1_"+sha256(Buffer.from(canonicalJson(material)));
  return Object.freeze({...material,plan_id:planId});
}
