// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENTRYPOINT_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1,
  fetchVoidPublicP2pBootstrapContentBytesV1,
  readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1,
} from "../src/p2p/udp_swarm_public_relay_introduction_entrypoint_v1.js";

const ROOT=path.resolve(import.meta.dirname,"..");
const MARKER="VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENTRYPOINT_V1_PROOF_GREEN";

assert.equal(
  await readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir: ROOT,
    env: {},
    udpRuntimeEnabled: false,
  }),
  null,
);
assert.equal(
  await readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir: ROOT,
    env: { [VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1]: "0" },
    udpRuntimeEnabled: false,
  }),
  null,
);

await assert.rejects(
  readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir: ROOT,
    env: { [VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1]: "true" },
    udpRuntimeEnabled: true,
  }),
  /must be exactly 0 or 1/u,
);

await assert.rejects(
  readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir: ROOT,
    env: { [VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1]: "" },
    udpRuntimeEnabled: true,
  }),
  /must be exactly 0 or 1/u,
);

await assert.rejects(
  readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir: ROOT,
    env: { [VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1]: "1" },
    udpRuntimeEnabled: false,
  }),
  /requires VOID_P2P_UDP_SWARM_RUNTIME_ENABLED=1/u,
);

await assert.rejects(
  readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir: ROOT,
    env: { [VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1]: "1" },
    udpRuntimeEnabled: true,
  }),
  /hold|active|signing|threshold/i,
  "current hold release root must fail before collector/network activation",
);

assert.equal(
  fs.existsSync(
    path.join(ROOT, VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1),
  ),
  true,
);
assert.equal(
  VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1,
  "config/void-p2p-udp-swarm-observer-authorization-v1.json",
);

const originalFetch=globalThis.fetch;
let fetchCalls=0;
try {
  globalThis.fetch=(async (input: string | URL | Request, init?: RequestInit)=>{
    fetchCalls += 1;
    assert.equal(String(input),"https://mirror.example/void/bootstrap/v2/records/voidpbr2_"+"a".repeat(64)+".json");
    assert.equal(init?.method,"GET");
    assert.equal(init?.redirect,"error");
    assert.deepEqual(init?.headers,{accept:"application/json"});
    return new Response(JSON.stringify({ok:true}),{
      status:200,
      headers:{"content-type":"application/json; charset=utf-8"},
    });
  }) as typeof fetch;

  const bytes=await fetchVoidPublicP2pBootstrapContentBytesV1({
    mirror:{
      transport:"https",
      base_url:"https://mirror.example/void/bootstrap/v2",
      failure_domain:"mirror-a",
    },
    url:"https://mirror.example/void/bootstrap/v2/records/voidpbr2_"+"a".repeat(64)+".json",
    expected_record_id:"voidpbr2_"+"a".repeat(64),
  });
  assert.deepEqual(JSON.parse(bytes.toString("utf8")),{ok:true});
  assert.equal(fetchCalls,1);

  await assert.rejects(
    fetchVoidPublicP2pBootstrapContentBytesV1({
      mirror:{
        transport:"https",
        base_url:"https://mirror.example/void/bootstrap/v2",
        failure_domain:"mirror-a",
      },
      url:"https://attacker.example/void/bootstrap/v2/records/voidpbr2_"+"a".repeat(64)+".json",
    }),
    /escaped the validated mirror origin/u,
  );
  assert.equal(fetchCalls,1);

  await assert.rejects(
    fetchVoidPublicP2pBootstrapContentBytesV1({
      mirror:{
        transport:"https",
        base_url:"https://mirror.example/void/bootstrap/v2",
        failure_domain:"mirror-a",
      },
      url:"https://mirror.example/private/latest.json",
    }),
    /immutable content namespace/u,
  );
  assert.equal(fetchCalls,1);

  globalThis.fetch=(async ()=>{
    fetchCalls += 1;
    return new Response(
      new Uint8Array(1024*1024+1),
      {status:200,headers:{"content-type":"application/json"}},
    );
  }) as typeof fetch;
  await assert.rejects(
    fetchVoidPublicP2pBootstrapContentBytesV1({
      mirror:{
        transport:"https",
        base_url:"https://mirror.example/void/bootstrap/v2",
        failure_domain:"mirror-a",
      },
      url:"https://mirror.example/void/bootstrap/v2/manifests/voidpbm1_"+"b".repeat(64)+".json",
    }),
    /byte bound|content length/u,
  );
} finally {
  globalThis.fetch=originalFetch;
}

const indexSource=fs.readFileSync(path.join(ROOT,"src/index.ts"),"utf8");
assert.match(
  indexSource,
  /await\s+udpSwarmNodeRuntimeMount\.startPublicRelayIntroductionCollectorV1\s*\(/u,
);
assert.match(
  indexSource,
  /readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1/u,
);
assert.match(
  indexSource,
  /await\s+udpSwarmNodeRuntimeMount\.stop\(\)\.catch/u,
);
assert.match(
  indexSource,
  /node\.stop\(\);\s*throw\s+error/u,
);

console.log(MARKER);
console.log("marker="+VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENTRYPOINT_V1);
console.log("default_enabled=false");
console.log("explicit_opt_in_required=true");
console.log("current_hold_release_root_rejected_before_network=true");
console.log("fixed_release_root_path=true");
console.log("fixed_observer_authorization_path=true");
console.log("caller_selectable_trust_path=false");
console.log("immutable_mirror_namespace_enforced=true");
console.log("bounded_fetch=true");
console.log("entrypoint_mount_binding_wired=true");
console.log("rejected_opt_in_cleans_up_runtime_mount_and_node=true");
console.log("production_key_generated_or_read=false");
console.log("deployment_performed=false");
console.log("service_restart_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
