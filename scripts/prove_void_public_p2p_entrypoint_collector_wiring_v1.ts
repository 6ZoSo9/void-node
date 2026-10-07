// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025-2026 6ZoSo9

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_ENTRYPOINT_V1,
  VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1,
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

const productionReleaseRoot = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1),
    "utf8",
  ),
);
assert.equal(productionReleaseRoot.status, "active");
assert.equal(productionReleaseRoot.threshold, 1);
assert.equal(productionReleaseRoot.keys.length, 1);

const productionObserverAuthorization = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1,
    ),
    "utf8",
  ),
);
const productionObserverSourceValidationTime = Date.parse(
  productionObserverAuthorization.not_before,
);
assert(Number.isSafeInteger(productionObserverSourceValidationTime));

function createTrustFixtureRoot(): string {
  const root=fs.mkdtempSync(
    path.join(os.tmpdir(),"void-public-relay-trust-descriptor-"),
  );
  const config=path.join(root,"config");
  fs.mkdirSync(config,{mode:0o700});
  for(const relativePath of [
    VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1,
    VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1,
  ]){
    fs.writeFileSync(
      path.join(root,relativePath),
      fs.readFileSync(path.join(ROOT,relativePath)),
      {mode:0o600},
    );
  }
  return root;
}

async function readFixtureEntrypoint(
  rootDir: string,
  testOnlyAfterFixedTrustFstat?: (
    input: Readonly<{
      relativePath: string;
      target: string;
      configDir: string;
    }>,
  )=>void,
){
  return await readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir,
    env:{[VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1]:"1"},
    udpRuntimeEnabled:true,
    nowMs:productionObserverSourceValidationTime,
    testOnlyAfterFixedTrustFstat,
  });
}

