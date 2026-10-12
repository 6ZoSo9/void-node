#!/usr/bin/env node
// Source-only, disposable hosted-runner proof. No operational host mutation.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const MARKER = "VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1";
const repo = process.cwd();
const source = path.join(repo,"runtime/canonical-producer-source-custody-v1.cjs");
const launcher = fs.readFileSync("ops/run-void-node-live-v1.sh","utf8");
assert.ok(launcher.includes(
  '"$NODE_BINARY" "$ROOT/runtime/canonical-producer-source-custody-v1.cjs" "$ROOT"'),
  "canonical launcher must require source-custody before exec/tsx");
assert.ok(launcher.indexOf("canonical-producer-source-custody-v1.cjs") <
          launcher.indexOf("exec \"$NODE_BINARY\""),
          "attestation must precede actual loader");
assert.ok(fs.statSync(source).isFile());
assert.notEqual(process.getuid?.(),0,"CI proof must run as unprivileged user");
// /var/lib is root-owned on the supported Ubuntu hosted runner; /opt may
// be deliberately writable by the runner's hosted-toolcache installer and
// would correctly fail the same-UID ancestry guard.
const fixture = "/var/lib/void-source-custody-proof-"+String(process.pid)+"-"+String(process.getuid());
assert.match(fixture,/^\/var\/lib\/void-source-custody-proof-[0-9]+-[0-9]+$/);
function sudo(...args) {
  const run = spawnSync("sudo", ["-n",...args], {encoding:"utf8",timeout:12000});
  assert.equal(run.error,undefined,"sudo was unavailable");
  assert.equal(run.status,0,"CI disposable-fixture sudo operation failed: "+args[0]);
}
function observed() {
  return spawnSync(process.execPath,[
    path.join(fixture,"runtime/canonical-producer-source-custody-v1.cjs"),
    fixture,
  ], {encoding:"utf8",timeout:30000,maxBuffer:256*1024,
      env:{PATH:"/usr/bin:/bin",NODE_OPTIONS:""}});
}
function green() {
  const r = observed();
  assert.equal(r.status,0,r.stderr?.slice(0,800));
  assert.match(r.stdout,new RegExp(MARKER+"_GREEN source_nodes_checked=[0-9]+"));
}
function hold(reason) {
  const r = observed();
  assert.equal(r.status,2,"expected read-only custody HOLD");
  assert.match(r.stderr,new RegExp(MARKER+"_HOLD "+reason));
}
const subdirs=[
  ".git","src","ops","runtime","node_modules",
  "node_modules/tsx","node_modules/tsx/dist",
];
const sources=[
  "src/index.ts",
  "ops/run-void-node-live-v1.sh",
  "runtime/canonical-producer-self-http-guard-v1.cjs",
  "runtime/canonical-producer-self-http-guard-v2.cjs",
  "runtime/canonical-producer-self-http-guard-v3.cjs",
  "node_modules/tsx/dist/preflight.cjs",
  "node_modules/tsx/dist/loader.mjs",
];
try {
  sudo("install","-d","-m","0755",fixture);
  for(const p of subdirs) sudo("install","-d","-m","0755",path.join(fixture,p));
  for(const p of sources)
    sudo("install","-m","0644","/dev/null",path.join(fixture,p));
  sudo("install","-m","0644",source,
    path.join(fixture,"runtime/canonical-producer-source-custody-v1.cjs"));
  green();

  // Kernel denied writes, not just mocked file-stat snapshots.
  const kernelWrite = spawnSync(process.execPath,[
    "-e",'require("node:fs").appendFileSync(process.argv[1],"X")',
    path.join(fixture,"src/index.ts"),
  ],{encoding:"utf8",timeout:3000});
  assert.notEqual(kernelWrite.status,0,
    "actual unprivileged process must not change protected source bytes");

  sudo("chmod","0777",path.join(fixture,"src"));
  hold("source_mutable_or_untrusted_owner");
  sudo("chmod","0755",path.join(fixture,"src"));
  green();

  sudo("chmod","0777",fixture);
  hold("source_mutable_or_untrusted_owner");
  sudo("chmod","0755",fixture);
  green();

  sudo("chown",String(process.getuid())+":"+String(process.getgid()),
    path.join(fixture,"src/index.ts"));
  hold("source_mutable_or_untrusted_owner");
  sudo("chown","0:0",path.join(fixture,"src/index.ts"));
  green();

  sudo("ln","-s","src/index.ts",path.join(fixture,".internal-link"));
  green();  // Root-owned symlink resolves to an equally protected in-tree file.
  sudo("ln","-s","/etc/passwd",path.join(fixture,".external-link"));
  hold("symlink_outside_source_tree");
  sudo("rm","-f",path.join(fixture,".external-link"));
  green();

  sudo("install","-d","-m","0777",path.join(fixture,".runtime"));
  hold("source_mutable_or_untrusted_owner");
  sudo("rmdir",path.join(fixture,".runtime"));
  green();

  // No special privilege, wallet, key, deployed service or network involved.
  console.log(MARKER+"_PROOF_GREEN");
  console.log("root_owned_protected_fixture_positive=true");
  console.log("real_kernel_unprivileged_source_write_denied=true");
  console.log("writable_source_and_ancestor_hold=true");
  console.log("untrusted_owner_and_external_symlink_hold=true");
  console.log("internal_protected_symlink_accepted=true");
  console.log("writable_runtime_state_inside_source_tree_holds=true");
  console.log("production_source_tree_or_service_changed=false");
} finally {
  // CI-only uniquely named root-owned fixture under /var/lib; never a real
  // operator checkout. Its exact ephemeral path is validated above.
  sudo("rm","-rf","--",fixture);
}
