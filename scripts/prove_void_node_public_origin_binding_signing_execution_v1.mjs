#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildUnsignedVoidNodePublicOriginBindingV1,
  unsignedVoidNodePublicOriginBindingBytesV1,
  verifyVoidNodePublicOriginBindingV1,
} from "../tools/lib/void-node-public-origin-binding-v1.mjs";
import {
  requiredVoidNodePublicOriginBindingSigningConfirmationV1,
  signVerifiedVoidNodePublicOriginBindingRequestV1,
} from "../tools/void-node-public-origin-binding-signing-execution-v1.mjs";
import {
  buildVoidNodePublicOriginBindingSigningRequestV1,
} from "../tools/void-node-public-origin-binding-signing-request-v1.mjs";

const ROOT=process.cwd();
const TOOL=path.join(
  ROOT,
  "tools/void-node-public-origin-binding-signing-execution-v1.mjs",
);
const NODE_EVIDENCE=path.join(
  ROOT,
  "public/public-node/evidence/void-node-onion-binding-v1-nimo-verified.json",
);
const work=fs.mkdtempSync(
  path.join(
    os.tmpdir(),
    "void-public-origin-binding-signing-execution-v1-",
  ),
);

function sha256(value){
  return createHash("sha256").update(value).digest("hex");
}

