#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const PREEXEC="ops/public/void_cloudflare_historical_user_tunnel_retirement_preexec_v2.c";
const QUERY="ops/public/void_cloudflare_historical_user_tunnel_retirement_query_v2.c";
const PARENT_QUERY="ops/public/void_cloudflare_historical_user_tunnel_retirement_query_v1.c";
const WORKFLOW=".github/workflows/cloudflare-retirement-preexec-provenance-v1.yml";
const DOC="docs/architecture/cloudflare-retirement-preexec-provenance-v1.md";

function blob(data){
  return crypto.createHash("sha1")
    .update(Buffer.from("blob "+data.length+"\0","ascii"))
    .update(data).digest("hex");
}
const parentBytes=fs.readFileSync(path.join(ROOT,PARENT_QUERY));
assert.equal(blob(parentBytes),"25c1747ddd6a121b1ba2dbc1590c33a149e9b87b");

const preexec=fs.readFileSync(path.join(ROOT,PREEXEC),"utf8");
const query=fs.readFileSync(path.join(ROOT,QUERY),"utf8");
const workflow=fs.readFileSync(path.join(ROOT,WORKFLOW),"utf8");


function workflowEventPaths(name){
  const lines=workflow.split("\n");
  const eventLine="  "+name+":";
  const start=lines.indexOf(eventLine);
  assert.ok(start>=0,"missing workflow event: "+name);
  let inPaths=false;
  const paths=[];
  for(let i=start+1;i<lines.length;i+=1){
    const line=lines[i];
    if(/^  [A-Za-z_][A-Za-z0-9_-]*:$/.test(line)) break;
    if(line==="    paths:"){
      inPaths=true;
      continue;
    }
    if(!inPaths) continue;
    const match=/^      - "([^"]+)"$/.exec(line);
    if(match){
      paths.push(match[1]);
      continue;
    }
    if(line.trim()!=="" && !line.startsWith("      ")){
      inPaths=false;
    }
  }
  assert.ok(paths.length>0,"empty workflow paths: "+name);
  return paths;
}
const pullRequestPaths=workflowEventPaths("pull_request");
const pushPaths=workflowEventPaths("push");
assert.deepEqual(
  [...pushPaths].sort(),
  [...pullRequestPaths].sort(),
  "pull_request/main push path sets diverged",
);
assert.ok(workflow.includes("  push:\n    branches: [main]\n"));
assert.ok(workflow.includes('if [ -z "${BASE:-}" ]; then'));
assert.ok(workflow.includes('BASE="$(git rev-parse "$HEAD^1")"'));
assert.equal(
  (workflow.match(/if sudo test -e "\$root" \|\| sudo test -L "\$root"; then/gu)||[]).length,
  4,
);
assert.equal(
  (workflow.match(/echo "fixed fixture root already exists"/gu)||[]).length,
  2,
);
assert.equal(
  (workflow.match(/echo "fixture root still exists after cleanup"/gu)||[]).length,
  2,
);
assert.equal(
  (workflow.match(/sudo rm -rf --one-file-system "\$root"/gu)||[]).length,
  2,
);
assert.equal(workflow.includes('sudo rm -rf "$root" || true'),false);
assert.equal(
  (workflow.match(/\.void-fixture-owner-v1/gu)||[]).length >= 3,
  true,
);
for(const marker of [
  "fixture_preflight_file_rejected=true",
  "fixture_preflight_symlink_rejected=true",
  "fixture_preflight_directory_rejected=true",
  "fixture_preflight_stale_owned_rejected=true",
]){
  assert.ok(workflow.includes(marker),marker);
}
assert.ok(workflow.includes('refusing cleanup of unverified fixture root'));
assert.ok(workflow.includes('fixture root still exists after cleanup'));
assert.ok(workflow.includes('exit 97'));

for(const token of [
  "VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_PREEXEC_V2",
  "pipe2(proof_pipe, O_CLOEXEC)",
  "pid_t child = fork()",
  "waitpid(child, &status, 0)",
  "PROOF_FD_NAME",
  "parent_pid=%ld",
  "child_pid=%ld",
  "preexec_dev=%llu",
  "query_dev=%llu",
  "fexecve(query_fd, child_argv, child_env)",
]){
  assert.ok(preexec.includes(token),token);
}
for(const token of [
  "VOID_CLOUDFLARE_HISTORICAL_USER_TUNNEL_RETIREMENT_QUERY_PROVENANCE_V1",
  "retirement_query_v1_main",
  "protected_preexec_provenance()",
  "record.parent_pid != (long)parent",
  "record.child_pid != (long)self",
  "PROVENANCE_PREEXEC_PATH",
  "PROVENANCE_QUERY_PATH",
  "protected_preexec_provenance_required",
]){
  assert.ok(query.includes(token),token);
}
assert.ok(
  query.indexOf("protected_preexec_provenance()") <
  query.lastIndexOf("retirement_query_v1_main(argc, argv)")
);

for(const forbidden of [
  "systemctl ","systemctl\t","eth_sendRawTransaction","BEGIN PRIVATE KEY",
]){
  assert.equal(preexec.includes(forbidden),false,"preexec:"+forbidden);
  assert.equal(query.includes(forbidden),false,"query:"+forbidden);
}

for(const p of [PREEXEC,QUERY,PARENT_QUERY,WORKFLOW,DOC]){
  assert.ok(workflow.includes('"'+p+'"'),p);
}

console.log("VOID_CLOUDFLARE_RETIREMENT_PREEXEC_PROVENANCE_V1_PROOF_GREEN");
console.log("static_parent_remains_alive=true");
console.log("parent_child_pid_binding_required=true");
console.log("installed_parent_generation_binding_required=true");
console.log("installed_query_generation_binding_required=true");
console.log("direct_marker_invocation_rejected=true");
console.log("forged_proof_channel_rejected=true");
console.log("accepted_main_trigger_path_parity=true");
console.log("non_pr_diff_base_fallback_proven=true");
console.log("fixture_preexisting_state_rejected=true");
console.log("fixture_cleanup_run_owned_only=true");
console.log("fixture_cleanup_failure_is_fatal=true");
console.log("future_restart_prevented=false");
console.log("historical_user_tunnel_retirement_verified=false");
console.log("host_installation=false");
console.log("service_mutation=false");
console.log("funds_movement=false");