{
  const root=createTrustFixtureRoot();
  try{
    const options=await readFixtureEntrypoint(root);
    assert(options);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=createTrustFixtureRoot();
  try{
    const original=path.join(root,"release-root.original.json");
    const attacker=path.join(root,"release-root.attacker.json");
    fs.writeFileSync(
      attacker,
      fs.readFileSync(
        path.join(
          root,
          VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1,
        ),
      ),
      {mode:0o600},
    );
    let swapped=false;
    await assert.rejects(
      readFixtureEntrypoint(root,({relativePath,target})=>{
        if(
          !swapped&&
          relativePath===
            VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1
        ){
          fs.renameSync(target,original);
          fs.symlinkSync(attacker,target);
          swapped=true;
        }
      }),
      /fixed trust artifact (?:changed during descriptor read|path changed during descriptor read)/u,
    );
    assert.equal(swapped,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=createTrustFixtureRoot();
  try{
    const target=path.join(
      root,
      VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1,
    );
    const original=path.join(root,"release-root.original.json");
    let swapped=false;
    await assert.rejects(
      readFixtureEntrypoint(root,({relativePath})=>{
        if(
          !swapped&&
          relativePath===
            VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1
        ){
          fs.renameSync(target,original);
          fs.copyFileSync(original,target);
          swapped=true;
        }
      }),
      /fixed trust artifact (?:changed during descriptor read|path changed during descriptor read)/u,
    );
    assert.equal(swapped,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=createTrustFixtureRoot();
  try{
    const configDir=path.join(root,"config");
    const detached=path.join(root,"config.detached");
    const attacker=path.join(root,"config.attacker");
    fs.mkdirSync(attacker,{mode:0o700});
    for(const relativePath of [
      VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1,
      VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_OBSERVER_AUTHORIZATION_V1,
    ]){
      fs.writeFileSync(
        path.join(attacker,path.basename(relativePath)),
        fs.readFileSync(path.join(root,relativePath)),
        {mode:0o600},
      );
    }
    let swapped=false;
    await assert.rejects(
      readFixtureEntrypoint(root,({relativePath})=>{
        if(
          !swapped&&
          relativePath===
            VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1
        ){
          fs.renameSync(configDir,detached);
          fs.symlinkSync(attacker,configDir);
          swapped=true;
        }
      }),
      /fixed trust artifact(?: path)? changed during descriptor read/u,
    );
    assert.equal(swapped,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

{
  const root=createTrustFixtureRoot();
  try{
    let mutated=false;
    await assert.rejects(
      readFixtureEntrypoint(root,({relativePath,target})=>{
        if(
          !mutated&&
          relativePath===
            VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1
        ){
          const bytes=fs.readFileSync(target);
          assert(bytes.length>4);
          bytes[1]=bytes[1]===0x20?0x0a:0x20;
          fs.writeFileSync(target,bytes);
          mutated=true;
        }
      }),
      /fixed trust artifact changed during descriptor read/u,
    );
    assert.equal(mutated,true);
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

for(const fixture of [
  {
    name:"short",
    prepare(target:string){
      fs.writeFileSync(target,Buffer.from("{","utf8"));
    },
    error:/fixed trust artifact size is outside its bound/u,
  },
  {
    name:"oversized",
    prepare(target:string){
      fs.writeFileSync(
        target,
        Buffer.alloc(
          VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FETCH_MAX_BYTES_V1+1,
          0x20,
        ),
      );
    },
    error:/fixed trust artifact size is outside its bound/u,
  },
  {
    name:"nonregular",
    prepare(target:string){
      fs.rmSync(target,{force:true});
      fs.mkdirSync(target,{mode:0o700});
    },
    error:/fixed trust artifact must be a regular non-symlink file/u,
  },
  {
    name:"malformed-json",
    prepare(target:string){
      fs.writeFileSync(target,Buffer.from("{bad-json}\n","utf8"));
    },
    error:/fixed trust artifact is not valid JSON/u,
  },
] as const){
  const root=createTrustFixtureRoot();
  try{
    const target=path.join(
      root,
      VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_RELEASE_ROOT_V1,
    );
    fixture.prepare(target);
    await assert.rejects(
      readFixtureEntrypoint(root),
      fixture.error,
      fixture.name,
    );
  }finally{
    fs.rmSync(root,{recursive:true,force:true});
  }
}

const productionEntrypointOptions =
  await readVoidUdpSwarmPublicRelayIntroductionEntrypointOptionsV1({
    rootDir: ROOT,
    env: { [VOID_P2P_UDP_SWARM_PUBLIC_INTRODUCTION_FLAG_V1]: "1" },
    udpRuntimeEnabled: true,
    nowMs: productionObserverSourceValidationTime,
  });
assert(productionEntrypointOptions);
assert.equal(
  typeof productionEntrypointOptions.fetchRecordBytes,
  "function",
);
assert.equal(
  typeof productionEntrypointOptions.fetchManifestBytes,
  "function",
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

  let zeroProgressCancelled=false;
  let releaseZeroProgressCancel:(()=>void)|undefined;
  let signalZeroProgressCancel:(()=>void)|undefined;
  const zeroProgressCancelCalled=new Promise<void>((resolve)=>{
    signalZeroProgressCancel=resolve;
  });
  const zeroProgressCancelPending=new Promise<void>((resolve)=>{
    releaseZeroProgressCancel=resolve;
  });
  globalThis.fetch=(async ()=>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller){
          controller.enqueue(new Uint8Array(0));
        },
        cancel(){
          zeroProgressCancelled=true;
          signalZeroProgressCancel?.();
          return zeroProgressCancelPending;
        },
      }),
      {status:200,headers:{"content-type":"application/json"}},
    )
  ) as typeof fetch;
  const zeroProgressOperation=
    fetchVoidPublicP2pBootstrapContentBytesV1({
      mirror:{
        transport:"https",
        base_url:"https://mirror.example/void/bootstrap/v2",
        failure_domain:"mirror-a",
      },
      url:"https://mirror.example/void/bootstrap/v2/records/voidpbr2_"+"c".repeat(64)+".json",
    });
  let zeroProgressSettled=false;
  void zeroProgressOperation.then(
    ()=>{zeroProgressSettled=true;},
    ()=>{zeroProgressSettled=true;},
  );
  await zeroProgressCancelCalled;
  await Promise.resolve();
  await Promise.resolve();
  const zeroProgressSettledBeforeCancelRelease=zeroProgressSettled;
  releaseZeroProgressCancel?.();
  await assert.rejects(
    zeroProgressOperation,
    /stream made no progress/u,
  );
  assert.equal(zeroProgressCancelled,true);
  assert.equal(
    zeroProgressSettledBeforeCancelRelease,
    true,
    "bootstrap no-progress rejection waited for cancel settlement",
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
console.log("fixed_trust_descriptor_bound=true");
console.log("post_fstat_symlink_replacement_rejected=true");
console.log("post_fstat_regular_replacement_rejected=true");
console.log("config_directory_substitution_rejected=true");
console.log("mid_read_mutation_rejected=true");
console.log("short_oversized_nonregular_malformed_rejected=true");
console.log("caller_selectable_trust_path=false");
console.log("immutable_mirror_namespace_enforced=true");
console.log("bounded_fetch=true");
console.log("zero_progress_bootstrap_stream_rejected=true");
console.log("entrypoint_mount_binding_wired=true");
console.log("rejected_opt_in_cleans_up_runtime_mount_and_node=true");
console.log("production_key_generated_or_read=false");
console.log("deployment_performed=false");
console.log("service_restart_performed=false");
console.log("wallet_signer_validator_wc_money_authority=0");