try{
  const {privateKey,publicKey}=generateKeyPairSync("ed25519");
  const publicKeyPem=publicKey
    .export({type:"spki",format:"pem"})
    .toString();
  const fingerprint=sha256(
    publicKey.export({type:"spki",format:"der"}),
  );
  const nodeId=sha256(
    Buffer.from(publicKeyPem,"utf8"),
  ).slice(0,32);
  const now=Date.now();
  const issuedAt=new Date(now-1000).toISOString();
  const expiresAt=new Date(now+86400000).toISOString();
  const origin="https://proof.example";

  const unsigned=
    buildUnsignedVoidNodePublicOriginBindingV1({
      nodeId,
      publicKey,
      origin,
      issuedAt,
      expiresAt,
    });
  unsigned.signature.value=null;
  const payload=
    unsignedVoidNodePublicOriginBindingBytesV1(unsigned);
  const payloadSha=sha256(payload);
  const request={
    request_id:`voidnpobsr1_${"1".repeat(64)}`,
    unsigned_binding:unsigned,
    signing:{
      payload_base64:payload.toString("base64"),
      payload_sha256:payloadSha,
    },
  };
  const verifiedRequest={
    request_id:request.request_id,
    origin,
    node_id:nodeId,
    public_key_fingerprint_sha256:fingerprint,
    payload_sha256:payloadSha,
  };
  const keypair={
    privateKey,
    publicKey,
    pubPEM:publicKeyPem,
    nodeId,
  };

  const completed=
    signVerifiedVoidNodePublicOriginBindingRequestV1({
      request,
      verifiedRequest,
      keypair,
      nowMs:now,
      verifySignedBinding:(binding,options)=>
        verifyVoidNodePublicOriginBindingV1(binding,{
          ...options,
          expectedPublicKeyFingerprintSha256:fingerprint,
        }),
    });

  assert.equal(completed.summary.signature_created,true);
  assert.equal(completed.summary.signature_count,1);
  assert.equal(completed.summary.publication,false);
  assert.equal(completed.summary.route_activation,false);
  assert.equal(completed.summary.runtime_mutation,false);
  assert.equal(completed.summary.work_credit_mutation,false);
  assert.equal(completed.summary.funds_movement,false);
  assert.equal(
    completed.signed_binding.signature.value.length,
    88,
  );
  const verifiedSigned=verifyVoidNodePublicOriginBindingV1(
    completed.signed_binding,
    {
      expectedOrigin:origin,
      expectedNodeId:nodeId,
      expectedPublicKeyFingerprintSha256:fingerprint,
      nowMs:now,
    },
  );
  assert.equal(verifiedSigned.node_id,nodeId);
  assert.equal(
    verifiedSigned.public_key_fingerprint_sha256,
    fingerprint,
  );

  const evidence=JSON.parse(
    fs.readFileSync(NODE_EVIDENCE,"utf8"),
  );
  const productionRequest=
    buildVoidNodePublicOriginBindingSigningRequestV1({
      origin:"https://seed.nullfeed.org",
      node_id:evidence.node.node_id,
      public_key_pem:evidence.node.public_key_pem,
      issued_at:new Date(now-1000).toISOString(),
      expires_at:new Date(now+86400000).toISOString(),
    });
  const requestFile=path.join(work,"request.json");
  fs.writeFileSync(
    requestFile,
    JSON.stringify(productionRequest,null,2)+"\n",
    {mode:0o644},
  );
  const outputFile=path.join(work,"signed.json");
  const missingKey=path.join(work,"missing-node-key.pem");

  const wrongConfirmation=spawnSync(
    process.execPath,
    [
      TOOL,
      "sign",
      "--request",requestFile,
      "--key-file",missingKey,
      "--output",outputFile,
      "--confirmation","wrong",
    ],
    {cwd:ROOT,encoding:"utf8"},
  );
  assert.notEqual(wrongConfirmation.status,0);
  assert.match(
    wrongConfirmation.stderr,
    /exact signing confirmation mismatch/u,
  );
  assert.doesNotMatch(
    wrongConfirmation.stderr,
    /private-key file could not be canonicalized/u,
  );
  assert.equal(fs.existsSync(outputFile),false);

  const correctConfirmation=
    requiredVoidNodePublicOriginBindingSigningConfirmationV1(
      productionRequest,
    );
  const missingKeyRun=spawnSync(
    process.execPath,
    [
      TOOL,
      "sign",
      "--request",requestFile,
      "--key-file",missingKey,
      "--output",outputFile,
      "--confirmation",correctConfirmation,
    ],
    {cwd:ROOT,encoding:"utf8"},
  );
  assert.notEqual(missingKeyRun.status,0);
  assert.match(
    missingKeyRun.stderr,
    /node private-key file could not be canonicalized/u,
  );
  assert.equal(fs.existsSync(outputFile),false);

  fs.writeFileSync(outputFile,"occupied\n",{mode:0o600});
  const occupiedRun=spawnSync(
    process.execPath,
    [
      TOOL,
      "sign",
      "--request",requestFile,
      "--key-file",missingKey,
      "--output",outputFile,
      "--confirmation",correctConfirmation,
    ],
    {cwd:ROOT,encoding:"utf8"},
  );
  assert.notEqual(occupiedRun.status,0);
  assert.match(
    occupiedRun.stderr,
    /refusing to overwrite existing output/u,
  );
  assert.doesNotMatch(
    occupiedRun.stderr,
    /private-key file could not be canonicalized/u,
  );

  const source=fs.readFileSync(TOOL,"utf8");
  assert.equal(source.includes("--keypair-module"),false);
  assert.equal(source.includes("process.env"),false);
  assert.equal(source.includes("BEGIN PRIVATE KEY"),false);
  assert.match(
    source,
    /sign-void-node-public-origin-binding-v1:/u,
  );
  assert.match(
    source,
    /verifyVoidNodePublicOriginBindingSigningRequestV1/u,
  );
  assert.match(
    source,
    /loadExistingVoidNodeKeypairV1/u,
  );
  assert.match(
    source,
    /verifyReviewedVoidNodePublicOriginBindingV1/u,
  );

  console.log(
    "VOID_NODE_PUBLIC_ORIGIN_BINDING_SIGNING_EXECUTION_V1_PROOF_GREEN",
  );
  console.log("ephemeral_signing_success=true");
  console.log("signature_count=1");
  console.log("exact_payload_signed=true");
  console.log("signed_binding_reverified=true");
  console.log("bad_confirmation_before_key_access=true");
  console.log("occupied_output_before_key_access=true");
  console.log("existing_void_node_key_loader_pinned=true");
  console.log("caller_selectable_keypair_module=false");
  console.log("environment_key_path_fallback=false");
  console.log("production_private_key_access=false");
  console.log("production_signature_created=false");
  console.log("publication=false");
  console.log("route_activation=false");
  console.log("service_restart=false");
  console.log("runtime_mutation=false");
  console.log("work_credit_mutation=false");
  console.log("funds_movement=false");
}finally{
  fs.rmSync(work,{recursive:true,force:true});
}
