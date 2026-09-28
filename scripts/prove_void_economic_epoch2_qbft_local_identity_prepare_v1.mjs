#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";
import {computeAddress, SigningKey} from "ethers";

const ROOT=process.cwd();
const TOOL=path.join(ROOT,"ops/common/void-economic-epoch2-qbft-local-identity-prepare-v1.mjs");
const NODE_ID="1234567890abcdef1234567890abcdef";

function run(args){
  return new Promise((resolve)=>{
    const child=spawn(process.execPath,[TOOL,...args],{
      cwd:ROOT,
      stdio:["ignore","pipe","pipe"],
      env:{...process.env},
    });
    let stdout="";
    let stderr="";
    child.stdout.on("data",(b)=>stdout+=b.toString("utf8"));
    child.stderr.on("data",(b)=>stderr+=b.toString("utf8"));
    child.on("close",(code)=>resolve({code,stdout,stderr}));
  });
}

const server=http.createServer((req,res)=>{
  if(req.method==="GET"&&req.url==="/health"){
    res.writeHead(200,{"content-type":"application/json"});
    res.end(JSON.stringify({ok:true,nodeId:NODE_ID,http:4102,p2p:4702}));
    return;
  }
  res.writeHead(404);
  res.end();
});
await new Promise((resolve)=>server.listen(0,"127.0.0.1",resolve));
const addr=server.address();
assert(addr&&typeof addr==="object");

const temp=fs.mkdtempSync(path.join(os.tmpdir(),"void-qbft-identity-proof-"));
const privateRoot=path.join(temp,"private");
const output=path.join(temp,"public.json");

const ready=await run([
  "--machine-role","xiphos",
  "--node-base",`http://127.0.0.1:${addr.port}/`,
  "--private-root",privateRoot,
  "--output",output,
]);

assert.equal(ready.code,0,ready.stderr||ready.stdout);
assert.match(ready.stdout,/VOID_ECONOMIC_EPOCH2_QBFT_LOCAL_IDENTITY_PREPARE_V1_GREEN/);
assert.match(ready.stdout,/node_private_key_stdout=false/);
assert.match(ready.stdout,/besu_node_started=false/);
assert.match(ready.stdout,/production_validator_set_bound=false/);

const keyPath=path.join(privateRoot,"nodekey");
assert.equal(fs.existsSync(keyPath),true);
assert.equal(fs.lstatSync(keyPath).isSymbolicLink(),false);
assert.equal((fs.statSync(keyPath).mode&0o777),0o600);

const key=fs.readFileSync(keyPath,"utf8").trim();
assert.match(key,/^[0-9a-f]{64}$/);
assert.equal(ready.stdout.includes(key),false);

const signingKey=new SigningKey("0x"+key);
const publicKey=signingKey.publicKey.toLowerCase();
const validatorAddress=computeAddress(publicKey).toLowerCase();

const publicValue=JSON.parse(fs.readFileSync(output,"utf8"));
assert.equal(publicValue.marker,"VOID_ECONOMIC_EPOCH2_QBFT_NODE_IDENTITY_PUBLIC_ATTESTATION_V1");
assert.equal(publicValue.status,"PUBLIC_IDENTITY_DERIVATION_GREEN_UNBOUND");
assert.equal(publicValue.machine_role,"xiphos");
assert.equal(publicValue.void_node_id,NODE_ID);
assert.equal(publicValue.besu.client,"Besu");
assert.equal(publicValue.besu.client_version,"26.8.1");
assert.equal(publicValue.besu.public_key,publicKey);
assert.equal(publicValue.besu.validator_address,validatorAddress);
assert.equal(publicValue.besu.public_key_address_derivation_verified,true);
assert.equal(publicValue.local_private_attestation.private_key_content_exported,false);
assert.equal(publicValue.local_private_attestation.private_key_content_recorded_in_repo,false);
assert.equal(publicValue.authority.besu_node_started,false);
assert.equal(publicValue.authority.production_validator_set_bound,false);
assert.equal(publicValue.authority.validator_mutation,false);
assert.equal(publicValue.authority.authoritative_chain2050_write,false);
assert.equal(publicValue.authority.funds_movement,false);
assert.equal(publicValue.authority.migration_authorized,false);
assert.equal(publicValue.authority.public_activation,false);

const localPath=path.join(
  privateRoot,
  publicValue.local_private_attestation.filename,
);
assert.equal(fs.existsSync(localPath),true);
const localBytes=fs.readFileSync(localPath);
const localSha=(await import("node:crypto")).createHash("sha256").update(localBytes).digest("hex");
assert.equal(localSha,publicValue.local_private_attestation.file_sha256);
assert.equal(localBytes.toString("utf8").includes(key),false);

const invalid=await run([
  "--machine-role","xiphos",
  "--node-base","http://10.0.0.2:4102/",
  "--private-root",path.join(temp,"bad-private"),
  "--output",path.join(temp,"bad.json"),
]);
assert.notEqual(invalid.code,0);
assert.match(invalid.stderr,/node_base_must_be_loopback_http/);

const source=fs.readFileSync(TOOL,"utf8");
for(const forbidden of [
  "eth_sendRawTransaction",
  "eth_sendTransaction",
  "systemctl",
  "child_process.exec(",
  "ssh ",
  "scp ",
  "transaction_signing",
  "authoritative_chain2050_write:true",
  "public_activation:true",
]){
  assert.equal(source.includes(forbidden),false,forbidden);
}

await new Promise((resolve)=>server.close(resolve));
fs.rmSync(temp,{recursive:true,force:true});

console.log("VOID_ECONOMIC_EPOCH2_QBFT_LOCAL_IDENTITY_PREPARE_V1_PROOF_GREEN");
console.log("loopback_health_node_id_bound=true");
console.log("secp256k1_node_key_local_only=true");
console.log("besu_public_key_address_derivation_verified=true");
console.log("private_key_stdout=false");
console.log("private_key_repo_write=false");
console.log("besu_node_started=false");
console.log("production_validator_set_bound=false");
console.log("validator_mutation=false");
console.log("chain2050_write=false");
console.log("migration_authorized=false");
console.log("public_activation=false");
