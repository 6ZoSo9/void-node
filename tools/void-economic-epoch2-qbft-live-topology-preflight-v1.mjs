#!/usr/bin/env node
import crypto from "node:crypto";

export const VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1 =
  "VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1";

export const BESU_IMAGE_V1 =
  "hyperledger/besu@sha256:6f3f21ce533383fcc8db3bce02252b59d5a9e776b72b5a1c8ecd2db011600042";
export const PLUGIN_SHA256_V1 =
  "6637c57b64666e7761a8e254e7968a60f4a80bef05e070be8e8b934d887d5518";
export const P2P_PORT_V1 = 30313;
export const RPC_PORT_V1 = 18553;

const ROLE_ORDER = Object.freeze(["precision", "nimo", "xiphos"]);
const EXPECTED = Object.freeze({
  precision: Object.freeze({
    hostname: "zoso-Precision-Tower-7810",
    validator_address: "0xf00436d7e27cec6cd24723ee5a78ce24c0ef5863",
    public_key:
      "0x048216236da44fd8fef2e52114d191a7b588537bafc46c70a9c75bb05ee688f806f0d4d619d6c30c533147d3d3c258c6c7b134653d6291f0b71e7462551532a436",
  }),
  nimo: Object.freeze({
    hostname: "Nimo",
    validator_address: "0x02f967953386188397b992c208239d3a25180db6",
    public_key:
      "0x042a748293a1959a5dbabd8e504ae2f09f0e1b3807e6353b1d9114ad581c6ea805419d7e8707576449ad35b12519f209a2d8f160343b3a139fec1665bf2e2c41fe",
  }),
  xiphos: Object.freeze({
    hostname: "Xiphos",
    validator_address: "0x461bf06270d9d28962f7570182c061b828799b66",
    public_key:
      "0x04f4e3b8a08d7f22c88652e000ad5e94fcbe8e883d0dc677fe2e2e676d02fafa79f5e8d6678f52b7641bb57882571931377b5e6694bcc3035cce0ba19d438d6935",
  }),
});

const SHA256=/^[0-9a-f]{64}$/u;
const COMMIT=/^[0-9a-f]{40}$/u;
const IPV4=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u;

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key)=>[key,canonical(value[key])]),
    );
  }
  throw new Error("unsupported canonical value");
}
function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}
function tailscaleIpv4(value) {
  if (typeof value !== "string") return "";
  const m=IPV4.exec(value.trim());
  if(!m) return "";
  const bytes=m.slice(1).map(Number);
  if(bytes.some((x)=>x<0||x>255)) return "";
  const n=((bytes[0]<<24)>>>0)+(bytes[1]<<16)+(bytes[2]<<8)+bytes[3];
  const lo=((100<<24)>>>0)+(64<<16);
  const hi=((100<<24)>>>0)+(127<<16)+(255<<8)+255;
  return n>=lo&&n<=hi?value.trim():"";
}
function enode(publicKey, ip) {
  const key=String(publicKey).toLowerCase().replace(/^0x04/u,"");
  if(!/^[0-9a-f]{128}$/u.test(key)) throw new Error("public key shape invalid");
  return "enode://"+key+"@"+ip+":"+String(P2P_PORT_V1);
}

export function buildVoidEconomicEpoch2QbftLiveTopologyPreflightV1(input) {
  const expectedHead=String(input?.expected_head||"").toLowerCase();
  if(!COMMIT.test(expectedHead)) throw new Error("expected_head_invalid");
  if(!Array.isArray(input?.observations)||input.observations.length!==3) {
    throw new Error("observation_count_invalid");
  }

  const rows=[];
  const reasons=[];
  const addresses=new Set();

  for(let i=0;i<ROLE_ORDER.length;i+=1) {
    const role=ROLE_ORDER[i];
    const expected=EXPECTED[role];
    const source=input.observations[i];
    if(!source||source.role!==role) throw new Error("observation_role_order_invalid:"+role);

    const ip=tailscaleIpv4(source.tailscale_ipv4);
    if(!ip) reasons.push(role+":tailscale_ipv4_invalid");
    else if(addresses.has(ip)) reasons.push(role+":tailscale_ipv4_duplicate");
    else addresses.add(ip);

    const keyMode=String(source.nodekey_mode||"");
    const pluginSha=String(source.plugin_sha256||"").toLowerCase();
    const head=String(source.repo_head||"").toLowerCase();

    const checks={
      hostname_exact:source.hostname===expected.hostname,
      user_exact:source.user==="zoso",
      tailscale_ipv4_valid:Boolean(ip),
      nodekey_present:source.nodekey_present===true,
      nodekey_mode_private:keyMode==="400"||keyMode==="600",
      nodekey_content_read:false,
      plugin_present:source.plugin_present===true,
      plugin_sha256_exact:pluginSha===PLUGIN_SHA256_V1,
      docker_reachable:source.docker_reachable===true,
      besu_image_present:source.besu_image_present===true,
      p2p_port_vacant:source.p2p_port_vacant===true,
      rpc_port_vacant:source.rpc_port_vacant===true,
      repo_branch_main:source.repo_branch==="main",
      repo_clean:Number(source.repo_dirty_count)===0,
      repo_head_exact:head===expectedHead,
    };

    for(const [key,ok] of Object.entries(checks)) {
      if(!ok) reasons.push(role+":"+key);
    }

    rows.push(Object.freeze({
      role,
      hostname:source.hostname,
      tailscale_ipv4:ip||null,
      validator_address:expected.validator_address,
      besu_public_key:expected.public_key,
      enode:ip?enode(expected.public_key,ip):null,
      repo_head:COMMIT.test(head)?head:null,
      checks:Object.freeze(checks),
    }));
  }

  const ready=reasons.length===0;
  const material={
    marker:VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1,
    version:1,
    expected_head:expectedHead,
    chain_id:2050,
    execution_epoch:2,
    consensus:"QBFT",
    validator_count:3,
    required_quorum:2,
    p2p_port:P2P_PORT_V1,
    precision_loopback_rpc_port:RPC_PORT_V1,
    besu_image:BESU_IMAGE_V1,
    plugin_sha256:PLUGIN_SHA256_V1,
    observations:rows,
    ready_for_private_successor_runtime_plan:ready,
    hold_reasons:reasons,
    authority:{
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
    },
  };
  return Object.freeze({
    ...material,
    topology_preflight_id:
      "voide2qltp1_"+sha256(Buffer.from(canonicalJson(material))),
  });
}

export const VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_EXPECTED_V1=EXPECTED;
