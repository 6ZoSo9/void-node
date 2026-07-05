#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { hostname, platform, release, arch } from "node:os";
import { join } from "node:path";

function run(cmd, args = []) {
  try {
    const stdout = execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return { ok: true, stdout };
  } catch (err) {
    return {
      ok: false,
      stdout: String(err.stdout || "").trim(),
      stderr: String(err.stderr || err.message || "").trim(),
    };
  }
}

function parseJson(path) {
  try {
    JSON.parse(readFileSync(path, "utf8"));
    return true;
  } catch {
    return false;
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync(".void-field-reports", { recursive: true });

const checks = {
  machine: {
    hostname: hostname(),
    platform: platform(),
    release: release(),
    arch: arch(),
  },
  git_head: run("git", ["rev-parse", "--short", "HEAD"]),
  git_branch: run("git", ["branch", "--show-current"]),
  git_status_clean: run("git", ["status", "--short"]),
  node_version: run("node", ["--version"]),
  npm_version: run("npm", ["--version"]),
  package_json_exists: existsSync("package.json"),
  public_node_index_json_valid: existsSync("public/public-node/index.json") && parseJson("public/public-node/index.json"),
  runtime_index_json_valid: existsSync("public/public-node/runtime/index.json") && parseJson("public/public-node/runtime/index.json"),
  dangerous_paths_expected_gated: {
    wallet_movement: "disabled/not exercised by field trial",
    wc_settlement: "disabled/not exercised by field trial",
    validator_admission: "disabled/not exercised by field trial",
    public_mutation_routes: "disabled/not exercised by field trial",
  },
};

checks.git_status_clean.ok = checks.git_status_clean.ok && checks.git_status_clean.stdout.length === 0;

const report = {
  marker: "VOID_FIELD_TRIAL_V1_REPORT_READY",
  created_at: new Date().toISOString(),
  network_hint: process.env.VOID_NETWORK_HINT || "operator-specified",
  checks,
};

const out = join(".void-field-reports", `void-field-trial-${stamp}.json`);
writeFileSync(out, JSON.stringify(report, null, 2) + "\n");

console.log("VOID_FIELD_TRIAL_V1_REPORT_READY");
console.log(`report=${out}`);
console.log(`host=${report.checks.machine.hostname}`);
console.log(`git_head=${report.checks.git_head.stdout || "unknown"}`);
console.log(`public_node_index_json_valid=${report.checks.public_node_index_json_valid}`);
console.log(`runtime_index_json_valid=${report.checks.runtime_index_json_valid}`);
