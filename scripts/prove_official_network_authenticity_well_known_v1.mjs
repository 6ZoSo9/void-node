#!/usr/bin/env node
import {createHash,createPublicKey,verify} from "node:crypto";
import {readFile} from "node:fs/promises";
const A=JSON.parse(await readFile("public/.well-known/void-network-authenticity.json","utf8"));
const S=JSON.parse(await readFile("public/.well-known/void-network-authenticity.schema.json","utf8"));
const D=JSON.parse(await readFile("public/.well-known/void-agent-discovery.json","utf8"));
const DS=JSON.parse(await readFile("public/.well-known/void-agent-discovery.schema.json","utf8"));
const R=await readFile("src/ai-agent-discovery-runtime-route-v1.ts","utf8");
const P=JSON.parse(await readFile("config/official-network-authenticity-root-v2-1/official-network-authenticity-root-v2-payload.json","utf8"));
const ROOT=JSON.parse(await readFile("config/official-network-authenticity-root-v2-1/official-network-authenticity-root-v2.json","utf8"));
const PEM=await readFile("config/official-network-authenticity-root-v2-1/official-network-authenticity-root-v2-public.pem","utf8");
const cv=v=>Array.isArray(v)?v.map(cv):(v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,cv(v[k])])):v);
const pb=Buffer.from(`${JSON.stringify(cv(P))}\n`);
const sh=b=>createHash("sha256").update(b).digest("hex");
const falseKeys=["mutation_authority_granted","runtime_authority_granted","service_enablement_granted","wallet_authority_granted","validator_authority_granted","work_credit_authority_granted","buy_void_authority_granted","economic_authority_granted","third_party_network_control_granted"];
const C=[
[A.marker==="VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1","marker"],
[A.protocol==="void-network-authenticity/1","protocol"],
[A.status==="public_verification_available","status"],
[A.network.name==="VOID Mainnet-0"&&A.network.chain_id===2050,"network"],
[A.admission.status==="admitted_unactivated","admission"],
[A.admission.checkpoint_tag==="ckpt-official-network-authenticity-root-public-admission-v2-1-post-merge-exact-green-20260725T144005Z"&&A.admission.checkpoint_commit==="b8e93d1d0b84e917c16a2d5cdfc195fcb6e4e8af","checkpoint"],
[A.verification.key_id==="ed25519:00e7609bf643b41c7cae625c3ae51f5d55c06ec1adba35e8eb80300c64e77a7c"&&A.verification.payload_sha256==="3c3af2b3f7753e03e244c6f2520bcc0501b1b6f1eacea583a9a8e4fe32b8cdf3","root binding"],
[JSON.stringify(A.verification.signed_payload)===JSON.stringify(P),"payload copy"],
[A.verification.public_key_pem===PEM&&A.verification.signature_base64===ROOT.signature_base64,"public evidence copy"],
[sh(pb)==="3c3af2b3f7753e03e244c6f2520bcc0501b1b6f1eacea583a9a8e4fe32b8cdf3","payload digest"],
[A.authority.verification_only===true&&falseKeys.every(k=>A.authority[k]===false),"authority false"],
[A.safety.private_key_present===false&&A.safety.treat_unknown_as==="not_official","safety"],
[D.network_authenticity==="/.well-known/void-network-authenticity.json","discovery link"],
[DS.required.includes("network_authenticity")&&DS.properties.network_authenticity.const==="/.well-known/void-network-authenticity.json","discovery schema"],
[(R.match(/route: "\/\.well-known\/void-network-authenticity\.json"/g)||[]).length===1,"route once"],
[(R.match(/route: "\/\.well-known\/void-network-authenticity\.schema\.json"/g)||[]).length===1,"schema route once"],
[S.properties.status.const==="public_verification_available"&&S.properties.admission.properties.status.const==="admitted_unactivated","schema status"],
[!JSON.stringify(A).includes("BEGIN PRIVATE KEY"),"no private key"]];
const pub=createPublicKey(A.verification.public_key_pem);
const der=pub.export({format:"der",type:"spki"});
C.push([`ed25519:${sh(der)}`==="ed25519:00e7609bf643b41c7cae625c3ae51f5d55c06ec1adba35e8eb80300c64e77a7c","derived key"]);
C.push([verify(null,pb,pub,Buffer.from(A.verification.signature_base64,"base64")),"signature"]);
let f=0; for(const [ok,n] of C){if(ok)console.log(`PASS: ${n}`);else{f++;console.error(`FAIL: ${n}`)}}
if(f){console.error(`HOLD: ${f} check(s) failed`);process.exit(1)}
console.log(`GREEN: VOID_OFFICIAL_NETWORK_AUTHENTICITY_WELL_KNOWN_V1 (${C.length} checks)`);
