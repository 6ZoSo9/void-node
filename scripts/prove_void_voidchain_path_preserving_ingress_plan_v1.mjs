#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V1,
  VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1,
  prepareVoidchainPathPreservingIngressPlanV1,
  verifyVoidchainPathPreservingIngressPlanV1,
} from "../tools/void-voidchain-path-preserving-ingress-plan-v1.mjs";

const ROOT=String(spawnSync(
  "/usr/bin/git",
  ["--no-replace-objects","rev-parse","--show-toplevel"],
  {encoding:"utf8",stdio:["ignore","pipe","pipe"]},
).stdout).trim();
const HEAD=String(spawnSync(
  "/usr/bin/git",
  ["--no-replace-objects","rev-parse","HEAD"],
  {cwd:ROOT,encoding:"utf8",stdio:["ignore","pipe","pipe"]},
).stdout).trim();

function sha256(value){
  return crypto.createHash("sha256").update(value).digest("hex");
}

function rejectPrepare(input,pattern){
  assert.throws(
    ()=>prepareVoidchainPathPreservingIngressPlanV1(input),
    pattern,
  );
}

assert.equal(
  VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1,
  "VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1",
);
assert.match(HEAD,/^[0-9a-f]{40}$/u);

const temp=fs.mkdtempSync(
  path.join(os.tmpdir(),"void-voidchain-ingress-plan-"),
);
try{
  fs.chmodSync(temp,0o700);
  const tunnelId="6ff42ae2-765d-4adf-8112-31c55c1551ef";
  const credential=path.join(temp,tunnelId+".json");
  const executedMarker=path.join(temp,"cloudflared-executed.txt");
  const cloudflared=path.join(temp,"cloudflared");
  const output=path.join(temp,"packet");

  fs.writeFileSync(
    credential,
    "THIS_IS_OPAQUE_SECRET_FIXTURE_AND_IS_NOT_JSON\n",
    {mode:0o600},
  );
  fs.chmodSync(credential,0o600);
  fs.writeFileSync(
    cloudflared,
    [
      "#!/bin/sh",
      "printf executed > "+JSON.stringify(executedMarker),
      "exit 91",
      "",
    ].join("\n"),
    {mode:0o755},
  );
  fs.chmodSync(cloudflared,0o755);
  const cloudflaredSha=sha256(fs.readFileSync(cloudflared));

  const request={
    tunnel_id:tunnelId,
    credentials_file:credential,
    cloudflared_path:cloudflared,
    expected_cloudflared_sha256:cloudflaredSha,
    expected_repository_head:HEAD,
    output_dir:output,
  };

  const packet=prepareVoidchainPathPreservingIngressPlanV1(request);
  assert.equal(fs.existsSync(executedMarker),false);
  assert.match(packet.plan_id,/^voidvci1_[0-9a-f]{64}$/u);
  assert.equal(packet.hostname,"voidchain.org");
  assert.equal(packet.public_origin,"https://voidchain.org");
  assert.equal(packet.frontdoor.origin,"http://127.0.0.1:8083");
  assert.equal(packet.frontdoor.upstream_origin,"http://127.0.0.1:8082");
  assert.equal(packet.frontdoor.readiness_bound_to_current_upstream,true);
  assert.equal(packet.frontdoor.loopback_only,true);
  assert.equal(packet.path_contract.hostname,"voidchain.org");
  assert.equal(packet.path_contract.service,"http://127.0.0.1:8083");
  assert.equal(packet.path_contract.cloudflared_path_rule,null);
  assert.equal(packet.path_contract.prefix_strip,false);
  assert.equal(packet.path_contract.path_rewrite,false);
  assert.equal(packet.path_contract.frontdoor_proxy_uses_original_request_url,true);
  assert.equal(packet.path_contract.catch_all_service,"http_status:404");
  assert.equal(packet.path_contract.private_routes_exposed,false);
  assert.equal(packet.precision_recovery_prerequisite.issue,1618);
  assert.equal(
    packet.precision_recovery_prerequisite.independent_live_host_acceptance_required,
    true,
  );
  assert.equal(
    packet.precision_recovery_prerequisite.independent_live_host_acceptance_claimed,
    false,
  );
  assert.equal(packet.credential.content_read,false);
  assert.equal(packet.credential.path,credential);
  assert.equal(packet.cloudflared.path,cloudflared);
  assert.equal(packet.cloudflared.sha256,cloudflaredSha);
  assert.equal(packet.cloudflared.executed,false);
  assert.equal(packet.activation.packet_inert,true);
  for(const key of [
    "install_plan_defined",
    "rollback_plan_defined",
    "services_started",
    "unit_installed",
    "dns_changed",
    "tls_changed",
    "tunnel_started",
    "public_ingress_qualified",
    "external_path_preservation_accepted",
  ]){
    assert.equal(packet.activation[key],false,key);
  }

  const config=fs.readFileSync(
    path.join(output,"cloudflared-config.yml"),
    "utf8",
  );
  assert.equal(
    (config.match(/^  - hostname: voidchain\.org$/gmu)||[]).length,
    1,
  );
  assert.equal(
    (config.match(/^    service: http:\/\/127\.0\.0\.1:8083$/gmu)||[]).length,
    1,
  );
  assert.equal(
    (config.match(/^  - service: http_status:404$/gmu)||[]).length,
    1,
  );
  assert.doesNotMatch(config,/\bpath:/u);
  assert.doesNotMatch(config,/rewrite|stripPrefix|prefix-strip/iu);

  const unit=fs.readFileSync(
    path.join(output,"void-voidchain-ingress-v1.service"),
    "utf8",
  );
  assert.match(unit,/After=network-online\.target void-public-frontdoor-v1\.service/u);
  assert.match(unit,/--no-autoupdate/u);
  assert.match(unit,/tunnel run/u);
  assert.doesNotMatch(unit,/--token/u);
  assert.doesNotMatch(unit,/Environment=.*CREDENTIAL/iu);

  const verified=verifyVoidchainPathPreservingIngressPlanV1({
    packet_dir:output,
  });
  assert.equal(verified.ok,true);
  assert.equal(verified.status,"VOIDCHAIN_INGRESS_PLAN_VERIFIED_INERT");
  assert.equal(verified.plan_id,packet.plan_id);
  assert.equal(verified.path_preserving,true);
  assert.equal(verified.exact_current_source_bound,true);
  assert.equal(verified.cloudflared_executable_bound,true);
  assert.equal(verified.credential_metadata_bound_without_content_read,true);
  assert.equal(
    verified.precision_recovery_independent_acceptance_required,
    true,
  );
  assert.equal(verified.installation_authorized,false);
  assert.equal(verified.ingress_activation_authorized,false);
  assert.equal(verified.independent_public_acceptance,false);
  assert.equal(fs.existsSync(executedMarker),false);

  for(const [key,value] of Object.entries(
    VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_AUTHORITY_V1,
  )){
    const allowed=new Set([
      "source_only_plan",
      "canonical_git_source_binding_required",
      "exact_frontdoor_source_required",
      "path_preservation_required",
      "external_cloudflared_sha256_required",
      "credential_metadata_binding_required",
      "create_only_private_packet_write",
      "precision_recovery_independent_acceptance_required",
    ]);
    assert.equal(value,allowed.has(key),key);
  }

  rejectPrepare(
    {...request,output_dir:path.join(temp,"bad-hash"),expected_cloudflared_sha256:"0".repeat(64)},
    /VOIDCHAIN_INGRESS_CLOUDFLARED_SHA256_MISMATCH/u,
  );
  rejectPrepare(
    {...request,output_dir:path.join(temp,"bad-head"),expected_repository_head:"0".repeat(40)},
    /VOIDCHAIN_INGRESS_REPOSITORY_HEAD_MISMATCH/u,
  );
  rejectPrepare(
    {...request,output_dir:path.join(ROOT,".voidchain-ingress-plan-test")},
    /VOIDCHAIN_INGRESS_OUTPUT_MUST_BE_OUTSIDE_REPOSITORY/u,
  );
  rejectPrepare(
    {...request,output_dir:output},
    /VOIDCHAIN_INGRESS_OUTPUT_ALREADY_EXISTS/u,
  );

  {
    const configPath=path.join(output,"cloudflared-config.yml");
    const original=fs.readFileSync(configPath);
    fs.writeFileSync(
      configPath,
      Buffer.concat([original,Buffer.from("  path: /api/*\n")]),
    );
    assert.throws(
      ()=>verifyVoidchainPathPreservingIngressPlanV1({packet_dir:output}),
      /VOIDCHAIN_INGRESS_PACKET_FILE_CONTENT_MISMATCH:cloudflared-config\.yml/u,
    );
    fs.writeFileSync(configPath,original);
    fs.chmodSync(configPath,0o600);
  }

  {
    const original=fs.readFileSync(credential);
    const originalMode=fs.statSync(credential).mode&0o777;
    fs.chmodSync(credential,0o644);
    assert.throws(
      ()=>verifyVoidchainPathPreservingIngressPlanV1({packet_dir:output}),
      /VOIDCHAIN_INGRESS_CREDENTIAL_MODE_INVALID/u,
    );
    fs.chmodSync(credential,originalMode);
    fs.writeFileSync(credential,original);
  }

  {
    const frontdoor=path.join(ROOT,"ops/public/void-public-frontdoor-v1.mjs");
    const original=fs.readFileSync(frontdoor);
    try{
      fs.appendFileSync(frontdoor,"\n// proof-dirty-source\n");
      rejectPrepare(
        {...request,output_dir:path.join(temp,"dirty-source")},
        /VOIDCHAIN_INGRESS_REPOSITORY_NOT_CLEAN/u,
      );
    }finally{
      fs.writeFileSync(frontdoor,original);
    }
  }

  assert.equal(fs.existsSync(executedMarker),false);

  const source=fs.readFileSync(
    path.join(ROOT,"tools/void-voidchain-path-preserving-ingress-plan-v1.mjs"),
    "utf8",
  );
  for(const forbidden of [
    "fetch(",
    "https.request(",
    "systemctl",
    "tailscale ",
    "cloudflaredPath, [",
    "eth_sendRawTransaction",
    "new Wallet(",
  ]){
    assert.equal(source.includes(forbidden),false,forbidden);
  }
  for(const required of [
    '"voidchain.org"',
    '"http://127.0.0.1:8083"',
    '"http_status:404"',
    'path: req.url || "/"',
    "GIT_NO_REPLACE_OBJECTS",
    "--no-replace-objects",
    "credential_content_read: false",
    "cloudflared_execution: false",
    "installation_authorized: false",
    "ingress_activation_authorized: false",
  ]){
    assert.equal(source.includes(required),true,required);
  }

  console.log("VOID_VOIDCHAIN_PATH_PRESERVING_INGRESS_PLAN_V1_PROOF_GREEN");
  console.log("hostname=voidchain.org");
  console.log("frontdoor_origin=http://127.0.0.1:8083");
  console.log("path_preserving=true");
  console.log("cloudflared_executed=false");
  console.log("credential_content_read=false");
  console.log("precision_recovery_independent_acceptance_required=true");
  console.log("install_plan_defined=false");
  console.log("rollback_plan_defined=false");
  console.log("dns_mutation=false");
  console.log("tls_mutation=false");
  console.log("service_start=false");
  console.log("installation_authorized=false");
  console.log("ingress_activation_authorized=false");
  console.log("independent_public_acceptance=false");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
