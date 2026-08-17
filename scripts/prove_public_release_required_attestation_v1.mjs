#!/usr/bin/env node

import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UPDATER = path.join(ROOT, "release/bin/void-node-update");
const MARKER = "VOID_PUBLIC_RELEASE_REQUIRED_ATTESTATION_V1_PROOF_GREEN";
const CANONICAL_CHANNEL =
  "https://raw.githubusercontent.com/6ZoSo9/void-node/main/public/public-node/void-network/channels/stable-v1.json";

function invoke(extraArgs, env = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-release-attestation-proof-"));
  try {
    const result = childProcess.spawnSync(
      process.execPath,
      [
        UPDATER,
        "apply",
        "--channel",
        CANONICAL_CHANNEL,
        "--install-root",
        path.join(tmp, "install"),
        "--bin-dir",
        path.join(tmp, "bin"),
        ...extraArgs,
        "--yes",
      ],
      {
        cwd: ROOT,
        env: { ...process.env, ...env },
        encoding: "utf8",
        timeout: 2000,
      },
    );
    return {
      ...result,
      combined: `${result.stdout ?? ""}${result.stderr ?? ""}`,
      installExists: fs.existsSync(path.join(tmp, "install")),
      binExists: fs.existsSync(path.join(tmp, "bin")),
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const source = fs.readFileSync(UPDATER, "utf8");
assert.equal(
  source.includes("VOID_NODE_UPDATE_ALLOW_SKIP_ATTESTATION"),
  false,
  "production attestation bypass environment must be absent",
);
assert.match(
  source,
  /o\.command==="apply"&&o\.skipAttestation&&!o\.testAllowFile\)fail\("--skip-attestation is test-only; pass --test-allow-file"\)/,
  "production apply must reject --skip-attestation before channel processing",
);
assert.match(
  source,
  /channel\.verification\.github_attestation_required&&!o\.testAllowFile\)/,
  "production required-attestation branch must not depend on skipAttestation",
);

const productionBypass = invoke(["--skip-attestation"], {
  VOID_NODE_UPDATE_ALLOW_SKIP_ATTESTATION: "1",
});
assert.equal(productionBypass.error?.code, undefined, "production bypass probe timed out");
assert.notEqual(productionBypass.status, 0, "production bypass unexpectedly succeeded");
assert.match(
  productionBypass.combined,
  /--skip-attestation is test-only; pass --test-allow-file/,
  "production bypass was not rejected at the test-only boundary",
);
assert.equal(productionBypass.installExists, false, "production bypass created install state");
assert.equal(productionBypass.binExists, false, "production bypass created bin state");

const testBoundary = invoke(["--test-allow-file", "--skip-attestation"]);
assert.equal(testBoundary.error?.code, undefined, "test-boundary probe timed out");
assert.notEqual(testBoundary.status, 0, "synthetic HTTPS probe unexpectedly completed");
assert.doesNotMatch(
  testBoundary.combined,
  /--skip-attestation is test-only; pass --test-allow-file/,
  "explicit test boundary incorrectly rejected test-only attestation skipping",
);

console.log("production_stable_attestation_non_bypassable=true");
console.log("legacy_environment_override_rejected=true");
console.log("test_only_skip_boundary_retained=true");
console.log(MARKER);
