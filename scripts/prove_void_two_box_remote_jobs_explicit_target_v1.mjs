#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const MARKER = "VOID_TWO_BOX_REMOTE_JOBS_EXPLICIT_TARGET_V1";
const files = [
  "ops/two-box-remote-jobs-submit-proof.sh",
  "ops/two-box-remote-jobs-submit-product-proof.sh",
  "ops/two-box-remote-datanet-view-proof.sh",
];

for (const path of files) {
  const source = fs.readFileSync(path, "utf8");
  assert.ok(source.startsWith("#!/usr/bin/env bash\n"), path);
  assert.ok(source.includes(`MARKER="${MARKER}"`), path);
  assert.equal(
    source.includes('${ALIEN:-zoso@100.122.79.39}'),
    false,
    `legacy implicit SSH target remains: ${path}`,
  );
  assert.ok(
    source.includes(': "${ALIEN:?set ALIEN to an explicit SSH target, for example user@host}"'),
    `explicit SSH target requirement missing: ${path}`,
  );
  assert.ok(source.includes("retired Alienware"), path);
  assert.equal((source.match(/100\.122\.79\.39/g) || []).length, 1, path);
}

for (const path of [
  "ops/two-box-remote-jobs-submit-product-proof.sh",
  "ops/two-box-remote-datanet-view-proof.sh",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.equal(
    source.includes('${REMOTE_NODE_BASE:-http://100.122.79.39:4100}'),
    false,
    `legacy implicit HTTP origin remains: ${path}`,
  );
  assert.ok(
    source.includes(': "${REMOTE_NODE_BASE:?set REMOTE_NODE_BASE to the explicit remote node HTTP origin}"'),
    `explicit HTTP origin requirement missing: ${path}`,
  );
  assert.ok(source.includes('parsed.scheme not in {"http", "https"}'), path);
  assert.ok(source.includes("parsed.username is not None or parsed.password is not None"), path);
  assert.ok(source.includes('parsed.path not in {"", "/"} or parsed.query or parsed.fragment'), path);
  assert.ok(source.includes("credential-free HTTP(S) origin"), path);
}

const sshOnly = fs.readFileSync("ops/two-box-remote-jobs-submit-proof.sh", "utf8");
assert.equal(sshOnly.includes("REMOTE_NODE_BASE="), false);

for (const path of files) {
  const source = fs.readFileSync(path, "utf8");
  assert.ok(source.includes("TARGET_GUARD="), path);
  assert.ok(source.includes("${ALIEN,,}"), path);
}
for (const path of [
  "ops/two-box-remote-jobs-submit-product-proof.sh",
  "ops/two-box-remote-datanet-view-proof.sh",
]) {
  const source = fs.readFileSync(path, "utf8");
  assert.ok(source.includes("${REMOTE_NODE_BASE,,}"), path);
}

for (const path of files) {
  const env = {
    ...process.env,
    ALIEN: "ZOSO@ZOSO-ALIENWARE-AURORA-R7.TAILA47FD.TS.NET",
    REMOTE_NODE_BASE: "https://example.invalid",
  };
  const result = spawnSync("bash", [path], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
    timeout: 2000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 2, path);
  assert.match(
    String(result.stderr || ""),
    /retired Alienware/u,
    path,
  );
}

for (const path of files) {
  const result = spawnSync("bash", [path], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ALIEN: "-oProxyCommand=must-not-run",
      REMOTE_NODE_BASE: "https://example.invalid",
    },
    encoding: "utf8",
    timeout: 2000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 2, path);
  assert.match(String(result.stderr || ""), /ALIEN must be an explicit SSH alias or user@host/u, path);
}

for (const path of [
  "ops/two-box-remote-jobs-submit-product-proof.sh",
  "ops/two-box-remote-datanet-view-proof.sh",
]) {
  for (const badBase of [
    "https://user:pass@example.invalid:4100",
    "https://example.invalid:4100/path",
    "https://example.invalid:4100?query=1",
  ]) {
    const result = spawnSync("bash", [path], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ALIEN: "reviewed-host",
        REMOTE_NODE_BASE: badBase,
      },
      encoding: "utf8",
      timeout: 2000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 2, path + " " + badBase);
    assert.match(String(result.stderr || ""), /credential-free HTTP\(S\) origin/u, path);
  }
}

console.log(`${MARKER}_PROOF_GREEN`);
console.log("implicit_retired_ssh_target=false");
console.log("implicit_retired_http_origin=false");
console.log("explicit_remote_target_required=true");
console.log("retired_target_casefold_rejected=true");
console.log("ssh_option_injection_rejected=true");
console.log("remote_origin_credentials_path_query_rejected=true");
console.log("live_ssh_executed=false");
console.log("live_http_executed=false");
console.log("job_submission_executed=false");
console.log("wc_write_executed=false");
console.log("funds_movement=false");
